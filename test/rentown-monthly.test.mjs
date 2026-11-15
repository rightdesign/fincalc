import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareRentOwn, rentOwnDefaults } from '../site/rentown.js';

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const base = () => rentOwnDefaults();

test('monthly breakdown: year 1 components sum to the monthly cost and principal is split out', () => {
  const r = compareRentOwn(base());
  const m = r.monthly[0];
  assert.equal(r.monthly.length, 7);
  near(m.ownTotal, r.firstOwnMonthly);
  near(m.ownTotal, 3194, 1);
  assert.ok(m.interest > 1940 && m.interest < 1960);
  assert.ok(m.principal > 320 && m.principal < 330);
  near(m.interest + m.principal, 2275.3, 0.5);
  near(m.ownCost, m.ownTotal - m.principal);
  near(m.rentTotal, r.firstRentMonthly);
  near(m.rent, 2300);
  assert.ok(r.monthly[6].principal > m.principal && r.monthly[6].interest < m.interest);
});
