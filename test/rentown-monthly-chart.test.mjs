import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareRentOwn, rentOwnDefaults } from '../site/rentown.js';
import { monthlyChart } from '../site/rentown-monthly-chart.js';

const base = () => rentOwnDefaults();

test('the monthly curve starts at the year-1 monthly costs and renting overtakes owning later', () => {
  const r = compareRentOwn(base());
  assert.equal(r.monthlyCurve.length, 360);
  assert.equal(r.monthlyCurve[0].own, r.firstOwnMonthly);
  assert.equal(r.monthlyCurve[0].rent, r.firstRentMonthly);
  assert.ok(r.monthlyCross > 1);
  const before = r.monthlyCurve[r.monthlyCross - 2];
  const at = r.monthlyCurve[r.monthlyCross - 1];
  assert.ok(before.cost > before.rent);
  assert.ok(at.cost <= at.rent);
  assert.ok(at.cost < at.own);
});

test('the monthly chart marks the crossing and describes itself', () => {
  const nw = { ...base(), years: 5 };
  const r = compareRentOwn(nw);
  const { svg, description } = monthlyChart(r.monthlyCurve, r.monthlyCross, String, nw.years, 0, 5);
  assert.ok(svg.includes('Monthly break-even'));
  assert.ok(svg.includes('Your stay: year 5'));
  assert.ok(description.includes('cheaper month to month'));
  assert.ok(description.includes('first month of year'));
  assert.ok(Math.abs(r.monthlyCurve[48].cost - r.monthly[4].ownCost) < 1e-6);
});

test('with no monthly crossover no marker is drawn', () => {
  const r = compareRentOwn({ ...base(), rentGrowth: 0 });
  const { svg, description } = monthlyChart(r.monthlyCurve, null, String, 7);
  assert.ok(!svg.includes('Monthly break-even'));
  assert.ok(description.includes('stays the dearer'));
});
