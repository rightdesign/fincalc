import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { RENTOWN_FIELDS, compareRentOwn, decodeRentOwn, encodeRentOwn, invalidRentOwn, rentOwnDefaults } from '../site/rentown.js';
import { rentOwnChart } from '../site/rentown-chart.js';
import { CALCULATORS } from '../site/menu.js';

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const base = () => rentOwnDefaults();

test('the menu lists rent vs own second and the page exists', () => {
  assert.equal(CALCULATORS[1].href, 'rent-vs-own.html');
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
  near(r.final.own, 108000);
  near(r.final.rent, 120000 - 24);
  assert.equal(r.breakEven, null);
});

test('a loan is repaid over its term and the owner net worth is equity after selling costs', () => {
  const v = { ...base(), years: 30, term: 30, growth: 0, selling: 0 };
  const r = compareRentOwn(v);
  near(r.final.own, v.price, 1);
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

test('inputs round-trip through the URL fragment, writing only changes', () => {
  const v = { ...base(), price: 500000, rate: 5.75 };
  const text = encodeRentOwn(v);
  assert.equal(text, 'price=500000&rate=5.75');
  assert.deepEqual(decodeRentOwn(`#${text}`), v);
  assert.deepEqual(decodeRentOwn('price=abc&years=0&bogus=1'), base());
  assert.equal(RENTOWN_FIELDS.length, Object.keys(base()).length);
});

test('the chart marks the break-even year and describes itself', () => {
  const r = compareRentOwn({ ...base(), years: 15 });
  const { svg, description } = rentOwnChart(r.years, r.breakEven, (n) => `$${Math.round(n)}`);
  assert.ok(svg.includes('Break-even'));
  assert.ok(description.includes('Owning pulls ahead'));
  assert.ok(!rentOwnChart(r.years, null, String).svg.includes('Break-even'));
});

test('PMI applies below 20% down, drops off at 80% loan-to-value and moves break-even', () => {
  const nw = { ...base(), price: 400000, down: 10, rate: 7.5, years: 30 };
  const r = compareRentOwn(nw);
  near(r.firstPmi, 180);
  assert.ok(r.totalPmi > 0 && r.totalPmi < 180 * 360);
  const none = compareRentOwn({ ...nw, pmi: 0 });
  assert.equal(none.firstPmi, 0);
  assert.ok(r.firstOwnMonthly - none.firstOwnMonthly > 179.99);
  assert.ok(none.breakEven <= r.breakEven);
  assert.ok(r.final.difference < none.final.difference);
});

test('PMI is zero at 20% down', () => {
  const r = compareRentOwn(base());
  assert.equal(r.firstPmi, 0);
  assert.equal(r.totalPmi, 0);
  assert.equal(compareRentOwn({ ...base(), pmi: 0 }).final.difference, r.final.difference);
});
