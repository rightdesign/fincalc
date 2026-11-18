import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rentOwnDefaults } from '../site/rentown.js';
import { renderCards, TABS } from '../site/rentown/cards.js';
import { buildContext } from '../site/rentown/context.js';

const html = (tab) => renderCards(buildContext(rentOwnDefaults(), 'future'), tab);

test('the results have a hero, three tiles and the five tabs, with only the chosen panel showing', () => {
  const h = html('table');
  assert.deepEqual(TABS.map((t) => t.label), ['Net worth', 'Monthly cost', 'Where the difference comes from', 'What moves it', 'Table']);
  assert.ok(h.indexOf('class="hero ro-headline"') < h.indexOf('class="tile-row'));
  assert.equal((h.match(/<div class="tile"/g) || []).length, 3);
  assert.equal((h.match(/role="tab"/g) || []).length, 5);
  assert.equal((h.match(/role="tabpanel"/g) || []).length, 5);
  assert.equal((h.match(/class="results-panel" hidden/g) || []).length, 4);
  assert.match(h, /id="ro-tab-table" aria-selected="true"/);
});

test('an unknown tab falls back to the first, and the renderers emit no m-* classes', () => {
  assert.match(html('nope'), /id="ro-tab-networth" aria-selected="true"/);
  assert.doesNotMatch(html(), /class="[^"]*\bm-[a-z]/);
});
