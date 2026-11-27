import { money, signed, word } from './format.js';

// The third path: rent for `waitYears`, then buy the same home at its appreciated price.
export function laterCard({ v, r, later, today, final, label }) {
  const l = today ? later.finalReal : later.final;
  const rows = today ? later.real : later.years;
  const span = word(v.waitYears, 'year');
  const rate = later.rate;
  const buy =
    later.buyYear == null
      ? `Your stay ends before the purchase, so this path is the same as renting for all ${word(v.years, 'year')}.`
      : v.waitYears === 0
        ? 'Buying immediately is the same as buying now.'
        : `You buy at the start of year ${v.waitYears + 1} with a ${money(later.loan)} loan at ${rate}%, a payment of ${money(later.monthlyPayment)} a month, after the investments are sold (and taxed) to pay closing costs and the down payment.`;
  const worst =
    later.stopsBeingWorst == null
      ? `Buying now is still the worst of the three at the end of your stay.`
      : later.stopsBeingWorst === 1
        ? 'Buying now is never the worst of the three.'
        : `Buying now stops being the worst of the three in year ${later.stopsBeingWorst}.`;
  const table = rows
    .map(
      (y) =>
        `<tr><td>${y.year}</td><td>${money(y.own)}</td><td>${money(y.rent)}</td><td>${money(y.later)}</td><td>${y.later >= Math.max(y.own, y.rent) ? 'Rent, then buy' : y.own >= y.rent ? 'Buy now' : 'Rent forever'}</td></tr>`,
    )
    .join('');
  return `<div class="card ro-later"><h2>Rent ${span}, then buy</h2>
      <p>After ${word(v.years, 'year')}, ${label}: buy now ${money(final.own)}, rent forever ${money(final.rent)}, rent for ${span} then buy ${money(l.later)} (${signed(l.later - final.own)} vs buying now).</p>
      <p>${buy}</p>
      <p>${worst}</p>
      <details><summary>Net worth of the three paths by year</summary><div class="ro-table-wrap"><table class="data-table"><caption>Net worth at the end of each year, ${label}</caption>
        <thead><tr><th scope="col">Year</th><th scope="col">Buy now</th><th scope="col">Rent forever</th><th scope="col">Rent ${span}, then buy</th><th scope="col">Best</th></tr></thead>
        <tbody>${table}</tbody></table></div></details>
    </div>`;
}
