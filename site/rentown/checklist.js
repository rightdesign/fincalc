import { RENTOWN_CHECKLIST } from '../rentown.js';

export function checklistCard() {
  const checklistHtml = RENTOWN_CHECKLIST.map((c) => `<li><strong>${c.label}.</strong> ${c.ask}</li>`).join('');
  return `<div class="card ro-checklist"><h3>Before you decide</h3><ul>${checklistHtml}</ul><p><small>This calculator ignores these, and they can matter more than the money.</small></p></div>`;
}
