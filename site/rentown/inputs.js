import { RENTOWN_FIELDS } from '../rentown.js';
import { money } from './format.js';

// Shown only in print: the inputs the results were worked from.
export function inputsCard({ v }) {
  const inputRows = RENTOWN_FIELDS.filter((f) => !f.showIf || f.showIf(v)).map((f) => `<tr><th scope="row">${f.label}</th><td>${v[f.id] == null ? 'Not entered' : f.money ? money(v[f.id]) : f.options ? (f.options.find((o) => o[0] === v[f.id]) || [])[1] : v[f.id]}</td></tr>`).join('');
  return `<div class="print-only ro-print-inputs"><table class="data-table"><caption>Your inputs</caption><tbody>${inputRows}</tbody></table></div>`;
}
