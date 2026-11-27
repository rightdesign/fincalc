import { followThrough } from '../rentown.js';
import { money } from './format.js';

export function followCard({ r }) {
  const ft = followThrough(r);
  const perMonth = money(ft.monthly);
  const followHtml =
    ft.winner === 'rent'
      ? ft.direction === 'ownCostsMore'
        ? `<p>Renting comes out ahead only if you actually invest the difference: <strong>${perMonth} a month</strong>, what owning would cost beyond your rent in year 1.</p>
      <ol><li>Keep a cushion of 3 to 6 months of expenses in savings first.</li><li>Put what is comfortable beyond that into low-cost, diversified funds such as index ETFs.</li><li>Automate the transfer each month so it happens without a decision.</li></ol>`
        : ft.direction === 'rentCostsMore'
          ? `<p>Renting is ahead only if you invest the down payment and closing costs you would have put into a home, and it costs <strong>${perMonth} a month more</strong> than owning in year 1. That plan relies on covering the extra ${perMonth} a month from income or by drawing on that account, and it grows as your rent rises.</p>
      <ol><li>Invest the cash you are not putting into a home in low-cost, diversified funds such as index ETFs.</li><li>Check that your income, or withdrawals from that account, can cover the higher rent for the whole stay.</li><li>Keep a cushion of 3 to 6 months of expenses in savings first.</li></ol>`
          : `<p>Renting is ahead and costs about the same as owning in year 1, so there is no monthly difference to invest. Keep a 3 to 6 month cushion and invest whatever you can spare, ideally automatically.</p>`
      : ft.direction === 'ownCostsMore'
        ? `<p>Owning costs <strong>${perMonth} a month more</strong> than renting in year 1. Make sure your budget holds that, and your 3 to 6 month cushion, before you buy.</p>`
        : `<p>Owning costs ${ft.direction === 'same' ? 'about the same as' : `${perMonth} a month less than`} renting in year 1. Keep a 3 to 6 month cushion for repairs and surprises.</p>`;
  return `<div class="card ro-follow"><h3>${ft.winner === 'rent' ? 'If you rent: invest the difference' : 'If you buy: check the monthly budget'}</h3>${followHtml}</div>`;
}
