import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RENTOWN_PRESETS, matchRentOwnPreset, compareRentOwn, rentOwnDefaults } from '../site/rentown.js';

const base = () => rentOwnDefaults();

test('presets set their settings together and are recognised again', () => {
  for (const p of RENTOWN_PRESETS) {
    const v = { ...base(), ...p.values };
    assert.equal(matchRentOwnPreset(v), p);
    assert.equal(matchRentOwnPreset({ ...v, down: v.down + 1 }), null);
  }
});

test('the default inputs are the 20% down preset and 10% down changes the headline', () => {
  assert.equal(matchRentOwnPreset(base()).id, 'down20');
  const ftb = { ...base(), ...RENTOWN_PRESETS.find((p) => p.id === 'ftb10').values };
  assert.equal(ftb.down, 10);
  assert.ok(compareRentOwn(ftb).firstPmi > 0);
  assert.notEqual(compareRentOwn(ftb).final.difference, compareRentOwn(base()).final.difference);
});

test('return presets fill the investment return and tax drag, and the defaults stay put', async () => {
  const { RETURN_PRESETS } = await import('../site/rentown.js');
  assert.deepEqual(RETURN_PRESETS.map((p) => p.investment), [10, 8, 6, 4]);
  assert.equal(base().investment, 5);
  assert.equal(base().investDrag, 0.4);
  for (const p of RETURN_PRESETS) {
    const r = compareRentOwn({ ...base(), investment: p.investment, investDrag: p.investDrag });
    assert.ok(Number.isFinite(r.final.difference));
  }
});

test('presets never touch the mortgage rate', () => {
  for (const p of RENTOWN_PRESETS) assert.equal('rate' in p.values, false);
  const custom = { ...base(), rate: 8.25 };
  const applied = { ...custom, ...RENTOWN_PRESETS.find((p) => p.id === 'ftb3').values };
  assert.equal(applied.rate, 8.25);
  assert.equal(matchRentOwnPreset({ ...base(), rate: 8.25 }).id, 'down20');
});
