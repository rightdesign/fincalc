// Model and input definitions for the compound interest calculator. Pure (no DOM) so it runs
// under node; compound-app.js owns the page.
export const COMPOUND_INPUTS_KEY = 'fincalc.compound';
export const MAX_YEARS = 100;

// Sensible bounds for the percent inputs that can run away. Negative return and inflation are allowed
// (a losing investment, deflation); the floors keep (1 + rate) and (1 + inflation) well above zero.
export const LIMITS = {
  rate: { min: -20, max: 30 },
  stepUp: { min: 0, max: 20 },
  variance: { min: 0, max: 15 },
  inflation: { min: -10, max: 30 },
};

// Text for the allowed range of a limited input, e.g. "-20 to 30".
export const limitText = (id) => `${LIMITS[id].min} to ${LIMITS[id].max}`;

// kind: 'money' ($), 'percent' (%), 'years', 'choice'. slider adds a range input beside the box.
export const COMPOUND_FIELDS = [
  { id: 'start', label: 'Starting balance', kind: 'money', default: 10000, slider: { min: 0, max: 500000, step: 1000 }, hint: 'What you have invested today. Enter 0 if you are starting from nothing.' },
  { id: 'monthly', label: 'Monthly contribution', kind: 'money', default: 500, slider: { min: 0, max: 5000, step: 50 }, hint: 'What you add every month (end or beginning, set below). Enter 0 for a one-time lump sum.' },
  { id: 'contributeYears', label: 'Contribute for (years)', kind: 'years', default: 30, slider: { min: 0, max: 60, step: 1 }, hint: 'How many years you keep adding the monthly contribution. After that the balance keeps compounding, with no new money, until the end of Years. It follows Years unless you change it, and cannot be longer than Years.' },
  { id: 'stepUp', label: 'Increase contribution each year (%)', kind: 'percent', default: 0, slider: { min: 0, max: 10, step: 0.5 }, hint: 'Raises the monthly contribution by this percent at the start of each year after the first, like a raise or a cost-of-living bump. 0 keeps it flat. It only applies while you are still contributing.' },
  { id: 'rate', label: 'Annual return (%)', kind: 'percent', default: 7, slider: { min: 0, max: 15, step: 0.1 }, hint: 'The yearly growth you expect before inflation and taxes. Negative is allowed for a losing investment (-20 to 30). Stocks have averaged about 7–10% over the long run; savings accounts earn far less. Typical planning range 3–8%.' },
  {
    id: 'rateBasis', label: 'Return is quoted as', kind: 'choice', default: 'effective',
    hint: 'Effective means the balance grows by exactly this percent over a year, however often interest is added: 9% turns $100 into $109. This is how long-run market returns are quoted. Nominal (APR) is the rate before compounding, as loans and CDs quote it: 9% compounded monthly adds 0.75% a month and grows 9.38% a year.',
    options: [{ value: 'effective', label: 'Effective annual rate (APY)' }, { value: 'nominal', label: 'Nominal rate (APR)' }],
  },
  { id: 'variance', label: 'Return range (± percentage points)', kind: 'percent', default: 0, slider: { min: 0, max: 5, step: 0.5 }, hint: 'Optional. Shows the result at the annual return minus and plus this many percentage points. With a 9% return and this set to 2, the chart shades the range between a 7% and an 11% return, and the results state the balance range. 0 shows a single line.' },
  { id: 'years', label: 'Years', kind: 'years', default: 30, slider: { min: 1, max: 60, step: 1 }, hint: `How long the money stays invested. Whole years, 1–${MAX_YEARS}.` },
  {
    id: 'frequency', label: 'Compounding', kind: 'choice', default: 'monthly',
    hint: 'How often interest is added to the balance. An effective annual return grows by that percent over a year whatever you pick here; with a nominal rate, monthly adds one twelfth of the rate each month; annually adds the full rate once a year, and semiannually and quarterly split the year the same way (contributions made inside a period earn simple interest until it ends). Daily and continuous compounding grow the balance a little faster than monthly.',
    options: [{ value: 'annually', label: 'Annually' }, { value: 'semiannually', label: 'Semiannually' }, { value: 'quarterly', label: 'Quarterly' }, { value: 'monthly', label: 'Monthly' }, { value: 'daily', label: 'Daily' }, { value: 'continuous', label: 'Continuously' }],
  },
  {
    id: 'timing', label: 'Contributions made', kind: 'choice', default: 'end',
    hint: 'End of month: each contribution lands after that month\'s interest, so it starts earning the next month. Beginning of month: it lands first and earns interest for the whole month, worth about one extra month of growth per contribution.',
    options: [{ value: 'end', label: 'End of month' }, { value: 'start', label: 'Beginning of month' }],
  },
  { id: 'taxRate', label: 'Tax on interest (%)', kind: 'percent', default: 0, slider: { min: 0, max: 50, step: 1 }, hint: 'Your marginal tax rate on the interest and dividends a taxable account pays out. Each period\'s interest is reduced by this rate before it compounds forward, so the results are after tax. Leave at 0 for a tax-free or tax-deferred account, or to ignore tax. 0–100%.' },
  { id: 'inflation', label: 'Inflation (% per year)', kind: 'percent', default: 3, slider: { min: 0, max: 10, step: 0.1 }, hint: "Used only for the today's-dollars view: each year's balance is divided by (1 + inflation) for every year that has passed. The long-run US average is about 3%. Negative is allowed for deflation (-10 to 30)." },
  {
    id: 'basis', label: 'Show results in', kind: 'choice', default: 'future',
    hint: "Future dollars are the plain amounts you will see on the statement. Today's dollars restate the balance in what it could buy at today's prices.",
    options: [{ value: 'future', label: 'Future dollars' }, { value: 'today', label: "Today's dollars" }],
  },
];

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
    else if (f.id === 'years' && (!Number.isInteger(x) || x < 1 || x > MAX_YEARS)) bad.push(f.label);
    else if (f.id === 'contributeYears' && !Number.isInteger(x)) bad.push(f.label);
  }
  return bad;
}

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

// Years for a lump sum to double at the effective annual rate, after tax on the interest
// (null when the rate leaves nothing to compound).
export function yearsToDouble(v) {
  const net = (effectiveAnnualRate(v) / 100) * (1 - (v.taxRate ?? 0) / 100);
  return net > 0 ? Math.log(2) / Math.log1p(net) : null;
}

// Text for the "Time to double" tile: the big value and its caption.
export function doubleTileText(v) {
  const years = yearsToDouble(v);
  if (years === null) return { value: 'Never', caption: 'Needs a positive return after tax' };
  return {
    value: `${years < 10 ? years.toFixed(1) : Math.round(years)} years`,
    caption: `Money invested at the ${effectiveAnnualRate(v).toFixed(2)}% effective rate${v.taxRate > 0 ? ', after tax' : ''}`,
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
  const keep = 1 - (v.taxRate ?? 0) / 100;
  const early = v.timing === 'start';
  const payYears = contributionYears(v);
  // Interest rate earned over one month when compounding at least monthly.
  // The tax comes off each period's interest, so for k >= 12 it scales the rate itself.
  const rm = r * keep;
  const monthRate = k === 12 ? rm / 12 : k === Infinity ? Math.expm1(rm / 12) : (1 + rm / k) ** (k / 12) - 1;
  const span = 12 / k;
  let balance = v.start;
  let contributed = v.start;
  const years = [];
  for (let y = 1; y <= v.years; y++) {
    const open = balance;
    let interest = 0;
    let added = 0;
    const monthly = y <= payYears ? v.monthly * (1 + (v.stepUp ?? 0) / 100) ** (y - 1) : 0;
    if (k >= 12) {
      for (let m = 1; m <= 12; m++) {
        if (early) balance += monthly;
        const i = balance * monthRate;
        balance += i + (early ? 0 : monthly);
        interest += i;
        added += monthly;
      }
    } else {
      for (let p = 0; p < k; p++) {
        const periodOpen = balance;
        let periodInterest = periodOpen * (r / k);
        let periodAdded = 0;
        for (let j = 1; j <= span; j++) { periodInterest += monthly * (r / k) * ((span - j + (early ? 1 : 0)) / span); periodAdded += monthly; }
        periodInterest *= keep;
        balance = periodOpen + periodAdded + periodInterest;
        interest += periodInterest;
        added += periodAdded;
      }
    }
    contributed += added;
    years.push({ year: y, contributions: added, interest, balance, totalContributed: contributed, totalInterest: balance - contributed });
  }
  const last = years[years.length - 1];
  return { years, start: v.start, futureValue: last.balance, contributed: last.totalContributed, interest: last.totalInterest };
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
  if (!(v.years > WAIT_YEARS)) return null;
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
  const years = r.years.map((y) => {
    const f = (1 + inflation / 100) ** y.year;
    const balance = y.balance / f;
    const contributions = y.contributions / f;
    const totalContributed = prevContributed + contributions;
    const interest = balance - prevBalance - contributions;
    prevBalance = balance;
    prevContributed = totalContributed;
    return { ...y, contributions, interest, balance, totalContributed, totalInterest: balance - totalContributed };
  });
  const last = years[years.length - 1];
  return { ...r, years, futureValue: last.balance, contributed: last.totalContributed, interest: last.totalInterest };
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
    { id: 'monthly', label: `+${usd.format(LEVER_STEPS.monthly)} a month`, values: { ...v, monthly: v.monthly + LEVER_STEPS.monthly } },
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
  if (!(v.monthly > 0) || pay >= v.years) return '';
  return pay === 0 ? 'you made no monthly contributions, so only your starting balance grew' : `you contributed for the first ${pay === 1 ? 'year' : `${pay} years`}, then let it grow`;
}

export function headline(v, r) {
  const yrs = `${v.years} year${v.years === 1 ? '' : 's'}`;
  if (r.contributed === 0) return `After ${yrs}, nothing has been invested yet.`;
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
    const afterTax = v.rate * (1 - (v.taxRate ?? 0) / 100);
    const eff = v.basis === 'today' ? ((1 + afterTax / 100) / (1 + v.inflation / 100) - 1) * 100 : afterTax;
    const pct = (n) => String(Math.round(n * 100) / 100);
    const adjusts = [v.taxRate > 0 && 'tax', v.basis === 'today' && 'inflation'].filter(Boolean);
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
    const lateStop = contributionYears(v) <= firstN && v.monthly > 0 ? ' with no new contributions' : '';
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
