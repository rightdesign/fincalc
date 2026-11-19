import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bracketMedian } from '../scripts/update-state-insurance.mjs';

test('bracketMedian interpolates inside the bracket holding the middle household', () => {
  assert.equal(bracketMedian([0, 50, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0]), 300);
  assert.equal(bracketMedian([0, 0, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0]), 400);
  assert.equal(bracketMedian([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), null);
  assert.equal(bracketMedian([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10]), null);
});
