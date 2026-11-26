import { durationText } from '../rentown.js';
import { money, monthPoint, verdict, winner } from './format.js';

const lens = (breakEven, month, ahead) => breakEven == null
  ? ahead ? `Owning is ahead only for stays of ${durationText(ahead.startMonth)} to ${durationText(ahead.endMonth)}.` : 'Owning does not catch up within your stay.'
  : `Owning pulls ahead in ${monthPoint(month)} (year ${breakEven} on a yearly basis).`;

export function lensesCard({ r, final, label, span, view }) {
  const home = view === 'unrealized' ? 'home equity on paper, with no selling costs' : 'home equity after selling costs';
  return `<div class="ro-lenses">
      <div class="card"><h3>Equal-cash view</h3><p>${verdict(final.difference)} after ${span}, ${label} &mdash; ${lens(r.breakEven, r.breakEvenMonth, r.chartBreakEvenMonth == null ? r.chartAheadSpan : null)}</p><p>Both sides start with the same cash (the down payment and closing costs) and spend the same each month: whichever choice costs less that month invests the difference.</p></div>
      <div class="card"><h3>Pure net worth view</h3><p>${verdict(final.pureDifference)} after ${span}, ${label} &mdash; ${lens(r.pureBreakEven, r.pureBreakEvenMonth)}</p><p>Owner: ${home}. Renter: only the down payment and closing costs, invested and taxed the same way; the monthly difference is not credited to either side.</p></div>
    </div>`;
}

// Empty unless the two views name different winners.
export function lensesDisagreeCard({ final }) {
  const differ = winner(final.difference) !== winner(final.pureDifference);
  return differ
    ? `<p class="ro-why"><strong>The two views disagree.</strong> Equal-cash credits the renter with the monthly difference between owning and renting (${final.rent >= final.pureRent ? 'owning costs more than renting, so the renter invests the difference' : 'renting costs more than owning, so the renter pays the difference out of the investments'}); the pure view gives neither side that credit, so it only compares the starting cash with the home. The headline above follows the equal-cash view.</p>`
    : '';
}
