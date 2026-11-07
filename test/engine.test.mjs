import assert from 'node:assert/strict';
import { test } from 'node:test';
import { amortizationByYear, inTodaysDollars, monthlyPayment, downsizeFunding, netSaleProceeds, project, housingTaxSavings } from '../site/engine.js';
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

test('moving costs and rental upfront cash reduce the starting investment', () => {
  const v = { ...defaultValues(), horizon: 1 };
  const base = project(v);
  const costly = project({ ...v, movingCosts: 5000, rentalUpfront: 7500 });
  close(costly.rows[0].investmentCapital, base.rows[0].investmentCapital - 12500);
  close(costly.rows[0].netWorthGainLoss, base.rows[0].netWorthGainLoss - 12500);
  close(costly.rows[1].investmentCapital, base.rows[1].investmentCapital - 12500 * (1 + 0.06 * 0.85));
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

test('major repairs add to the owning cost in their year only, untaxed, and may stack', () => {
  const v = { ...defaultValues(), horizon: 3 };
  const base = project(v).rows;
  const { rows } = project({ ...v, repairs: [{ year: 2, amount: 12000 }, { year: 2, amount: 3000 }, { year: 9, amount: 99999 }] });
  close(rows[1].repairs, 0);
  close(rows[2].repairs, 15000);
  close(rows[2].unrecoverableCost - base[2].unrecoverableCost, 15000);
  close(rows[2].monthlyOwnCost - base[2].monthlyOwnCost, 1250);
  close(rows[2].taxSavings, base[2].taxSavings);
  close(rows[3].unrecoverableCost, base[3].unrecoverableCost);
  assert.ok(rows[3].netWorthGainLoss > base[3].netWorthGainLoss);
  close(project(v).rows[2].repairs, 0);
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

test('downsize path: year 0 buys the new home from proceeds and invests the rest', () => {
  const v = { ...defaultValues(), horizon: 5, newHomePrice: 200000, newBuyingCostsPct: 2, newMortgageAmount: 0, movingCosts: 5000 };
  const { rows, sale } = project(v);
  // 270,000 net proceeds - 5,000 moving - (200,000 + 4,000 buying) = 61,000 invested.
  close(rows[0].downsizeInvestmentCapital, sale.netProceeds - 5000 - 204000);
  assert.equal(rows[0].downsizeMortgageBalance, 0);
  // Net worth counts the new home after selling costs (no gain, so no tax).
  close(rows[0].downsizeNetWorth, 61000 + 200000 * 0.94);
  close(rows[0].downsizeGainLoss, rows[0].downsizeNetWorth - sale.netProceeds);
});

test('downsize path: a new mortgage lowers the cash paid and adds interest and principal', () => {
  const base = { ...defaultValues(), horizon: 10, newHomePrice: 250000 };
  const cash = project({ ...base, newMortgageAmount: 0 });
  const loan = project({ ...base, newMortgageAmount: 100000, newMortgageRate: 6, newMortgageTerm: 30 });
  close(loan.rows[0].downsizeInvestmentCapital - cash.rows[0].downsizeInvestmentCapital, 100000);
  assert.equal(cash.rows[3].monthlyDownsizeCost < loan.rows[3].monthlyDownsizeCost, true);
  assert.ok(loan.rows[10].downsizeMortgageBalance > 0 && loan.rows[10].downsizeMortgageBalance < 100000);
});

test('downsize path invests the difference between the stay and downsize cash outlay', () => {
  const v = { ...defaultValues(), horizon: 1, investmentGrowth: 0, newMortgageAmount: 0 };
  const { rows } = project(v);
  const outlay = rows[1].unrecoverableCost + rows[1].mortgagePrincipal;
  const newCost = rows[1].downsizeUnrecoverableCost;
  close(rows[1].downsizeInvestmentCapital - rows[0].downsizeInvestmentCapital, outlay - newCost);
});

test('downsize breakeven is the first year it is at or ahead of staying', () => {
  const r = project({ ...defaultValues(), horizon: 30 });
  if (r.downsizeBreakevenYear == null) assert.ok(r.rows.slice(1).every((x) => x.downsizeGainLoss < 0));
  else {
    assert.ok(r.rows[r.downsizeBreakevenYear].downsizeGainLoss >= 0);
    assert.ok(r.rows.slice(1, r.downsizeBreakevenYear).every((x) => x.downsizeGainLoss < 0));
  }
});

test('reports the downsize shortfall when proceeds and new mortgage do not cover the purchase', () => {
  const v = {
    ...defaultValues(), horizon: 3, homeValue: 5500000, sellingCostsPct: 0, costBasis: 5500000, mortgageBalance: 2443000, newHomePrice: 3000000, newBuyingCostsPct: 2, newMortgageAmount: 0, movingCosts: 20000,
  };
  const p = project(v);
  assert.equal(p.sale.netProceeds, 3057000);
  assert.equal(p.downsizeShortfall, 23000);
  assert.equal(p.rows[0].downsizeInvestmentCapital, -23000);
  const covered = project({ ...v, newMortgageAmount: p.downsizeShortfall });
  assert.equal(covered.downsizeShortfall, 0);
});

test('downsize path: with useProceeds off the full net proceeds are invested', () => {
  const v = { ...defaultValues(), horizon: 5, newHomePrice: 200000, newBuyingCostsPct: 2, newMortgageAmount: 0, movingCosts: 5000, useProceeds: 0 };
  const { rows, sale } = project(v);
  close(rows[0].downsizeInvestmentCapital, sale.netProceeds - 5000);
  // The 204,000 paid from outside funds is excluded: year 0 net worth is level with the checked mode.
  close(rows[0].downsizeNetWorth, sale.netProceeds - 5000 + 200000 * 0.94 - 204000);
  close(rows[0].downsizeNetWorth, project({ ...v, useProceeds: 1 }).rows[0].downsizeNetWorth);
  assert.equal(project(v).downsizeShortfall, 0);
  // Checked, or absent from older values, keeps the current behavior.
  const on = project({ ...v, useProceeds: 1 }).rows[0].downsizeInvestmentCapital;
  const absent = project({ ...v, useProceeds: undefined }).rows[0].downsizeInvestmentCapital;
  close(on, sale.netProceeds - 5000 - 204000);
  close(absent, on);
});

test('downsize path: a proceeds cap keeps the rest invested and leaves the remainder to outside funds', () => {
  const v = { ...defaultValues(), horizon: 5, newHomePrice: 400000, newBuyingCostsPct: 2, newMortgageAmount: 100000, movingCosts: 5000 };
  const { sale } = project(v);
  const needed = 408000 - 100000;
  const all = downsizeFunding(v);
  close(all.invested, sale.netProceeds - 5000 - needed);
  assert.equal(all.outsideFunds, 0);
  const amount = downsizeFunding({ ...v, proceedsMode: 'amount', proceedsAmount: 200000 });
  close(amount.invested, sale.netProceeds - 5000 - 200000);
  close(amount.outsideFunds, needed - 200000);
  const pctCap = downsizeFunding({ ...v, proceedsMode: 'percent', proceedsPercent: 50 });
  close(pctCap.invested, sale.netProceeds - 5000 - sale.netProceeds * 0.5);
  // A cap above what is needed changes nothing; useProceeds off ignores the cap.
  close(downsizeFunding({ ...v, proceedsMode: 'amount', proceedsAmount: 1e9 }).invested, all.invested);
  close(downsizeFunding({ ...v, useProceeds: 0, proceedsMode: 'amount', proceedsAmount: 1 }).invested, sale.netProceeds - 5000);
});

test('downsize path: outside funds are excluded from net worth when a proceeds cap is set, keeping year 0 level', () => {
  const v = { ...defaultValues(), horizon: 5, newHomePrice: 400000, newBuyingCostsPct: 2, newMortgageAmount: 100000, movingCosts: 5000 };
  const all = project(v).rows;
  const capped = project({ ...v, proceedsMode: 'amount', proceedsAmount: 200000 }).rows;
  close(capped[0].downsizeNetWorth, all[0].downsizeNetWorth);
  assert.ok(capped[5].downsizeNetWorth < all[5].downsizeNetWorth + 108000 * 1.5);
  assert.ok(capped[5].downsizeNetWorth > all[5].downsizeNetWorth - 1);
});

test('out-of-pocket cash: stay pays the full cost, others net off portfolio withdrawals', () => {
  const v = { ...defaultValues(), horizon: 5 };
  const { rows } = project(v);
  for (const r of rows.slice(1)) {
    assert.ok(Math.abs(r.monthlyStayOutOfPocket - r.monthlyOwnCost) < 1e-9);
    const sell = Math.max(0, r.rentCost - Math.max(0, r.investmentIncome)) / 12;
    assert.ok(Math.abs(r.monthlySellOutOfPocket - sell) < 1e-9);
    assert.ok(r.monthlySellOutOfPocket <= r.monthlyRentCost + 1e-9);
    assert.ok(r.monthlyDownsizeOutOfPocket >= 0);
    assert.ok(r.monthlyDownsizeOutOfPocket <= r.monthlyDownsizeCost + 1e-9);
  }
  const none = project({ ...v, investmentWithdrawal: 0 }).rows[1];
  assert.ok(Math.abs(none.monthlySellOutOfPocket - none.monthlyRentCost) < 1e-9);
});

test('withdraw-to-cover-rent sets income to the rent, ignoring the withdrawal percentage', () => {
  const v = { ...defaultValues(), horizon: 5, investmentWithdrawal: 0, withdrawalTaxRate: 20 };
  const off = project(v).rows[1];
  close(off.investmentIncome, 0);
  const on = project({ ...v, withdrawToCoverRent: 1 });
  for (const r of on.rows.slice(1)) {
    close(r.investmentIncome, r.rentCost);
    close(r.monthlySellOutOfPocket, 0);
    assert.ok(r.downsizeInvestmentIncome <= r.monthlyDownsizeCost * 12 + 1e-6);
  }
  // capped at what the capital can pay after tax
  const tiny = project({ ...v, withdrawToCoverRent: 1, rent: 1e7 }).rows[1];
  close(tiny.investmentIncome, project(v).rows[0].investmentCapital * 0.8);
});
