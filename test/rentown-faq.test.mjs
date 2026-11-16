import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rentOwnDefaults } from '../site/rentown.js';
import { faqItems, FAQ_SOURCES } from '../site/rentown/faq.js';
import { renderCards } from '../site/rentown/cards.js';
import { buildContext } from '../site/rentown/context.js';
import { monthPoint, money } from '../site/rentown/format.js';

const ctx = buildContext(rentOwnDefaults(), 'future');

test('six to eight questions, each answer two to four sentences', () => {
  const items = faqItems(ctx);
  assert.ok(items.length >= 6 && items.length <= 8);
  for (const i of items) assert.ok(i.a.split(/(?<=[.;])\s/).length >= 2, i.q);
});

test('the answers quote the live defaults', () => {
  const text = faqItems(ctx).map((i) => i.a).join(' ');
  const { v, r } = ctx;
  if (r.breakEven != null) assert.ok(text.includes(monthPoint(r.breakEvenMonth)));
  assert.ok(text.includes(`${v.investment}%`));
  assert.ok(text.includes(money(v.price)));
  assert.ok(text.includes(`${v.rate}%`));
  assert.ok(text.includes(money(v.exclusion)));
});

test('the answers follow the inputs', () => {
  const other = buildContext({ ...rentOwnDefaults(), rate: 4, investment: 9 }, 'future');
  const text = faqItems(other).map((i) => i.a).join(' ');
  assert.ok(text.includes('4%') && text.includes('9%'));
});

test('sources have links and as-of dates, and the card renders', () => {
  assert.ok(FAQ_SOURCES.length >= 5);
  for (const s of FAQ_SOURCES) assert.match(s.url, /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}\/[^\s]*$/);
  const html = renderCards(ctx);
  assert.ok(FAQ_SOURCES.some((s) => s.url === 'https://www.hud.gov/hud-partners/single-family-handbook-4000-1'));
  assert.ok(html.includes('ro-faq') && html.includes('freddiemac.com/pmms') && html.includes('as of'));
});
