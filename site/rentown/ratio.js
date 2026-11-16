import { solveBreakEven } from './solve.js';

const pct = (n) => `${(Math.round(n * 10) / 10).toFixed(1)}%`;

// The quick screen: price over a year of rent, rent as a share of price, and the rent share at which the model
// ties at the user's own rate and stay (the rule of thumb, recomputed rather than a fixed 5% or 7%).
export function ratioLine(v) {
  const annual = v.rent * 12;
  const ratio = `${(Math.round((v.price / annual) * 10) / 10).toFixed(1)}×`;
  const share = (annual / v.price) * 100;
  const tie = solveBreakEven(v, 'rent');
  const rule = tie == null
    ? 'no rent from $50 to $50,000 a month ties owning and renting on these inputs'
    : `renting wins below ~${pct(((tie * 12) / v.price) * 100)}/yr`;
  return `Price-to-rent ${ratio} · rent is ${pct(share)} of price/yr · rule of thumb at your ${v.rate}% rate: ${rule}`;
}

export const ratioCard = ({ v }) => `<p class="ro-ratio">${ratioLine(v)}</p>`;
