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

test('thresholds echo the entered values exactly, not rounded', () => {
  const t = Object.fromEntries(rentOwnThresholds({ ...base(), maintenance: 0.25, rate: 7.32 }).map((x) => [x.id, x]));
  assert.match(t.maintenance.text, /\(you entered 0\.25%\)\.$/);
  assert.match(t.rate.text, /\(you entered 7\.32%\)\.$/);
});

test('thresholds keep a computed entry (maintenance converted from dollars) readable', () => {
  const t = Object.fromEntries(rentOwnThresholds({ ...base(), maintenance: 0.4540540540540541 }).map((x) => [x.id, x]));
  assert.match(t.maintenance.text, /\(you entered 0\.454%\)\.$/);
});
