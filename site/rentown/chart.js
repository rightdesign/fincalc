import { durationText } from '../rentown.js';
import { rentOwnChartHtml } from '../rentown-chart.js';
import { monthlyChartHtml } from '../rentown-monthly-chart.js';
import { money, signed } from './format.js';

// The year-by-year table as plain numbers, shared by the card below and the CSV download.
export const TABLE_COLUMNS = ['Year', 'Own', 'Rent (equal-cash)', 'Difference (equal-cash)', 'Rent (pure)', 'Difference (pure)'];
export const tableYears = (r, today) => (today ? r.real : r.years);
export const tableRows = (r, today) => tableYears(r, today).map((y) => [y.year, ...[y.own, y.rent, y.difference, y.pureRent, y.pureDifference].map(Math.round)]);

function chartData({ r, later, today }) {
  return (today ? r.chartReal : r.chartYears).map((y, i) => ({ ...y, later: (today ? later.chartReal : later.chartYears)[i].later }));
}

export function chartCard(ctx) {
  return `<div class="chart-stack">${netWorthChart(ctx)}${monthlyChart(ctx)}${tablePanel(ctx)}</div>`;
}

export const netWorthChart = ({ r, later, today, v }) => rentOwnChartHtml(chartData({ r, later, today }), r.chartBreakEven, money, v.years, r.chartBreakEvenMonth, v.view === 'unrealized', r.chartBreakEvenMonth == null && r.chartAheadSpan ? `${durationText(r.chartAheadSpan.startMonth)} to ${durationText(r.chartAheadSpan.endMonth)}` : null);

export const monthlyChart = ({ r, today, v }) => monthlyChartHtml(r.monthlyCurve, r.monthlyCross, money, v.years, today ? v.inflation : 0, Math.max(v.years, r.chartBreakEven ?? 0));

export function tablePanel({ v, r, today, final, label }) {
  const rows_ = tableYears(r, today);
  const rows = rows_.map((y) => `<tr><td>${y.year}${y.repair ? ` <small>(major repair ${money(v.repairCost)})</small>` : ''}${y.homeTax > 0 ? ` <small>(tax if you sell: ${money(y.homeTax)})</small>` : ''}</td><td>${money(y.own)}</td><td>${money(y.rent)}</td><td>${signed(y.difference)}</td><td>${money(y.pureRent)}</td><td>${signed(y.pureDifference)}</td></tr>`).join('');
  return `<div class="ro-table-wrap"><table class="data-table"><caption>Net worth at the end of each year, ${label}</caption>
        <thead><tr>${TABLE_COLUMNS.map((c) => `<th scope="col">${c}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody></table>
        <p class="no-print"><button type="button" id="rentown-csv">Download table (CSV)</button></p>
        <p>Tax on investments over ${v.years} ${v.years === 1 ? 'year' : 'years'}: ${money(final.dragPaid + final.saleTax)} (${money(final.dragPaid)} tax drag along the way, ${money(final.saleTax)} capital gains tax when you sell${v.view === 'unrealized' ? ', not counted in the unrealized view' : ''}). Investment return after tax drag: ${Math.round(r.afterTaxReturn * 100) / 100}% per year, before the tax on sale.</p>
        <p>Monthly cost in year 1: own ${money(r.firstOwnMonthly)}${r.firstPmi > 0 ? ` (including ${money(r.firstPmi)} mortgage insurance)` : ''} · rent ${money(r.firstRentMonthly)}.</p>
        <p>Income tax saved by owning in year 1: ${money(r.firstTaxBenefit)}.${v.itemize && v.marginalTaxRate > 0 && r.firstTaxBenefit === 0 ? ' Your mortgage interest and property tax are below the standard deduction, so owning gives no extra tax benefit at these numbers.' : ''}</p>
        ${r.totalPmi > 0 ? `<p>Mortgage insurance over your stay: ${money(r.totalPmi)} in total${r.program.id === 1 ? ', charged for the life of the loan or the first 11 years, depending on the down payment' : ', charged only while the loan is above 80% of the home&rsquo;s value'}.</p>` : ''}
        ${r.program.fee > 0 ? `<p>${r.program.feeName}: ${money(r.program.fee)}, ${r.program.financed ? 'added to the loan' : 'paid in cash at closing'}.</p>` : ''}</div>`;
}
