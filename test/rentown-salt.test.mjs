import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareRentOwn, rentOwnDefaults, saltCap, taxBenefit } from '../site/rentown.js';

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('the SALT cap follows the calendar year and reverts to $10,000 in 2030', () => {
  near(saltCap(0), 40400);
  near(saltCap(1), 40804);
  near(saltCap(3), 40400 * 1.01 ** 3);
  assert.equal(saltCap(4), 10000);
  assert.equal(saltCap(19), 10000);
});

test('income above the threshold phases the cap down, never below $10,000', () => {
  near(saltCap(0, 505000), 40400);
  near(saltCap(0, 605000), 40400 - 30000);
  assert.equal(saltCap(0, 5000000), 10000);
  near(saltCap(0, null), 40400);
});

test("property tax is deducted up to each year's cap", () => {
  const v = { ...rentOwnDefaults(), filing: 1, marginalTaxRate: 30, inflation: 0, itemize: 1 };
  near(taxBenefit(v, 20000, 50000, 0), (20000 + 40400 - 16100) * 0.3);
  near(taxBenefit(v, 20000, 50000, 5), (20000 + 10000 - 16100) * 0.3);
});

test('state income tax shares the cap, and the renter deducts it too', () => {
  const v = {
    ...rentOwnDefaults(),
    filing: 1,
    marginalTaxRate: 30,
    inflation: 0,
    itemize: 1,
    stateIncomeTax: 40000,
  };
  // State tax uses 40,000 of the 40,400 cap, so only $400 of property tax counts, plus the interest.
  near(taxBenefit(v, 20000, 50000, 0), (20000 + 40400 - 40000) * 0.3);
  near(taxBenefit({ ...v, itemize: 0 }, 20000, 50000, 0), 0);
});

test('the standard deduction is indexed by inflation', () => {
  const v = { ...rentOwnDefaults(), filing: 1, marginalTaxRate: 30, inflation: 10, itemize: 1 };
  near(taxBenefit(v, 20000, 0, 1), (20000 - 16100 * 1.1) * 0.3);
});

test('a long stay loses the property tax deduction after 2029', () => {
  const v = { ...rentOwnDefaults(), price: 2000000, tax: 2.5, years: 20, marginalTaxRate: 38 };
  const r = compareRentOwn(v);
  const rows = r.years.filter((y) => y.taxBenefit > 0);
  assert.ok(rows.length > 0);
  assert.ok(r.years[1].taxBenefit > r.years[10].taxBenefit);
});
