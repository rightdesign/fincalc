import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareRentOwn, rentOwnDefaults } from '../site/rentown.js';
import { buildContext } from '../site/rentown/context.js';
import { chartCard, TABLE_COLUMNS, tableRows } from '../site/rentown/chart.js';
import { tableCsv } from '../site/export.js';
import { money } from '../site/rentown/format.js';

const v = { ...rentOwnDefaults(), years: 8 };

test('the CSV has the columns shown and one line per year of the stay', () => {
  const r = compareRentOwn(v);
  const lines = tableCsv({ columns: TABLE_COLUMNS, rows: tableRows(r, false) }).trimEnd().split('\r\n');
  assert.equal(lines[0], 'Year,Own (equal-cash),Rent (equal-cash),Difference (equal-cash),Own (pure),Rent (pure),Difference (pure)');
  assert.equal(lines.length, 9);
  assert.ok(!lines.join('').includes('$'));
});

test('the CSV numbers are the ones the table displays, in either dollars basis', () => {
  for (const basis of ['future', 'today']) {
    const ctx = buildContext(v, basis);
    const html = chartCard(ctx);
    for (const row of tableRows(ctx.r, ctx.today)) {
      assert.ok(html.includes(`<td>${money(row[1])}</td><td>${money(row[2])}</td>`), `${basis} year ${row[0]}`);
    }
  }
});

test('the card carries the download button', () => {
  assert.ok(chartCard(buildContext(v, 'future')).includes('id="rentown-csv"'));
});
