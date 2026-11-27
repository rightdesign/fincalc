import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rentOwnDefaults, compareRentOwn } from '../site/rentown.js';
import { tornadoRows } from '../site/rentown/tornado.js';
import { renderCards } from '../site/rentown/cards.js';
import { buildContext } from '../site/rentown/context.js';

const v = rentOwnDefaults();

test('five inputs, sorted by swing, one marked as moving the answer most', () => {
  const rows = tornadoRows(v);
  assert.equal(rows.length, 5);
  assert.deepEqual(rows.map((r) => r.id).sort(), [
    'growth',
    'investment',
    'rate',
    'rentGrowth',
    'years',
  ]);
  assert.ok(rows[0].swing >= rows[4].swing);
  assert.equal(rows.filter((r) => r.top).length, 1);
  assert.ok(rows[0].top);
});

test('base column matches the model and low/high are computed live', () => {
  const rows = tornadoRows(v);
  const g = rows.find((r) => r.id === 'growth');
  assert.equal(g.base.gap, compareRentOwn(v).final.difference);
  assert.equal(g.high.gap, compareRentOwn({ ...v, growth: v.growth + 2 }).final.difference);
  assert.ok(g.high.gap > g.low.gap);
});

test('values are clamped to the input range', () => {
  const r = tornadoRows({ ...v, years: 1 }).find((x) => x.id === 'years');
  assert.equal(r.low.value, 1);
});

test('the card renders after the drivers card with the label', () => {
  const html = renderCards(buildContext(v, 'future'));
  assert.ok(html.indexOf('ro-drivers') < html.indexOf('ro-tornado'));
  assert.match(html, /moves the answer most/);
});
