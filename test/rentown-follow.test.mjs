import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareRentOwn, followThrough, rentOwnDefaults } from '../site/rentown.js';

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const base = () => rentOwnDefaults();

test('follow-through quotes the Year-1 monthly gap, not the total spread over the stay', () => {
  const r = compareRentOwn(base());
  const f = followThrough(r);
  assert.equal(f.winner, 'rent');
  assert.equal(f.direction, 'ownCostsMore');
  near(f.monthly, 879, 1);
  assert.ok(Math.abs(f.monthly - Math.abs(r.final.difference) / 84) > 100);
});

test('follow-through when owning wins says what owning costs per month', () => {
  const v = { ...base(), price: 500000, rent: 2086, years: 7, investment: 3, growth: 5 };
  const r = compareRentOwn(v);
  const f = followThrough(r);
  assert.equal(f.winner, 'own');
  assert.equal(f.direction, 'ownCostsMore');
  near(f.monthly, r.firstOwnMonthly - r.firstRentMonthly);
});
