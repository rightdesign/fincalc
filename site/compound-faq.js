import { contributionYears, inTodaysDollars, simulateCompound as simulate } from './compound.js';

// FAQ and sources for the compound interest page. Pure (no DOM). Each answer quotes the numbers on the page right now.
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const money = (n) => usd.format(Math.round(n) === 0 ? 0 : n);
const years = (n) => `${n} year${n === 1 ? '' : 's'}`;

export function faqItems(v, r) {
  const share = r.futureValue > 0 ? Math.round((r.interest / r.futureValue) * 100) : 0;
  const monthly = v.frequency === 'monthly';
  const today = v.basis === 'today';
  const gap = simulateGap(v);
  const unit = today ? " in today's dollars" : '';
  const growth = today ? 'growth after inflation' : 'interest';
  return [
    {
      q: 'What is compound interest?',
      a: `Interest earned on both your original money and the interest it has already earned. Over many years the interest on interest becomes the larger part of the total. On this page it is ${money(r.interest)} of the ${money(r.futureValue)}${unit}.`,
    },
    {
      q: 'Is 7% a realistic return?',
      a: `The S&P 500's long-run average is about 10% a year nominal, or about 7% after inflation, which is the same source the rent vs own investment presets cite. You have ${v.rate}% a year over ${years(v.years)}. Treat the return as an assumption, not a forecast: real returns swing from year to year, and a lower rate such as 4% to 5% is a sensible second scenario.`,
    },
    {
      q: 'Does compounding work with monthly contributions?',
      a: `Yes. Each contribution joins the balance and starts earning too, so every deposit compounds for the rest of the time. Your ${money(v.monthly)} a month adds up to ${money(r.contributed - v.start)} over ${years(v.years)}; with ${money(v.start)} to start, you put in ${money(r.contributed)} and ${growth} adds ${money(r.interest)} (${share}% of the ${money(r.futureValue)} total${unit}).`,
    },
    {
      q: 'What about taxes and fees?',
      a: `They are not modelled, so the ${money(r.futureValue)}${unit} is before tax and fees. Taxes on gains and fund or account fees would lower it, and a fee of even 1% a year takes a real bite out of ${years(v.years)} of growth. To allow for them, enter a return a little lower than you expect.`,
    },
    {
      q: 'What if I stop contributing?',
      a: stopAnswer(v, r, unit),
    },
    {
      q: 'What if I increase my contribution every year?',
      a: `This version does not model that: the contribution stays flat at ${money(v.monthly)} a month for ${years(contributionYears(v))}. A raise each year would add to the future value, so treat the figure here as a floor for that plan, or rerun it with a higher monthly amount.`,
    },
    {
      q: 'Does it matter whether interest compounds monthly or annually?',
      a: `A little. You have ${monthly ? 'monthly' : 'annual'} compounding, ending at ${money(r.futureValue)}${unit}; ${gap}`,
    },
    {
      q: 'What return should I use?',
      a: `Use a rate you would be comfortable planning around, and try a lower one too. Stocks have averaged about 7% to 10% a year before inflation over the long run; savings accounts and bonds earn less.`,
    },
    {
      q: "Are the results in today's dollars?",
      a: today
        ? `Yes, right now: the figures above are restated using ${v.inflation}% a year inflation, so ${money(r.futureValue)} is what the future balance could buy at today's prices. Switch "Show results in" to future dollars to see the amount you would actually hold.`
        : `Not at the moment: they are future dollars, so ${money(r.futureValue)} will buy less in ${years(v.years)} than it does now. Choose "Today's dollars" under "Show results in" to restate the balance using the inflation rate you enter (${v.inflation}% a year).`,
    },
  ];
}

// Quotes the page's plan against the same plan with contributions running the whole time (or, when
// they already do, against stopping a third of the way in).
function stopAnswer(v, r, unit) {
  const pay = contributionYears(v);
  const restate = (x) => (v.basis === 'today' ? inTodaysDollars(x, v.inflation) : x);
  if (pay < v.years) {
    const whole = restate(simulate({ ...v, contributeYears: v.years }));
    return `Your contributions stop after ${years(pay)} and the balance keeps compounding for the other ${years(v.years - pay)}, ending at ${money(r.futureValue)}${unit} on ${money(r.contributed)} contributed. Contributing for all ${years(v.years)} would end at ${money(whole.futureValue)}${unit}, so stopping early costs ${money(whole.futureValue - r.futureValue)}${unit}.`;
  }
  const cut = Math.max(1, Math.round(v.years / 3));
  if (v.years < 2 || v.monthly <= 0) return 'Set "Contribute for" below Years and the contributions end after that many years while the balance keeps compounding, with no new money, to the end.';
  const stopped = restate(simulate({ ...v, contributeYears: cut }));
  return `Right now you contribute for all ${years(v.years)}, ending at ${money(r.futureValue)}${unit}. If you stopped after ${years(cut)}, the balance would keep compounding with no new money and end at ${money(stopped.futureValue)}${unit} on ${money(stopped.contributed)} contributed. Set "Contribute for" to try your own stopping point.`;
}

// Compares the chosen frequency with the other one, quoting the gap on the page's inputs.
function simulateGap(v) {
  const today = v.basis === 'today';
  const restate = (x) => (today ? inTodaysDollars(x, v.inflation) : x);
  const mine = restate(simulate(v));
  const other = restate(simulate({ ...v, frequency: v.frequency === 'monthly' ? 'annually' : 'monthly' }));
  const diff = Math.abs(mine.futureValue - other.futureValue);
  const name = v.frequency === 'monthly' ? 'annual' : 'monthly';
  return `${name} compounding would end at ${money(other.futureValue)}, a difference of ${money(diff)}. The gap grows with the rate and the time.`;
}

// References behind the rules the model uses. Dates say when the figures were last checked against them.
export const FAQ_SOURCES = [
  { name: 'S&P Dow Jones Indices, S&P 500 (long-run average return, about 10% nominal)', url: 'https://www.spglobal.com/spdji/en/indices/equity/sp-500/', asOf: 'November 2026' },
  { name: 'Investor.gov (SEC), Compound Interest Calculator (the compounding formula)', url: 'https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator', asOf: 'November 2026' },
  { name: 'IRS Topic No. 409, Capital Gains and Losses (taxes on investment gains, not modelled)', url: 'https://www.irs.gov/taxtopics/tc409', asOf: 'November 2026' },
];

export function faqCard(v, r) {
  const items = faqItems(v, r).map((i) => `<details><summary>${i.q}</summary><p>${i.a}</p></details>`).join('');
  const sources = FAQ_SOURCES.map((s) => `<li><a href="${s.url}" rel="noopener">${s.name}</a>, as of ${s.asOf}</li>`).join('');
  return `<section class="m-card ro-faq" id="faq"><h2>Frequently asked questions</h2>${items}<h3>Sources</h3><ul>${sources}</ul></section>`;
}
