import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { decodeRentOwn, longDate, parseLiveRate, rentOwnDefaults } from '../site/rentown.js';
import { latestObservation } from '../scripts/update-rate.mjs';

const good = { rate: 7.32, week: '2026-10-22', updated: '2026-11-15', source: 'Freddie Mac survey', url: 'https://www.freddiemac.com/pmms' };

test('the shipped data file is usable', () => {
  const data = JSON.parse(readFileSync(new URL('../site/data/rates.json', import.meta.url), 'utf8'));
  assert.ok(parseLiveRate(data));
});

test('a good record parses and bad ones are refused', () => {
  assert.equal(parseLiveRate(good).rate, 7.32);
  for (const bad of [null, 'x', { ...good, rate: '7.3' }, { ...good, rate: -1 }, { ...good, rate: 99 }, { ...good, week: 'Oct 22' }, { ...good, url: 'javascript:alert(1)' }]) {
    assert.equal(parseLiveRate(bad), null);
  }
});

test('dates read the same in every time zone', () => {
  assert.equal(longDate('2026-10-22'), 'Oct 22, 2026');
});

test('the survey rate is the default and an address value still wins', () => {
  assert.equal(rentOwnDefaults().rate, 6.5);
  assert.equal(decodeRentOwn('rate=5.5').rate, 5.5);
});

test('the newest numeric FRED row is used', () => {
  const csv = 'observation_date,MORTGAGE30US\n2026-10-15,7.1\n2026-10-22,7.32\n2026-10-29,.\n';
  assert.deepEqual(latestObservation(csv), { week: '2026-10-22', rate: 7.32 });
  assert.equal(latestObservation('observation_date,MORTGAGE30US\n'), null);
});
