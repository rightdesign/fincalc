import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareRentOwn, decodeRentOwn, encodeRentOwn, invalidRentOwn, rentOwnDefaults } from '../site/rentown.js';
import { compareRentThenBuy } from '../site/rentown-later.js';

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const base = () => ({ ...rentOwnDefaults(), years: 10 });

test('renting for 0 years is the buy-now result', () => {
  const v = { ...base(), waitYears: 0, repairYear: 3, repairCost: 8000, hoa: 150, utilities: 80 };
  const r = compareRentOwn(v);
  const l = compareRentThenBuy(v, r);
  l.chartYears.forEach((y, i) => near(y.later, r.chartYears[i].own));
  assert.equal(l.buyYear, 0);
});

test('renting for the whole stay is the rent-forever result', () => {
  const v = base();
  const r = compareRentOwn(v);
  const l = compareRentThenBuy({ ...v, waitYears: v.years }, r);
  l.years.forEach((y, i) => near(y.later, r.years[i].rent));
  near(l.final.later, r.final.rent);
  near(l.finalReal.later, r.finalReal.rent);
  assert.equal(l.buyYear, null);
});

test('a purchase after the stay never happens inside it', () => {
  const v = { ...base(), waitYears: 20 };
  const r = compareRentOwn(v);
  const l = compareRentThenBuy(v, r);
  assert.equal(l.buyYear, null);
  near(l.final.later, r.final.rent);
});

test('the later purchase is the same home at its appreciated price on the balance after the savings', () => {
  const v = { ...base(), waitYears: 3, growth: 5, down: 10, closing: 2, tax: 0, insurance: 0, maintenance: 0, pmi: 0, selling: 0, investment: 0, investDrag: 0, capGains: 0, rent: 2000, rentGrowth: 0, renterInsurance: 0, exclusion: 0 };
  const l = compareRentThenBuy(v);
  const price = 450000 * 1.05 ** 3;
  const savings = 450000 * 0.12 + 36 * (compareRentOwn(v).series[0].own - 2000);
  near(l.loan, price - (savings - price * 0.02), 1);
});

test('a separate rate when you buy changes the loan, and blank keeps the mortgage rate', () => {
  const v = { ...base(), waitYears: 3 };
  const same = compareRentThenBuy({ ...v, waitRate: null });
  near(same.final.later, compareRentThenBuy({ ...v, waitRate: v.rate }).final.later);
  const higher = compareRentThenBuy({ ...v, waitRate: v.rate + 2 });
  assert.ok(higher.final.later < same.final.later);
  assert.ok(higher.monthlyPayment > same.monthlyPayment);
});

test('buying stops being the worst choice in the year after it last trails the other two', () => {
  const l = compareRentThenBuy({ ...base(), years: 15, waitYears: 2 });
  const worst = l.years.map((y) => y.own < y.rent && y.own < y.later);
  const last = worst.lastIndexOf(true);
  assert.equal(l.stopsBeingWorst, last === l.years.length - 1 ? null : l.years[last + 1].year);
  const never = compareRentThenBuy({ ...base(), growth: 12, years: 5 });
  assert.equal(never.stopsBeingWorst, never.years[0].own < never.years[0].rent && never.years[0].own < never.years[0].later ? never.stopsBeingWorst : 1);
});

test('today\'s dollars are the nominal rows discounted by inflation', () => {
  const l = compareRentThenBuy(base());
  near(l.real[4].later, l.years[4].later / 1.025 ** 5);
});

test('the new inputs validate and round-trip through the link', () => {
  const v = { ...rentOwnDefaults(), waitYears: 5, waitRate: 5.5 };
  assert.deepEqual(invalidRentOwn(v), []);
  assert.deepEqual(decodeRentOwn(encodeRentOwn(v)), v);
  assert.deepEqual(invalidRentOwn({ ...rentOwnDefaults(), waitYears: 2.5, waitRate: -1 }), ['Years you rent before buying', 'Mortgage rate when you buy later, optional']);
  assert.equal(decodeRentOwn('').waitRate, null);
});

test('the results show the rent-then-buy card and a third chart line', async () => {
  const { buildContext } = await import('../site/rentown/context.js');
  const { renderCards } = await import('../site/rentown/cards.js');
  const html = renderCards(buildContext({ ...rentOwnDefaults(), waitYears: 3 }, 'future'));
  assert.ok(html.includes('Rent 3 years, then buy'));
  assert.ok(html.includes('Rent, then buy</text>'));
  assert.ok(html.includes('You buy at the start of year 4'));
  assert.ok(renderCards(buildContext({ ...rentOwnDefaults(), waitYears: 0 }, 'today')).includes('Buying immediately is the same as buying now.'));
});

test('the unrealized view applies to the rent-then-buy line too', () => {
  const v = { ...base(), view: 'unrealized', repairYear: 3, repairCost: 8000 };
  const r = compareRentOwn(v);
  compareRentThenBuy({ ...v, waitYears: 0 }, r).chartYears.forEach((y, i) => near(y.later, r.chartYears[i].own));
  const l = compareRentThenBuy({ ...v, waitYears: v.years }, r);
  l.years.forEach((y, i) => near(y.later, r.years[i].rent));
});

test('the renting years match rent forever exactly, tax refund included', () => {
  const v = { ...base(), price: 2000000, down: 70, takeHome: 300000, marginalTaxRate: 38, rent: 9000, waitYears: 2, years: 10 };
  const r = compareRentOwn(v);
  assert.ok(r.firstTaxBenefit > 0);
  const l = compareRentThenBuy(v, r);
  near(l.years[0].later, r.years[0].rent);
  near(l.years[1].later, r.years[1].rent);
});

test('buying immediately gets the same mortgage interest and property tax deduction as buying now', () => {
  const v = { ...base(), waitYears: 0, price: 1000000, marginalTaxRate: 38 };
  const r = compareRentOwn(v);
  assert.ok(r.firstTaxBenefit > 0);
  compareRentThenBuy(v, r).years.forEach((y, i) => near(y.later, r.years[i].own, 0.5));
});

test('the later purchase follows the loan program: VA has no PMI, FHA adds its fee, ARM starts at the ARM rate', () => {
  const v = { ...base(), waitYears: 2, down: 5, pmi: 1.5 };
  const conv = compareRentThenBuy(v);
  const va = compareRentThenBuy({ ...v, program: 2, feeFinanced: 1 });
  const fha = compareRentThenBuy({ ...v, program: 1, feeFinanced: 1 });
  assert.ok(va.final.later !== conv.final.later);
  assert.ok(fha.loan > conv.loan);
  const arm = compareRentThenBuy({ ...v, arm: 1, armRate: 3 });
  near(arm.rate, 3);
});

test('buying immediately with a loan program matches buying now', () => {
  for (const extra of [{ program: 1 }, { program: 2, feeFinanced: 0 }, { arm: 1 }]) {
    const v = { ...base(), waitYears: 0, down: 5, ...extra };
    const r = compareRentOwn(v);
    const l = compareRentThenBuy(v, r);
    l.years.forEach((y, i) => near(y.later, r.years[i].own, 0.5));
  }
});
