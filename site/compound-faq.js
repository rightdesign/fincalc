import {
  altFrequency,
  contribUnit,
  contributionPhrase,
  contributes,
  contributionMonths,
  frequencyLabel,
  inTodaysDollars,
  monthsText,
  simulateCompound as simulate,
  termMonths,
} from './compound.js';

// FAQ and sources for the compound interest page. Pure (no DOM). Each answer quotes the numbers on the page right now.
const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const money = (n) => usd.format(Math.round(n) === 0 ? 0 : n);

export function faqItems(v, r) {
  const share = r.futureValue > 0 ? Math.round((r.interest / r.futureValue) * 100) : 0;
  const today = v.basis === 'today';
  const gap = simulateGap(v);
  const unit = today ? " in today's dollars" : '';
  const growth = today ? 'growth after inflation' : 'interest';
  const out = r.withdrawn > 0;
  const kept = out ? ' The same withdrawals are taken in both plans.' : '';
  return [
    {
      q: 'What is compound interest?',
      a: `Interest earned on both your original money and the interest it has already earned. Over many years the interest on interest becomes the larger part of the total. ${
        out
          ? `On this page you put in ${money(r.contributed)}, took out ${money(r.withdrawn)} and earned ${money(r.interest)} in interest, leaving ${money(r.futureValue)}${unit}.`
          : `On this page it is ${money(r.interest)} of the ${money(r.futureValue)}${unit}.`
      }`,
    },
    {
      q: 'Is 7% a realistic return?',
      a: `The S&P 500's long-run average is about 10% a year nominal, or about 7% after inflation, which is the same source the rent vs own investment presets cite. You have ${v.rate}% a year over ${monthsText(termMonths(v))}. Treat the return as an assumption, not a forecast: real returns swing from year to year, and a lower rate such as 4% to 5% is a sensible second scenario.`,
    },
    {
      q: 'Does compounding work with monthly contributions?',
      a: `Yes. Each contribution joins the balance and starts earning too, so every deposit compounds for the rest of the time. Your ${contributionPhrase(v, money)} adds up to ${money(r.contributed - v.start)} over ${monthsText(termMonths(v))}; with ${money(v.start)} to start, you put in ${money(r.contributed)} and ${growth} adds ${money(r.interest)}${
        out
          ? `. You also take out ${money(r.withdrawn)}, so ${money(r.futureValue)}${unit} is left; the interest can be larger than that balance because withdrawals come out of it.`
          : ` (${share}% of the ${money(r.futureValue)} total${unit}).`
      }`,
    },
    {
      q: 'What about taxes and fees?',
      a:
        v.accountType === 'free'
          ? `This is set to a tax-free account (like a Roth IRA), so nothing is taxed and the ${money(r.futureValue)}${unit} is what you keep. ${feeSentence(v, unit)}`
          : v.taxRate > 0
            ? `Tax is modelled: with a ${v.taxRate}% tax rate on a ${accountText(v.accountType)}, the ${money(r.futureValue)}${unit} is after tax. That is ${money(untaxed(v).futureValue - r.futureValue)} lower than the same plan untaxed (${money(untaxed(v).futureValue)}${unit}). ${feeSentence(v, unit)}`
            : `Tax rate is set to 0%, so the ${money(r.futureValue)}${unit} is before tax. Choose an account type and enter your tax rate: taxable accounts are taxed as they grow or when sold, a 401(k) or traditional IRA is taxed on the whole balance at the end, and a Roth is not taxed. ${feeSentence(v, unit)}`,
    },
    {
      q: 'What if I stop contributing?',
      a: stopAnswer(v, r, unit) + kept,
    },
    {
      q: 'What if I increase my contribution every year?',
      a: increaseAnswer(v, r, unit) + kept,
    },
    {
      q: 'Does it matter how often interest compounds?',
      a: `A little. You have ${frequencyLabel(v.frequency).toLowerCase()} compounding, ending at ${money(r.futureValue)}${unit}; ${gap}`,
    },
    {
      q: 'What return should I use?',
      a: `Use a rate you would be comfortable planning around, and try a lower one too. Stocks have averaged about 7% to 10% a year before inflation over the long run; savings accounts and bonds earn less.`,
    },
    {
      q: "Are the results in today's dollars?",
      a: today
        ? `Yes, right now: the figures above are restated using ${v.inflation}% a year inflation, so ${money(r.futureValue)} is what the future balance could buy at today's prices. Switch "Show results in" to future dollars to see the amount you would actually hold.`
        : `Not at the moment: they are future dollars, so ${money(r.futureValue)} will buy less in ${monthsText(termMonths(v))} than it does now. Choose "Today's dollars" under "Show results in" to restate the balance using the inflation rate you enter (${v.inflation}% a year).`,
    },
  ];
}

// Quotes the page's plan against the same plan with contributions running the whole time (or, when
// they already do, against stopping a third of the way in).
function stopAnswer(v, r, unit) {
  const pay = contributionMonths(v);
  const term = termMonths(v);
  const restate = (x) => (v.basis === 'today' ? inTodaysDollars(x, v.inflation) : x);
  if (pay < term) {
    const whole = restate(
      simulate({ ...v, contributeYears: v.years, contributeMonths: v.months ?? 0 }),
    );
    return `Your contributions stop after ${monthsText(pay)} and the balance keeps compounding for the other ${monthsText(term - pay)}, ending at ${money(r.futureValue)}${unit} on ${money(r.contributed)} contributed. Contributing for all ${monthsText(termMonths(v))} would end at ${money(whole.futureValue)}${unit}, so stopping early costs ${money(whole.futureValue - r.futureValue)}${unit}.`;
  }
  const cut = Math.max(1, Math.round(term / 36));
  if (term < 24 || !contributes(v))
    return 'Set "Contribute for" below Years and the contributions end after that many years while the balance keeps compounding, with no new money, to the end.';
  const stopped = restate(simulate({ ...v, contributeYears: cut, contributeMonths: 0 }));
  return `Right now you contribute for all ${monthsText(termMonths(v))}, ending at ${money(r.futureValue)}${unit}. If you stopped after ${monthsText(cut * 12)}, the balance would keep compounding with no new money and end at ${money(stopped.futureValue)}${unit} on ${money(stopped.contributed)} contributed. Set "Contribute for" to try your own stopping point.`;
}

// Quotes the page's plan against the same plan with a flat contribution (or, when the plan is flat, a 3% yearly increase).
function increaseAnswer(v, r, unit) {
  const restate = (x) => (v.basis === 'today' ? inTodaysDollars(x, v.inflation) : x);
  if (!(v.monthly > 0) || contributionMonths(v) < 12)
    return 'With no regular contribution there is nothing to increase. Enter a contribution amount, then use "Increase contribution each year (%)" to raise it every year.';
  const step = v.stepUp ?? 0;
  if (step > 0) {
    const flat = restate(simulate({ ...v, stepUp: 0 }));
    const last = v.monthly * (1 + step / 100) ** (Math.ceil(contributionMonths(v) / 12) - 1);
    return `Your contribution rises ${step}% a year, from ${money(v.monthly)} ${contribUnit(v)} in year 1 to ${money(last)} ${contribUnit(v)} in year ${Math.ceil(contributionMonths(v) / 12)}, so you put in ${money(r.contributed)} and end at ${money(r.futureValue)}${unit}. Kept flat at ${money(v.monthly)} ${contribUnit(v)} it would end at ${money(flat.futureValue)}${unit}, so the increases add ${money(r.futureValue - flat.futureValue)}${unit}. Set the increase to 0 to keep it flat.`;
  }
  const raised = restate(simulate({ ...v, stepUp: 3 }));
  return `Set "Increase contribution each year (%)" to raise it. Right now it is 0%, so the contribution stays flat at ${money(v.monthly)} ${contribUnit(v)} for ${monthsText(contributionMonths(v))}, ending at ${money(r.futureValue)}${unit}. With a 3% increase each year it would end at ${money(raised.futureValue)}${unit}, ${money(raised.futureValue - r.futureValue)}${unit} more.`;
}

const accountText = (t) =>
  ({
    deferred: 'tax-deferred account (tax on the whole balance at the end)',
    stocks: 'taxable stock account (tax on yearly dividends and on the gain at the end)',
  })[t] ?? "taxable interest account (each period's interest is taxed before it compounds)";

// The same plan with no tax, in the dollars the page shows.
// The fee half of the "taxes and fees" answer: what the fee input did, or how to try one.
function feeSentence(v, unit) {
  if (!(v.fee > 0))
    return `Fees are not charged because Annual fees is 0%: enter your fund expense ratio plus any advisory fee under "Annual fees" to see what ${monthsText(termMonths(v))} of them cost.`;
  const free = simulate({ ...v, fee: 0 });
  const base = v.basis === 'today' ? inTodaysDollars(free, v.inflation) : free;
  const mine = v.basis === 'today' ? inTodaysDollars(simulate(v), v.inflation) : simulate(v);
  return `Fees are modelled too: ${v.fee}% a year, charged monthly on the balance, leaves ${money(base.futureValue - mine.futureValue)} less${unit} than the same plan with no fees (${money(base.futureValue)}${unit}).`;
}

function untaxed(v) {
  const x = simulate({ ...v, taxRate: 0 });
  return v.basis === 'today' ? inTodaysDollars(x, v.inflation) : x;
}

// Compares the chosen frequency with the other one, quoting the gap on the page's inputs.
function simulateGap(v) {
  const today = v.basis === 'today';
  const restate = (x) => (today ? inTodaysDollars(x, v.inflation) : x);
  const mine = restate(simulate(v));
  const other = restate(simulate({ ...v, frequency: altFrequency(v.frequency) }));
  const diff = Math.abs(mine.futureValue - other.futureValue);
  return `${frequencyLabel(altFrequency(v.frequency)).toLowerCase()} compounding would end at ${money(other.futureValue)}, a difference of ${money(diff)}. The gap grows with the rate and the time.`;
}

// References behind the rules the model uses. Dates say when the figures were last checked against them.
export const FAQ_SOURCES = [
  {
    name: 'S&P Dow Jones Indices, S&P 500 (long-run average return, about 10% nominal)',
    url: 'https://www.spglobal.com/spdji/en/indices/equity/sp-500/',
    asOf: 'November 2026',
  },
  {
    name: 'Investor.gov (SEC), Compound Interest Calculator (the compounding formula)',
    url: 'https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator',
    asOf: 'November 2026',
  },
  {
    name: 'IRS Topic No. 409, Capital Gains and Losses (taxes on investment gains and income)',
    url: 'https://www.irs.gov/taxtopics/tc409',
    asOf: 'November 2026',
  },
];

export function faqCard(v, r) {
  const items = faqItems(v, r)
    .map((i) => `<details><summary>${i.q}</summary><p>${i.a}</p></details>`)
    .join('');
  const sources = FAQ_SOURCES.map(
    (s) => `<li><a href="${s.url}" rel="noopener">${s.name}</a>, as of ${s.asOf}</li>`,
  ).join('');
  return `<section class="m-card ro-faq" id="faq"><h2>Frequently asked questions</h2>${items}<h3>Sources</h3><ul>${sources}</ul></section>`;
}
