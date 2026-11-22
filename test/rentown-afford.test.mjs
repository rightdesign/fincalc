import assert from 'node:assert/strict';
import { test } from 'node:test';
import { affordability, compareRentOwn, decodeRentOwn, encodeRentOwn, invalidRentOwn, rentOwnDefaults } from '../site/rentown.js';
import { affordCard } from '../site/rentown/afford.js';

const base = () => rentOwnDefaults();

test('no after-tax salary, no affordability check', () => {
  const v = base();
  assert.equal(affordability(v, compareRentOwn(v)), null);
  assert.equal(affordCard({ v, r: compareRentOwn(v) }), '');
});

test('housing cost as a share of after-tax pay is flagged above 33%', () => {
  const v = { ...base(), takeHome: 60000 };
  const a = affordability(v, compareRentOwn(v));
  assert.ok(Math.abs(a.share - (a.monthly / 5000) * 100) < 1e-9);
  assert.equal(a.over, true);
  assert.equal(a.months, null);
  const rich = { ...base(), takeHome: 600000 };
  assert.equal(affordability(rich, compareRentOwn(rich)).over, false);
});

test('emergency savings are turned into months of payments', () => {
  const v = { ...base(), takeHome: 120000, emergency: 30000 };
  const r = compareRentOwn(v);
  const a = affordability(v, r);
  near(a.months, 30000 / a.monthly);
  assert.equal(a.covered, a.months >= 6);
  assert.match(affordCard({ v, r }), /Job-loss stress test/);
  const rich = { ...v, emergency: 1e7 };
  assert.equal(affordability(rich, compareRentOwn(rich)).covered, true);
});

function near(a, b) { assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`); }

test('the new fields are optional, validated and kept in the link', () => {
  assert.deepEqual(invalidRentOwn(base()), []);
  assert.equal(invalidRentOwn({ ...base(), emergency: -1 }).length, 1);
  const v = decodeRentOwn(encodeRentOwn({ ...base(), takeHome: 90000, emergency: 20000 }));
  assert.equal(v.takeHome, 90000);
  assert.equal(v.emergency, 20000);
});
