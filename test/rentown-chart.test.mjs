import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareRentOwn, rentOwnDefaults } from '../site/rentown.js';
import { rentOwnChart } from '../site/rentown-chart.js';

const base = () => rentOwnDefaults();

test('the chart marks the break-even year and describes itself', () => {
  const r = compareRentOwn({ ...base(), years: 15 });
  const { svg, description } = rentOwnChart(r.years, r.breakEven, (n) => `$${Math.round(n)}`);
  assert.ok(svg.includes('Break-even'));
  assert.ok(description.includes('Owning pulls ahead'));
  assert.ok(!rentOwnChart(r.years, null, String).svg.includes('Break-even'));
});

test('the chart runs past the stay to the break-even year; the table and verdict stay on the stay', () => {
  const nw = { ...base(), price: 400000, down: 10, rate: 7.5, years: 4 };
  const r = compareRentOwn(nw);
  assert.equal(r.years.length, 4);
  assert.equal(r.breakEven, null);
  assert.ok(r.chartBreakEven >= 12 && r.chartBreakEven <= 16);
  assert.equal(r.chartYears.length, r.chartBreakEven);
  const { svg, description } = rentOwnChart(r.chartYears, r.chartBreakEven, String, nw.years);
  assert.ok(svg.includes(`Break-even: year ${r.chartBreakEven}`));
  assert.ok(svg.includes('Your stay: year 4'));
  assert.ok(description.includes('plan to stay 4 years'));
});

test('with no crossover inside 30 years the chart runs 30 years and draws no break-even', () => {
  const r = compareRentOwn({ ...base(), growth: 0, investment: 7 });
  assert.equal(r.chartBreakEven, null);
  assert.equal(r.chartYears.length, 30);
  const { svg } = rentOwnChart(r.chartYears, r.chartBreakEven, String, 7);
  assert.ok(!svg.includes('Break-even'));
  assert.ok(svg.includes('Your stay: year 7'));
});

test('a stay longer than 30 years keeps the whole stay on the chart', () => {
  assert.equal(compareRentOwn({ ...base(), years: 40 }).chartYears.length, 40);
});

test('the chart in today\'s dollars is deflated and keeps the same break-even year', () => {
  const r = compareRentOwn({ ...base(), inflation: 3 });
  assert.equal(r.chartReal.length, r.chartYears.length);
  assert.ok(Math.abs(r.chartReal.at(-1).own) < Math.abs(r.chartYears.at(-1).own));
  assert.equal(r.chartReal.findIndex((y) => y.difference >= 0), r.chartYears.findIndex((y) => y.difference >= 0));
});

test('the chart marks the crossing month, not just the year', () => {
  const r = compareRentOwn({ ...base(), years: 15 });
  const { svg, description } = rentOwnChart(r.years, r.breakEven, String, 15, r.breakEvenMonth);
  const month = ((r.breakEvenMonth - 1) % 12) + 1;
  assert.ok(svg.includes(`Break-even: year ${r.breakEven}, month ${month}`));
  assert.ok(description.includes(`year ${r.breakEven}, month ${month}`));
});
