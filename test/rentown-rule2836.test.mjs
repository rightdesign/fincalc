import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  rule2836,
  compareRentOwn,
  decodeRentOwn,
  encodeRentOwn,
  invalidRentOwn,
  rentOwnDefaults,
} from '../site/rentown.js';
import { rule2836Card } from '../site/rentown/rule2836.js';

const base = () => rentOwnDefaults();

test('28/36 check is off without an income', () => {
  const r = compareRentOwn(base());
  assert.equal(rule2836(base(), r), null);
  assert.equal(rule2836Card({ v: base(), r }), '');
});

test('28/36 ratios and flags', () => {
  const v = { ...base(), income: 120000, otherDebt: 500 };
  const r = compareRentOwn(v);
  const a = rule2836(v, r);
  const m = r.monthly[0];
  const housing = m.interest + m.principal + m.tax + m.insurance + m.pmi + m.hoa;
  assert.ok(Math.abs(a.housing - housing) < 0.01);
  assert.ok(Math.abs(a.housingRatio - (housing / 10000) * 100) < 1e-9);
  assert.ok(Math.abs(a.debtRatio - ((housing + 500) / 10000) * 100) < 1e-9);
  const low = rule2836(
    { ...v, income: 1000000, otherDebt: 0 },
    compareRentOwn({ ...v, income: 1000000, otherDebt: 0 }),
  );
  assert.equal(low.housingOver, false);
  assert.equal(low.debtOver, false);
  const tight = rule2836({ ...v, income: 60000 }, compareRentOwn({ ...v, income: 60000 }));
  assert.equal(tight.housingOver, true);
  assert.equal(tight.debtOver, true);
  assert.match(rule2836Card({ v, r }), /28\/36/);
});

test('income and other debt are optional and round-trip', () => {
  assert.deepEqual(invalidRentOwn(base()), []);
  assert.deepEqual(invalidRentOwn({ ...base(), otherDebt: -1 }).length, 1);
  const v = decodeRentOwn(encodeRentOwn({ ...base(), income: 90000, otherDebt: 300 }));
  assert.equal(v.income, 90000);
  assert.equal(v.otherDebt, 300);
  assert.equal(decodeRentOwn('').income, null);
});
