import { followThrough } from '../rentown.js';
import { money } from './format.js';

export function followCard({ r }) {
  const ft = followThrough(r);
  const perMonth = money(ft.monthly);
  const followHtml = ft.winner === 'rent'
    ? (ft.direction === 'ownCostsMore'
      ? `<p>Renting comes out ahead only if you actually invest the difference: <strong>${perMonth} a month</strong>, what owning would cost beyond your rent in year 1.</p>
      <ol><li>Keep a cushion of 3 to 6 months of expenses in savings first.</li><li>Put what is comfortable beyond that into low-cost, diversified funds such as index ETFs.</li><li>Automate the transfer each month so it happens without a decision.</li></ol>`
      : `<p>Renting is ahead and costs ${ft.direction === 'same' ? 'about the same as' : `${perMonth} a month more than`} owning in year 1, so there is no monthly difference to invest. Keep a 3 to 6 month cushion and invest whatever you can spare, ideally automatically.</p>`)
    : (ft.direction === 'ownCostsMore'
      ? `<p>Owning costs <strong>${perMonth} a month more</strong> than renting in year 1. Make sure your budget holds that, and your 3 to 6 month cushion, before you buy.</p>`
      : `<p>Owning costs ${ft.direction === 'same' ? 'about the same as' : `${perMonth} a month less than`} renting in year 1. Keep a 3 to 6 month cushion for repairs and surprises.</p>`);
  return `<div class="m-card ro-follow"><h3>${ft.winner === 'rent' ? 'If you rent: invest the difference' : 'If you buy: check the monthly budget'}</h3>${followHtml}</div>`;
}
