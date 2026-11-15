import { compareScenarios } from '../rentown.js';
import { money, pct } from './format.js';

export function scenariosCard({ v, today, label }) {
  const scenarioRows = compareScenarios(v).map((s) => { const d = today ? s.differenceReal : s.difference; return `<tr><th scope="row">${s.label}</th><td>${pct(s.growth)}</td><td>${pct(s.rentGrowth)}</td><td>${pct(s.investment)}</td><td>${s.breakEven == null ? 'Not within stay' : `Year ${s.breakEven}`}</td><td>${d >= 0 ? 'Owning' : 'Renting'} ${money(Math.abs(d))}</td></tr>`; }).join('');
  return `<div class="ro-table-wrap"><table class="m-table ro-scenarios"><caption>What if the growth rates are different? Ahead after ${v.years} ${v.years === 1 ? 'year' : 'years'}, ${label}</caption>
      <thead><tr><th scope="col">Case</th><th scope="col">Home growth</th><th scope="col">Rent growth</th><th scope="col">Investment return</th><th scope="col">Break-even</th><th scope="col">Ahead</th></tr></thead>
      <tbody>${scenarioRows}</tbody></table></div>`;
}
