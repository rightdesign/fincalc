import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RENTOWN_CHECKLIST } from '../site/rentown.js';

test('the checklist has four items', () => {
  assert.equal(RENTOWN_CHECKLIST.length, 4);
});
