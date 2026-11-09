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

// Said when the downsize path has no new mortgage: there is no payment at all,
// so the monthly cash need is the new home's carrying costs less what the
// invested proceeds can withdraw. `first` is the year-1 projection row.
export function noMortgageNotice(values, first, funding) {
  if (!(values.newMortgageAmount <= 0) || !first) return '';
  const invested = funding.invested > 0.5
    ? ` ${formatMoney(funding.invested)} stays invested after the purchase and can withdraw ${formatMoney(first.monthlyDownsizeInvestmentIncome)} a month after tax.`
    : ' Nothing is left invested after the purchase.';
  return `No mortgage payment on the new home: monthly cash you must supply in year 1 is its carrying costs only, ${formatMoney(first.monthlyDownsizeCost)} a month, or ${formatMoney(first.monthlyDownsizeOutOfPocket)} after withdrawals, against ${formatMoney(first.monthlyStayOutOfPocket)} to stay.${invested}`;
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
  const cashRow = (label, r) => [label, ...[r.monthlyStayOutOfPocket, r.monthlySellOutOfPocket, r.monthlyDownsizeOutOfPocket].map(formatMoney)];
  const totalCash = (pick) => formatMoney(sum((r) => pick(r) * 12));
  const row = (label, pick) => [label, ...paths.map((p) => formatMoney(pick(p)))];
  const gap = (name, net) => {
    const diff = net - end.stayNetWorth;
    const pct = end.stayNetWorth > 0 ? ` (${diff >= 0 ? '+' : '-'}${(Math.abs(diff / end.stayNetWorth) * 100).toFixed(1)}%)` : '';
    return `${name} ends year ${end.year} ${formatMoney(Math.abs(diff))}${pct} ${diff >= 0 ? 'ahead of' : 'behind'} staying.`;
  };
  // Same measure as the "Monthly cash you must supply" rows below: housing
  // outflows less portfolio withdrawals applied to housing.
  const month = (name, own, other) => {
    const d1 = own(first) - other(first);
    const dn = own(end) - other(end);
    const fmt = (d) => `${formatMoney(Math.abs(d))} ${d >= 0 ? 'more' : 'less'}`;
    return `Staying needs ${fmt(d1)} monthly cash you must supply than ${name} in year 1 and ${fmt(dn)} in year ${end.year}.`;
  };
  const funding = downsizeFunding(values);
  const signed = (n) => (n < 0 ? `\u2212${formatMoney(-n)}` : formatMoney(n));
  const dash = '\u2014';
  const sellInvested = sale.netProceeds - values.movingCosts - values.rentalUpfront;
  const deployRow = (label, sell, down) => [label, sell == null ? dash : signed(sell), down == null ? dash : signed(down)];
  const buyCash = funding.newHomePrice + funding.buyingCosts;
  const deployment = {
    title: 'Cash deployed at sale and purchase (year 0)',
    columns: ['', 'Sell and rent', 'Downsize'],
    rows: [
      deployRow('Sale price', funding.salePrice, funding.salePrice),
      deployRow('Selling costs', -funding.sellingCosts, -funding.sellingCosts),
      deployRow('Capital gains tax', -funding.taxesDue, -funding.taxesDue),
      deployRow('Mortgage payoff', -funding.mortgagePayoff, -funding.mortgagePayoff),
      deployRow('Net proceeds', funding.netProceeds, funding.netProceeds),
      deployRow('Moving costs', -values.movingCosts, -values.movingCosts),
      deployRow('Rental upfront cash', -values.rentalUpfront, null),
      deployRow('New home price', null, -funding.newHomePrice),
      deployRow('Buying costs', null, -funding.buyingCosts),
      deployRow('Cash used to buy the new home (price plus buying costs)', null, -buyCash),
      deployRow('New mortgage', null, funding.newMortgage),
      ...(funding.outsideFunds > 0.5 ? [deployRow('Paid from outside funds', null, funding.outsideFunds)] : []),
      deployRow(funding.invested < 0 || sellInvested < 0 ? 'Invested at year 0 (negative is a shortfall)' : 'Invested at year 0', sellInvested, funding.invested),
    ],
    note: `Year-0 amounts, before any inflation adjustment. The cash used to buy the new home is kept out of the cost totals above: the new home's value is already counted in its year-${end.year} net proceeds, so adding it would count that equity twice.${funding.invested < 0 ? ` ${shortfallNotice(-funding.invested)}` : ''}`,
  };
  const opp = (label, stay, sell, down) => [label, ...[stay, sell, down].map((n) => (n == null ? dash : signed(n)))];
  const opportunity = {
    title: 'Opportunity costs by component',
    columns: ['', 'Stay', 'Sell and rent', 'Downsize'],
    rows: [
      opp('Investment return forgone on the money left in the home', costs.stay.opportunity, null, null),
      opp('Home appreciation forgone by selling', null, costs.sell.opportunity, end.homeValue - values.homeValue),
      opp('Less appreciation earned on the new home', null, null, -(end.downsizeHomeValue - values.newHomePrice)),
      opp('Opportunity costs', ...paths.map((p) => p.opportunity)),
    ],
    note: 'The components add up to the Opportunity costs row in the table above.',
  };
  return {
    id: 'cost-summary',
    title: 'Summary of costs by category',
    headlines: [
      gap('Selling and investing', end.investmentCapital),
      gap('Downsizing', end.downsizeNetWorth),
      month('renting', (r) => r.monthlyStayOutOfPocket, (r) => r.monthlySellOutOfPocket),
      month('downsizing', (r) => r.monthlyStayOutOfPocket, (r) => r.monthlyDownsizeOutOfPocket),
      `Downsizing uses ${formatMoney(buyCash)} of cash to buy the new home (${formatMoney(funding.newHomePrice)} price plus ${formatMoney(funding.buyingCosts)} buying costs) and starts year 0 with ${funding.invested < 0 ? `a ${formatMoney(-funding.invested)} shortfall` : `${formatMoney(funding.invested)} invested`}.`,
    ],
    columns: ['', 'Stay', 'Sell and rent', 'Downsize'],
    extras: [deployment, opportunity],
    rows: [
      row('Initial costs', (p) => p.initial),
      row('Recurring costs', (p) => p.recurring),
      row('Opportunity costs', (p) => p.opportunity),
      row('Total costs', (p) => p.initial + p.recurring + p.opportunity),
      row(`Net proceeds (year ${end.year})`, (p) => p.net),
      cashRow('Monthly cash you must supply (year 1)', first),
      cashRow(`Monthly cash you must supply (year ${end.year})`, end),
      [`Total cash you must supply (years 1 to ${end.year})`, totalCash((r) => r.monthlyStayOutOfPocket), totalCash((r) => r.monthlySellOutOfPocket), totalCash((r) => r.monthlyDownsizeOutOfPocket)],
    ],
    note: `Amounts cover years 1 to ${end.year}. Initial costs are selling costs, capital-gains tax and moving, plus the rental's upfront cash or the new home's buying costs. Recurring costs are running housing costs (net of tax savings) or rent. Opportunity costs are the investment return forgone on the money left in your home, or the home appreciation forgone by selling. Net proceeds are net worth at the end of the horizon, after sale costs and taxes. Total costs add the first three rows only. The monthly cash rows are housing outflows less portfolio withdrawals applied to housing; they are a cash-flow measure, not part of the totals. The total cash row adds those monthly amounts over every year of the horizon: the cash the household has to generate from income or other savings, which net worth does not show.${downsizeFunding(values).outsideFunds > 0.5 ? ' Downsize net proceeds leave out the money from outside this model that pays for the new home.' : ''}${values.todaysDollars === 'real' ? " All amounts are in today's dollars." : ''}`,
  };
}

// Share of the month's rent the withdrawal income covers, flagged when under
// 100% (the cell is read as text in the table and the hover card).
function rentCoverage(r) {
  if (!(r.monthlyRentCost > 0)) return '\u2014';
  const pct = Math.round((Math.max(0, r.monthlyInvestmentIncome) / r.monthlyRentCost) * 100);
  return pct < 100 ? `${pct}% (under 100%)` : `${pct}%`;
}

// First year (1 or later) a gap field is at or above zero, else null.
function pureCross(rows, field) {
  const hit = rows.slice(1).find((r) => r[field] >= 0);
  return hit ? hit.year : null;
}

// Each section: title, a summary line, table (columns + rows of formatted
// cells) and chart series ({ label, points: [{ x, y }] }).
export function buildResults(values) {
  const projection = project(values);
  const { breakevenYear, downsizeBreakevenYear, downsizeShortfall } = projection;
  const rows = values.todaysDollars === 'real' ? inTodaysDollars(projection.rows, values.inflation) : projection.rows;
  const years = rows.slice(1);
  const noMortgage = noMortgageNotice(values, years[0], downsizeFunding(values));
  const series = (label, list, pick) => ({ label, points: list.map((r) => ({ x: r.year, y: pick(r) })) });

  const netWorth = {
    id: 'net-worth',
    title: 'Net worth',
    summary: `${gapNote('Selling and investing', 'Selling', rows, (r) => r.netWorthGainLoss, breakevenYear)} ${gapNote('Downsizing', 'Downsizing', rows, (r) => r.downsizeGainLoss, downsizeBreakevenYear)} Staying is counted as if you sold the home that year, after selling costs and capital-gains tax; downsizing counts the new home the same way, plus your investments.${downsizeFunding(values).outsideFunds > 0.5 ? ' The money from outside this model that pays for the new home is left out, so the three paths stay comparable.' : ''}`,
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
    summary: 'Income the invested net proceeds could pay out each month at the withdrawal rate, after any tax on withdrawals, if you sell and rent or if you downsize. Coverage is that income divided by the rent; below 100% the house is not paying for your housing and the difference comes out of pocket.'
      + (downsizeShortfall > 0.5 ? ` Downsizing starts with negative invested capital: ${shortfallNotice(downsizeShortfall)} The downsize columns assume that shortfall is drawn from other savings.` : ''),
    columns: ['Year', 'Investment capital', 'Income (per year)', 'Income (per month)', 'Rent (per month)', 'Rent covered', 'Out of pocket (per month)', 'Downsize investment capital', 'Downsize income (per month)'],
    rows: years.map((r) => [String(r.year), formatMoney(r.investmentCapital), formatMoney(r.investmentIncome), formatMoney(r.monthlyInvestmentIncome), formatMoney(r.monthlyRentCost), rentCoverage(r), formatMoney(Math.min(r.monthlyRentCost, Math.max(0, r.monthlyRentCost - r.monthlyInvestmentIncome))), formatMoney(r.downsizeInvestmentCapital), formatMoney(r.monthlyDownsizeInvestmentIncome)]),
    series: [
      series('Income (per month)', years, (r) => r.monthlyInvestmentIncome),
      series(downsizeShortfall > 0.5 ? 'Downsize income (per month; starts with a savings shortfall)' : 'Downsize income (per month)', years, (r) => r.monthlyDownsizeInvestmentIncome),
    ],
    tipCols: [3, 8],
    tipExtra: 5,
    markerX: null,
  };

  const cashNeeded = {
    id: 'cash-needed',
    title: 'Monthly cash you must come up with',
    summary: 'The cash the household must supply each month from income or other savings: all housing cash outflows (owning: mortgage principal and interest, property tax, insurance, maintenance, HOA dues and any major repairs, less tax saved; renting: rent and renter\'s insurance; downsizing: the new home\'s costs and any new mortgage) minus the after-tax portfolio withdrawals applied to housing. Staying has no invested proceeds to draw on, so all of it is generated by the household. The contribution columns use the same definition as the net worth comparison: staying\'s monthly cash needed less the path\'s own, which is the amount that path adds to its investment (or draws, if negative) each month, before its withdrawals are taken out, so all three cover the housing need on equal cash out. The figures reconcile: staying\'s cash needed less a path\'s equals that contribution.' + (noMortgage ? ` ${noMortgage}` : ''),
    columns: ['Year', 'Stay (per month)', 'Sell and rent (per month)', 'Downsize (per month)', 'Sell: contribution vs staying (per month)', 'Downsize: contribution vs staying (per month)'],
    rows: years.map((r) => [String(r.year), formatMoney(r.monthlyStayOutOfPocket), formatMoney(r.monthlySellOutOfPocket), formatMoney(r.monthlyDownsizeOutOfPocket), formatMoney(r.monthlySellContribution), formatMoney(r.monthlyDownsizeContribution)]),
    series: [
      series('Stay (per month)', years, (r) => r.monthlyStayOutOfPocket),
      series('Sell and rent (per month)', years, (r) => r.monthlySellOutOfPocket),
      series('Downsize (per month)', years, (r) => r.monthlyDownsizeOutOfPocket),
    ],
    tipCols: [1, 2, 3],
    tipExtra: null,
    markerX: null,
  };

  const equalCash = {
    id: 'equal-cash',
    title: 'Net worth with equal cash contributions',
    summary: `Every path gets the same cash each year: what staying needs to fund its mortgage and carrying costs (${formatMoney(years[0]?.monthlyEqualContribution ?? 0)} a month in year 1). Selling and renting pays the rent, and downsizing pays the new home's costs and mortgage, first from portfolio withdrawals at your withdrawal setting (never more than the housing costs) and then from that contribution, and invests whatever is left over. ${gapNote('Selling and investing', 'Selling', rows, (r) => r.equalSellGainLoss, (rows.slice(1).find((r) => r.equalSellGainLoss >= 0) ?? {}).year)} ${gapNote('Downsizing', 'Downsizing', rows, (r) => r.equalDownsizeGainLoss, (rows.slice(1).find((r) => r.equalDownsizeGainLoss >= 0) ?? {}).year)} Staying is counted as if you sold the home that year, as in the net worth chart.${downsizeFunding(values).outsideFunds > 0.5 ? ' The money from outside this model that pays for the new home is left out.' : ''}`,
    columns: ['Year', 'Stay (equity after sale)', 'Sell (invested)', 'Downsize (new home + invested)', 'Sell minus stay', 'Downsize minus stay'],
    rows: rows.map((r) => [String(r.year), formatMoney(r.stayNetWorth), formatMoney(r.equalSellNetWorth), formatMoney(r.equalDownsizeNetWorth), formatMoney(r.equalSellGainLoss), formatMoney(r.equalDownsizeGainLoss)]),
    series: [
      series('Stay (equity after sale)', rows, (r) => r.stayNetWorth),
      series('Sell (invested)', rows, (r) => r.equalSellNetWorth),
      series('Downsize', rows, (r) => r.equalDownsizeNetWorth),
    ],
    tipCols: [1, 2, 3],
    tipExtra: 4,
    markerX: null,
  };

  const pureNetWorth = {
    id: 'pure-net-worth',
    title: 'Pure net worth',
    summary: `Pure net worth: what each path is worth at the end if the portfolio pays its own way. Withdrawals are taken out of the portfolio and spent, and the sell and downsize paths get no credit for the yearly difference in cash flow between owning and their housing, so nothing is equalized between the paths. This differs from the Net worth chart, which assumes each path spends the same cash on housing. ${gapNote('Selling and investing', 'Selling', rows, (r) => r.pureSellGainLoss, pureCross(rows, 'pureSellGainLoss'))} ${gapNote('Downsizing', 'Downsizing', rows, (r) => r.pureDownsizeGainLoss, pureCross(rows, 'pureDownsizeGainLoss'))}${downsizeFunding(values).outsideFunds > 0.5 ? ' The money from outside this model that pays for the new home is left out.' : ''}`,
    columns: ['Year', 'Stay (equity after sale)', 'Sell (invested)', 'Downsize (new home + invested)', 'Sell minus stay', 'Downsize minus stay'],
    rows: rows.map((r) => [String(r.year), formatMoney(r.stayNetWorth), formatMoney(r.pureSellNetWorth), formatMoney(r.pureDownsizeNetWorth), formatMoney(r.pureSellGainLoss), formatMoney(r.pureDownsizeGainLoss)]),
    series: [
      series('Stay (equity after sale)', rows, (r) => r.stayNetWorth),
      series('Sell (invested)', rows, (r) => r.pureSellNetWorth),
      series('Downsize', rows, (r) => r.pureDownsizeNetWorth),
    ],
    tipCols: [1, 2, 3],
    tipExtra: 4,
    markerX: pureCross(rows, 'pureSellGainLoss'),
  };

  const sections = [netWorth, cashFlow, income, cashNeeded, pureNetWorth, equalCash];
  if (values.todaysDollars === 'real') {
    for (const sec of sections) sec.summary += " All amounts are in today's dollars.";
  }
  const end = rows[rows.length - 1];
  const headline = { breakevenYear, downsizeBreakevenYear, year: end.year, stay: end.stayNetWorth, sell: end.investmentCapital, downsize: end.downsizeNetWorth, equalSell: end.equalSellNetWorth, equalDownsize: end.equalDownsizeNetWorth };
  return { breakevenYear, headline, sections, shortfallNotice: shortfallNotice(downsizeShortfall), noMortgageNotice: noMortgage, costSummary: costSummary(values, projection, rows), sensitivity: sensitivityLines(values) };
}

// CSS custom properties (see styles.css), so the night theme can recolour the series.
const COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'];
const W = 480;
const PAD = { l: 64, r: 12, t: 12, b: 28 };
// The legend sits on its own rows below the year labels, so the chart grows
// by one row per line of legend rather than overlapping the axis.
const PLOT_H = 260;
const LEGEND_ROW = 16;
const CHAR_W = 6;
const SWATCH_GAP = 14;
const ITEM_GAP = 18;

// Legend item positions, wrapped to the chart width: [{ x, row }] per series.
function legendLayout(series) {
  const maxX = W - PAD.r;
  let x = PAD.l;
  let row = 0;
  return series.map((s) => {
    const width = SWATCH_GAP + s.label.length * CHAR_W;
    if (x > PAD.l && x + width > maxX) { x = PAD.l; row++; }
    const item = { x, row };
    x += width + ITEM_GAP;
    return item;
  });
}

function chartHeight(series) {
  const rows = Math.max(...legendLayout(series).map((l) => l.row), 0) + 1;
  return PLOT_H + 6 + rows * LEGEND_ROW;
}

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
    sy: (y) => PLOT_H - PAD.b - ((y - yMin) / (yMax - yMin)) * (PLOT_H - PAD.t - PAD.b),
  };
}

// A self-contained SVG line chart with axes, a legend, an optional vertical
// marker (the breakeven year) and a hidden crosshair with one ring per
// series that the page moves to the active year.
export function lineChartSvg(section) {
  if (!section.series.some((s) => s.points.length)) return '';
  const { xMin, xMax, yMin, yMax, sx, sy } = chartScale(section);
  const f = (n) => n.toFixed(1);

  const H = chartHeight(section.series);
  const legend = legendLayout(section.series);
  let out = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escape(section.title)} chart" class="chart">`;
  for (let i = 0; i <= 4; i++) {
    const y = yMin + ((yMax - yMin) * i) / 4;
    out += `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${f(sy(y))}" y2="${f(sy(y))}" class="grid"/>`;
    out += `<text x="${PAD.l - 6}" y="${f(sy(y) + 4)}" text-anchor="end" font-size="10">${escape(formatMoney(y))}</text>`;
  }
  out += `<text x="${PAD.l}" y="${PLOT_H - 8}" font-size="10">Year ${xMin}</text>`;
  out += `<text x="${W - PAD.r}" y="${PLOT_H - 8}" text-anchor="end" font-size="10">Year ${xMax}</text>`;
  if (section.markerX != null) {
    out += `<line class="marker" x1="${f(sx(section.markerX))}" x2="${f(sx(section.markerX))}" y1="${PAD.t}" y2="${PLOT_H - PAD.b}"/>`;
    out += `<text x="${f(sx(section.markerX) + 4)}" y="${PAD.t + 10}" font-size="10">Breakeven: year ${section.markerX}</text>`;
  }
  section.series.forEach((s, i) => {
    const d = s.points.map((p, j) => `${j ? 'L' : 'M'}${f(sx(p.x))},${f(sy(p.y))}`).join('');
    out += `<path d="${d}" fill="none" style="stroke:${COLORS[i]}" stroke-width="2.5"/>`;
  });
  section.series.forEach((s, i) => {
    const top = PLOT_H + 2 + legend[i].row * LEGEND_ROW;
    out += `<rect x="${legend[i].x}" y="${top}" width="10" height="10" style="fill:${COLORS[i]}"/>`;
    out += `<text x="${legend[i].x + SWATCH_GAP}" y="${top + 9}" font-size="10">${escape(s.label)}</text>`;
  });
  out += `<g class="hover" style="display:none"><line class="crosshair" y1="${PAD.t}" y2="${PLOT_H - PAD.b}"/>`;
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
  const list = (path) => `<ul>${lines.filter((l) => l.path === path).map((l) => `<li>${escape(l.text)}</li>`).join('')}</ul>`;
  return `<section class="result" id="sensitivity"><h2>What drives the verdict</h2><p>The verdict compares each path with staying at the end of your time horizon. For each key assumption, this is the value at which that verdict flips, holding everything else as entered.</p><h3>Selling and renting vs. staying</h3>${list('sell')}<h3>Downsizing vs. staying</h3>${list('downsize')}</section>`;
}

// The three key numbers kept above the result tabs.
export function headlineHtml(h) {
  const year = (y) => (y == null ? 'Not within horizon' : `Year ${y}`);
  const card = (label, value) => `<div class="kpi"><span class="kpi-label">${escape(label)}</span><strong>${escape(value)}</strong></div>`;
  return `<div class="headline">${card('Sell pulls ahead', year(h.breakevenYear))}${card('Downsize pulls ahead', year(h.downsizeBreakevenYear))}${card(`Net worth, year ${h.year} (stay / sell / downsize)`, [h.stay, h.sell, h.downsize].map(formatMoney).join(' / '))}${card(`Net worth, equal cash contributions, year ${h.year} (stay / sell / downsize)`, [h.stay, h.equalSell, h.equalDownsize].map(formatMoney).join(' / '))}</div>`;
}

// The inputs that differ from their defaults, as [label, formatted value]
// pairs, for the summary at the top of a printout.
export function changedInputs(values, fields, defaults) {
  const show = (f, v) => (f.kind === 'choice' ? (f.options.find((o) => o.value === v)?.label ?? String(v)) : f.kind === 'checkbox' ? (v === 1 ? 'Yes' : 'No') : String(v));
  const list = fields.filter((f) => values[f.id] != null && values[f.id] !== defaults[f.id]).map((f) => [f.label, show(f, values[f.id])]);
  for (const r of values.repairs ?? []) list.push(['Major repair', `year ${r.year}, ${formatMoney(r.amount)}`]);
  return list;
}

// The cost summary: headline gaps, then the category table.
export function costSummaryHtml(summary) {
  if (!summary) return '';
  const head = summary.columns.map((c) => `<th scope="col">${escape(c)}</th>`).join('');
  const body = summary.rows.map((r) => `<tr>${r.map((c, i) => (i ? `<td>${escape(c)}</td>` : `<th scope="row">${escape(c)}</th>`)).join('')}</tr>`).join('');
  return `<section class="result" id="${summary.id}"><h2>${escape(summary.title)}</h2><ul>${summary.headlines.map((h) => `<li>${escape(h)}</li>`).join('')}</ul><div class="table-wrap"><table><caption>${escape(summary.title)}</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div><p class="hint-note">${escape(summary.note)}</p>${(summary.extras || []).map(extraTableHtml).join('')}</section>`;
}

function extraTableHtml(t) {
  const head = t.columns.map((c) => `<th scope="col">${escape(c)}</th>`).join('');
  const body = t.rows.map((r) => `<tr>${r.map((c, i) => (i ? `<td>${escape(c)}</td>` : `<th scope="row">${escape(c)}</th>`)).join('')}</tr>`).join('');
  return `<h3>${escape(t.title)}</h3><div class="table-wrap"><table><caption>${escape(t.title)}</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div><p class="hint-note">${escape(t.note)}</p>`;
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
    ...(values.useProceeds !== 0 && f.outsideFunds > 0.5 ? [{ label: 'Paid from outside funds', amount: f.outsideFunds }] : []),
    { label: 'Moving costs', amount: -f.movingCosts },
  ];
  return { steps, invested: f.invested, shortfall: f.invested < 0, resultLabel: f.invested < 0 ? 'Shortfall drawn from investments' : 'Amount invested at year 0' };
}

export function downsizeWaterfallHtml(w) {
  const signed = (n) => (n < 0 ? `\u2212${formatMoney(-n)}` : formatMoney(n));
  const rows = w.steps.map((s) => `<tr${s.total ? ' class="subtotal"' : ''}><th scope="row">${escape(s.label)}</th><td>${escape(signed(s.amount))}</td></tr>`).join('');
  return `<table><caption>Where the sale money goes</caption><tbody>${rows}<tr class="total"><th scope="row">${escape(w.resultLabel)}</th><td>${escape(formatMoney(Math.abs(w.invested)))}</td></tr></tbody></table>`;
}
