// The results cards in the order the page shows them. A new card is a new module and one new line here.
import { headlineCard } from './headline.js';
import { ratioCard } from './ratio.js';
import { driversCard } from './drivers.js';
import { tornadoCard } from './tornado.js';
import { solveCard } from './solve-card.js';
import { cashCard } from './cash.js';
import { affordCard } from './afford.js';
import { lensesCard, lensesDisagreeCard } from './lenses.js';
import { monthlyCard } from './monthly.js';
import { followCard } from './follow.js';
import { checklistCard } from './checklist.js';
import { waterfallCard } from './waterfall.js';
import { scenariosCard } from './scenarios.js';
import { inputsCard } from './inputs.js';
import { laterCard } from './later.js';
import { netWorthChart, monthlyChart, tablePanel } from './chart.js';
import { tilesCard } from './tiles.js';
import { faqCard } from './faq.js';

// The results tabs, in order; each lists the cards it holds. Hidden panels stay in the page so printing shows them all.
export const TABS = [
  { id: 'networth', label: 'Net worth', cards: [(c) => netWorthChart(c), lensesCard, lensesDisagreeCard, laterCard] },
  { id: 'monthly', label: 'Monthly cost', cards: [(c) => monthlyChart(c), monthlyCard] },
  { id: 'difference', label: 'Where the difference comes from', cards: [waterfallCard] },
  { id: 'moves', label: 'What moves it', cards: [driversCard, tornadoCard, solveCard, scenariosCard] },
  { id: 'table', label: 'Table', cards: [tablePanel] },
];

// The answer, the three tiles and the quick screen sit above the tabs; the cash, follow-through, checklist and FAQ below.
export const ABOVE = [headlineCard, tilesCard, ratioCard];
export const BELOW = [cashCard, affordCard, followCard, checklistCard, inputsCard, faqCard];

const join = (cards, ctx) => cards.map((card) => card(ctx)).join('\n    ');

// Each card takes the context from context.js and returns its markup.
export function renderCards(ctx, tab = TABS[0].id) {
  const active = TABS.some((t) => t.id === tab) ? tab : TABS[0].id;
  const tabs = TABS.map((t) => `<button type="button" role="tab" id="ro-tab-${t.id}" aria-selected="${t.id === active}" aria-controls="ro-panel-${t.id}" tabindex="${t.id === active ? 0 : -1}">${t.label}</button>`).join('');
  const panels = TABS.map((t) => `<div role="tabpanel" id="ro-panel-${t.id}" aria-labelledby="ro-tab-${t.id}" class="results-panel"${t.id === active ? '' : ' hidden'}><h3 class="print-title">${t.label}</h3>${join(t.cards, ctx)}</div>`).join('\n    ');
  return `\n    ${join(ABOVE, ctx)}
    <div class="panel-box"><div class="tab-strip" role="tablist" aria-label="Results">${tabs}</div>
    ${panels}</div>
    ${join(BELOW, ctx)}`;
}
