import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareRentOwn, rentOwnDefaults } from '../site/rentown.js';
import { renderCards } from '../site/rentown/cards.js';
import { buildContext } from '../site/rentown/context.js';

// The FINC-188 report: owning leads for a while, then sale tax and compounding investments overtake it.
const reversing = { ...rentOwnDefaults(), price: 2000000, down: 70, closing: 2, moving: 20000, takeHome: 300000, insurance: 0.14, pmi: 0, maintenance: 0.25, income: 50000, growth: 4.7, rent: 9000, renterInsurance: 1000, years: 20, waitYears: 0, selling: 6.5, exclusion: 500000, investment: 10, marginalTaxRate: 38, capGains: 30 };

test('a lead that later reverses is reported as a range, not as never', () => {
  const r = compareRentOwn(reversing);
  const ahead = r.chartYears.filter((y) => y.difference >= 0).map((y) => y.year);
  assert.ok(ahead.length > 0, 'fixture should have owning ahead for some stays');
  assert.equal(r.chartBreakEvenMonth, null);
  assert.ok(r.chartAheadSpan.startMonth > 0 && r.chartAheadSpan.endMonth > r.chartAheadSpan.startMonth);
  const html = renderCards(buildContext(reversing, 'future'));
  assert.doesNotMatch(html, /Renting wins at every stay/);
  assert.doesNotMatch(html, /Not within 30 years/);
  assert.match(html, /Buying wins only for stays of/);
});

test('no span is reported for an ordinary permanent crossover', () => {
  assert.equal(compareRentOwn(rentOwnDefaults()).chartAheadSpan?.endMonth ?? null, null);
});

test('the tornado range ends at the last whole year the Table tab shows owning ahead', () => {
  const r = compareRentOwn(reversing);
  const ahead = r.chartYears.filter((y) => y.difference >= 0).map((y) => y.year);
  const html = renderCards(buildContext(reversing, 'future'));
  assert.match(html, new RegExp(`years ${Math.min(...ahead)} to ${Math.max(...ahead)} only`));
});

test('the detail line fits a stay shorter than, inside and longer than the range', () => {
  const text = (years) => renderCards(buildContext({ ...reversing, years }, 'future'));
  assert.match(text(2), /has not yet made up/);
  assert.doesNotMatch(text(2), /behind again/);
  assert.match(text(10), /Break-even: owning pulls ahead/);
  assert.doesNotMatch(text(10), /behind again/);
  assert.match(text(25), /behind again/);
});

test('the lenses card and chart description use the range, not "does not catch up"', () => {
  const html = renderCards(buildContext(reversing, 'future'));
  // The equal-cash lens and the chart description use the range; only the pure net worth lens, which really never catches up, keeps the old wording.
  assert.equal(html.match(/does not catch up/g).length, 1);
  assert.match(html, /Owning is ahead only for stays of [^<]*to[^<]*\./);
});
