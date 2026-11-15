import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareRentOwn, rentOwnThresholds, rentOwnDefaults } from '../site/rentown.js';

const base = () => rentOwnDefaults();

test('thresholds flip the verdict at the default scenario', () => {
  const v = base();
  const t = Object.fromEntries(rentOwnThresholds(v).map((x) => [x.id, x]));
  assert.ok(t.growth.flip > 3);
  assert.ok(t.rentGrowth.flip > 3); // faster rent growth favors owning, so the flip is above the entered 3%
  assert.match(t.growth.text, /^Owning wins if home value growth is above /);
  for (const x of Object.values(t)) {
    if (x.flip == null) continue;
    assert.ok(Math.abs(compareRentOwn({ ...v, [x.id]: x.flip }).final.difference) < 500, x.id);
  }
});
