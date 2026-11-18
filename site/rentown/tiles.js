import { durationText } from '../rentown.js';
import { money, signed } from './format.js';

// Three at-a-glance figures under the answer: what each path leaves you with, and when owning pulls ahead.
export function tilesCard({ v, r, final, label }) {
  const when = r.chartBreakEvenMonth == null ? `Not within ${Math.max(30, v.years)} years` : durationText(r.chartBreakEvenMonth);
  return `<div class="tile-row ro-tiles">
      <div class="tile"><h3>Owning leaves you</h3><p class="big">${money(final.own)}</p><p>After ${v.years} ${v.years === 1 ? 'year' : 'years'}, ${label}</p></div>
      <div class="tile"><h3>Renting leaves you</h3><p class="big">${money(final.rent)}</p><p>${signed(final.rent - final.own)} vs owning</p></div>
      <div class="tile"><h3>Owning pulls ahead</h3><p class="big">${when}</p><p>Stay at least this long to come out ahead</p></div>
    </div>`;
}
