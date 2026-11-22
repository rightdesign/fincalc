import { money } from './format.js';

// The 5% Rule, a rule of thumb from Ben Felix's PWL Capital research: unrecoverable ownership costs run about 5% of the
// home's value a year, split 1% property tax, 1% maintenance and 3% cost of capital (mortgage interest plus the return
// forgone on the equity). A simplified gross figure beside the detailed breakdown, not a replacement for it.
export const PWL_SHARES = { tax: 1, maintenance: 1, capital: 3 };

export function fivePercentRule(v) {
  const yearly = (pct) => (v.price * pct) / 100;
  const total = PWL_SHARES.tax + PWL_SHARES.maintenance + PWL_SHARES.capital;
  const monthly = yearly(total) / 12;
  return { total, monthly, tax: yearly(PWL_SHARES.tax) / 12, maintenance: yearly(PWL_SHARES.maintenance) / 12, capital: yearly(PWL_SHARES.capital) / 12, rent: v.rent, cheaper: monthly < v.rent ? 'own' : monthly > v.rent ? 'rent' : 'tie' };
}

export function pwlCard({ v }) {
  const f = fivePercentRule(v);
  const read = { own: `Rent is higher than the ${money(f.monthly)} unrecoverable cost of owning, so by this rule of thumb owning leans ahead.`, rent: `The unrecoverable cost of owning is higher than the ${money(f.rent)} rent, so by this rule of thumb renting leans ahead.`, tie: 'The two are about equal by this rule of thumb.' }[f.cheaper];
  return `<div class="card ro-pwl"><h3>Rule of thumb: the 5% Rule</h3>
      <p>Ben Felix and PWL Capital estimate that the costs of owning you never get back come to about 5% of the home&rsquo;s value a year, divided by 12 for a monthly figure.</p>
      <table class="data-table"><tbody>
        <tr><th scope="row">Property taxes (1% of ${money(v.price)} a year)</th><td>${money(f.tax)}</td></tr>
        <tr><th scope="row">Maintenance (1%)</th><td>${money(f.maintenance)}</td></tr>
        <tr><th scope="row">Cost of capital (3%: mortgage interest plus the return you give up on your equity)</th><td>${money(f.capital)}</td></tr>
        <tr><th scope="row">Unrecoverable cost of owning (5%)</th><td><strong>${money(f.monthly)}</strong></td></tr>
        <tr><th scope="row">Your monthly rent</th><td><strong>${money(f.rent)}</strong></td></tr>
      </tbody></table>
      <p>${read}</p>
      <p class="hint">A quick gross screen that ignores home price growth. The detailed model above counts appreciation, so its break-even is lower (about 4.5%) and it stays the better guide.</p></div>`;
}
