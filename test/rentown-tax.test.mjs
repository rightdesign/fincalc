import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareRentOwn, rentOwnDefaults, taxBenefit } from '../site/rentown.js';

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
// Written for a single filer's $250,000 exclusion; the app default is now married filing jointly ($500,000).
const base = () => ({ ...rentOwnDefaults(), exclusion: 250000, investDrag: 0.7 });

test('taxing the renter\'s investments narrows the renting lead', () => {
  const lead = (extra) => -compareRentOwn({ ...base(), ...extra }).final.difference;
  const untaxed = lead({ investDrag: 0, capGains: 0 });
  assert.ok(lead({ investDrag: 1, capGains: 0 }) < untaxed);
  assert.ok(lead({ investDrag: 0, capGains: 15 }) < untaxed);
});

test('with no investment return there is no investment tax', () => {
  const r = compareRentOwn({ ...base(), investment: 0, investDrag: 1, capGains: 50 });
  const none = compareRentOwn({ ...base(), investment: 0, investDrag: 0, capGains: 0 });
  near(r.final.dragPaid, 0);
  near(r.final.saleTax, 0);
  near(r.final.difference, none.final.difference);
  near(compareRentOwn({ ...base(), investment: 0 }).afterTaxReturn, 0);
});

test('tax on investments is reported and the after-tax return shows the drag', () => {
  const r = compareRentOwn(base());
  assert.ok(r.final.dragPaid > 0 && r.final.saleTax > 0);
  near(r.afterTaxReturn, 4.3, 1e-9);
});

test('assessed growth left blank or equal to home growth changes nothing', () => {
  const plain = compareRentOwn(base());
  near(compareRentOwn({ ...base(), assessed: 3 }).final.difference, plain.final.difference, 1e-6);
  assert.deepEqual(compareRentOwn({ ...base(), assessed: null }).final, plain.final);
});

test('a 2% assessment cap lowers property tax and favors owning', () => {
  const v = { ...base(), years: 30 };
  const plain = compareRentOwn(v);
  const capped = compareRentOwn({ ...v, assessed: 2 });
  const tax = (r) => r.monthly[29].tax * 12;
  // Year 30's tax runs on the value at the start of that year (29 years of growth).
  near(tax(plain), 450000 * 1.03 ** 29 * 0.011, 1);
  near(tax(capped), 450000 * 1.02 ** 29 * 0.011, 1);
  assert.ok(capped.final.difference > plain.final.difference);
  assert.ok(capped.waterfall.recurring.tax < plain.waterfall.recurring.tax);
});

test('an assessment cap above the home growth never raises property tax', () => {
  const v = { ...base(), growth: 0, years: 10 };
  const plain = compareRentOwn(v);
  const capped = compareRentOwn({ ...v, assessed: 5 });
  near(capped.monthly[9].tax, plain.monthly[9].tax, 1e-6);
  assert.ok(capped.waterfall.recurring.tax <= plain.waterfall.recurring.tax + 1e-6);
});

test('assessed growth is optional, range-checked and kept in the link', async () => {
  const { invalidRentOwn, encodeRentOwn, decodeRentOwn, RENTOWN_TAX_CAPS } = await import('../site/rentown.js');
  assert.deepEqual(invalidRentOwn(base()), []);
  assert.equal(invalidRentOwn({ ...base(), assessed: 99 }).length, 1);
  assert.equal(encodeRentOwn(base()).includes('assessed'), false);
  assert.equal(decodeRentOwn(encodeRentOwn({ ...base(), assessed: 2 })).assessed, 2);
  assert.deepEqual(RENTOWN_TAX_CAPS.map((c) => c.values.assessed), [2, 3]);
});

test('the home sale is taxed above the primary-residence exclusion', () => {
  const none = { ...base(), exclusion: 1e9 };
  // T0 defaults: the gain sits inside the exclusion, so nothing changes.
  const t0 = compareRentOwn(base());
  near(t0.final.homeTax, 0);
  near(t0.final.difference, compareRentOwn(none).final.difference);
  // 15 years at 5% growth: gain $415,888, single owes 15% of the excess over $250,000.
  const long = { ...base(), years: 15, growth: 5 };
  near(compareRentOwn(long).final.homeTax, 24883, 1);
  near(compareRentOwn({ ...long, exclusion: 500000 }).final.homeTax, 0);
  near(compareRentOwn(long).final.difference, compareRentOwn({ ...long, exclusion: 1e9 }).final.difference - 24883, 1);
});

test('the exclusion needs a two-year stay', () => {
  const r = compareRentOwn({ ...base(), years: 3, growth: 30 });
  assert.ok(r.years[0].homeTax > r.years[1].homeTax, 'year 1 sale gets no exclusion, year 2 does');
  assert.ok(r.years[1].homeTax > 0, 'a large enough gain still exceeds the exclusion');
  const noExclusion = compareRentOwn({ ...base(), years: 3, growth: 30, exclusion: 0 });
  near(r.years[0].homeTax, noExclusion.years[0].homeTax);
});

test('T0 verdict is unchanged by the home-sale tax', () => {
  const r = compareRentOwn(base());
  near(r.final.difference, compareRentOwn({ ...base(), exclusion: 1e9 }).final.difference);
  assert.equal(r.breakEven, compareRentOwn({ ...base(), exclusion: 1e9 }).breakEven);
});

test('income tax lens: joint filers at T0 get no benefit, single filers do, and 0% or the standard deduction give none', () => {
  const joint = compareRentOwn({ ...base(), marginalTaxRate: 22 });
  assert.equal(joint.firstTaxBenefit, 0);
  near(joint.final.difference, compareRentOwn({ ...base(), marginalTaxRate: 0 }).final.difference, 1e-6);
  const single = compareRentOwn({ ...base(), filing: 1 });
  near(single.firstTaxBenefit, 2684, 1);
  assert.ok(single.firstTaxBenefit < 0.22 * (23300 + 4950));
  assert.equal(single.years[0].taxBenefit, single.firstTaxBenefit);
  const none = compareRentOwn({ ...base(), filing: 1, marginalTaxRate: 0 });
  assert.equal(none.firstTaxBenefit, 0);
  assert.ok(none.final.difference < single.final.difference);
  assert.equal(compareRentOwn({ ...base(), filing: 1, itemize: 0 }).firstTaxBenefit, 0);
});

test('the SALT cap limits the property tax deduction', () => {
  const capped = compareRentOwn({ ...base(), price: 3000000, tax: 3, filing: 1 }).firstTaxBenefit;
  assert.ok(capped < 0.22 * (2400000 * 0.065 + 40000));
});

test('a renter whose deposit exceeds the cash put in owes at the mortgage rate and the debt earns no investment return', () => {
  // Owning costing more than renting is the only other way into the account, and it only adds to it.
  const debt = (extra) => compareRentOwn({ ...base(), down: 0, closing: 0, deposit: 500000, years: 20, ...extra });
  const r = debt({});
  assert.ok(r.final.rent < 0);
  assert.ok(r.years.every((y, i) => y.dragPaid >= 0 && (i === 0 || y.dragPaid >= r.years[i - 1].dragPaid)));
  near(debt({ investment: 20 }).final.rent, r.final.rent, 1e-6);
});

test('a renter is never drawn below zero by owning costing less: the owner invests the difference', () => {
  const r = compareRentOwn({ ...base(), rent: 20000, years: 20 });
  assert.ok(r.final.rent > 0);
  assert.ok(r.final.own > r.final.pureOwn);
});

test('mortgage interest is deductible only on the first $750,000 of debt', () => {
  const v = { ...rentOwnDefaults(), itemize: true, marginalTaxRate: 38, filing: 2 };
  assert.equal(taxBenefit(v, 117000, 0, 0, 1600000), (117000 * (750000 / 1600000) - 32200) * 0.38);
  assert.equal(taxBenefit(v, 40000, 0, 0, 700000), (40000 - 32200) * 0.38);
  assert.equal(taxBenefit(v, 40000, 0), (40000 - 32200) * 0.38);
});
