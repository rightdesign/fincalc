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
    markerX: null,
  };

  const income = {
    id: 'investable-cash',
    title: 'Investable cash',
    summary: 'Income the invested net proceeds could pay out each month at the withdrawal rate.',
    columns: ['Year', 'Investment capital', 'Income (per year)', 'Income (per month)'],
    rows: years.map((r) => [String(r.year), formatMoney(r.investmentCapital), formatMoney(r.investmentIncome), formatMoney(r.monthlyInvestmentIncome)]),
    series: [series('Income (per month)', years, (r) => r.monthlyInvestmentIncome)],
    markerX: null,
  };

  return { breakevenYear, sections: [netWorth, cashFlow, income] };
}

const COLORS = ['#1b6ec2', '#c25b1b'];
const W = 480;
const H = 260;
const PAD = { l: 64, r: 12, t: 12, b: 28 };

// A self-contained SVG line chart with axes, a legend and an optional
// vertical marker (the breakeven year).
export function lineChartSvg(section) {
  const pts = section.series.flatMap((s) => s.points);
  if (!pts.length) return '';
  const xs = pts.map((p) => p.x);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(0, ...pts.map((p) => p.y));
  const yMax = Math.max(0, ...pts.map((p) => p.y)) || 1;
  const sx = (x) => PAD.l + (xMax === xMin ? 0 : ((x - xMin) / (xMax - xMin)) * (W - PAD.l - PAD.r));
  const sy = (y) => H - PAD.b - ((y - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b);
  const f = (n) => n.toFixed(1);

  let out = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escape(section.title)} chart" class="chart">`;
  for (let i = 0; i <= 4; i++) {
    const y = yMin + ((yMax - yMin) * i) / 4;
    out += `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${f(sy(y))}" y2="${f(sy(y))}" stroke="#ddd"/>`;
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
    out += `<path d="${d}" fill="none" stroke="${COLORS[i]}" stroke-width="2"/>`;
  });
  section.series.forEach((s, i) => {
    out += `<rect x="${PAD.l + 60 + i * 170}" y="${H - 22}" width="10" height="10" fill="${COLORS[i]}"/>`;
    out += `<text x="${PAD.l + 74 + i * 170}" y="${H - 13}" font-size="10">${escape(s.label)}</text>`;
  });
  return `${out}</svg>`;
}

export function tableHtml(section) {
  const head = section.columns.map((c) => `<th scope="col">${escape(c)}</th>`).join('');
  const body = section.rows.map((r) => `<tr>${r.map((c, i) => (i ? `<td>${escape(c)}</td>` : `<th scope="row">${escape(c)}</th>`)).join('')}</tr>`).join('');
  return `<table><caption>${escape(section.title)} by year</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}
