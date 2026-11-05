import assert from 'node:assert/strict';
import { test } from 'node:test';
import { amortizationByYear, monthlyPayment, netSaleProceeds, project } from '../site/engine.js';
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

test('investment capital compounds with the owning-vs-renting difference', () => {
  const v = { ...defaultValues(), horizon: 1 };
  const { sale, rows } = project(v);
  const y1 = rows[1];
  close(
    y1.investmentCapital,
    sale.netProceeds * 1.06 + y1.unrecoverableCost + y1.mortgagePrincipal - y1.rentCost,
  );
  close(y1.investmentIncome, sale.netProceeds * 0.04);
  close(y1.monthlyInvestmentIncome, y1.investmentIncome / 12);
});

test('net worth gain/loss starts at the selling cost and the breakeven year is found', () => {
  const { rows, breakevenYear } = project(defaultValues());
  close(rows[0].netWorthGainLoss, rows[0].investmentCapital - rows[0].equity);
  assert.ok(rows[0].netWorthGainLoss < 0);
  const first = rows.find((r) => r.netWorthGainLoss >= 0);
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
