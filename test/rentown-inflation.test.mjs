import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareRentOwn, rentOwnDefaults } from '../site/rentown.js';

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
// Pinned numbers were recorded with the old 0.7% tax drag default (FINC-186 lowered it to 0.4%).
const base = () => ({ ...rentOwnDefaults(), investDrag: 0.7 });

test("inflation defaults to 2.5% and today's dollars shrink the gap", () => {
  assert.equal(rentOwnDefaults().inflation, 2.5);
  const r = compareRentOwn({ ...base(), deposit: 0 });
  near(r.final.difference, -12002, 1);
  assert.ok(Math.abs(r.finalReal.difference) < Math.abs(r.final.difference));
  near(r.finalReal.difference, r.final.difference / 1.025 ** 7);
});

test('at 0% inflation the two bases agree', () => {
  const r = compareRentOwn({ ...base(), inflation: 0 });
  assert.deepEqual(r.real, r.years);
});
