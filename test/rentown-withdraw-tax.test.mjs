import test from 'node:test';
import assert from 'node:assert/strict';
import { withdraw } from '../site/rentown.js';

test('a withdrawal sells extra to pay the tax on the gain it realizes', () => {
  // $2M with $1M basis: half is gain, so 30% tax takes 15% of each dollar sold.
  const r = withdraw(2e6, 1e6, 850000, 0.3);
  assert.ok(Math.abs(r.portfolio - 1e6) < 1e-6);
  assert.ok(Math.abs(r.basis - 0.5e6) < 1e-6);
});

test('no tax in the paper view, and no gain means no tax', () => {
  assert.deepEqual(withdraw(2e6, 1e6, 1e6, 0), { portfolio: 1e6, basis: 0.5e6 });
  assert.deepEqual(withdraw(1e6, 1e6, 1e5, 0.3), { portfolio: 9e5, basis: 9e5 });
});

test('running out leaves debt after tax on everything sold', () => {
  const r = withdraw(100, 0, 100, 0.5);
  assert.equal(r.portfolio, -50);
  assert.equal(r.basis, 0);
});
