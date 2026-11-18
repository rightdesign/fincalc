import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPOUND_PRESETS, compoundDefaults, decodeCompound, encodeCompound, headline, invalidCompound, simulateCompound } from '../site/compound.js';

test('worked example: $10,000 + $500/month at 7% monthly for 30 years', () => {
  const v = compoundDefaults();
  const r = simulateCompound(v);
  const closed = 10000 * (1 + 0.07 / 12) ** 360 + 500 * (((1 + 0.07 / 12) ** 360 - 1) / (0.07 / 12));
  assert.ok(Math.abs(r.futureValue - closed) < 0.01);
  assert.equal(r.contributed, 190000);
  assert.ok(Math.abs(r.futureValue - 691000) < 1000);
  assert.ok(Math.abs(r.interest - 501000) < 1000);
  assert.equal(r.years.length, 30);
  assert.match(headline(v, r), /^After 30 years, your \$190,000 becomes about \$691,000 — about \$501,000 of it is interest\.$/);
});

test('zero return grows only by contributions; zero everything is zero', () => {
  const r = simulateCompound({ start: 1000, monthly: 100, rate: 0, years: 2, frequency: 'monthly' });
  assert.equal(r.futureValue, 3400);
  assert.equal(r.interest, 0);
  assert.equal(simulateCompound({ start: 0, monthly: 0, rate: 5, years: 3, frequency: 'annually' }).futureValue, 0);
});

test('annual compounding of a lump sum is balance x (1 + rate)^years', () => {
  const r = simulateCompound({ start: 1000, monthly: 0, rate: 10, years: 3, frequency: 'annually' });
  assert.ok(Math.abs(r.futureValue - 1331) < 1e-9);
});

test('annual compounding gives simple interest on contributions made within the year', () => {
  const r = simulateCompound({ start: 0, monthly: 100, rate: 12, years: 1, frequency: 'annually' });
  assert.ok(Math.abs(r.futureValue - (1200 + 100 * 0.12 * (66 / 12))) < 1e-9);
});

test('encode keeps only changed values and round-trips; bad input falls back to defaults', () => {
  const d = compoundDefaults();
  assert.equal(encodeCompound(d), '');
  const v = { ...d, monthly: 250, frequency: 'annually' };
  assert.deepEqual(decodeCompound(encodeCompound(v)), v);
  assert.deepEqual(decodeCompound('#years=abc&frequency=daily&rate=-3'), d);
  assert.deepEqual(decodeCompound(''), d);
});

test('validation and presets', () => {
  assert.deepEqual(invalidCompound(compoundDefaults()), []);
  assert.deepEqual(invalidCompound({ ...compoundDefaults(), years: 2.5, rate: NaN }), ['Annual return (%)', 'Years']);
  for (const p of COMPOUND_PRESETS) assert.deepEqual(invalidCompound(p.values), [], p.id);
});
