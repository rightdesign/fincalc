import { money } from './format.js';

// Totals are summed from the rounded dollar amounts shown, so the column always adds up on the page.
const r0 = Math.round;
const shownTotals = (m) => {
  const ownCost = r0(m.interest) + r0(m.tax) + r0(m.insurance) + r0(m.pmi) + r0(m.maintenance) + r0(m.hoa) + r0(m.utilities);
  return { ownCost, ownTotal: ownCost + r0(m.principal), rentTotal: r0(m.rent) + r0(m.renterInsurance) };
};

const breakdown = (src, label, insurance) => {
  const m = { ...src, ...shownTotals(src) };
  return `<table class="data-table"><caption>${label}</caption><tbody>
        <tr><th scope="row">Mortgage interest</th><td>${money(m.interest)}</td></tr>
        <tr><th scope="row">Mortgage principal (goes to equity, not lost)</th><td>${money(m.principal)}</td></tr>
        <tr><th scope="row">Property tax</th><td>${money(m.tax)}</td></tr>
        <tr><th scope="row">Home insurance</th><td>${money(m.insurance)}</td></tr>
        ${m.pmi > 0 ? `<tr><th scope="row">${insurance}</th><td>${money(m.pmi)}</td></tr>` : ''}
        <tr><th scope="row">Maintenance</th><td>${money(m.maintenance)}</td></tr>
        ${m.hoa > 0 ? `<tr><th scope="row">HOA dues</th><td>${money(m.hoa)}</td></tr>` : ''}
        ${m.utilities > 0 ? `<tr><th scope="row">Extra utilities</th><td>${money(m.utilities)}</td></tr>` : ''}
        <tr><th scope="row">Total to own</th><td><strong>${money(m.ownTotal)}</strong></td></tr>
        <tr><th scope="row">True monthly cost excluding principal</th><td><strong>${money(m.ownCost)}</strong></td></tr>
        <tr><th scope="row">Rent</th><td>${money(m.rent)}</td></tr>
        <tr><th scope="row">Renter&rsquo;s insurance</th><td>${money(m.renterInsurance)}</td></tr>
        ${m.deposit > 0 ? `<tr><th scope="row">Security deposit (paid once, not in the total; returned when you leave)</th><td>${money(m.deposit)}</td></tr>` : ''}
        <tr><th scope="row">Total to rent</th><td><strong>${money(m.rentTotal)}</strong></td></tr>
      </tbody></table>`;
};

const yearLabel = (m) => `First month of year ${m.year}`;

export function monthlyCard({ r }) {
  const lastMonthly = r.monthly[r.monthly.length - 1];
  return `<div class="card ro-monthly"><h3>Where the monthly cost goes</h3>
      ${breakdown(r.monthly[0], yearLabel(r.monthly[0]), r.program.insuranceName)}
      ${lastMonthly.year > 1 ? breakdown(lastMonthly, yearLabel(lastMonthly), r.program.insuranceName) : ''}</div>`;
}
