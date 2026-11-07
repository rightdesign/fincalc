import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildResults, cardHtml, cardText, chartDescription, chartHtml, costSummaryHtml, formatMoney, hoverPoints, lineChartSvg, sensitivityHtml, tableHtml } from '../site/results.js';
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
  else assert.ok(nw.summary.includes(`year ${breakevenYear}`));
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
  assert.equal(hoverPoints(nw)[3].extra.value, nw.rows[3][4]);
  assert.equal(hoverPoints(cf)[0].extra, null);
  assert.equal(hoverPoints(inc)[0].items[0].value, inc.rows[0][3]);
  assert.equal(hoverPoints({ series: [] }).length, 0);
});

test('card and chart markup carry the values, escaped, with a ring per series', () => {
  const nw = buildResults(defaultValues()).sections[0];
  const p = hoverPoints(nw)[2];
  assert.match(cardHtml(p), /Year 2/);
  assert.ok(cardHtml(p).includes(p.items[0].value));
  assert.match(cardText(p), /^Year 2: Stay \(equity after sale\) /);
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

test('builds a sensitivity list that renders as escaped HTML', () => {
  const { sensitivity } = buildResults(defaultValues());
  assert.equal(sensitivity.length, 4);
  const html = sensitivityHtml(sensitivity);
  assert.match(html, /id="sensitivity"/);
  assert.equal((html.match(/<li>/g) ?? []).length, 4);
});

test('the net worth summary always gives the gap at the horizon and the closest year', () => {
  const lag = { ...defaultValues(), investmentGrowth: 0, appreciation: 8 };
  const { breakevenYear, sections } = buildResults(lag);
  assert.equal(breakevenYear, null);
  const text = sections[0].summary;
  assert.match(text, /does not catch up/);
  assert.match(text, /behind staying/);
  assert.match(text, /narrowing|widening/);
  const win = buildResults({ ...defaultValues(), investmentGrowth: 12, appreciation: 0 });
  assert.ok(win.breakevenYear != null);
  assert.match(win.sections[0].summary, /by year \d+ it is [^ ]+ ahead of staying/);
});

test('the cost summary lists each category for the three paths and the gaps against staying', () => {
  const v = defaultValues();
  const { costSummary } = buildResults(v);
  assert.deepEqual(costSummary.rows.map((r) => r[0]).slice(0, 4), ['Initial costs', 'Recurring costs', 'Opportunity costs', 'Total costs']);
  for (const r of costSummary.rows) assert.equal(r.length, 4);
  assert.equal(costSummary.rows[0][1], '$0');
  assert.equal(costSummary.headlines.length, 4);
  assert.match(costSummary.headlines[0], /ahead of staying|behind staying/);
  assert.match(costSummary.headlines[2], /year 1 and .* in year \d+/);
  assert.match(costSummaryHtml(costSummary), /<th scope="row">Initial costs<\/th>/);
});

test('the cost summary is absent with no years and noted in today\'s dollars', () => {
  assert.equal(buildResults({ ...defaultValues(), horizon: 0 }).costSummary, null);
  assert.equal(costSummaryHtml(null), '');
  assert.match(buildResults({ ...defaultValues(), todaysDollars: 'real' }).costSummary.note, /today's dollars/);
});

test('every chart axis rescales to the visible data when the horizon shrinks', () => {
  const axisLabels = (h) => buildResults({ ...defaultValues(), horizon: h }).sections.map((s) => {
    const svg = lineChartSvg(s);
    const peak = Math.max(...s.series.flatMap((x) => x.points.map((p) => p.y)));
    return { svg, peak, xs: Math.max(...s.series.flatMap((x) => x.points.map((p) => p.x))) };
  });
  const long = axisLabels(25);
  const short = axisLabels(10);
  short.forEach((s, i) => {
    assert.ok(s.peak < long[i].peak);
    assert.notEqual(s.svg, long[i].svg);
    assert.ok(s.svg.includes(`Year ${s.xs}`));
    assert.ok(s.svg.includes(formatMoney(s.peak)), 'top y-axis label is the 10-year maximum');
    assert.ok(!s.svg.includes(formatMoney(long[i].peak)), 'old 25-year maximum is gone');
  });
});

test('each chart carries a text equivalent with every line and a pointer to its table', () => {
  const nw = buildResults(defaultValues()).sections[0];
  const html = chartHtml(nw);
  assert.match(html, /aria-describedby="chart-desc-net-worth"/);
  const text = chartDescription(nw);
  for (const s of nw.series) assert.ok(text.includes(s.label), s.label);
  assert.match(text, /starts at .* ends at .* highest .* lowest/);
  assert.match(text, /table below/);
});

test('the downsize waterfall adds up to the amount invested at year 0', async () => {
  const { downsizeWaterfall, downsizeWaterfallHtml } = await import('../site/results.js');
  const { project } = await import('../site/engine.js');
  const v = { ...defaultValues(), newMortgageAmount: 50000, movingCosts: 5000 };
  const w = downsizeWaterfall(v);
  const at = w.steps.findIndex((x) => x.label === 'Net proceeds');
  const first = w.steps.slice(0, at).reduce((t, x) => t + x.amount, 0);
  const rest = w.steps.slice(at + 1).reduce((t, x) => t + x.amount, 0);
  assert.ok(Math.abs(first - w.steps[at].amount) < 1e-6);
  assert.ok(Math.abs(w.steps[at].amount + rest - w.invested) < 1e-6);
  assert.equal(w.invested, project(v).rows[0].downsizeInvestmentCapital);
  assert.equal(w.shortfall, false);
  assert.match(downsizeWaterfallHtml(w), /Amount invested at year 0/);
});

test('the downsize waterfall reports a shortfall when the proceeds do not cover the new home', async () => {
  const { downsizeWaterfall, downsizeWaterfallHtml } = await import('../site/results.js');
  const w = downsizeWaterfall({ ...defaultValues(), newHomePrice: 900000 });
  assert.equal(w.shortfall, true);
  assert.match(downsizeWaterfallHtml(w), /Shortfall drawn from investments/);
});

test('the downsize waterfall leaves out the purchase when the proceeds are not used to buy the new home', async () => {
  const { downsizeWaterfall } = await import('../site/results.js');
  const v = { ...defaultValues(), useProceeds: 0 };
  const w = downsizeWaterfall(v);
  assert.equal(w.steps.some((s) => s.label === 'New home price'), false);
  assert.equal(w.invested, w.steps.find((s) => s.label === 'Net proceeds').amount - v.movingCosts);
});
