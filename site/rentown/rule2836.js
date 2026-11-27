import { rule2836, DEBT_CAP, HOUSING_CAP } from '../rentown.js';
import { money } from './format.js';

const pct = (n) => `${(Math.round(n * 10) / 10).toFixed(1)}%`;

// The 28/36 rule (popularised by Ramit Sethi): shown only when a gross income was entered.
export function rule2836Card({ v, r }) {
  const a = rule2836(v, r);
  if (!a) return '';
  const row = (label, amount, ratio, cap, over) =>
    `<tr><th scope="row">${label}</th><td>${money(amount)}</td><td><strong>${pct(ratio)}</strong> of ${money(a.gross)}</td><td>${over ? `Over the ${cap}% cap` : `Within the ${cap}% cap`}</td></tr>`;
  return `<div class="card ro-rule2836"><h3>Can you afford it? The 28/36 rule</h3>
      <table class="data-table"><thead><tr><th scope="col">Per month</th><th scope="col">Amount</th><th scope="col">Share of gross monthly income</th><th scope="col">Result</th></tr></thead><tbody>
        ${row('Housing (mortgage, property tax, insurance, HOA)', a.housing, a.housingRatio, HOUSING_CAP, a.housingOver)}
        ${row(`Total debt payments (housing plus ${money(v.otherDebt)} other)`, a.debt, a.debtRatio, DEBT_CAP, a.debtOver)}
      </tbody></table>
      <p><small>The rule of thumb caps housing at ${HOUSING_CAP}% and all debt payments at ${DEBT_CAP}% of gross monthly income. It uses the first month's costs and leaves out maintenance and extra utilities.</small></p></div>`;
}
