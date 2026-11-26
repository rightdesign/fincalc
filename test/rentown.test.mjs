import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { compareRentOwn, compareScenarios, durationText, equivalentRent, invalidRentOwn, rentOwnDefaults } from '../site/rentown.js';
import { headlineCard } from '../site/rentown/headline.js';
import { buildContext } from '../site/rentown/context.js';
import { CALCULATORS } from '../site/menu.js';

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
// Pinned numbers were recorded with the old 0.7% tax drag default (FINC-186 lowered it to 0.4%).
const base = () => ({ ...rentOwnDefaults(), investDrag: 0.7 });

test('the menu lists rent vs own third and the page exists', () => {
  assert.equal(CALCULATORS[2].href, 'rent-vs-own.html');
  const html = readFileSync(new URL('../site/rent-vs-own.html', import.meta.url), 'utf8');
  assert.ok(html.includes('menu.js'));
});

test('defaults are valid and give one row per year', () => {
  assert.deepEqual(invalidRentOwn(base()), []);
  assert.equal(compareRentOwn(base()).years.length, 7);
});

test('with a free home and no growth, owning loses exactly the costs paid', () => {
  // No loan, no costs but selling, flat value, no investment return, rent 0.01: renting keeps the cash.
  const v = { ...base(), down: 100, rate: 0, closing: 0, tax: 0, insurance: 0, maintenance: 0, growth: 0, selling: 10, investment: 0, rent: 1, rentGrowth: 0, renterInsurance: 0, years: 2, price: 120000 };
  const r = compareRentOwn(v);
  // Owning costs nothing, so the owner invests the 24 of rent saved.
  near(r.final.pureOwn, 108000);
  near(r.final.own, 108024);
  near(r.final.rent, 120000);
  assert.equal(r.breakEven, null);
});

test('a loan is repaid over its term and the owner net worth is equity after selling costs', () => {
  const v = { ...base(), years: 30, term: 30, growth: 0, selling: 0 };
  const r = compareRentOwn(v);
  near(r.final.pureOwn, v.price, 1);
});

test('when owning costs less, the owner invests the difference and the equal-cash Own includes it', () => {
  const v = { ...base(), rent: 9000, years: 10, down: 70, tax: 0.5 };
  const r = compareRentOwn(v);
  assert.ok(r.firstOwnMonthly < r.firstRentMonthly);
  assert.ok(r.final.own > r.final.pureOwn);
  // The pure view still compares the home equity alone.
  near(r.final.pureDifference, r.final.pureOwn - r.final.pureRent);
  near(r.final.difference, r.final.own - r.final.rent);
});

test('break-even is the first year after which owning stays ahead', () => {
  const v = { ...base(), years: 15 };
  const r = compareRentOwn(v);
  const after = r.years.filter((y) => y.year >= r.breakEven);
  assert.ok(after.every((y) => y.difference >= 0));
  if (r.breakEven > 1) assert.ok(r.years[r.breakEven - 2].difference < 0);
});

test('invalid and out of range values are reported by label', () => {
  assert.deepEqual(invalidRentOwn({ ...base(), price: NaN, years: 0 }), ['Home price', 'Years you will stay']);
  assert.deepEqual(invalidRentOwn({ ...base(), term: 2.5 }), ['Loan term']);
});

test('T0: the expected case has renting ahead by about $12,002 after 7 years (after investment tax)', () => {
  const exp = compareScenarios({ ...base(), deposit: 0 })[1];
  assert.ok(Math.abs(exp.difference + 12002) < 50, String(exp.difference));
});

test('monthly break-even is the same rule as the yearly one, evaluated month by month', () => {
  const r = compareRentOwn({ ...base(), years: 15 });
  assert.ok(r.breakEvenMonth != null);
  // It falls inside the break-even year, after the last year-end that trailed.
  assert.equal(Math.ceil(r.breakEvenMonth / 12), r.breakEven);
  assert.ok(r.breakEvenMonth > (r.breakEven - 1) * 12 || r.breakEven === 1);
  // A shorter stay changes only where the run ends, so the crossing month is unchanged while the stay still contains it.
  assert.equal(compareRentOwn({ ...base(), years: r.breakEven }).breakEvenMonth, r.breakEvenMonth);
  assert.equal(compareRentOwn({ ...base(), years: 1, growth: 0 }).breakEvenMonth, null);
  assert.ok(r.pureBreakEvenMonth == null || Math.ceil(r.pureBreakEvenMonth / 12) === r.pureBreakEven);
});

test('durationText writes months as years and months', () => {
  assert.equal(durationText(71), '5 years 11 months');
  assert.equal(durationText(12), '1 year');
  assert.equal(durationText(13), '1 year 1 month');
  assert.equal(durationText(5), '5 months');
});

// Full inputs are stated; every other field is the default (6.5%, 30 years, 1.1% tax, 3% growth, 5% investment).
const breakEvenCases = [
  ['T0 ($450,000, 20% down, $2,300 rent, 7-year stay)', { price: 450000, down: 20, rent: 2300, years: 7 }, 104, 2415],
  ['T-NW ($400,000, 10% down, 7.5%, $2,300 rent, 4-year stay)', { price: 400000, down: 10, rate: 7.5, rent: 2300, years: 4 }, 136, 3020],
  ['T-Z ($300,000, 5% down, $1,800 rent, 7-year stay)', { price: 300000, down: 5, rent: 1800 }, 81, 1780],
];
for (const [name, inputs, months, equivalent] of breakEvenCases) {
  test(`break-even ${name} is pinned and does not move with the stay`, () => {
    const v = { ...rentOwnDefaults(), investDrag: 0.7, deposit: 0, ...inputs };
    assert.equal(compareRentOwn(v).chartBreakEvenMonth, months);
    assert.equal(compareRentOwn({ ...v, years: 30 }).chartBreakEvenMonth, months);
    assert.equal(Math.round(equivalentRent(v)), equivalent);
    assert.match(headlineCard(buildContext(v, 'future')), new RegExp(`Buying wins if you stay at least ${durationText(months)}\\.`));
  });
}

test('the headline says renting wins at every stay when owning never catches up', () => {
  const v = { ...rentOwnDefaults(), rent: 1 };
  assert.equal(compareRentOwn(v).chartBreakEvenMonth, null);
  assert.match(headlineCard(buildContext(v, 'future')), /Renting wins at every stay up to 30 years on these numbers\./);
  assert.match(headlineCard(buildContext({ ...v, years: 30 }, 'future')), /Renting wins at every stay up to 30 years/);
});

test('equivalentRent leaves renting and owning level at the stay', () => {
  const v = rentOwnDefaults();
  assert.ok(Math.abs(compareRentOwn({ ...v, rent: equivalentRent(v) }).final.difference) < 1);
});

test('the tax benefit counts only deductions above the standard deduction', () => {
  // Joint, year 1: interest ~$23,300 + property tax $4,950 stays under the $32,200 standard deduction.
  assert.equal(compareRentOwn(base()).firstTaxBenefit, 0);
  const single = compareRentOwn({ ...base(), filing: 1 });
  assert.ok(single.firstTaxBenefit > 0);
  assert.ok(single.firstTaxBenefit < 0.22 * (23400 + 4950));
  assert.equal(single.years[0].taxBenefit, single.firstTaxBenefit);
});

test('a zero rate, or taking the standard deduction, gives no benefit', () => {
  const withTax = compareRentOwn({ ...base(), filing: 1 }).final.difference;
  for (const off of [{ marginalTaxRate: 0 }, { itemize: 0 }]) {
    const r = compareRentOwn({ ...base(), filing: 1, ...off });
    assert.equal(r.firstTaxBenefit, 0);
    assert.ok(r.final.difference < withTax);
  }
});

test('the SALT cap limits the property tax deduction', () => {
  const capped = compareRentOwn({ ...base(), price: 3000000, tax: 3, filing: 1 }).firstTaxBenefit;
  assert.ok(capped < 0.22 * (2400000 * 0.065 + 40000));
});
