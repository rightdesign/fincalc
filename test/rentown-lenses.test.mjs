import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareRentOwn, rentOwnDefaults } from '../site/rentown.js';
import { rentOwnChart } from '../site/rentown-chart.js';

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const base = () => rentOwnDefaults();

test('the pure renter only grows the starting cash; equal-cash adds the invested monthly savings', () => {
  const v = { ...base(), years: 7, investDrag: 0, capGains: 0, deposit: 0 };
  const r = compareRentOwn(v);
  const start = v.price * (v.down / 100 + v.closing / 100);
  near(r.final.pureRent, start * (1 + v.investment / 100) ** v.years, 0.5);
  // Owning costs more than rent every year here, so the renter invests a surplus.
  assert.ok(r.firstOwnMonthly > r.firstRentMonthly);
  for (const y of r.years) {
    assert.ok(y.rent > y.pureRent);
    near(y.difference, y.own - y.rent);
    near(y.pureDifference, y.own - y.pureRent);
  }
});

test('the pure renter pays the same tax drag and capital gains tax as the equal-cash renter', () => {
  const v = { ...base(), years: 7 };
  const untaxed = compareRentOwn({ ...v, investDrag: 0, capGains: 0 }).final.pureRent;
  const r = compareRentOwn(v);
  assert.ok(r.final.pureRent < untaxed);
  assert.ok(r.final.pureRent > v.price * (v.down / 100 + v.closing / 100));
  near(r.finalReal.pureRent, r.final.pureRent / (1 + v.inflation / 100) ** v.years);
  near(r.finalReal.pureDifference, r.finalReal.own - r.finalReal.pureRent);
});

test('with identical monthly costs the two lenses agree', () => {
  const v = { ...base(), down: 100, rate: 0, closing: 0, tax: 0, insurance: 0, maintenance: 0, rent: 0, rentGrowth: 0, renterInsurance: 0, years: 3 };
  const r = compareRentOwn(v);
  near(r.final.rent, r.final.pureRent, 0.05);
});

test('the chart draws the pure renter line when the years carry it', () => {
  const years = compareRentOwn(base()).years;
  assert.ok(rentOwnChart(years, null, String).svg.includes('Rent (pure)'));
});
