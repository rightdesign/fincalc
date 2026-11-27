// Model and input definitions for the compound interest calculator. Pure (no DOM) so it runs
// under node; compound-app.js owns the page.
export const COMPOUND_INPUTS_KEY = 'fincalc.compound';
export const MAX_YEARS = 100;

// How often the regular contribution is made: times per year, and the words that name it.
export const CONTRIB_PERIODS = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12, quarterly: 4, annually: 1 };
const CONTRIB_OPTIONS = [{ value: 'weekly', label: 'Weekly' }, { value: 'biweekly', label: 'Biweekly' }, { value: 'semimonthly', label: 'Semimonthly' }, { value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }, { value: 'annually', label: 'Annually' }];
const CONTRIB_UNIT = { weekly: 'a week', biweekly: 'every two weeks', semimonthly: 'twice a month', monthly: 'a month', quarterly: 'a quarter', annually: 'a year' };
// What you put in, as a phrase: "$500 a month", or "$100 a week plus $5,000 a year" with an annual lump sum.
export function contributionPhrase(v, fmt) {
  const parts = [];
  if (v.monthly > 0 || !(v.annual > 0)) parts.push(`${fmt(v.monthly)} ${contribUnit(v)}`);
  if (v.annual > 0) parts.push(`${fmt(v.annual)} a year`);
  return parts.join(' plus ');
}
// The year-by-year table's caption: when in each contribution period the money goes in.
const CONTRIB_PERIOD_NAME = { weekly: 'week', biweekly: 'two-week period', semimonthly: 'half-month', monthly: 'month', quarterly: 'quarter', annually: 'year' };
export function yearsCaption(v) {
  const when = v.timing === 'start' ? 'beginning' : 'end';
  const period = CONTRIB_PERIOD_NAME[v.contribFrequency] ?? CONTRIB_PERIOD_NAME.monthly;
  return `Year by year (contributions at the ${when} of each ${period}${v.annual > 0 ? `, the annual lump sum at the ${when} of each year` : ''})`;
}
// True when any money goes in after the start: a regular contribution or an annual lump sum.
export const contributes = (v) => v.monthly > 0 || v.annual > 0;
// "a month", "a week", "every two weeks" ... for sentences like "$500 a month".
export const contribUnit = (v) => CONTRIB_UNIT[v.contribFrequency] ?? CONTRIB_UNIT.monthly;

// Sensible bounds for the percent inputs that can run away. Negative return and inflation are allowed
// (a losing investment, deflation); the floors keep (1 + rate) and (1 + inflation) well above zero.
export const LIMITS = {
  rate: { min: -20, max: 30 },
  stepUp: { min: 0, max: 20 },
  annualStepUp: { min: 0, max: 20 },
  withdrawStep: { min: 0, max: 20 },
  withdrawFrom: { min: 1, max: MAX_YEARS },
  withdrawPercent: { min: 0, max: 100 },
  variance: { min: 0, max: 15 },
  inflation: { min: -10, max: 30 },
};

// Text for the allowed range of a limited input, e.g. "-20 to 30".
export const limitText = (id) => `${LIMITS[id].min} to ${LIMITS[id].max}`;

// Yearly dividend, as a percent of the balance, that a taxable stock account pays and is taxed on.
export const DIVIDEND_YIELD = 2;

// slider.curve: 2 makes the slider non-linear (finer at the low end) so a wide range stays usable.
// kind: 'money' ($), 'percent' (%), 'years', 'choice'. slider adds a range input beside the box.
export const COMPOUND_FIELDS = [
  { id: 'start', label: 'Starting balance', kind: 'money', default: 10000, slider: { min: 0, max: 10000000, step: 1000, curve: 2 }, hint: 'What you have invested today. Enter 0 if you are starting from nothing.' },
  { id: 'monthly', label: 'Contribution', kind: 'money', default: 500, slider: { min: 0, max: 100000, step: 50, curve: 2 }, hint: 'What you add each time you contribute, as often as Contribution frequency says (monthly unless you change it; end or beginning of the period, set below). Enter 0 for a one-time lump sum.' },
  { id: 'years', label: 'Years', kind: 'years', default: 30, slider: { min: 1, max: MAX_YEARS, step: 1 }, hint: `How long the money stays invested. Whole years, 1–${MAX_YEARS}.` },
  {
    id: 'contribFrequency', advanced: true, label: 'Contribution frequency', kind: 'choice', default: 'monthly',
    hint: 'How often the contribution above is made. Weekly is 52 times a year, biweekly 26 (every two weeks), semimonthly 24 (twice a month), quarterly 4 and annually once. Each deposit is placed at its real time in the year, so a weekly saver earns a little more than the same yearly total added monthly.',
    options: CONTRIB_OPTIONS,
  },
  { id: 'annual', advanced: true, label: 'Annual lump sum', kind: 'money', default: 0, slider: { min: 0, max: 1000000, step: 500, curve: 2 }, hint: 'Optional. A separate amount you add once a year on top of the regular contribution, like an IRA deposit or a bonus. It lands at the start of each year when contributions are made at the beginning of the period, and at the end of each year otherwise. 0 means none.' },
  { id: 'annualStepUp', advanced: true, label: 'Increase annual lump sum each year (%)', kind: 'percent', default: 0, slider: { min: 0, max: 10, step: 0.5 }, hint: 'Raises the annual lump sum by this percent each year after the first. 0 keeps it flat. It only applies while you are still contributing.' },
  { id: 'contributeYears', advanced: true, label: 'Contribute for (years)', kind: 'years', default: 30, slider: { min: 0, max: MAX_YEARS, step: 1 }, hint: 'How many years you keep adding the contribution and the annual lump sum. After that the balance keeps compounding, with no new money, until the end of Years. It follows Years unless you change it, and cannot be longer than Years.' },
  { id: 'stepUp', advanced: true, label: 'Increase contribution each year (%)', kind: 'percent', default: 0, slider: { min: 0, max: 10, step: 0.5 }, hint: 'Raises the regular contribution by this percent at the start of each year after the first, like a raise or a cost-of-living bump. 0 keeps it flat. It only applies while you are still contributing.' },
  {
    id: 'withdrawMode', advanced: true, label: 'Withdraw', kind: 'choice', default: 'amount',
    hint: 'A fixed dollar amount each time, a percent of the balance at the moment of each withdrawal, or a percent of the interest earned since the previous withdrawal (nothing is taken if that interest is negative). The amount below is used for the fixed mode; the percent below for the other two.',
    options: [{ value: 'amount', label: 'A fixed amount' }, { value: 'percentBalance', label: 'A percent of the balance' }, { value: 'percentEarnings', label: 'A percent of the earnings' }],
  },
  { id: 'withdrawal', advanced: true, label: 'Withdrawal amount', kind: 'money', default: 0, slider: { min: 0, max: 5000, step: 50 }, hint: 'Optional. The fixed amount you take out each time, at the same point in the month as contributions (set below). How often is set by Withdraw every. Enter 0 for no withdrawals. It is capped at what is left, so the balance never goes below zero, and the results say when it runs out. To model saving first and spending later, set Contribute for and Start withdrawing to match. Only used when Withdraw is a fixed amount.' },
  { id: 'withdrawPercent', advanced: true, label: 'Withdrawal percent (%)', kind: 'percent', default: 0, slider: { min: 0, max: 10, step: 0.1 }, hint: 'The percent taken each time when Withdraw is a percent of the balance or of the earnings (0-100). Remember it applies to every withdrawal, so 1% a month is far more than 1% a year. Only used for those two modes.' },
  {
    id: 'withdrawFreq', advanced: true, label: 'Withdraw every', kind: 'choice', default: 'monthly',
    hint: 'How often the withdrawal is taken. Quarterly, half-yearly and yearly withdrawals happen in the last month of each 3, 6 or 12 months (the first month of each when contributions are at the beginning of the month), counted from the start of year 1, and a withdrawal only happens once the start year is reached.',
    options: [{ value: 'monthly', label: 'Month' }, { value: 'quarterly', label: 'Quarter' }, { value: 'semiannually', label: 'Half year' }, { value: 'yearly', label: 'Year' }],
  },
  { id: 'withdrawFrom', advanced: true, label: 'Start withdrawing in year', kind: 'years', default: 1, slider: { min: 1, max: 60, step: 1 }, hint: 'The year withdrawals begin (1 is the first year). Contributions and withdrawals can overlap. A year after the end of Years means no withdrawals are taken. Only used when the monthly withdrawal is above 0.' },
  { id: 'withdrawStep', advanced: true, label: 'Increase withdrawal each year (%)', kind: 'percent', default: 0, slider: { min: 0, max: 10, step: 0.5 }, hint: 'Raises a fixed withdrawal by this percent at the start of each year after the first withdrawal year, for example to keep up with inflation. 0 keeps it flat. Not used for the percent modes.' },
  { id: 'rate', label: 'Annual return (%)', kind: 'percent', default: 7, slider: { min: 0, max: 15, step: 0.1 }, hint: 'The yearly growth you expect before inflation and taxes. Negative is allowed for a losing investment (-20 to 30). Stocks have averaged about 7–10% over the long run; savings accounts earn far less. Typical planning range 3–8%.' },
  {
    id: 'rateBasis', advanced: true, label: 'Return is quoted as', kind: 'choice', default: 'effective',
    hint: 'Effective means the balance grows by exactly this percent over a year, however often interest is added: 9% turns $100 into $109. This is how long-run market returns are quoted. Nominal (APR) is the rate before compounding, as loans and CDs quote it: 9% compounded monthly adds 0.75% a month and grows 9.38% a year.',
    options: [{ value: 'effective', label: 'Effective annual rate (APY)' }, { value: 'nominal', label: 'Nominal rate (APR)' }],
  },
  { id: 'variance', advanced: true, label: 'Return range (± percentage points)', kind: 'percent', default: 0, slider: { min: 0, max: 5, step: 0.5 }, hint: 'Optional. Shows the result at the annual return minus and plus this many percentage points. With a 9% return and this set to 2, the chart shades the range between a 7% and an 11% return, and the results state the balance range. 0 shows a single line.' },
  {
    id: 'frequency', advanced: true, label: 'Compounding', kind: 'choice', default: 'monthly',
    hint: 'How often interest is added to the balance. An effective annual return grows by that percent over a year whatever you pick here; with a nominal rate, monthly adds one twelfth of the rate each month; annually adds the full rate once a year, and semiannually and quarterly split the year the same way (contributions made inside a period earn simple interest until it ends). Daily and continuous compounding grow the balance a little faster than monthly.',
    options: [{ value: 'annually', label: 'Annually' }, { value: 'semiannually', label: 'Semiannually' }, { value: 'quarterly', label: 'Quarterly' }, { value: 'monthly', label: 'Monthly' }, { value: 'daily', label: 'Daily' }, { value: 'continuous', label: 'Continuously' }],
  },
  {
    id: 'timing', advanced: true, label: 'Contributions made', kind: 'choice', default: 'end',
    hint: 'End of period: each contribution lands after that period\'s interest, so it starts earning the next period. Beginning of period: it lands first and earns interest for the whole period (a week, a month, a quarter or a year, as the frequency says), worth about one extra period of growth per contribution.',
    options: [{ value: 'end', label: 'End of period' }, { value: 'start', label: 'Beginning of period' }],
  },
  {
    id: 'accountType', advanced: true, label: 'Account type', kind: 'choice', default: 'interest',
    hint: 'How the money is taxed. Taxable, interest: each period\'s interest is taxed as it is earned (a savings account, CD or bonds). Tax-free: nothing is taxed (a Roth IRA). Tax-deferred: nothing is taxed until you withdraw, so the whole balance is taxed at the end (a 401(k) or traditional IRA). Taxable, stocks: a small yearly dividend (' + DIVIDEND_YIELD + '% of the balance) is taxed each year and the rest of the gain is taxed when you sell at the end. Results are the after-tax balance.',
    options: [{ value: 'interest', label: 'Taxable: interest' }, { value: 'stocks', label: 'Taxable: stocks' }, { value: 'deferred', label: 'Tax-deferred (401(k), traditional IRA)' }, { value: 'free', label: 'Tax-free (Roth)' }],
  },
  { id: 'taxRate', advanced: true, label: 'Tax rate (%)', kind: 'percent', default: 0, slider: { min: 0, max: 50, step: 1 }, hint: 'Your tax rate for the account type above: on each period\'s interest (taxable, interest), on the dividends and the final gain (taxable, stocks), or on the whole balance at the end (tax-deferred). Ignored for tax-free. At 0 nothing is taxed. 0–100%.' },
  { id: 'inflation', advanced: true, label: 'Inflation (% per year)', kind: 'percent', default: 3, slider: { min: 0, max: 10, step: 0.1 }, hint: "Shown next to the result as the balance in today's dollars, and used for the tables and chart when Show results in is Today's dollars: each year's balance is divided by (1 + inflation) for every year that has passed. The long-run US average is about 3%. Negative is allowed for deflation (-10 to 30)." },
  {
    id: 'basis', advanced: true, label: 'Show results in', kind: 'choice', default: 'future',
    hint: "Future dollars are the plain amounts you will see on the statement. Today's dollars restate the balance in what it could buy at today's prices.",
    options: [{ value: 'future', label: 'Future dollars' }, { value: 'today', label: "Today's dollars" }],
  },
];

// The Advanced inputs whose value differs from its default (Contribute for is measured against Years,
// which it follows), so the page can badge the disclosure when something hidden is changing the result.
export function advancedChanged(v) {
  return COMPOUND_FIELDS.filter((f) => f.advanced && v[f.id] !== (f.id === 'contributeYears' ? v.years : f.default)).map((f) => f.label);
}

// A curved slider is positions 0..SLIDER_STEPS mapped to min..max along a power curve.
export const SLIDER_STEPS = 1000;
export function sliderValue(f, pos) {
  const { min, max, step, curve } = f.slider;
  if (!curve) return Number(pos);
  const raw = min + (max - min) * (Number(pos) / SLIDER_STEPS) ** curve;
  return Math.min(max, Math.max(min, Math.round(raw / step) * step));
}
export function sliderPos(f, n) {
  const { min, max, curve } = f.slider;
  if (!curve) return n;
  const t = Math.min(1, Math.max(0, (n - min) / (max - min)));
  return Math.round(t ** (1 / curve) * SLIDER_STEPS);
}

// A preset sets only the inputs it names (its label spells them out) and leaves the rest as the user had them.
export const COMPOUND_PRESETS = [
  { id: 'retirement', label: 'Retirement saver: $500/month, 7%, 30 years', values: { monthly: 500, rate: 7, years: 30 } },
  { id: 'first100k', label: 'First $100K: $250/month, 7%, 15 years', values: { monthly: 250, rate: 7, years: 15 } },
  { id: 'college', label: 'College fund: $300/month, 6%, 18 years', values: { monthly: 300, rate: 6, years: 18 } },
  { id: 'stopearly', label: 'Contribute, then let it grow: $500/month, 7%, contribute 20 years, 30 years', values: { monthly: 500, rate: 7, contributeYears: 20, years: 30 } },
];

export function compoundDefaults() {
  const v = {};
  for (const f of COMPOUND_FIELDS) v[f.id] = f.default;
  return v;
}

// Plain-number read of a typed amount: commas, spaces and a dollar sign are ignored.
export function parseNumber(raw) {
  const text = String(raw ?? '').replace(/[\s$,%]/g, '');
  return text === '' ? NaN : Number(text);
}

// Names of the fields whose value cannot be used, for an "Enter a valid value for" message.
export function invalidCompound(v) {
  const bad = [];
  for (const f of COMPOUND_FIELDS) {
    const x = v[f.id];
    if (f.kind === 'choice') { if (!f.options.some((o) => o.value === x)) bad.push(f.label); continue; }
    const lim = LIMITS[f.id];
    if (!Number.isFinite(x) || x < (lim ? lim.min : 0) || (lim && x > lim.max)) bad.push(f.label);
    else if (f.id === 'taxRate' && x > 100) bad.push(f.label);
    else if ((f.id === 'years' || f.id === 'withdrawFrom') && (!Number.isInteger(x) || x < 1 || x > MAX_YEARS)) bad.push(f.label);
    else if (f.id === 'contributeYears' && !Number.isInteger(x)) bad.push(f.label);
  }
  return bad;
}

// Months between withdrawals for each frequency choice.
export const WITHDRAW_MONTHS = { monthly: 1, quarterly: 3, semiannually: 6, yearly: 12 };

// Whether the plan takes money out at all: a fixed amount above 0, or a percent above 0 in the percent modes.
export const withdrawsOn = (v) => ((v.withdrawMode ?? 'amount') === 'amount' ? v.withdrawal > 0 : v.withdrawPercent > 0);

// How many years the monthly contribution runs: never more than Years, and all of them when unset.
export const contributionYears = (v) => Math.min(v.contributeYears ?? v.years, v.years);

// Compounding periods per year for each frequency choice.
export const PERIODS_PER_YEAR = { annually: 1, semiannually: 2, quarterly: 4, monthly: 12, daily: 365, continuous: Infinity };

export const frequencyLabel = (f) => COMPOUND_FIELDS.find((x) => x.id === 'frequency').options.find((o) => o.value === f).label;

// The frequency the "other choice" comparison uses: annually against monthly, everything else against monthly.
export const altFrequency = (f) => (f === 'monthly' ? 'annually' : 'monthly');

// The nominal yearly rate that compounds k times a year to the stated rate. An effective (APY) rate
// is converted so the balance grows by exactly that much in a year; a nominal (APR) rate is used as is.
export function nominalRate(rate, k, basis) {
  if (basis === 'nominal' || rate === 0) return rate;
  return k === Infinity ? Math.log1p(rate) : k * ((1 + rate) ** (1 / k) - 1);
}

// The yearly growth the stated rate really produces once it compounds (the APY), as a percent.
export function effectiveAnnualRate(v) {
  const k = PERIODS_PER_YEAR[v.frequency] ?? 12;
  const nom = nominalRate(v.rate / 100, k, v.rateBasis);
  return 100 * (k === Infinity ? Math.expm1(nom) : (1 + nom / k) ** k - 1);
}

// The percent of each period's interest taken as tax: only a taxable interest account is taxed as it grows.
export const interestTax = (v) => ((v.accountType ?? 'interest') === 'interest' ? (v.taxRate ?? 0) : 0);

// The yearly growth money really gets, as percents: the effective rate, then after tax on the
// interest, then (only in today's dollars) after inflation too. `net` is the last one that applies.
export function growthRates(v) {
  const effective = effectiveAnnualRate(v);
  const afterTax = effective * (1 - interestTax(v) / 100);
  const real = v.basis === 'today' ? ((1 + afterTax / 100) / (1 + (v.inflation ?? 0) / 100) - 1) * 100 : null;
  return { effective, afterTax, real, net: real ?? afterTax };
}

// Years for a lump sum to double at the rate it really grows (after tax, and after inflation in
// today's dollars); null when that rate leaves nothing to compound.
export function yearsToDouble(v) {
  const net = growthRates(v).net / 100;
  return net > 0 ? Math.log(2) / Math.log1p(net) : null;
}

// Text for the "Time to double" tile: the big value and its caption.
export function doubleTileText(v) {
  const years = yearsToDouble(v);
  const adjusts = [interestTax(v) > 0 && 'tax', v.basis === 'today' && 'inflation'].filter(Boolean).join(' and ');
  if (years === null) return { value: 'Never', caption: `Needs a positive return after ${adjusts || 'tax'}` };
  const rate = growthRates(v).net;
  return {
    value: `${years < 10 ? years.toFixed(1) : Math.round(years)} years`,
    caption: adjusts ? `Money growing ${rate.toFixed(2)}% a year, after ${adjusts}` : `Money invested at the ${rate.toFixed(2)}% effective rate`,
  };
}

// Year-by-year growth. The monthly contribution rises by stepUp percent each year after the first.
// Interest is taxed at taxRate as it is earned (each month's interest when compounding
// monthly or more often; each period's interest otherwise), so only the after-tax part joins the balance
// and compounds; interest, totalInterest and the balances are all after tax. Contributions are made at the end of each month, or the beginning when
// timing is 'start'. Compounding every month or more often grows the balance by a monthly factor
// (monthly adds rate/12 of the balance each month; daily and continuous use their equivalent
// monthly factor); a beginning-of-month contribution is added first, so it earns that month too.
// Annual, semiannual and quarterly compounding add rate/periods to the balance at the start of the
// period once per period, while the period's contributions earn simple interest (rate/periods x
// months remaining / months in the period, one more month each when made at the beginning of the
// month) that joins the balance when the period ends.
export function simulateCompound(v) {
  const k = PERIODS_PER_YEAR[v.frequency];
  const r = nominalRate(v.rate / 100, k, v.rateBasis);
  const keep = 1 - interestTax(v) / 100;
  const type = v.accountType ?? 'interest';
  const t = (v.taxRate ?? 0) / 100;
  const div = type === 'stocks' ? DIVIDEND_YIELD / 100 : 0;
  // Value after the tax a sale or withdrawal would trigger; basis is what has been paid in (plus reinvested dividends).
  const after = (bal, basis) => (type === 'deferred' ? bal * (1 - t) : type === 'stocks' ? bal - t * Math.max(0, bal - basis) : bal);
  let basis = v.start;
  let shown = after(v.start, basis);
  const early = v.timing === 'start';
  const payYears = contributionYears(v);
  const n = CONTRIB_PERIODS[v.contribFrequency] ?? 12;
  // Interest rate earned over one month when compounding at least monthly.
  // The tax comes off each period's interest, so for k >= 12 it scales the rate itself.
  const rm = r * keep;
  const monthRate = k === 12 ? rm / 12 : k === Infinity ? Math.expm1(rm / 12) : (1 + rm / k) ** (k / 12) - 1;
  const slots = k >= 12 ? 12 : k;
  // Where a deposit at fraction t of the year falls: its slot, and how far into it (0..1).
  const place = (t) => {
    const pos = t * slots;
    const slot = Math.min(slots - 1, Math.max(0, early ? Math.floor(pos + 1e-9) : Math.ceil(pos - 1e-9) - 1));
    return { slot, tau: Math.min(1, Math.max(0, pos - slot)) };
  };
  const regular = Array.from({ length: n }, (_, i) => place((early ? i : i + 1) / n));
  const lump = place(early ? 0 : 1);
  const span = 12 / k;
  const wStart = v.withdrawFrom ?? 1;
  const wBase = v.withdrawal ?? 0;
  const mode = v.withdrawMode ?? 'amount';
  const wEvery = WITHDRAW_MONTHS[v.withdrawFreq ?? 'monthly'];
  const wPct = (v.withdrawPercent ?? 0) / 100;
  // Interest earned since the last withdrawal (or the plan's start), for the percent-of-earnings mode.
  let earned = 0;
  let balance = v.start;
  let contributed = v.start;
  let withdrawn = 0;
  let runsOut = null;
  const years = [];
  // The same run month by month (for the monthly schedule). Below monthly compounding, interest
  // joins the balance only when its period ends, so it shows up in that period's last month.
  const months = [];
  const pushMonth = (y, m, contributions, withdrawals, interest, bal, paid, paidOut) => months.push({ month: (y - 1) * 12 + m, year: y, contributions, withdrawals, interest, balance: bal, totalContributed: paid, totalWithdrawn: paidOut, totalInterest: bal - paid + paidOut });
  for (let y = 1; y <= v.years; y++) {
    let interest = 0;
    let added = 0;
    let taken = 0;
    const paying = y <= payYears;
    const amount = paying ? v.monthly * (1 + (v.stepUp ?? 0) / 100) ** (y - 1) : 0;
    const lumpSum = paying ? (v.annual ?? 0) * (1 + (v.annualStepUp ?? 0) / 100) ** (y - 1) : 0;
    const yearAmount = wBase * (1 + (v.withdrawStep ?? 0) / 100) ** (y - wStart);
    // What month m of this year asks to take out, given the cash on hand. Zero outside the start year and off the withdrawal schedule.
    const wantAt = (m, cash) => {
      const abs = (y - 1) * 12 + m;
      if (y < wStart || (early ? (abs - 1) % wEvery : abs % wEvery) !== 0) return 0;
      return mode === 'amount' ? yearAmount : mode === 'percentBalance' ? Math.max(cash, 0) * wPct : Math.max(earned, 0) * wPct;
    };
    // After a month's interest and withdrawal: a withdrawal month restarts the earnings count, as does any month before withdrawals begin.
    const settle = (m) => { if (y < wStart || (early ? ((y - 1) * 12 + m - 1) % wEvery : ((y - 1) * 12 + m) % wEvery) === 0) earned = 0; };
    // Money landing in each slot as [amount, tau] pairs.
    const deposits = Array.from({ length: slots }, () => []);
    for (const d of regular) deposits[d.slot].push([amount, d.tau]);
    if (lumpSum > 0) deposits[lump.slot].push([lumpSum, lump.tau]);
    for (let s = 0; s < slots; s++) {
      const paid = deposits[s].reduce((sum, [a]) => sum + a, 0);
      // Cash on hand for a withdrawal at fraction tauW of the slot: the deposits made by then (the balance is added by the caller).
      const landed = (tauW) => deposits[s].reduce((sum, [a, tau]) => sum + (tau <= tauW + 1e-9 ? a : 0), 0);
      if (k >= 12) {
        // Deposits at the slot start join the balance before its interest; the rest earn simple interest for what remains.
        let i = balance * monthRate + deposits[s].reduce((sum, [a, tau]) => sum + a * (1 - tau) * monthRate, 0);
        // The withdrawal is taken at the same point in the month as contributions and never exceeds the cash on hand.
        const tauW = early ? 0 : 1;
        if (!early) earned += i;
        const cash = balance + landed(tauW) + (early ? 0 : i);
        const want = wantAt(s + 1, cash);
        const got = want > 0 ? Math.min(want, Math.max(cash, 0)) : 0;
        if (got < want && !runsOut) runsOut = { year: y, month: (y - 1) * 12 + s + 1 };
        i -= got * monthRate * (1 - tauW);
        if (early) earned += i;
        balance += i + paid - got;
        settle(s + 1);
        interest += i;
        taken += got;
        added += paid;
        pushMonth(y, s + 1, paid, got, i, balance, contributed + added, withdrawn + taken);
      } else {
        const periodOpen = balance;
        let periodInterest = balance * (r / k) + deposits[s].reduce((sum, [a, tau]) => sum + a * (r / k) * (1 - tau), 0);
        let periodTaken = 0;
        const gots = [];
        for (let j = 1; j <= span; j++) {
          // Interest is simple within the period, so a month's withdrawal is limited to the cash on hand
          // (the opening balance plus deposits made by then, less what was already taken) and never drives the interest below zero.
          const tauW = (early ? j - 1 : j) / span;
          const cash = periodOpen + landed(tauW) - periodTaken;
          earned += periodOpen * (r / k) * keep / span;
          const want = wantAt((s * span) + j, cash);
          const got = want > 0 ? Math.min(want, Math.max(cash, 0)) : 0;
          settle((s * span) + j);
          if (got < want && !runsOut) runsOut = { year: y, month: (y - 1) * 12 + s * span + j };
          periodInterest -= got * (r / k) * (1 - tauW);
          periodTaken += got;
          gots.push(got);
        }
        periodInterest *= keep;
        const takenBefore = periodTaken;
        balance = periodOpen + paid - periodTaken + periodInterest;
        // A negative return can leave the period short even after the cash cap; what could not be covered was never paid out.
        if (balance < 0 && periodTaken > 0) {
          const short = Math.min(-balance, periodTaken);
          periodTaken -= short;
          balance += short;
          if (!runsOut) runsOut = { year: y, month: (y - 1) * 12 + (s + 1) * span };
        }
        if (Math.abs(balance) < 1e-9) balance = 0;
        // Spread the period's deposits and withdrawals over its months (withdrawals scaled if the clamp above trimmed them); interest lands in the last month.
        const monthOf = ([, tau]) => Math.min(span, Math.max(1, early ? Math.floor(tau * span + 1e-9) + 1 : Math.ceil(tau * span - 1e-9)));
        const paidIn = Array.from({ length: span }, () => 0);
        for (const d of deposits[s]) paidIn[monthOf(d) - 1] += d[0];
        const scale = takenBefore > 0 ? periodTaken / takenBefore : 1;
        let cumPaid = 0;
        let cumTaken = 0;
        for (let j = 1; j <= span; j++) {
          const w = (gots[j - 1] ?? 0) * scale;
          cumPaid += paidIn[j - 1];
          cumTaken += w;
          pushMonth(y, s * span + j, paidIn[j - 1], w, j === span ? periodInterest : 0, periodOpen + cumPaid - cumTaken + (j === span ? periodInterest : 0), contributed + added + cumPaid, withdrawn + taken + cumTaken);
        }
        interest += periodInterest;
        taken += periodTaken;
        added += paid;
      }
    }
    contributed += added;
    withdrawn += taken;
    basis += added;
    if (div > 0) {
      // Dividends are taxed each year; what is left is reinvested and counts as money paid in.
      const paid = balance * div;
      balance -= paid * t;
      basis += paid * (1 - t);
    }
    const value = after(balance, basis);
    if (type === 'deferred' || type === 'stocks') interest = value - shown - added + taken;
    shown = value;
    years.push({ year: y, contributions: added, withdrawals: taken, interest, balance: value, totalContributed: contributed, totalWithdrawn: withdrawn, totalInterest: value - contributed + withdrawn });
  }
  const last = years[years.length - 1];
  return { years, months, start: v.start, futureValue: last.balance, contributed: last.totalContributed, withdrawn, runsOut, interest: last.totalInterest };
}

// Best and worst case: the same plan at the return minus and plus the variance (never below the lowest return the page accepts),
// in the dollars the results are shown in. Null when no variance is set.
export function returnRange(v) {
  if (!(v.variance > 0)) return null;
  const run = (rate) => {
    const r = simulateCompound({ ...v, rate });
    return v.basis === 'today' ? inTodaysDollars(r, v.inflation) : r;
  };
  const lowRate = Math.max(LIMITS.rate.min, v.rate - v.variance);
  const highRate = v.rate + v.variance;
  return { lowRate, highRate, low: run(lowRate), high: run(highRate) };
}

export const WAIT_YEARS = 10;

// The same plan run twice for the same end date: starting now, and starting WAIT_YEARS later (so
// WAIT_YEARS fewer years of the same contribution, return and compounding). Null when the horizon
// is not longer than the wait, because there is nothing left to compare. In today's-dollars mode
// both balances (which land on the same date) are divided by (1 + inflation)^years and the gap is
// recomputed from them; what was contributed is restated the same way, each at the year it was paid.
export function compareStartingLater(v) {
  if (!(v.years > WAIT_YEARS) || withdrawsOn(v)) return null;
  const now = simulateCompound(v);
  const later = simulateCompound({ ...v, years: v.years - WAIT_YEARS });
  const deflate = v.basis === 'today' ? (1 + v.inflation / 100) ** v.years : 1;
  const today = v.basis === 'today';
  // Dollars paid at calendar year t are divided by (1 + inflation)^t; the later plan's year 1 is year WAIT_YEARS + 1.
  const paid = (r, offset) => (today ? r.years.reduce((sum, y) => sum + y.contributions / (1 + v.inflation / 100) ** (y.year + offset), r.start / (1 + v.inflation / 100) ** offset) : r.contributed);
  const nowContributed = paid(now, 0);
  const laterContributed = paid(later, WAIT_YEARS);
  const nowBalance = now.futureValue / deflate;
  const laterBalance = later.futureValue / deflate;
  return {
    waitYears: WAIT_YEARS,
    todaysDollars: v.basis === 'today',
    now: { futureValue: nowBalance, contributed: nowContributed },
    later: { futureValue: laterBalance, contributed: laterContributed },
    gap: nowBalance - laterBalance,
    extraContributed: nowContributed - laterContributed,
  };
}

// The same years with every dollar restated in today's dollars: each year's balance and that year's
// contributions are divided by (1 + inflation)^year, the starting balance is already in today's
// dollars, and interest is the real balance minus the real contributions (negative when inflation
// outruns the return). Each year's interest is the real change in balance less what was added.
export function inTodaysDollars(r, inflation) {
  let prevBalance = r.start;
  let prevContributed = r.start;
  let prevWithdrawn = 0;
  const years = r.years.map((y) => {
    const f = (1 + inflation / 100) ** y.year;
    const balance = y.balance / f;
    const contributions = y.contributions / f;
    const withdrawals = (y.withdrawals ?? 0) / f;
    const totalContributed = prevContributed + contributions;
    const totalWithdrawn = prevWithdrawn + withdrawals;
    const interest = balance - prevBalance - contributions + withdrawals;
    prevBalance = balance;
    prevContributed = totalContributed;
    prevWithdrawn = totalWithdrawn;
    return { ...y, contributions, withdrawals, interest, balance, totalContributed, totalWithdrawn, totalInterest: balance - totalContributed + totalWithdrawn };
  });
  // Months are restated to match: balances at (1 + inflation)^(month / 12), contributions at their year's factor as above,
  // so each December equals its year row.
  let prevM = r.start;
  let paidM = r.start;
  let outM = 0;
  const months = r.months.map((m) => {
    const balance = m.balance / (1 + inflation / 100) ** (m.month / 12);
    const contributions = m.contributions / (1 + inflation / 100) ** m.year;
    const withdrawals = (m.withdrawals ?? 0) / (1 + inflation / 100) ** m.year;
    paidM += contributions;
    outM += withdrawals;
    const interest = balance - prevM - contributions + withdrawals;
    prevM = balance;
    return { ...m, balance, contributions, withdrawals, interest, totalContributed: paidM, totalWithdrawn: outM, totalInterest: balance - paidM + outM };
  });
  const last = years[years.length - 1];
  return { ...r, years, months, futureValue: last.balance, contributed: last.totalContributed, withdrawn: last.totalWithdrawn, interest: last.totalInterest };
}

// The final balance split four ways: the starting balance, the contributions, and the interest each earned.
// The plan is linear in what goes in, so the contributions' share is the same plan run with no starting
// balance, and the starting balance's share is the rest. inflation (percent) restates every part in today's
// dollars at the horizon; null leaves them nominal. An interest part is negative when inflation outruns the return.
export function balanceBreakdown(v, inflation = null) {
  const run = (plan) => { const r = simulateCompound(plan); return inflation == null ? r : inTodaysDollars(r, inflation); };
  const whole = run(v);
  const added = run({ ...v, start: 0 });
  // Withdrawals come out of the same pot as contributions, so the contributions' part is net of them.
  const put = whole.contributed - v.start - (whole.withdrawn ?? 0);
  const fromContributions = added.futureValue;
  const fromStart = whole.futureValue - fromContributions;
  return { start: v.start, contributions: put, startInterest: fromStart - v.start, contributionInterest: fromContributions - put, total: whole.futureValue, withdrawn: whole.withdrawn ?? 0 };
}

// What each choice is worth: the same plan with the other compounding frequency, and with the other
// contribution timing. gap is the plan as entered minus the alternative, in the same dollars as r.
export function choiceEffects(v, r, inflation) {
  const flip = (change) => {
    const alt = simulateCompound({ ...v, ...change });
    const f = (inflation == null ? alt : inTodaysDollars(alt, inflation)).futureValue;
    return { futureValue: f, gap: r.futureValue - f };
  };
  return {
    frequency: { ...flip({ frequency: altFrequency(v.frequency) }), alt: altFrequency(v.frequency) },
    timing: { ...flip({ timing: v.timing === 'end' ? 'start' : 'end' }), alt: v.timing === 'end' ? 'start' : 'end' },
  };
}

// What moves the needle: the end balance with each lever raised on its own, next to the base case.
// Figures are in the dollars the results are shown in (inflation-adjusted when basis is 'today').
// Each row also carries extra, the money you would put in beyond the base case, because the levers
// cost different amounts and so are not ranked against each other.
// The extra years stop at MAX_YEARS, and the row says how many were actually added.
export const LEVER_STEPS = { monthly: 100, rate: 1, years: 5 };

export function leverTable(v) {
  const finalBalance = (x) => {
    const r = simulateCompound(x);
    return (x.basis === 'today' ? inTodaysDollars(r, x.inflation) : r).futureValue;
  };
  const base = finalBalance(v);
  const baseContributed = simulateCompound(v).contributed;
  const extraYears = Math.min(LEVER_STEPS.years, MAX_YEARS - v.years);
  const levers = [
    { id: 'monthly', label: `+${usd.format(LEVER_STEPS.monthly)} ${contribUnit(v)}`, values: { ...v, monthly: v.monthly + LEVER_STEPS.monthly } },
    { id: 'rate', label: `+${LEVER_STEPS.rate} point of annual return`, values: { ...v, rate: v.rate + LEVER_STEPS.rate } },
  ];
  if (extraYears > 0) levers.push({ id: 'years', label: `+${extraYears} year${extraYears === 1 ? '' : 's'}`, values: { ...v, years: v.years + extraYears, ...(contributionYears(v) === v.years && { contributeYears: v.years + extraYears }) } });
  const rows = levers.map((l) => {
    const balance = finalBalance(l.values);
    return { id: l.id, label: l.label, balance, gain: balance - base, extra: simulateCompound(l.values).contributed - baseContributed };
  });
  return { base, rows };
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// "About" amounts round to the nearest thousand when large, the nearest hundred otherwise.
export function roundedMoney(n) {
  const step = Math.abs(n) >= 10000 ? 1000 : 100;
  return usd.format(Math.round(n / step) * step);
}

// Names the shape when contributions stop before the end; empty when they run throughout or there is nothing to stop.
function stopNote(v) {
  const pay = contributionYears(v);
  if (!contributes(v) || pay >= v.years) return '';
  return pay === 0 ? `you made no ${v.contribFrequency === 'monthly' && !(v.annual > 0) ? 'monthly ' : ''}contributions, so only your starting balance grew` : `you contributed for the first ${pay === 1 ? 'year' : `${pay} years`}, then let it grow`;
}

export function headline(v, r) {
  const yrs = `${v.years} year${v.years === 1 ? '' : 's'}`;
  if (r.contributed === 0) return `After ${yrs}, nothing has been invested yet.`;
  if (r.withdrawn > 0) {
    const today = v.basis === 'today' ? " in today's dollars" : '';
    const end = r.runsOut ? `the money runs out in year ${r.runsOut.year}` : `${roundedMoney(r.futureValue)} is left${today}`;
    return `After ${yrs}, you put in ${usd.format(r.contributed)} and took out ${usd.format(r.withdrawn)}${today}; ${end}.`;
  }
  if (v.basis === 'today') {
    const gap = r.interest >= 0 ? `about ${roundedMoney(r.interest)} more than you put in` : `about ${roundedMoney(-r.interest)} less than you put in`;
    return `After ${yrs}, your ${usd.format(r.contributed)} becomes about ${roundedMoney(r.futureValue)} in today's dollars — ${stopNote(v) || gap}.`;
  }
  return `After ${yrs}, your ${usd.format(r.contributed)} becomes about ${roundedMoney(r.futureValue)} — ${stopNote(v) || `about ${roundedMoney(r.interest)} of it is interest`}.`;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Year-end balance, with year 0 being the starting balance.
const balanceAt = (v, r, year) => (year === 0 ? v.start : r.years[year - 1].balance);

// The balance passes each doubling milestone (100,000, 200,000, 400,000 ...) in a given year.
// A small final balance starts the ladder lower so there is always something to show.
export function doublingMilestones(v, r) {
  const final = r.futureValue;
  const base = [100000, 10000, 1000].find((b) => final >= b);
  if (!base) return [];
  const out = [];
  let prev = 0;
  for (let amount = base; amount <= final; amount *= 2) {
    if (v.start >= amount) continue;
    const year = r.years.find((y) => y.balance >= amount).year;
    out.push({ amount, year, after: year - prev });
    prev = year;
  }
  return out;
}

// The four "why compounding is so powerful" points, built from the live inputs. Each is
// { id, title, text } in plain English; a point that does not apply to the inputs is left out.
export function compoundingExplainer(v, r) {
  const points = [];
  const first = r.years[0];
  const last = r.years[r.years.length - 1];
  points.push({
    id: 'interest-on-interest',
    title: 'Interest earns interest',
    text: v.rate > 0
      ? `In year 1 your money earns ${roundedMoney(first.interest)}. By year ${v.years} it earns ${roundedMoney(last.interest)} in a single year, because it is paid on a much bigger balance. Each year's growth is paid on everything that came before, so growth speeds up instead of staying level.`
      : 'At a 0% return nothing grows on its own: your balance is only what you put in. Raise the return to see interest start earning interest.',
  });
  if (v.rate > 0) {
    // The rate the model actually compounds at: after tax, and after inflation in today's dollars.
    const afterTax = v.rate * (1 - interestTax(v) / 100);
    const eff = v.basis === 'today' ? ((1 + afterTax / 100) / (1 + v.inflation / 100) - 1) * 100 : afterTax;
    const pct = (n) => String(Math.round(n * 100) / 100);
    const adjusts = [interestTax(v) > 0 && 'tax', v.basis === 'today' && 'inflation'].filter(Boolean);
    const used = eff === v.rate ? `${pct(v.rate)}%` : `${pct(eff)}% (your ${pct(v.rate)}% return after ${adjusts.join(' and ')})`;
    const intro = 'Divide 72 by the return and you get roughly how many years it takes money to double';
    if (eff > 0) {
      const doubling = 72 / eff;
      const shown = doubling >= 10 ? String(Math.round(doubling)) : doubling.toFixed(1);
      points.push({
        id: 'rule-of-72',
        title: 'The Rule of 72',
        text: `${intro}: 72 ÷ ${pct(eff)} ≈ ${shown} years. At ${used} your money doubles about every ${shown} years, and each doubling is bigger than the last.`,
      });
    } else {
      points.push({
        id: 'rule-of-72',
        title: 'The Rule of 72',
        text: `${intro}. After ${adjusts.join(' and ')}, your ${pct(v.rate)}% return grows your money at ${pct(eff)}% a year, so it never doubles.`,
      });
    }
  }
  const lastN = Math.floor(v.years / 3);
  if (lastN >= 1 && v.rate > 0) {
    const firstN = v.years - lastN;
    const early = balanceAt(v, r, firstN);
    const late = last.balance - early;
    const lateStop = contributionYears(v) <= firstN && contributes(v) ? ' with no new contributions' : '';
    points.push({
      id: 'back-loaded',
      title: 'The payoff comes late',
      text: `Your last ${plural(lastN, 'year')} add about ${roundedMoney(late)}${lateStop}, ${late > early ? 'more than' : 'compared with'} the ${roundedMoney(early)} your first ${plural(firstN, 'year')} built. The money you invest early does the most work, because it has the most time left to compound.`,
    });
  }
  const milestones = doublingMilestones(v, r);
  if (milestones.length > 1) {
    const faster = milestones.slice(1).every((m, i) => m.after < milestones[i].after);
    const steps = milestones.map((m, i) => `${roundedMoney(m.amount)} in year ${m.year}${i > 0 ? ` (${plural(m.after, 'year')} after the last)` : v.start > 0 ? ` (${plural(m.after, 'year')} from your ${roundedMoney(v.start)} start)` : ''}`);
    points.push({
      id: 'milestones',
      title: faster ? 'Each doubling comes faster' : 'When your balance doubles',
      text: `Your balance passes ${steps.join(', then ')}. ${faster ? 'After the first, each doubling takes fewer years than the one before it, because growth starts to outweigh what you contribute.' : ''}`.trim(),
    });
  }
  return points;
}

// Only values that differ from the defaults are written, so links stay short. Contribute for is written unless the link is already default for both it and Years (the decoder reads an absent value as Years), even when it equals Years, so a link keeps the plan if Years is edited later.
export function encodeCompound(v) {
  const d = compoundDefaults();
  const p = new URLSearchParams();
  for (const f of COMPOUND_FIELDS) {
    if (v[f.id] == null || Number.isNaN(v[f.id])) continue;
    if (f.id === 'contributeYears') { const held = Math.min(v[f.id], v.years); if (held !== d[f.id] || v.years !== d.years) p.set(f.id, String(held)); continue; }
    if (v[f.id] !== d[f.id]) p.set(f.id, String(v[f.id]));
  }
  return p.toString();
}

// Anything absent, unknown or unreadable falls back to the default. Never throws.
export function decodeCompound(text) {
  const v = compoundDefaults();
  let p;
  try { p = new URLSearchParams(String(text ?? '').replace(/^[#?]/, '')); } catch { return v; }
  for (const f of COMPOUND_FIELDS) {
    if (!p.has(f.id) || f.id === 'contributeYears') continue;
    const raw = p.get(f.id);
    if (f.kind === 'choice') { if (f.options.some((o) => o.value === raw)) v[f.id] = raw; continue; }
    const n = parseNumber(raw);
    const lim = LIMITS[f.id];
    if (Number.isFinite(n) && n >= (lim ? lim.min : 0) && !(lim && n > lim.max)) v[f.id] = n;
  }
  // Absent means "as long as Years"; a value past Years is held to it.
  const given = parseNumber(p.get('contributeYears'));
  v.contributeYears = Number.isInteger(given) && given >= 0 ? Math.min(given, v.years) : v.years;
  return v;
}
