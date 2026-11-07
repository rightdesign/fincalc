// Results view models for the stay vs. sell-and-rent comparison: tables and
// SVG line charts built from the engine's projection. Pure (strings and
// plain objects, no DOM) so it runs under node.
import { downsizeFunding, inTodaysDollars, project } from './engine.js';
import { sensitivityLines } from './sensitivity.js';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
export const formatMoney = (n) => usd.format(Math.round(n) === 0 ? 0 : n);

const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Said wherever the downsize path starts with negative invested capital: the
// sale proceeds and new mortgage do not cover the new home, buying and moving
// costs, and the model draws the rest from other savings.
export function shortfallNotice(shortfall) {
  if (!(shortfall > 0.5)) return '';
  return `Shortfall of ${formatMoney(shortfall)} \u2014 increase the new mortgage, or it will be drawn from other savings.`;
}

// One path's standing against staying: when it pulls ahead (if ever), the
// gap at the horizon and how it is moving, and the year it came closest.
// `rows` hold each path's net worth minus staying, so a positive gap is ahead.
function gapNote(subject, short, rows, gap, crossYear) {
  const years = rows.slice(1);
  if (!years.length) return '';
  const end = years[years.length - 1];
  const endGap = gap(end);
  const side = (g) => `${formatMoney(Math.abs(g))} ${g >= 0 ? 'ahead of' : 'behind'} staying`;
  if (crossYear != null) return `${subject} pulls ahead of staying in year ${crossYear}; by year ${end.year} it is ${side(endGap)}.`;
  const closest = years.reduce((best, r) => (Math.abs(gap(r)) < Math.abs(gap(best)) ? r : best));
  const prev = years.length > 1 ? years[years.length - 2] : null;
  const trend = prev == null ? '' : Math.abs(endGap) < Math.abs(gap(prev)) ? ' and the gap is still narrowing' : ' and the gap is widening';
  const nearest = closest === end ? '' : ` It came closest in year ${closest.year}, ${side(gap(closest))}.`;
  return `${subject} does not catch up with staying within this time horizon. In year ${end.year}, ${short.toLowerCase()} is ${side(endGap)}${trend}.${nearest}`;
}

// Cost summary by category for the three paths over the whole horizon, plus
// headline gaps against staying. `rows` are the (possibly inflation-adjusted)
// projection rows; `factor` restates a year-0 amount in the same dollars as
// the horizon year (1 nominal).
//   Initial: selling costs, capital-gains tax, moving, rental upfront / buying costs.
//   Recurring: running housing costs (stay, downsize) or rent (sell), summed over the years.
//   Opportunity: investment return forgone on the cash left in the home (stay), or
//   home appreciation forgone (sell; downsize, net of the new home's appreciation).
//   Net proceeds: net worth at the horizon. Total is the three costs only.
function costSummary(values, projection, rows) {
  const years = rows.slice(1);
  if (!years.length) return null;
  const { sale } = projection;
  const end = years[years.length - 1];
  const first = years[0];
  const deflate = values.todaysDollars === 'real' ? (1 + values.inflation / 100) ** end.year : 1;
  const sum = (pick) => years.reduce((t, r) => t + pick(r), 0);
  const buyingCosts = values.newHomePrice * (values.newBuyingCostsPct / 100);
  const saleCosts = sale.sellingCosts + sale.taxesDue + values.movingCosts;
  const stayGrowthForgone = (sale.netProceeds * ((1 + projection.investmentGrowth) ** end.year - 1)) / deflate;
  const costs = {
    stay: { initial: 0, recurring: sum((r) => r.unrecoverableCost), opportunity: stayGrowthForgone, net: end.stayNetWorth },
    sell: { initial: saleCosts + values.rentalUpfront, recurring: sum((r) => r.rentCost), opportunity: end.homeValue - values.homeValue, net: end.investmentCapital },
    downsize: {
      initial: saleCosts + buyingCosts,
      recurring: sum((r) => r.downsizeUnrecoverableCost),
      opportunity: end.homeValue - values.homeValue - (end.downsizeHomeValue - values.newHomePrice),
      net: end.downsizeNetWorth,
    },
  };
  const paths = [costs.stay, costs.sell, costs.downsize];
  const row = (label, pick) => [label, ...paths.map((p) => formatMoney(pick(p)))];
  const gap = (name, net) => {
    const diff = net - end.stayNetWorth;
    const pct = end.stayNetWorth > 0 ? ` (${diff >= 0 ? '+' : '-'}${(Math.abs(diff / end.stayNetWorth) * 100).toFixed(1)}%)` : '';
    return `${name} ends year ${end.year} ${formatMoney(Math.abs(diff))}${pct} ${diff >= 0 ? 'ahead of' : 'behind'} staying.`;
  };
  const month = (name, own, other) => {
    const d1 = own(first) - other(first);
    const dn = own(end) - other(end);
    const fmt = (d) => `${formatMoney(Math.abs(d))} ${d >= 0 ? 'more' : 'less'}`;
    return `Staying costs ${fmt(d1)} per month than ${name} in year 1 and ${fmt(dn)} in year ${end.year}.`;
  };
  return {
    id: 'cost-summary',
    title: 'Summary of costs by category',
    headlines: [
      gap('Selling and investing', end.investmentCapital),
      gap('Downsizing', end.downsizeNetWorth),
      month('renting', (r) => r.monthlyOwnCost, (r) => r.monthlyRentCost),
      month('downsizing', (r) => r.monthlyOwnCost, (r) => r.monthlyDownsizeCost),
    ],
    columns: ['', 'Stay', 'Sell and rent', 'Downsize'],
    rows: [
      row('Initial costs', (p) => p.initial),
      row('Recurring costs', (p) => p.recurring),
      row('Opportunity costs', (p) => p.opportunity),
      row('Total costs', (p) => p.initial + p.recurring + p.opportunity),
      row(`Net proceeds (year ${end.year})`, (p) => p.net),
    ],
    note: `Amounts cover years 1 to ${end.year}. Initial costs are selling costs, capital-gains tax and moving, plus the rental's upfront cash or the new home's buying costs. Recurring costs are running housing costs (net of tax savings) or rent. Opportunity costs are the investment return forgone on the money left in your home, or the home appreciation forgone by selling. Net proceeds are net worth at the end of the horizon, after sale costs and taxes. Total costs add the first three rows only.${values.todaysDollars === 'real' ? " All amounts are in today's dollars." : ''}`,
  };
}

// Each section: title, a summary line, table (columns + rows of formatted
// cells) and chart series ({ label, points: [{ x, y }] }).
export function buildResults(values) {
  const projection = project(values);
  const { breakevenYear, downsizeBreakevenYear, downsizeShortfall } = projection;
  const rows = values.todaysDollars === 'real' ? inTodaysDollars(projection.rows, values.inflation) : projection.rows;
  const years = rows.slice(1);
  const series = (label, list, pick) => ({ label, points: list.map((r) => ({ x: r.year, y: pick(r) })) });

  const netWorth = {
    id: 'net-worth',
    title: 'Net worth',
    summary: `${gapNote('Selling and investing', 'Selling', rows, (r) => r.netWorthGainLoss, breakevenYear)} ${gapNote('Downsizing', 'Downsizing', rows, (r) => r.downsizeGainLoss, downsizeBreakevenYear)} Staying is counted as if you sold the home that year, after selling costs and capital-gains tax; downsizing counts the new home the same way, plus your investments.`,
    columns: ['Year', 'Stay (equity after sale)', 'Sell (invested)', 'Downsize (new home + invested)', 'Sell minus stay', 'Downsize minus stay'],
    rows: rows.map((r) => [String(r.year), formatMoney(r.stayNetWorth), formatMoney(r.investmentCapital), formatMoney(r.downsizeNetWorth), formatMoney(r.netWorthGainLoss), formatMoney(r.downsizeGainLoss)]),
    series: [
      series('Stay (equity after sale)', rows, (r) => r.stayNetWorth),
      series('Sell (invested)', rows, (r) => r.investmentCapital),
      series('Downsize', rows, (r) => r.downsizeNetWorth),
    ],
    tipCols: [1, 2, 3],
    tipExtra: 4,
    markerX: breakevenYear,
  };

  const cashFlow = {
    id: 'cash-flow',
    title: 'Monthly cash flow',
    summary: 'What each path costs per month: owning (property tax, insurance, maintenance, HOA dues, any major repairs, mortgage principal and interest, less any tax saved by deducting mortgage interest and property tax) vs. renting vs. owning the new, smaller home (same costs, on the new home).',
    columns: ['Year', 'Own (per month)', 'Rent (per month)', 'Downsize (per month)', 'Own minus rent'],
    rows: years.map((r) => [String(r.year), formatMoney(r.monthlyOwnCost), formatMoney(r.monthlyRentCost), formatMoney(r.monthlyDownsizeCost), formatMoney(r.monthlyOwnCost - r.monthlyRentCost)]),
    series: [
      series('Own (per month)', years, (r) => r.monthlyOwnCost),
      series('Rent (per month)', years, (r) => r.monthlyRentCost),
      series('Downsize (per month)', years, (r) => r.monthlyDownsizeCost),
    ],
    tipCols: [1, 2, 3],
    tipExtra: null,
    markerX: null,
  };

  const income = {
    id: 'investable-cash',
    title: 'Investable cash',
    summary: 'Income the invested net proceeds could pay out each month at the withdrawal rate, after any tax on withdrawals, if you sell and rent or if you downsize.'
      + (downsizeShortfall > 0.5 ? ` Downsizing starts with negative invested capital: ${shortfallNotice(downsizeShortfall)} The downsize columns assume that shortfall is drawn from other savings.` : ''),
    columns: ['Year', 'Investment capital', 'Income (per year)', 'Income (per month)', 'Downsize investment capital', 'Downsize income (per month)'],
    rows: years.map((r) => [String(r.year), formatMoney(r.investmentCapital), formatMoney(r.investmentIncome), formatMoney(r.monthlyInvestmentIncome), formatMoney(r.downsizeInvestmentCapital), formatMoney(r.monthlyDownsizeInvestmentIncome)]),
    series: [
      series('Income (per month)', years, (r) => r.monthlyInvestmentIncome),
      series(downsizeShortfall > 0.5 ? 'Downsize income (per month; starts with a savings shortfall)' : 'Downsize income (per month)', years, (r) => r.monthlyDownsizeInvestmentIncome),
    ],
    tipCols: [3, 5],
    tipExtra: null,
    markerX: null,
  };

  const sections = [netWorth, cashFlow, income];
  if (values.todaysDollars === 'real') {
    for (const sec of sections) sec.summary += " All amounts are in today's dollars.";
  }
  return { breakevenYear, sections, shortfallNotice: shortfallNotice(downsizeShortfall), costSummary: costSummary(values, projection, rows), sensitivity: sensitivityLines(values) };
}

// CSS custom properties (see styles.css), so the night theme can recolour the series.
const COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'];
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
    out += `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${f(sy(y))}" y2="${f(sy(y))}" class="grid"/>`;
    out += `<text x="${PAD.l - 6}" y="${f(sy(y) + 4)}" text-anchor="end" font-size="10">${escape(formatMoney(y))}</text>`;
  }
  out += `<text x="${PAD.l}" y="${H - 8}" font-size="10">Year ${xMin}</text>`;
  out += `<text x="${W - PAD.r}" y="${H - 8}" text-anchor="end" font-size="10">Year ${xMax}</text>`;
  if (section.markerX != null) {
    out += `<line class="marker" x1="${f(sx(section.markerX))}" x2="${f(sx(section.markerX))}" y1="${PAD.t}" y2="${H - PAD.b}"/>`;
    out += `<text x="${f(sx(section.markerX) + 4)}" y="${PAD.t + 10}" font-size="10">Breakeven: year ${section.markerX}</text>`;
  }
  section.series.forEach((s, i) => {
    const d = s.points.map((p, j) => `${j ? 'L' : 'M'}${f(sx(p.x))},${f(sy(p.y))}`).join('');
    out += `<path d="${d}" fill="none" style="stroke:${COLORS[i]}" stroke-width="2.5"/>`;
  });
  section.series.forEach((s, i) => {
    out += `<rect x="${PAD.l + i * 140}" y="${H - 22}" width="10" height="10" style="fill:${COLORS[i]}"/>`;
    out += `<text x="${PAD.l + 14 + i * 140}" y="${H - 13}" font-size="10">${escape(s.label)}</text>`;
  });
  out += `<g class="hover" style="display:none"><line class="crosshair" y1="${PAD.t}" y2="${H - PAD.b}"/>`;
  section.series.forEach((s, i) => {
    out += `<circle class="ring" r="4" style="stroke:${COLORS[i]}" stroke-width="2"/>`;
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

// A text equivalent of the chart for screen readers: the section's summary
// and, for each line, where it starts and ends and its highest and lowest
// points. The full year-by-year values are in the table below the chart.
export function chartDescription(section) {
  const fmt = (p) => `${formatMoney(p.y)} in year ${p.x}`;
  const lines = section.series.filter((s) => s.points.length).map((s) => {
    const first = s.points[0];
    const last = s.points[s.points.length - 1];
    const high = s.points.reduce((a, p) => (p.y > a.y ? p : a));
    const low = s.points.reduce((a, p) => (p.y < a.y ? p : a));
    return `${s.label}: starts at ${fmt(first)}, ends at ${fmt(last)}, highest ${fmt(high)}, lowest ${fmt(low)}.`;
  });
  const marker = section.markerX != null ? ` The breakeven year is ${section.markerX}.` : '';
  return `${section.title} line chart. ${lines.join(' ')}${marker} The full values for every year are in the table below.`;
}

// The chart plus its hover card and a live region for keyboard moves.
export function chartHtml(section) {
  const svg = lineChartSvg(section);
  if (!svg) return '';
  const id = `chart-desc-${section.id ?? 'x'}`;
  return `<div class="chart-wrap" tabindex="0" role="group" aria-label="${escape(section.title)} chart. Use the left and right arrow keys to read values by year." aria-describedby="${id}">${svg}<p class="visually-hidden" id="${id}">${escape(chartDescription(section))}</p><div class="chart-card" hidden></div><div class="visually-hidden" aria-live="polite"></div></div>`;
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

// The "what would change the answer" list under the charts.
export function sensitivityHtml(lines) {
  return `<section class="result" id="sensitivity"><h2>What drives the verdict</h2><p>The verdict compares selling and investing with staying at the end of your time horizon. For each key assumption, this is the value at which that verdict flips, holding everything else as entered.</p><ul>${lines.map((l) => `<li>${escape(l.text)}</li>`).join('')}</ul></section>`;
}

// The cost summary: headline gaps, then the category table.
export function costSummaryHtml(summary) {
  if (!summary) return '';
  const head = summary.columns.map((c) => `<th scope="col">${escape(c)}</th>`).join('');
  const body = summary.rows.map((r) => `<tr>${r.map((c, i) => (i ? `<td>${escape(c)}</td>` : `<th scope="row">${escape(c)}</th>`)).join('')}</tr>`).join('');
  return `<section class="result" id="${summary.id}"><h2>${escape(summary.title)}</h2><ul>${summary.headlines.map((h) => `<li>${escape(h)}</li>`).join('')}</ul><div class="table-wrap"><table><caption>${escape(summary.title)}</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div><p class="hint-note">${escape(summary.note)}</p></section>`;
}

// The year-0 funding of the downsize path as a list of steps (label, signed
// amount) ending in the amount invested, or the shortfall drawn from investments.
export function downsizeWaterfall(values) {
  const f = downsizeFunding(values);
  const steps = [
    { label: 'Sale price', amount: f.salePrice },
    { label: 'Selling costs', amount: -f.sellingCosts },
    { label: 'Capital gains tax', amount: -f.taxesDue },
    { label: 'Mortgage payoff', amount: -f.mortgagePayoff },
    { label: 'Net proceeds', amount: f.netProceeds, total: true },
    ...(values.useProceeds === 0 ? [] : [
      { label: 'New home price', amount: -f.newHomePrice },
      { label: 'Buying costs', amount: -f.buyingCosts },
      { label: 'New mortgage', amount: f.newMortgage },
    ]),
    { label: 'Moving costs', amount: -f.movingCosts },
  ];
  return { steps, invested: f.invested, shortfall: f.invested < 0, resultLabel: f.invested < 0 ? 'Shortfall drawn from investments' : 'Amount invested at year 0' };
}

export function downsizeWaterfallHtml(w) {
  const signed = (n) => (n < 0 ? `\u2212${formatMoney(-n)}` : formatMoney(n));
  const rows = w.steps.map((s) => `<tr${s.total ? ' class="subtotal"' : ''}><th scope="row">${escape(s.label)}</th><td>${escape(signed(s.amount))}</td></tr>`).join('');
  return `<table><caption>Where the sale money goes</caption><tbody>${rows}<tr class="total"><th scope="row">${escape(w.resultLabel)}</th><td>${escape(formatMoney(Math.abs(w.invested)))}</td></tr></tbody></table>`;
}
