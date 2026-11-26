import { compareRentOwn, RENTOWN_FIELDS } from '../rentown.js';
import { money, word } from './format.js';

// The five inputs a reader asks about first, each tried a step below and above the entered value.
export const TORNADO_INPUTS = [
  { id: 'rate', label: 'Mortgage rate', step: 1, unit: '%' },
  { id: 'growth', label: 'Home value growth', step: 2, unit: '%' },
  { id: 'rentGrowth', label: 'Rent growth', step: 2, unit: '%' },
  { id: 'investment', label: 'Investment return', step: 2, unit: '%' },
  { id: 'years', label: 'Stay length', step: 3, unit: ' years' },
];

const field = (id) => RENTOWN_FIELDS.find((f) => f.id === id);
const clamp = (x, f) => Math.min(f.max ?? Infinity, Math.max(f.min, x));
const num = (n) => Number(n.toFixed(2));

// Low / base / high for each input: the break-even year and how far ahead owning is at the end of the stay.
// Break-even is the first year owning is ahead if you sold then; it does not depend on the stay, so stay length
// moves only the end-of-stay gap, which is why the bars use the gap.
export function tornadoRows(v) {
  const point = (id, x) => {
    const r = compareRentOwn({ ...v, [id]: x });
    return { value: x, breakEven: r.chartBreakEven, span: r.chartAheadSpan, gap: r.final.difference };
  };
  const rows = TORNADO_INPUTS.map((t) => {
    const f = field(t.id);
    const low = point(t.id, clamp(v[t.id] - t.step, f));
    const base = point(t.id, v[t.id]);
    const high = point(t.id, clamp(v[t.id] + t.step, f));
    return { ...t, low, base, high, swing: Math.abs(high.gap - low.gap) };
  });
  const top = Math.max(...rows.map((r) => r.swing));
  return rows.map((r) => ({ ...r, top: top > 0 && r.swing === top })).sort((a, b) => b.swing - a.swing);
}

// Owning wins a whole-year stay only from the first year whose end month is ahead (ceil) to the last (floor), as the Table tab shows.
const aheadYears = (span) => {
  const from = Math.ceil(span.startMonth / 12);
  const to = Math.floor(span.endMonth / 12);
  return to < from ? null : from === to ? `year ${from} only` : `years ${from} to ${to} only`;
};
const year = (p) => (p.breakEven != null ? `year ${p.breakEven}` : (p.span && aheadYears(p.span)) || 'never');
const at = (t, p) => `${num(p.value)}${t.unit}`;

export function tornadoCard({ v }) {
  const rows = tornadoRows(v);
  const max = Math.max(...rows.map((r) => r.swing), 1);
  const base = rows[0].base;
  const body = rows.map((r) => {
    const lo = Math.min(r.low.gap, r.high.gap);
    const hi = Math.max(r.low.gap, r.high.gap);
    const width = (r.swing / max) * 100;
    const label = r.top ? `${r.label} <strong>(moves the answer most)</strong>` : r.label;
    return `<tr><th scope="row">${label}</th>
        <td>${at(r, r.low)}: ${year(r.low)}</td><td>${at(r, r.base)}: ${year(r.base)}</td><td>${at(r, r.high)}: ${year(r.high)}</td>
        <td class="ro-tornado-bar-cell"><span class="ro-tornado-bar" style="width:${width.toFixed(1)}%" aria-hidden="true"></span> ${money(lo)} to ${money(hi)}</td></tr>`;
  }).join('');
  return `<section class="card ro-tornado"><h2>Which input moves the answer most</h2>
      <p>Each input is moved down and up on its own, holding the rest as entered. The break-even year is when owning first pulls ahead if you sold then (${year(base)} at your inputs). The bar is the range of how far owning is ahead after ${word(v.years, 'year')}, in future dollars; a negative amount means renting is ahead.</p>
      <div class="scroll-wrap"><table class="data-table"><thead><tr><th scope="col">Input</th><th scope="col">Lower</th><th scope="col">Entered</th><th scope="col">Higher</th><th scope="col">Owning ahead after your stay</th></tr></thead><tbody>${body}</tbody></table></div></section>`;
}
