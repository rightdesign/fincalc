import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RENTOWN_PRESETS, matchRentOwnPreset, compareRentOwn, rentOwnDefaults } from '../site/rentown.js';

const base = () => rentOwnDefaults();

test('presets set the five settings together and are recognised again', () => {
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
