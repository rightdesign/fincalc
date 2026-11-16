// The results cards in the order the page shows them. A new card is a new module and one new line here.
import { headlineCard } from './headline.js';
import { ratioCard } from './ratio.js';
import { driversCard } from './drivers.js';
import { tornadoCard } from './tornado.js';
import { solveCard } from './solve-card.js';
import { cashCard } from './cash.js';
import { lensesCard, lensesDisagreeCard } from './lenses.js';
import { monthlyCard } from './monthly.js';
import { followCard } from './follow.js';
import { checklistCard } from './checklist.js';
import { waterfallCard } from './waterfall.js';
import { scenariosCard } from './scenarios.js';
import { inputsCard } from './inputs.js';
import { laterCard } from './later.js';
import { chartCard } from './chart.js';

export const CARDS = [
  headlineCard,
  laterCard,
  ratioCard,
  driversCard,
  tornadoCard,
  solveCard,
  cashCard,
  lensesCard,
  lensesDisagreeCard,
  monthlyCard,
  followCard,
  checklistCard,
  waterfallCard,
  scenariosCard,
  inputsCard,
  chartCard,
];

// Each card takes the context from context.js and returns its markup.
export const renderCards = (ctx) => `\n    ${CARDS.map((card) => card(ctx)).join('\n    ')}`;
