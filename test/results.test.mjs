import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildResults, formatMoney, lineChartSvg, tableHtml } from '../site/results.js';
import { defaultValues } from '../site/inputs.js';

test('formats money without cents and without negative zero', () => {
  assert.equal(formatMoney(1234.6), '$1,235');
  assert.equal(formatMoney(-0.2), '$0');
  assert.equal(formatMoney(-5000), '-$5,000');
});

test('builds the three sections with a table row per year', () => {
  const v = defaultValues();
  const { sections } = buildResults(v);
  assert.deepEqual(sections.map((s) => s.id), ['net-worth', 'cash-flow', 'investable-cash']);
  assert.equal(sections[0].rows.length, v.horizon + 1);
  assert.equal(sections[1].rows.length, v.horizon);
  for (const s of sections) for (const r of s.rows) assert.equal(r.length, s.columns.length);
});

test('the net worth summary and marker call out the breakeven year', () => {
  const { breakevenYear, sections } = buildResults(defaultValues());
  const nw = sections[0];
  assert.equal(nw.markerX, breakevenYear);
  if (breakevenYear == null) assert.match(nw.summary, /does not catch up/);
  else assert.ok(nw.summary.includes(breakevenYear === 0 ? 'day one' : `year ${breakevenYear}`));
});

test('charts are SVG with one path per series; tables escape text', () => {
  const nw = buildResults(defaultValues()).sections[0];
  const svg = lineChartSvg(nw);
  assert.ok(svg.startsWith('<svg'));
  assert.equal(svg.match(/<path /g).length, nw.series.length);
  assert.equal(lineChartSvg({ title: 't', series: [], markerX: null }), '');
  const html = tableHtml({ title: 'A<b>', columns: ['Year'], rows: [['1']] });
  assert.ok(html.includes('A&lt;b&gt;'));
});
