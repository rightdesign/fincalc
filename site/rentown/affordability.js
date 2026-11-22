import { money } from './format.js';

export const RAMSEY_LIMIT = 25;

// Dave Ramsey's rule: principal, interest, property tax, insurance, PMI and HOA dues together should be at most
// 25% of monthly take-home pay (the after-tax salary input, a year's worth, divided by 12). Worked from the first month's rounded dollar amounts, as shown in the monthly breakdown.
export function affordability(v, r) {
  if (v.takeHome == null || !(v.takeHome > 0)) return null;
  const m = r.monthly[0];
  const r0 = Math.round;
  const housing = r0(m.principal) + r0(m.interest) + r0(m.tax) + r0(m.insurance) + r0(m.pmi) + r0(m.hoa);
  const monthlyPay = v.takeHome / 12;
  const share = (housing / monthlyPay) * 100;
  return { housing, share, monthlyPay, limit: (monthlyPay * RAMSEY_LIMIT) / 100, over: share > RAMSEY_LIMIT };
}

export function affordabilityCard({ v, r }) {
  const a = affordability(v, r);
  const note = 'Ramsey&rsquo;s rule assumes a 15-year fixed-rate mortgage with 20% down (budget 3&ndash;4% for closing costs), after paying off other debt and building a 3&ndash;6 month emergency fund. It is a guideline, not a lender&rsquo;s test.';
  const body = a == null
    ? '<p>Enter your after-tax salary in the inputs to check your housing cost against the 25% guideline.</p>'
    : `<p class="${a.over ? 'ro-warn' : ''}"><strong>${a.over ? 'Over the 25% guideline' : 'Within the 25% guideline'}:</strong> your first-year housing cost of ${money(a.housing)} a month (principal, interest, property tax, insurance, PMI and HOA dues) is ${(Math.round(a.share * 10) / 10).toFixed(1)}% of your ${money(a.monthlyPay)} monthly take-home pay (your after-tax salary divided by 12). The 25% line is ${money(a.limit)} a month.</p>`;
  return `<div class="card ro-afford"><h3>Dave Ramsey&rsquo;s 25% rule</h3>${body}<p><small>${note}</small></p></div>`;
}
