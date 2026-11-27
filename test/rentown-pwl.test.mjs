import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rentOwnDefaults } from '../site/rentown.js';
import { fivePercentRule, pwlCard } from '../site/rentown/pwl.js';
import { renderCards } from '../site/rentown/cards.js';
import { money } from '../site/rentown/format.js';
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
  const v = rentOwnDefaults();
  assert.ok(
    html.includes(money((v.price * (v.tax + v.maintenance + 3)) / 1200)) &&
      html.includes(money(v.rent)),
  );
  assert.ok(!html.includes('4.5%'));
  assert.ok(html.includes('ties owning and renting'));
  assert.ok(renderCards(ctx, 'monthly').includes('ro-pwl'));
});

test('the card uses the entered tax and maintenance rates and flags a disagreement with the model', () => {
  const ctx = buildContext(
    { ...rentOwnDefaults(), price: 2000000, tax: 1.1, maintenance: 0.25, rent: 9000 },
    'future',
  );
  const html = pwlCard(ctx);
  assert.ok(html.includes('1.1% of $2,000,000') && html.includes('Maintenance (0.25%'));
  assert.ok(html.includes('(4.35%)'));
  assert.ok(html.includes('your own rates') || html.includes('your rate'));
});
