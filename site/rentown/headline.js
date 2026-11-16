import { money, monthPoint, word } from './format.js';

const phrase = (f) => (Math.round(f.difference) === 0 ? 'about even' : `${f.difference >= 0 ? 'owning' : 'renting'} ahead by ${money(Math.abs(f.difference))}`);

// Near-ties are inside the model's noise: under $5,000 or 5% of the larger side's net worth.
export const CLOSE_DOLLARS = 5000;
export const CLOSE_SHARE = 0.05;
export const isCloseCall = (f) => Math.abs(f.difference) < Math.max(CLOSE_DOLLARS, CLOSE_SHARE * Math.max(Math.abs(f.own), Math.abs(f.rent)));

export function headlineCard({ v, r, today, view, final, label }) {
  const other = today ? r.final : r.finalReal;
  const ahead = final.difference >= 0;
  const cash = r.cash;
  const costs = view === 'unrealized' ? 'closing costs' : 'closing and selling costs';
  const short = cash.shortfall > 0;
  const close = !short && isCloseCall(final);
  const gap = cash.monthsToClose == null
    ? ''
    : ` Setting aside the ${money(cash.monthlyGap)} a month owning would cost beyond rent would close the gap in about ${word(cash.monthsToClose, 'month')}, not counting interest earned.`;
  const headline = short
    ? `You are ${money(cash.shortfall)} short — renting while you save is the only option on these numbers.`
    : close
    ? `Too close to call — the assumptions decide it (${money(Math.abs(final.difference))} apart after ${v.years} ${v.years === 1 ? 'year' : 'years'}, ${label}).`
    : Math.round(final.difference) === 0
    ? `After ${v.years} ${v.years === 1 ? 'year' : 'years'}, owning and renting leave you about even (${label}).`
    : `After ${v.years} ${v.years === 1 ? 'year' : 'years'}, ${ahead ? 'owning' : 'renting'} leaves you about ${money(Math.abs(final.difference))} ahead, ${label}.`;
  const otherLine = `${today ? 'In future dollars' : "In today's dollars"} that is ${phrase(other)} (at ${v.inflation}% inflation).`;
  const detail = short
    ? `You need ${money(cash.total)} in cash to buy and have ${money(cash.saved)}.${gap} Once you have it, the numbers below apply: after ${v.years} ${v.years === 1 ? 'year' : 'years'}, ${ahead ? 'owning' : 'renting'} would leave you about ${money(Math.abs(final.difference))} ahead, ${label}.`
    : r.breakEven == null
    ? `Owning does not catch up within your stay: ${costs} and the cost of owning outweigh the gains.`
    : `Break-even: owning pulls ahead in ${monthPoint(r.breakEvenMonth)} (year ${r.breakEven} on a yearly basis).${r.breakEven > 1 ? ` Renting is ahead before that, mostly because of ${costs}.` : ''}`;
  return `<div class="m-card ro-headline"><h2 class="m-big">${headline}</h2><p>${otherLine}</p><p>${detail}</p><p>Headline view: equal-cash (below), ${view === 'unrealized' ? 'unrealized (on paper: no selling costs or sale tax)' : 'realized (after selling costs and sale tax)'}.${close ? ' See what drives the verdict below for the values at which the winner flips.' : ''}</p></div>`;
}
