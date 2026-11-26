import { incomeConflict } from '../rentown.js';
import { money } from './format.js';

// Warns when the after-tax salary is higher than gross income, since the affordability cards below would then contradict each other.
export function incomeConflictCard({ v }) {
  const c = incomeConflict(v);
  if (!c) return '';
  return `<div class="card ro-warn ro-income-conflict"><h3>Check your income inputs</h3>
      <p><strong>Your after-tax salary (${money(c.takeHome)} a year) is higher than your gross income (${money(c.income)} a year).</strong> Pay after tax cannot exceed pay before tax, so the Ramsey 25%, 33% and 28/36 checks below may disagree with each other. Correct one of the two inputs.</p></div>`;
}
