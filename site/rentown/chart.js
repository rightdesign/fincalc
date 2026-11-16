import { rentOwnChartHtml } from '../rentown-chart.js';
import { money, signed } from './format.js';

export function chartCard({ v, r, today, final, label }) {
  const rows_ = today ? r.real : r.years;
  const rows = rows_.map((y) => `<tr><td>${y.year}${y.repair ? ` <small>(major repair ${money(v.repairCost)})</small>` : ''}${y.homeTax > 0 ? ` <small>(tax if you sell: ${money(y.homeTax)})</small>` : ''}</td><td>${money(y.own)}</td><td>${money(y.rent)}</td><td>${signed(y.difference)}</td><td>${money(y.pureRent)}</td><td>${signed(y.pureDifference)}</td></tr>`).join('');
  return `<div class="m-charts">
      ${rentOwnChartHtml(today ? r.chartReal : r.chartYears, r.chartBreakEven, money, v.years, r.chartBreakEvenMonth)}
      <div class="ro-table-wrap"><table class="m-table"><caption>Net worth at the end of each year, ${label}</caption>
        <thead><tr><th scope="col">Year</th><th scope="col">Own</th><th scope="col">Rent (equal-cash)</th><th scope="col">Difference (equal-cash)</th><th scope="col">Rent (pure)</th><th scope="col">Difference (pure)</th></tr></thead>
        <tbody>${rows}</tbody></table>
        <p>Tax on investments over ${v.years} ${v.years === 1 ? 'year' : 'years'}: ${money(final.dragPaid + final.saleTax)} (${money(final.dragPaid)} tax drag along the way, ${money(final.saleTax)} capital gains tax when you sell). Investment return after tax drag: ${Math.round(r.afterTaxReturn * 100) / 100}% per year, before the tax on sale.</p>
        <p>Monthly cost in year 1: own ${money(r.firstOwnMonthly)}${r.firstPmi > 0 ? ` (including ${money(r.firstPmi)} mortgage insurance)` : ''} · rent ${money(r.firstRentMonthly)}.</p>
        ${r.totalPmi > 0 ? `<p>Mortgage insurance over your stay: ${money(r.totalPmi)} in total${r.program.id === 1 ? ', charged for the life of the loan or the first 11 years, depending on the down payment' : ', charged only while the loan is above 80% of the home&rsquo;s value'}.</p>` : ''}
        ${r.program.fee > 0 ? `<p>${r.program.feeName}: ${money(r.program.fee)}, ${r.program.financed ? 'added to the loan' : 'paid in cash at closing'}.</p>` : ''}</div>
    </div>`;
}
