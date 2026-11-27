import { money } from './format.js';
import { solveBreakEven } from './solve.js';

// The 5% Rule, a rule of thumb from Ben Felix's PWL Capital research: unrecoverable ownership costs run about 5% of the
// home's value a year, split 1% property tax, 1% maintenance and 3% cost of capital (mortgage interest plus the return
// forgone on the equity). A simplified gross figure beside the detailed breakdown, not a replacement for it.
export const PWL_SHARES = { tax: 1, maintenance: 1, capital: 3 };

// The tax and maintenance shares default to the rule's 1% each; a caller may pass the user's own rates.
export function fivePercentRule(v, shares = PWL_SHARES) {
  const yearly = (pct) => (v.price * pct) / 100;
  const total = shares.tax + shares.maintenance + shares.capital;
  const monthly = yearly(total) / 12;
  return {
    total,
    monthly,
    tax: yearly(shares.tax) / 12,
    maintenance: yearly(shares.maintenance) / 12,
    capital: yearly(shares.capital) / 12,
    rent: v.rent,
    cheaper: monthly < v.rent ? 'own' : monthly > v.rent ? 'rent' : 'tie',
  };
}

const pct = (n) => `${(Math.round(n * 100) / 100).toString()}%`;

export function pwlCard({ v, r }) {
  const shares = { tax: v.tax, maintenance: v.maintenance, capital: PWL_SHARES.capital };
  const f = fivePercentRule(v, shares);
  const read = {
    own: `Rent is higher than the ${money(f.monthly)} unrecoverable cost of owning, so by this rule of thumb owning leans ahead.`,
    rent: `The unrecoverable cost of owning is higher than the ${money(f.rent)} rent, so by this rule of thumb renting leans ahead.`,
    tie: 'The two are about equal by this rule of thumb.',
  }[f.cheaper];
  const tie = solveBreakEven(v, 'rent');
  const modelWinner = r.final.difference > 0 ? 'owning' : r.final.difference < 0 ? 'renting' : null;
  const ruleWinner = { own: 'owning', rent: 'renting' }[f.cheaper];
  const breakEven =
    tie == null
      ? 'No rent from $50 to $50,000 a month ties owning and renting in the detailed model on your inputs.'
      : `The detailed model ties owning and renting at a rent of ${money(tie)} a month, ${pct(((tie * 12) / v.price) * 100)} of the price a year; you pay ${pct(((f.rent * 12) / v.price) * 100)}.`;
  const conflict =
    modelWinner && ruleWinner && modelWinner !== ruleWinner
      ? ` The two disagree here: the rule of thumb leans ${ruleWinner} but the detailed model favors ${modelWinner}, because the rule is a gross screen that leaves out closing and selling costs, taxes and what the money would earn if invested.`
      : '';
  return `<div class="card ro-pwl"><h3>Rule of thumb: the 5% Rule</h3>
      <p>Ben Felix and PWL Capital estimate that the costs of owning you never get back come to about 5% of the home&rsquo;s value a year, divided by 12 for a monthly figure. Here the tax and maintenance rows use your own rates; the 3% cost of capital is the rule&rsquo;s fixed assumption.</p>
      <table class="data-table"><tbody>
        <tr><th scope="row">Property taxes (${pct(shares.tax)} of ${money(v.price)} a year, your rate)</th><td>${money(f.tax)}</td></tr>
        <tr><th scope="row">Maintenance (${pct(shares.maintenance)}, your rate)</th><td>${money(f.maintenance)}</td></tr>
        <tr><th scope="row">Cost of capital (3%: mortgage interest plus the return you give up on your equity)</th><td>${money(f.capital)}</td></tr>
        <tr><th scope="row">Unrecoverable cost of owning (${pct(f.total)})</th><td><strong>${money(f.monthly)}</strong></td></tr>
        <tr><th scope="row">Your monthly rent</th><td><strong>${money(f.rent)}</strong></td></tr>
      </tbody></table>
      <p>${read}${conflict}</p>
      <p class="hint">A quick gross screen that ignores home price growth. ${breakEven} The detailed model stays the better guide.</p></div>`;
}
