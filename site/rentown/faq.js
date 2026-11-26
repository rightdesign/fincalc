import { RETURN_PRESETS } from '../rentown.js';
import { money, monthPoint, pct, word } from './format.js';
import { ratioLine } from './ratio.js';
import { solveBreakEven } from './solve.js';
import { winner } from './format.js';

// Every answer quotes the numbers on the page right now, so each is built from the inputs and the result.
export function faqItems({ v, r, final, label, span }) {
  const paper = v.view === 'unrealized';
  const stay = r.breakEven == null
    ? `Owning does not pull ahead within your ${span}.`
    : `On your inputs owning pulls ahead in ${monthPoint(r.breakEvenMonth)}, and your stay is ${span}.`;
  const tiePrice = solveBreakEven(v, 'price');
  const tieRent = solveBreakEven(v, 'rent');
  const share = ((v.rent * 12) / v.price) * 100;
  const tieShare = tieRent == null ? null : ((tieRent * 12) / v.price) * 100;
  const presets = RETURN_PRESETS.map((p) => `${p.label.split(' ')[0]} ${p.investment}%`).join(', ');
  const differ = winner(final.difference) !== winner(final.pureDifference);
  const side = (d) => (d > 0 ? 'owning' : 'renting');
  return [
    {
      q: 'How is break-even calculated?',
      a: `${paper ? "Each month the model values both paths on paper: the owner's home value less the loan balance and any major repair, against the renter's investment balance, with no selling costs and no tax on a sale." : "Each month the model values both paths as if you sold that day: the owner's home value less selling costs, the loan balance and any tax on the gain, against the renter's investments less tax on their gains."} Break-even is the first year after which owning stays ahead through the end of your stay. ${stay}`,
    },
    {
      q: 'What return should I assume on investments?',
      a: `The renter invests the down payment, closing costs and any monthly savings, so this input matters a lot. You have ${v.investment}% with a ${v.investDrag}% yearly tax drag, which leaves about ${pct(r.afterTaxReturn)} a year before tax on sale. The presets are long-run nominal averages, not forecasts (${presets}); a higher return favors renting.`,
    },
    {
      q: 'Does this include taxes?',
      a: `It includes property tax (${v.tax}% of value a year), the capital gains tax on the renter's investments (${v.capGains}%) and the tax on your home sale gain after the ${money(v.exclusion)} exclusion, which needs a stay of at least two years. It does not model income tax effects of owning, such as the mortgage interest and property tax deductions.`,
    },
    {
      q: 'What does the price-to-rent ratio mean?',
      a: `It is the home price divided by a year of rent, a quick screen. ${ratioLine(v)}. Renting wins when yearly rent is below the break-even share; here that is ${tieShare == null ? 'not found in the search range' : `${pct(Math.round(tieShare * 10) / 10)} of the price (a rent of about ${money(tieRent)} a month)`}, against your ${pct(Math.round(share * 10) / 10)}.`,
    },
    {
      q: 'Why do the two views disagree?',
      a: differ
        ? `On your inputs they do: the equal-cash view says ${side(final.difference)} comes out ahead and the pure net worth view says ${side(final.pureDifference)}. The equal-cash view credits whichever side costs less each month with investing the difference; the pure view gives neither side that credit and only compares the starting cash with the home. The headline follows the equal-cash view.`
        : `On your inputs they agree, with ${side(final.difference)} ahead in both. They can differ because the equal-cash view credits whichever side costs less each month with investing the difference, while the pure view only compares the starting cash with the home. The headline follows the equal-cash view.`,
    },
    {
      q: 'How much does the down payment matter?',
      a: `You put down ${v.down}% (${money((v.price * v.down) / 100)}) on a ${money(v.price)} home. The renter invests that money instead, so a bigger down payment trades investment growth for a smaller loan and, on a conventional loan, less mortgage insurance (PMI, ${v.pmi}% of the loan while it is above 80% of the home's value). Change the field and watch the break-even move.`,
    },
    {
      q: 'How sensitive is the answer to the mortgage rate?',
      a: `Your rate is ${v.rate}% over ${word(v.term, 'year')}. A higher rate raises the monthly cost of owning and pushes break-even later; ${tiePrice == null ? 'no home price in the search range ties owning and renting' : `at your other inputs owning ties renting after ${span} at a home price of ${money(tiePrice)} (you entered ${money(v.price)})`}. Try a different rate to see how far ${final.difference >= 0 ? 'owning' : 'renting'}'s lead of ${money(Math.abs(final.difference))} (${label}) moves.`,
    },
  ];
}

// Sources the model leans on. Dates say when the figures were last checked against them.
export const FAQ_SOURCES = [
  { name: 'Freddie Mac Primary Mortgage Market Survey (default mortgage rate)', url: 'https://www.freddiemac.com/pmms', asOf: 'November 2026' },
  { name: 'IRS Publication 523, Selling Your Home (the $250,000 / $500,000 gain exclusion and two-year test)', url: 'https://www.irs.gov/publications/p523', asOf: 'November 2026' },
  { name: 'HUD FHA Single Family Housing Policy Handbook 4000.1 (FHA mortgage insurance premiums)', url: 'https://www.hud.gov/hud-partners/single-family-handbook-4000-1', asOf: 'November 2026' },
  { name: 'VA funding fee table (VA loan funding fee)', url: 'https://www.va.gov/housing-assistance/home-loans/funding-fee-and-closing-costs/', asOf: 'November 2026' },
  { name: 'Zillow Research (rent and home value context for your metro)', url: 'https://www.zillow.com/research/', asOf: 'November 2026' },
];

export function faqCard(ctx) {
  const items = faqItems(ctx).map((i) => `<details><summary>${i.q}</summary><p>${i.a}</p></details>`).join('');
  const sources = FAQ_SOURCES.map((s) => `<li><a href="${s.url}" rel="noopener">${s.name}</a>, as of ${s.asOf}</li>`).join('');
  return `<section class="card ro-faq"><h2>Frequently asked questions</h2>${items}<h3>Sources</h3><ul>${sources}</ul></section>`;
}
