import assert from 'node:assert/strict';
import { test } from 'node:test';
import { amortizationByYear, inTodaysDollars, monthlyPayment, netSaleProceeds, project, housingTaxSavings } from '../site/engine.js';
import { defaultValues } from '../site/inputs.js';

const close = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) <= eps, `${a} !~ ${b}`);

test('monthly payment matches the standard amortization formula', () => {
  close(monthlyPayment(200000, 6, 30), 1199.1, 0.01);
  close(monthlyPayment(120000, 0, 10), 1000);
  assert.equal(monthlyPayment(0, 5, 30), 0);
});

test('amortization splits interest and principal and pays off at term', () => {
  const years = amortizationByYear({ mortgageBalance: 200000, mortgageRate: 6, mortgageTerm: 30, horizon: 30 });
  const payment = monthlyPayment(200000, 6, 30);
  close(years[0].interest + years[0].principal, payment * 12, 0.01);
  assert.ok(years[0].interest > years[0].principal);
  close(years[29].balance, 0);
  close(years.reduce((s, y) => s + y.principal, 0), 200000, 0.01);
});

test('amortization stops after the term when the horizon is longer', () => {
  const years = amortizationByYear({ mortgageBalance: 50000, mortgageRate: 5, mortgageTerm: 5, horizon: 8 });
  assert.equal(years[5].interest, 0);
  assert.equal(years[7].principal, 0);
  assert.equal(years[7].balance, 0);
});

test('net sale proceeds follow the chain, with exclusion and taxes', () => {
  const s = netSaleProceeds({
    homeValue: 500000, sellingCostsPct: 6, costBasis: 300000, exclusion: 'single',
    taxRate: 20, mortgageBalance: 200000,
  });
  assert.equal(s.sellingCosts, 30000);
  assert.equal(s.netSales, 470000);
  assert.equal(s.gain, 170000);
  assert.equal(s.gainAfterExclusion, 0);
  assert.equal(s.taxesDue, 0);
  assert.equal(s.netProceeds, 270000);

  const none = netSaleProceeds({
    homeValue: 500000, sellingCostsPct: 6, costBasis: 300000, exclusion: 'none',
    taxRate: 20, mortgageBalance: 200000,
  });
  assert.equal(none.taxesDue, 34000);
  assert.equal(none.netProceeds, 236000);
});

test('a loss on the sale owes no tax', () => {
  const s = netSaleProceeds({
    homeValue: 300000, sellingCostsPct: 6, costBasis: 400000, exclusion: 'none',
    taxRate: 20, mortgageBalance: 0,
  });
  assert.equal(s.taxesDue, 0);
  assert.equal(s.netProceeds, 282000);
});

test('unrecoverable cost excludes principal and rent grows yearly', () => {
  const v = { ...defaultValues(), horizon: 3 };
  const { rows } = project(v);
  assert.equal(rows.length, 4);
  const y1 = rows[1];
  close(y1.unrecoverableCost, v.propertyTax + v.homeValue * 0.015 + y1.mortgageInterest);
  close(y1.rentCost, 2500 * 12 + 200);
  close(rows[2].rentCost, 2500 * 12 * 1.03 + 200);
  close(rows[1].homeValue, 500000 * 1.03);
});

test('property tax, insurance and maintenance each grow at their own rate', () => {
  const v = { ...defaultValues(), horizon: 3, propertyTaxGrowth: 2, insuranceGrowth: 10, maintenanceGrowth: 0, appreciation: 7 };
  const { rows } = project(v);
  close(rows[1].propertyTax, v.propertyTax);
  close(rows[3].propertyTax, v.propertyTax * 1.02 ** 2);
  close(rows[3].insurance, v.homeValue * 0.005 * 1.1 ** 2);
  close(rows[3].maintenance, v.homeValue * 0.01);
});

test('monthly own cost includes tax, insurance, maintenance, principal and interest', () => {
  const v = { ...defaultValues(), horizon: 1 };
  const y1 = project(v).rows[1];
  close(y1.monthlyOwnCost * 12, v.propertyTax + v.homeValue * 0.015 + y1.mortgageInterest + y1.mortgagePrincipal);
});

test('investment capital compounds with the owning-vs-renting difference', () => {
  const v = { ...defaultValues(), horizon: 1 };
  const { sale, rows } = project(v);
  const y1 = rows[1];
  close(
    y1.investmentCapital,
    sale.netProceeds * (1 + 0.06 * 0.85) + y1.unrecoverableCost + y1.mortgagePrincipal - y1.rentCost,
  );
  close(y1.investmentIncome, sale.netProceeds * 0.04);
  close(project({ ...v, withdrawalTaxRate: 25 }).rows[1].investmentIncome, sale.netProceeds * 0.04 * 0.75);
  close(y1.monthlyInvestmentIncome, y1.investmentIncome / 12);
});

test('stay net worth is after selling costs and tax, so year 0 is level and the breakeven year is found', () => {
  const { rows, breakevenYear } = project(defaultValues());
  close(rows[0].netWorthGainLoss, 0);
  close(rows[0].stayNetWorth, rows[0].investmentCapital);
  assert.ok(rows[1].stayNetWorth < rows[1].equity);
  const first = rows.slice(1).find((r) => r.netWorthGainLoss >= 0);
  assert.equal(breakevenYear, first ? first.year : null);
});

test('strong investment growth against a flat home reaches breakeven; weak never does', () => {
  const strong = project({ ...defaultValues(), appreciation: 0, investmentGrowth: 10, horizon: 30 });
  assert.ok(strong.breakevenYear > 0);
  const weak = project({ ...defaultValues(), appreciation: 8, investmentGrowth: 0, rent: 6000, horizon: 30 });
  assert.equal(weak.breakevenYear, null);
});

test('horizon bounds the projection and zero horizon yields only year 0', () => {
  assert.equal(project({ ...defaultValues(), horizon: 10 }).rows.length, 11);
  assert.equal(project({ ...defaultValues(), horizon: 0 }).rows.length, 1);
});

test('tax savings count only itemized housing deductions above the standard deduction', () => {
  const base = { propertyTax: 5000, saltCap: 10000, standardDeduction: 14000, marginalTaxRate: 25 };
  close(housingTaxSavings(base, 8000), 0);
  close(housingTaxSavings(base, 12000), (12000 + 5000 - 14000) * 0.25);
  close(housingTaxSavings({ ...base, marginalTaxRate: 0 }, 12000), 0);
});

test('the SALT cap limits the property tax that is deductible', () => {
  const v = { propertyTax: 20000, saltCap: 10000, standardDeduction: 0, marginalTaxRate: 20 };
  close(housingTaxSavings(v, 5000), (5000 + 10000) * 0.2);
});

test('tax savings reduce the owner\'s unrecoverable cost and monthly cost', () => {
  const v = { ...defaultValues(), mortgageBalance: 400000, standardDeduction: 10000, horizon: 1 };
  const y1 = project(v).rows[1];
  const gross = v.propertyTax + v.homeValue * 0.015 + y1.mortgageInterest;
  assert.ok(y1.taxSavings > 0);
  close(y1.taxSavings, (y1.mortgageInterest + v.propertyTax - 10000) * 0.24);
  close(y1.unrecoverableCost, gross - y1.taxSavings);
  close(y1.monthlyOwnCost * 12, gross - y1.taxSavings + y1.mortgagePrincipal);
});

test('tax on investment growth lowers the capital it compounds to', () => {
  const v = { ...defaultValues(), horizon: 10 };
  const untaxed = project({ ...v, investmentTaxRate: 0 }).rows[10].investmentCapital;
  const taxed = project({ ...v, investmentTaxRate: 25 }).rows[10].investmentCapital;
  assert.ok(taxed < untaxed);
  const y1 = project({ ...v, horizon: 1, investmentTaxRate: 100 }).rows[1];
  close(y1.investmentCapital, project(v).sale.netProceeds + y1.unrecoverableCost + y1.mortgagePrincipal - y1.rentCost);
});

test('tax on investment growth does not cushion a loss', () => {
  const v = { ...defaultValues(), horizon: 10, investmentGrowth: -10 };
  const untaxed = project({ ...v, investmentTaxRate: 0 }).rows[10].investmentCapital;
  const taxed = project({ ...v, investmentTaxRate: 100 }).rows[10].investmentCapital;
  close(taxed, untaxed);
});

test("today's dollars discounts each year by compounded inflation", () => {
  const { rows } = project({ ...defaultValues(), horizon: 3 });
  const real = inTodaysDollars(rows, 3);
  assert.deepEqual(real[0], rows[0]);
  close(real[2].homeValue, rows[2].homeValue / 1.03 ** 2);
  close(real[3].monthlyRentCost, rows[3].monthlyRentCost / 1.03 ** 3);
  assert.equal(real[3].year, 3);
  assert.equal(inTodaysDollars(rows, 0)[3].homeValue, rows[3].homeValue);
});

test('HOA dues grow yearly, count as owning cost and are not tax deductible', () => {
  const v = { ...defaultValues(), horizon: 2, hoaMonthly: 400, hoaGrowth: 5 };
  const base = project({ ...v, hoaMonthly: 0 }).rows;
  const { rows } = project(v);
  close(rows[1].hoa, 4800);
  close(rows[2].hoa, 4800 * 1.05);
  close(rows[1].unrecoverableCost - base[1].unrecoverableCost, 4800);
  close(rows[1].monthlyOwnCost - base[1].monthlyOwnCost, 400);
  close(rows[1].taxSavings, base[1].taxSavings);
});

test('stay net worth in a later year nets selling costs and capital-gains tax on that year\'s value', () => {
  const v = { ...defaultValues(), exclusion: 'none', horizon: 5 };
  const { rows } = project(v);
  const r = rows[5];
  const sale = netSaleProceeds({ ...v, homeValue: r.homeValue, mortgageBalance: r.mortgageBalance });
  close(r.stayNetWorth, sale.netProceeds);
  assert.ok(sale.taxesDue > 0);
  close(r.stayNetWorth, r.homeValue * 0.94 - sale.taxesDue - r.mortgageBalance);
});
