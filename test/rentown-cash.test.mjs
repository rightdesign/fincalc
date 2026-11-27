import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  compareRentOwn,
  decodeRentOwn,
  encodeRentOwn,
  invalidRentOwn,
  rentOwnDefaults,
} from '../site/rentown.js';

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const base = () => rentOwnDefaults();

test('cash needed to buy: down payment, closing, moving, reserve and the shortfall', () => {
  const c = compareRentOwn(base()).cash;
  near(c.down, 90000);
  near(c.closing, 13500);
  assert.equal(c.moving, 0);
  near(c.total, 103500);
  assert.equal(c.saved, null);
  assert.equal(c.shortfall, 0);
  const short = compareRentOwn({ ...base(), saved: 60000 }).cash;
  near(short.shortfall, 43500);
  assert.ok(short.monthsToClose == null || short.monthsToClose > 0);
  const r = compareRentOwn({ ...base(), moving: 2000, reserve: 2 });
  near(r.cash.total, 105500 + 2 * r.firstOwnMonthly);
  assert.equal(compareRentOwn({ ...base(), saved: 200000 }).cash.shortfall, 0);
});

test('cash saved is optional but must be valid when given', () => {
  assert.deepEqual(invalidRentOwn(base()), []);
  assert.deepEqual(invalidRentOwn({ ...base(), saved: -1 }), ['Cash you have saved, optional']);
  assert.equal(decodeRentOwn(encodeRentOwn({ ...base(), saved: 60000 })).saved, 60000);
  assert.equal(decodeRentOwn('').saved, null);
});
