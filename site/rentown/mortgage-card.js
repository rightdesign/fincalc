import { money, word } from './format.js';

const r0 = Math.round;

// One row per year of the stay, from the model's first month of each year. Every column is the rounded
// dollar amount shown, so the paid-each-month figure always adds up on the page. The payment is the rounded
// actual payment and principal is the remainder, so a fixed payment never flips between $1 apart.
export function mortgageRows(r) {
  return r.monthly.map((m, i) => {
    const interest = r0(m.interest);
    const payment = r0(m.interest + m.principal);
    const principal = payment - interest;
    const other =
      r0(m.tax) + r0(m.insurance) + r0(m.pmi) + r0(m.maintenance) + r0(m.hoa) + r0(m.utilities);
    return {
      year: m.year,
      payment,
      interest,
      principal,
      other,
      paid: payment + other,
      balance: r.yearEndBalances[i] ?? 0,
      paidOff: payment === 0,
    };
  });
}

export function mortgageCard({ v, r }) {
  const rows = mortgageRows(r);
  const arm = v.arm === 1;
  const first = rows[0];
  const terms = `${arm ? `${v.armRate}% ARM` : `${v.rate}%`} · ${word(v.term, 'yr')}`;
  const body = rows
    .map(
      (x) =>
        `<tr><th scope="row">${x.year}</th>${x.paidOff ? `<td colspan="3">Paid off</td>` : `<td>${money(x.payment)}</td><td>${money(x.interest)}</td><td>${money(x.principal)}</td>`}<td>${money(x.other)}</td><td><strong>${money(x.paid)}</strong></td><td>${money(x.balance)}</td></tr>`,
    )
    .join('');
  return `<div class="card ro-mortgage-card"><h3>Your mortgage</h3>
      <dl class="ro-mortgage-facts">
        <div><dt>Loan amount</dt><dd>${money(r.program.loan)}</dd></div>
        <div><dt>Rate and term</dt><dd>${terms}</dd></div>
        <div><dt>Monthly mortgage payment</dt><dd>${money(first.payment)}</dd></div>
        <div><dt>Total paid each month, all-in</dt><dd>${money(first.paid)}</dd></div>
      </dl>
      <div class="ro-table-wrap"><table class="data-table ro-mortgage-year"><caption>What you pay each month, by year of your stay (first month of each year)</caption>
        <thead><tr><th scope="col">Year</th><th scope="col">Mortgage payment</th><th scope="col">of which interest</th><th scope="col">of which principal</th><th scope="col">Tax, insurance, upkeep</th><th scope="col">Paid each month</th><th scope="col">Loan balance (year end)</th></tr></thead>
        <tbody>${body}</tbody></table></div>
      <p class="hint">The mortgage payment is principal and interest. Tax, insurance and upkeep include mortgage insurance, HOA dues and extra utilities when you entered them.${arm ? ' An ARM&rsquo;s payment changes at each rate reset.' : ''}${r.program.financed ? ` The financed ${r.program.feeName} is part of the loan amount.` : ''}</p></div>`;
}
