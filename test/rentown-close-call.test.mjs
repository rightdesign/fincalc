import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rentOwnDefaults } from '../site/rentown.js';
import { isCloseCall } from '../site/rentown/headline.js';
import { renderCards } from '../site/rentown/cards.js';
import { buildContext } from '../site/rentown/context.js';

test('band: under $5,000, or under 5% of the larger side', () => {
  assert.ok(isCloseCall({ difference: 4999, own: 100000, rent: 95001 }));
  assert.ok(!isCloseCall({ difference: 5001, own: 100000, rent: 94999 }));
  assert.ok(isCloseCall({ difference: -20000, own: 400000, rent: 420000 }));
  assert.ok(!isCloseCall({ difference: -30000, own: 400000, rent: 430000 }));
});

test('defaults are a clear call: headline names the winner', () => {
  const html = renderCards(buildContext(rentOwnDefaults(), 'future'));
  assert.doesNotMatch(html, /Too close to call/);
  assert.match(html, /leaves you about \$[\d,]+ ahead/);
});

test('a near-tie reads too close to call', () => {
  const v = rentOwnDefaults();
  let found;
  for (let p = 200000; p <= 1500000; p += 5000) {
    const html = renderCards(buildContext({ ...v, price: p }, 'future'));
    if (/Too close to call/.test(html)) { found = html; break; }
  }
  assert.ok(found, 'some price lands in the band');
  assert.match(found, /apart after/);
});
