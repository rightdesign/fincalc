import assert from 'node:assert/strict';
import { test } from 'node:test';
import { incomeConflict, rentOwnDefaults, compareRentOwn } from '../site/rentown.js';
import { incomeConflictCard } from '../site/rentown/income-conflict.js';

const base = () => rentOwnDefaults();

test('no conflict unless both incomes are entered and take-home exceeds gross', () => {
  assert.equal(incomeConflict({ ...base(), income: null, takeHome: 300000 }), null);
  assert.equal(incomeConflict({ ...base(), income: 50000, takeHome: null }), null);
  assert.equal(incomeConflict({ ...base(), income: 100000, takeHome: 80000 }), null);
  assert.equal(incomeConflict({ ...base(), income: 100000, takeHome: 100000 }), null);
});

test('take-home above gross shows a warning card', () => {
  const v = { ...base(), income: 50000, takeHome: 300000 };
  assert.deepEqual(incomeConflict(v), { income: 50000, takeHome: 300000 });
  const html = incomeConflictCard({ v, r: compareRentOwn(v) });
  assert.match(html, /higher than your gross income/);
  assert.equal(incomeConflictCard({ v: { ...v, takeHome: 40000 }, r: compareRentOwn(v) }), '');
});
