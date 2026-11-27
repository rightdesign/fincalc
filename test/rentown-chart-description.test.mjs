import test from 'node:test';
import assert from 'node:assert/strict';
import { rentOwnChart } from '../site/rentown-chart.js';

const fmt = (n) => `$${n}`;

test('chart description gives each line its own clause', () => {
  const years = [
    { year: 1, own: 100, rent: 200, pureRent: 300, later: 400 },
    { year: 30, own: 110, rent: 210, pureRent: 310, later: 410 },
  ];
  const { description } = rentOwnChart(years, null, fmt, null, null);
  assert.match(description, /owning is \$100 and renting with equal cash is \$200/);
  assert.match(description, /pure net worth basis is \$300 in year 1 and \$310 in year 30/);
  assert.match(
    description,
    /renting first and buying later is \$400 in year 1 and \$410 in year 30/,
  );
  assert.doesNotMatch(description, /with equal cash, or/);
});
