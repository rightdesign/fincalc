import { compareMortgageTypes, compareScenarios } from '../rentown.js';
import { money, pct } from './format.js';

export function scenariosCard({ v, today, label }) {
  const scenarioRows = compareScenarios(v).map((s) => { const d = today ? s.differenceReal : s.difference; return `<tr><th scope="row">${s.label}</th><td>${pct(s.growth)}</td><td>${pct(s.rentGrowth)}</td><td>${pct(s.investment)}</td><td>${s.breakEven == null ? 'Not within stay' : `Year ${s.breakEven}`}</td><td>${d >= 0 ? 'Owning' : 'Renting'} ${money(Math.abs(d))}</td></tr>`; }).join('');
  const types = v.arm === 1 ? compareMortgageTypes(v).map((t) => { const d = today ? t.differenceReal : t.difference; return `<tr><th scope="row">${t.label}</th><td>${pct(t.startRate)}</td><td>${pct(t.peakRate)}</td><td>${money(t.firstMortgage)}</td><td>${t.breakEven == null ? 'Not within stay' : `Year ${t.breakEven}`}</td><td>${d >= 0 ? 'Owning' : 'Renting'} ${money(Math.abs(d))}</td></tr>`; }).join('') : '';
  const typeTable = types && `<div class="ro-table-wrap"><table class="data-table ro-mortgage-types"><caption>Fixed rate vs ARM, same inputs. Ahead after ${v.years} ${v.years === 1 ? 'year' : 'years'}, ${label}</caption>
      <thead><tr><th scope="col">Mortgage</th><th scope="col">Starting rate</th><th scope="col">Highest rate in your stay</th><th scope="col">Year 1 monthly P&amp;I</th><th scope="col">Break-even</th><th scope="col">Ahead</th></tr></thead>
      <tbody>${types}</tbody></table></div>`;
  return `${typeTable}<div class="ro-table-wrap"><table class="data-table ro-scenarios"><caption>What if the growth rates are different? Ahead after ${v.years} ${v.years === 1 ? 'year' : 'years'}, ${label}</caption>
      <thead><tr><th scope="col">Case</th><th scope="col">Home growth</th><th scope="col">Rent growth</th><th scope="col">Investment return</th><th scope="col">Break-even</th><th scope="col">Ahead</th></tr></thead>
      <tbody>${scenarioRows}</tbody></table></div>`;
}
