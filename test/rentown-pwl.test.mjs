import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rentOwnDefaults } from '../site/rentown.js';
import { fivePercentRule, pwlCard } from '../site/rentown/pwl.js';
import { renderCards } from '../site/rentown/cards.js';
import { buildContext } from '../site/rentown/context.js';

test('5% of the price a year, split 1/1/3, divided by 12', () => {
  const f = fivePercentRule({ price: 450000, rent: 2300 });
  assert.equal(f.total, 5);
  assert.equal(f.monthly, 1875);
  assert.equal(f.tax, 375);
  assert.equal(f.maintenance, 375);
  assert.equal(f.capital, 1125);
  assert.equal(f.cheaper, 'own');
});

test('compares against rent either way', () => {
  assert.equal(fivePercentRule({ price: 450000, rent: 1500 }).cheaper, 'rent');
  assert.equal(fivePercentRule({ price: 450000, rent: 1875 }).cheaper, 'tie');
});

test('the card credits Ben Felix and PWL Capital, shows both monthly figures and sits on the monthly tab', () => {
  const ctx = buildContext(rentOwnDefaults(), 'future');
  const html = pwlCard(ctx);
  assert.ok(html.includes('Ben Felix') && html.includes('PWL Capital'));
  assert.ok(html.includes('$1,875') && html.includes('$2,300'));
  assert.ok(html.includes('4.5%'));
  assert.ok(renderCards(ctx, 'monthly').includes('ro-pwl'));
});
