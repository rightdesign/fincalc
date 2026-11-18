import { SOLVE_TARGETS, solveText } from './solve.js';

export function solveCard({ v }) {
  const rows = SOLVE_TARGETS.map((t) => {
    const s = solveText(v, t.id);
    const use = s.solved == null ? '' : ` <button type="button" class="no-print" data-solve="${t.id}" data-value="${s.solved}">Use this ${t.label}</button>`;
    return `<li>${s.text}${use}</li>`;
  }).join('');
  return `<section class="card ro-solve"><h2>Break-even price and rent</h2><p>Solved for you: the value that leaves owning and renting exactly even at the end of your stay, holding everything else as entered.</p><ul>${rows}</ul></section>`;
}
