import { money } from './format.js';

// Where the gap comes from: four buckets that add up to how far renting is ahead (or behind).
export function waterfallCard({ r, v }) {
  const w = r.waterfall;
  const row = (label, n, cls = '') => `<tr${cls ? ` class="${cls}"` : ''}><th scope="row">${label}</th><td>${money(n)}</td></tr>`;
  const rec = w.recurring;
  const lines = [['Mortgage payments (interest and principal)', rec.mortgage], [r.program.insuranceName, rec.pmi], ['Property tax', rec.tax], ['Home insurance', rec.insurance], ['Maintenance', rec.maintenance], ['HOA dues', rec.hoa], ['Extra utilities', rec.utilities]]
    .filter(([, n]) => n !== 0).map(([label, n]) => row(label, n, 'ro-sub')).join('');
  const sign = w.gap >= 0 ? 'renting ahead by' : 'owning ahead by';
  return `<div class="m-card ro-waterfall"><h3>Where the difference comes from (after ${v.years} ${v.years === 1 ? 'year' : 'years'}, in future dollars)</h3>
      <table class="m-table"><tbody>
        ${row(w.upfront.fee > 0 ? 'Upfront: down payment, closing costs and the upfront fee paid in cash' : 'Upfront: down payment and closing costs', w.upfront.total)}
        ${row('Recurring: owning costs beyond renting', rec.total)}
        ${lines}
        ${row('Rent and renter&rsquo;s insurance you would have paid', -(rec.rent + rec.renterInsurance), 'ro-sub')}
        ${row('Opportunity cost: return forgone by tying up money in the home, after tax on the investments', w.opportunity.total)}
        ${row(`Money back: sale price less selling costs, loan payoff${w.moneyBack.homeTax > 0 ? ', tax on the home-sale gain' : ''} and any major repair`, -w.moneyBack.total)}
        ${w.moneyBack.homeTax > 0 ? row('Tax on the home-sale gain, already taken out of the money back above', w.moneyBack.homeTax, 'ro-sub') : ''}
        <tr><th scope="row">Total: ${sign}</th><td><strong>${money(Math.abs(w.gap))}</strong></td></tr>
      </tbody></table>
      <p>Costs of owning are counted as positive; money back reduces the total. The mortgage payments include principal, which comes back in the loan payoff line. Moving costs and the cash reserve are not part of this comparison.</p></div>`;
}
