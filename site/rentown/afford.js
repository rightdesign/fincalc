import { affordability, JOB_LOSS_MONTHS, OLEARY_SHARE } from '../rentown.js';
import { money } from './format.js';

// Shown only once an after-tax salary is entered.
export function affordCard({ v, r }) {
  const a = affordability(v, r);
  if (!a) return '';
  const share = Math.round(a.share * 10) / 10;
  const stress = a.months == null
    ? '<p>Enter the emergency savings you would keep after buying to see how many months of payments they would cover if you lost your job.</p>'
    : `<p><strong>Job-loss stress test:</strong> ${money(v.emergency)} of emergency savings covers about <strong>${a.months === Infinity ? 'unlimited' : Math.floor(a.months * 10) / 10} months</strong> of that housing payment. ${a.covered ? `That clears a ${JOB_LOSS_MONTHS}-month job loss.` : `That is short of a ${JOB_LOSS_MONTHS}-month job loss; you would need about ${money(a.monthly * JOB_LOSS_MONTHS - v.emergency)} more.`}</p>`;
  return `<div class="card ro-afford"><h3>Can you afford it? The ${OLEARY_SHARE}% rule</h3>
      <p>Kevin O&rsquo;Leary&rsquo;s rule of thumb is to keep housing costs below one third (${OLEARY_SHARE}%) of your after-tax pay. Your first-month mortgage payment, property tax and insurance come to <strong>${money(a.monthly)}</strong>, or <strong>${share}%</strong> of your ${money(a.income)} monthly after-tax pay.</p>
      <p>${a.over ? `<strong>Above ${OLEARY_SHARE}%:</strong> the payment is over the guideline; ${OLEARY_SHARE}% of your pay is ${money(a.maxMonthly)} a month.` : `<strong>Within ${OLEARY_SHARE}%:</strong> the payment is at or under the guideline of ${money(a.maxMonthly)} a month.`}</p>
      ${stress}</div>`;
}
