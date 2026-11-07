import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildResults, cardHtml, cardText, chartHtml, formatMoney, hoverPoints, lineChartSvg, tableHtml } from '../site/results.js';
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

test('hover points snap to each year and reuse the table cells', () => {
  const { sections } = buildResults(defaultValues());
  for (const s of sections) {
    const pts = hoverPoints(s);
    assert.equal(pts.length, s.rows.length);
    assert.equal(pts[0].year, Number(s.rows[0][0]));
    assert.equal(pts[0].items.length, s.series.length);
    assert.equal(pts[0].items[0].value, s.rows[0][s.tipCols[0]]);
  }
  const [nw, cf, inc] = sections;
  assert.equal(hoverPoints(nw)[3].extra.label, 'Sell minus stay');
  assert.equal(hoverPoints(nw)[3].extra.value, nw.rows[3][3]);
  assert.equal(hoverPoints(cf)[0].extra, null);
  assert.equal(hoverPoints(inc)[0].items[0].value, inc.rows[0][3]);
  assert.equal(hoverPoints({ series: [] }).length, 0);
});

test('card and chart markup carry the values, escaped, with a ring per series', () => {
  const nw = buildResults(defaultValues()).sections[0];
  const p = hoverPoints(nw)[2];
  assert.match(cardHtml(p), /Year 2/);
  assert.ok(cardHtml(p).includes(p.items[0].value));
  assert.match(cardText(p), /^Year 2: Stay \(home equity\) /);
  const html = chartHtml(nw);
  assert.match(html, /tabindex="0"/);
  assert.equal(html.match(/class="ring"/g).length, nw.series.length);
  assert.equal(chartHtml({ title: 't', series: [], markerX: null }), '');
});

test("today's dollars option shrinks future amounts and is labelled", () => {
  const v = { ...defaultValues(), horizon: 10 };
  const nominal = buildResults(v);
  const real = buildResults({ ...v, todaysDollars: 'real', inflation: 3 });
  assert.equal(real.breakevenYear, nominal.breakevenYear);
  assert.equal(real.sections[0].rows[0][1], nominal.sections[0].rows[0][1]);
  assert.notEqual(real.sections[0].rows[10][1], nominal.sections[0].rows[10][1]);
  assert.ok(real.sections.every((s) => s.summary.includes("today's dollars")));
  assert.ok(nominal.sections.every((s) => !s.summary.includes("today's dollars")));
});
