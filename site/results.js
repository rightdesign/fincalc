// Results view models for the stay vs. sell-and-rent comparison: tables and
// SVG line charts built from the engine's projection. Pure (strings and
// plain objects, no DOM) so it runs under node.
import { project } from './engine.js';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
export const formatMoney = (n) => usd.format(Math.round(n) === 0 ? 0 : n);

const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Each section: title, a summary line, table (columns + rows of formatted
// cells) and chart series ({ label, points: [{ x, y }] }).
export function buildResults(values) {
  const { rows, breakevenYear } = project(values);
  const years = rows.slice(1);
  const series = (label, list, pick) => ({ label, points: list.map((r) => ({ x: r.year, y: pick(r) })) });

  const netWorth = {
    id: 'net-worth',
    title: 'Net worth',
    summary: breakevenYear == null
      ? 'Selling and investing does not catch up with staying within this time horizon.'
      : breakevenYear === 0
        ? 'Selling and investing is ahead from day one.'
        : `Selling and investing pulls ahead in year ${breakevenYear}.`,
    columns: ['Year', 'Stay (home equity)', 'Sell (invested)', 'Sell minus stay'],
    rows: rows.map((r) => [String(r.year), formatMoney(r.equity), formatMoney(r.investmentCapital), formatMoney(r.netWorthGainLoss)]),
    series: [
      series('Stay (home equity)', rows, (r) => r.equity),
      series('Sell (invested)', rows, (r) => r.investmentCapital),
    ],
    tipCols: [1, 2],
    tipExtra: 3,
    markerX: breakevenYear,
  };

  const cashFlow = {
    id: 'cash-flow',
    title: 'Monthly cash flow',
    summary: 'What each path costs per month: owning (taxes, insurance, maintenance, mortgage interest) vs. renting.',
    columns: ['Year', 'Own (per month)', 'Rent (per month)', 'Own minus rent'],
    rows: years.map((r) => [String(r.year), formatMoney(r.monthlyOwnCost), formatMoney(r.monthlyRentCost), formatMoney(r.monthlyOwnCost - r.monthlyRentCost)]),
    series: [
      series('Own (per month)', years, (r) => r.monthlyOwnCost),
      series('Rent (per month)', years, (r) => r.monthlyRentCost),
    ],
    tipCols: [1, 2],
    tipExtra: null,
    markerX: null,
  };

  const income = {
    id: 'investable-cash',
    title: 'Investable cash',
    summary: 'Income the invested net proceeds could pay out each month at the withdrawal rate.',
    columns: ['Year', 'Investment capital', 'Income (per year)', 'Income (per month)'],
    rows: years.map((r) => [String(r.year), formatMoney(r.investmentCapital), formatMoney(r.investmentIncome), formatMoney(r.monthlyInvestmentIncome)]),
    series: [series('Income (per month)', years, (r) => r.monthlyInvestmentIncome)],
    tipCols: [3],
    tipExtra: null,
    markerX: null,
  };

  return { breakevenYear, sections: [netWorth, cashFlow, income] };
}

const COLORS = ['#1b6ec2', '#c25b1b'];
const W = 480;
const H = 260;
const PAD = { l: 64, r: 12, t: 12, b: 28 };

// Chart geometry shared by the SVG and the hover model, so a ring always
// lands on its line.
function chartScale(section) {
  const pts = section.series.flatMap((s) => s.points);
  const xs = pts.map((p) => p.x);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(0, ...pts.map((p) => p.y));
  const yMax = Math.max(0, ...pts.map((p) => p.y)) || 1;
  return {
    xMin,
    xMax,
    yMin,
    yMax,
    sx: (x) => PAD.l + (xMax === xMin ? 0 : ((x - xMin) / (xMax - xMin)) * (W - PAD.l - PAD.r)),
    sy: (y) => H - PAD.b - ((y - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b),
  };
}

// A self-contained SVG line chart with axes, a legend, an optional vertical
// marker (the breakeven year) and a hidden crosshair with one ring per
// series that the page moves to the active year.
export function lineChartSvg(section) {
  if (!section.series.some((s) => s.points.length)) return '';
  const { xMin, xMax, yMin, yMax, sx, sy } = chartScale(section);
  const f = (n) => n.toFixed(1);

  let out = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escape(section.title)} chart" class="chart">`;
  for (let i = 0; i <= 4; i++) {
    const y = yMin + ((yMax - yMin) * i) / 4;
    out += `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${f(sy(y))}" y2="${f(sy(y))}" stroke="#eee"/>`;
    out += `<text x="${PAD.l - 6}" y="${f(sy(y) + 4)}" text-anchor="end" font-size="10">${escape(formatMoney(y))}</text>`;
  }
  out += `<text x="${PAD.l}" y="${H - 8}" font-size="10">Year ${xMin}</text>`;
  out += `<text x="${W - PAD.r}" y="${H - 8}" text-anchor="end" font-size="10">Year ${xMax}</text>`;
  if (section.markerX != null) {
    out += `<line class="marker" x1="${f(sx(section.markerX))}" x2="${f(sx(section.markerX))}" y1="${PAD.t}" y2="${H - PAD.b}" stroke="#555" stroke-dasharray="4 3"/>`;
    out += `<text x="${f(sx(section.markerX) + 4)}" y="${PAD.t + 10}" font-size="10">Breakeven: year ${section.markerX}</text>`;
  }
  section.series.forEach((s, i) => {
    const d = s.points.map((p, j) => `${j ? 'L' : 'M'}${f(sx(p.x))},${f(sy(p.y))}`).join('');
    out += `<path d="${d}" fill="none" stroke="${COLORS[i]}" stroke-width="2.5"/>`;
  });
  section.series.forEach((s, i) => {
    out += `<rect x="${PAD.l + 60 + i * 170}" y="${H - 22}" width="10" height="10" fill="${COLORS[i]}"/>`;
    out += `<text x="${PAD.l + 74 + i * 170}" y="${H - 13}" font-size="10">${escape(s.label)}</text>`;
  });
  out += `<g class="hover" style="display:none"><line class="crosshair" y1="${PAD.t}" y2="${H - PAD.b}" stroke="#555"/>`;
  section.series.forEach((s, i) => {
    out += `<circle class="ring" r="4" fill="#fff" stroke="${COLORS[i]}" stroke-width="2"/>`;
  });
  return `${out}</g></svg>`;
}

// One entry per year the pointer can snap to: where to draw the crosshair
// and rings (SVG units), and the card's text, taken from the table's own
// cells so the chart and table cannot disagree.
export function hoverPoints(section) {
  if (!section.series.some((s) => s.points.length)) return [];
  const { sx, sy } = chartScale(section);
  const cell = (row, col) => ({ label: section.columns[col], value: row[col] });
  return section.series[0].points.map((p, i) => {
    const row = section.rows[i];
    return {
      year: p.x,
      x: sx(p.x),
      ys: section.series.map((s) => sy(s.points[i].y)),
      items: section.tipCols.map((col, k) => ({ ...cell(row, col), label: section.series[k].label, color: COLORS[k] })),
      extra: section.tipExtra == null ? null : cell(row, section.tipExtra),
    };
  });
}

// The chart plus its hover card and a live region for keyboard moves.
export function chartHtml(section) {
  const svg = lineChartSvg(section);
  if (!svg) return '';
  return `<div class="chart-wrap" tabindex="0" role="group" aria-label="${escape(section.title)} chart. Use the left and right arrow keys to read values by year.">${svg}<div class="chart-card" hidden></div><div class="visually-hidden" aria-live="polite"></div></div>`;
}

export function cardHtml(point) {
  const rows = point.items.map((i) => `<div class="card-row"><span class="swatch" style="background:${i.color}"></span><span class="card-label">${escape(i.label)}</span><strong>${escape(i.value)}</strong></div>`).join('');
  const extra = point.extra ? `<div class="card-row card-extra"><span class="card-label">${escape(point.extra.label)}</span><strong>${escape(point.extra.value)}</strong></div>` : '';
  return `<div class="card-year">Year ${point.year}</div>${rows}${extra}`;
}

export function cardText(point) {
  return `Year ${point.year}: ${point.items.map((i) => `${i.label} ${i.value}`).join(', ')}`;
}

export function tableHtml(section) {
  const head = section.columns.map((c) => `<th scope="col">${escape(c)}</th>`).join('');
  const body = section.rows.map((r) => `<tr>${r.map((c, i) => (i ? `<td>${escape(c)}</td>` : `<th scope="row">${escape(c)}</th>`)).join('')}</tr>`).join('');
  return `<table><caption>${escape(section.title)} by year</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}
