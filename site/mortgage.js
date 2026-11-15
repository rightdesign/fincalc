// Variable-rate (adjustable) mortgage model. Pure functions, no DOM.
// Rates are annual percentages; the loan is amortized monthly.

export const RATE_BASES = [
  { value: 'index', label: 'Index + margin' },
  { value: 'change', label: 'Fixed change at each reset' },
];

// Common ARM types: "5/1" is fixed for 5 years (60 months), then adjusts every 1 year (12 months).
export const ARM_PRESETS = [3, 5, 7, 10].map((years) => ({ label: `${years}/1 ARM`, fixedMonths: years * 12, adjustMonths: 12 }));

// Illustrative starting values only; the user is told to enter the current figure.
export const INDEXES = [
  { value: 'treasury1', label: '1-year Treasury', rate: 4 },
  { value: 'sofr', label: 'SOFR (30-day average)', rate: 4.3 },
  { value: 'cofi', label: 'COFI (11th District cost of funds)', rate: 3 },
  { value: 'custom', label: 'Other index', rate: null },
];

export const MORTGAGE_FIELDS = [
  { id: 'loan', label: 'Loan amount ($)', value: 400000, min: 1, money: true, slider: { min: 50000, max: 2000000, step: 5000 } },
  { id: 'term', label: 'Loan term (years)', value: 30, min: 1, max: 50, integer: true, slider: { min: 1, max: 40, step: 1 } },
  { id: 'elapsed', label: 'Months already elapsed', value: 0, min: 0, max: 599, integer: true, slider: { min: 0, max: 360, step: 1 }, hint: 'For a loan you already have: how many months you have already paid. Enter the current balance as the loan amount and keep the original term and months before the first rate change; the schedule starts where the loan is today.' },
  { id: 'initialRate', label: 'Starting interest rate (%)', value: 5.5, min: 0, max: 30, slider: { min: 0, max: 15, step: 0.125 } },
  { id: 'fixedMonths', label: 'Months before the first rate change', value: 60, min: 1, max: 600, integer: true, slider: { min: 1, max: 360, step: 1 } },
  { id: 'adjustMonths', label: 'Months between rate changes after that', value: 12, min: 1, max: 600, integer: true, slider: { min: 1, max: 120, step: 1 } },
  { id: 'rateBasis', label: 'How the rate resets', type: 'select', value: 'index', options: RATE_BASES },
  { id: 'indexName', label: 'Index', type: 'select', value: 'treasury1', options: INDEXES, showIf: (v) => v.rateBasis === 'index', hint: 'The benchmark your loan documents name. Choosing one fills in an illustrative starting value; replace it with the current published figure.' },
  { id: 'indexRate', label: 'Index value today (%)', value: 4, min: 0, max: 30, showIf: (v) => v.rateBasis === 'index', slider: { min: 0, max: 15, step: 0.125 } },
  { id: 'margin', label: 'Margin (percentage points)', value: 2.75, min: 0, max: 15, showIf: (v) => v.rateBasis === 'index', hint: 'Fixed by your loan. At each reset the new rate is the index plus this margin, before the caps and floor apply.', slider: { min: 0, max: 15, step: 0.125 } },
  { id: 'indexChange', label: 'Assumed index change per reset (percentage points)', value: 0.25, min: -10, max: 10, showIf: (v) => v.rateBasis === 'index', hint: 'Your assumption for how far the index moves between resets. Use a negative number for falling rates.', slider: { min: -5, max: 5, step: 0.125 } },
  { id: 'change', label: 'Rate change at each adjustment (percentage points)', value: 0.5, min: -10, max: 10, showIf: (v) => v.rateBasis === 'change', hint: 'Your assumption for how the rate moves each time it resets. Use a negative number for falling rates.', slider: { min: -5, max: 5, step: 0.125 } },
  { id: 'firstCap', label: 'Cap on the first adjustment (percentage points)', value: 2, min: 0, max: 30, hint: 'The most the rate can move at the first reset, up or down. Many loans allow a larger first move (a 2/1/5 loan allows 2).', slider: { min: 0, max: 10, step: 0.25 } },
  { id: 'periodicCap', label: 'Cap on each later adjustment (percentage points)', value: 2, min: 0, max: 30, hint: 'The most the rate can move at each reset after the first, up or down (a 2/1/5 loan allows 1).', slider: { min: 0, max: 10, step: 0.25 } },
  { id: 'lifetimeCap', label: 'Cap above the starting rate over the loan (percentage points)', value: 5, min: 0, max: 30, slider: { min: 0, max: 15, step: 0.25 } },
  { id: 'floor', label: 'Lowest possible rate (%)', value: 2, min: 0, max: 30, slider: { min: 0, max: 15, step: 0.125 } },
  { id: 'extra', label: 'Extra payment each month ($)', value: 0, min: 0, money: true, hint: 'Paid on top of the required payment every month and applied to the balance. It shortens the loan; the required payment is unchanged.', slider: { min: 0, max: 5000, step: 50 } },
  { id: 'ioMonths', label: 'Interest-only months at the start', value: 0, min: 0, max: 600, integer: true, hint: 'For this many months the required payment covers interest only. After that it is recalculated to repay the balance over the months left. Negative amortization (payment-option loans) is not modelled.', slider: { min: 0, max: 120, step: 1 } },
  { id: 'refiMonth', label: 'Refinance after this many months (0 = do not compare)', value: 0, min: 0, max: 600, integer: true, hint: 'Compares keeping this loan with replacing it, after this many payments, by a new fixed-rate loan.', slider: { min: 0, max: 360, step: 1 } },
  { id: 'refiRate', label: 'New fixed rate (%)', value: 5, min: 0, max: 30, showIf: (v) => v.refiMonth > 0, slider: { min: 0, max: 15, step: 0.125 } },
  { id: 'refiTerm', label: 'New loan term (years)', value: 30, min: 1, max: 50, integer: true, showIf: (v) => v.refiMonth > 0, slider: { min: 1, max: 40, step: 1 } },
  { id: 'refiCosts', label: 'Refinance closing costs ($)', value: 4000, min: 0, money: true, showIf: (v) => v.refiMonth > 0, hint: 'Paid in cash when you refinance, not added to the new loan.', slider: { min: 0, max: 30000, step: 250 } },
  { id: 'homePrice', label: 'Home price ($, optional)', value: 0, min: 0, hint: 'Optional. With a price, the down payment is the price minus the loan amount, and mortgage insurance (PMI) stops once the balance falls to 80% of it. Leave at 0 to skip.', slider: { min: 0, max: 3000000, step: 5000 } },
  { id: 'closingCosts', label: 'Closing costs ($, optional)', value: 0, min: 0, hint: 'Optional. Paid once at closing, not part of the monthly payment.', slider: { min: 0, max: 50000, step: 500 } },
  { id: 'pmiRate', label: 'PMI (% of the loan per year, optional)', value: 0, min: 0, max: 5, hint: 'Optional. Charged each month while the balance is above 80% of the home price, so it needs a home price. Leave at 0 for none.', slider: { min: 0, max: 2, step: 0.05 } },
  { id: 'propertyTax', label: 'Property tax ($ per year, optional)', value: 0, min: 0, slider: { min: 0, max: 30000, step: 100 } },
  { id: 'insurance', label: 'Homeowners insurance ($ per year, optional)', value: 0, min: 0, slider: { min: 0, max: 10000, step: 100 } },
  { id: 'hoa', label: 'HOA dues ($ per month, optional)', value: 0, min: 0, slider: { min: 0, max: 1500, step: 10 } },
];

// Parses what a person typed into a number: "$400,000" and "400000" both give 400000.
// Blank or unreadable text gives NaN.
export function parseAmount(raw) {
  const text = String(raw ?? '').replace(/[\s$,]/g, '');
  return text === '' ? NaN : Number(text);
}

// The highest rate the loan can ever reach: the starting rate plus the lifetime cap.
export const maxRate = (v) => v.initialRate + v.lifetimeCap;

export const mortgageDefaults = () => Object.fromEntries(MORTGAGE_FIELDS.map((f) => [f.id, f.value]));

// The standard amortizing payment for a balance over n months at an annual rate (%).
export function payment(balance, annualRate, months) {
  if (months <= 0) return 0;
  const r = annualRate / 100 / 12;
  return r === 0 ? balance / months : (balance * r) / (1 - (1 + r) ** -months);
}

// The rate in force after `adjustments` resets, applying the first-reset cap, the
// cap on later resets, the lifetime cap above the starting rate, and the floor.
// With index + margin the uncapped target at reset k is the index (today's value
// plus k assumed changes) plus the margin; otherwise it is the previous rate plus
// the fixed change.
export function rateAfter(v, adjustments) {
  const ceiling = v.initialRate + v.lifetimeCap;
  const floor = v.floor; // binds only at resets; the fixed period runs at the starting rate
  const byIndex = v.rateBasis === 'index';
  let rate = v.initialRate;
  for (let i = 1; i <= adjustments; i += 1) {
    const target = byIndex ? v.indexRate + v.indexChange * i + v.margin : rate + v.change;
    const cap = i === 1 ? v.firstCap : v.periodicCap;
    const step = Math.max(-cap, Math.min(cap, target - rate));
    rate = Math.min(ceiling, Math.max(floor, rate + step));
  }
  return rate;
}

// Month-by-month simulation, summed by year. Returns the yearly rows and totals,
// plus the same loan held at the starting rate for comparison. The required
// payment covers interest only for the first `ioMonths` months, then repays the
// balance over the months left; `extra` is paid on top each month, so the loan
// can end early (the rows then stop at the payoff month).
export function simulate(v) {
  const months = Math.round(v.term * 12);
  const elapsed = v.elapsed || 0;
  const fixedMonths = v.fixedMonths;
  const every = v.adjustMonths;
  const extra = v.extra || 0;
  const io = Math.min(v.ioMonths || 0, months);
  const years = [];
  const escrow = (v.propertyTax + v.insurance) / 12 + v.hoa; // fixed monthly extras
  const pmiLimit = v.homePrice * 0.8;
  let pmiMonths = 0;
  let totalPmi = 0;
  let firstPmi = 0;
  const monthly = [];
  let balance = v.loan;
  // Resets that already happened before today (an elapsed loan past its fixed period).
  let adjustments = elapsed > fixedMonths ? Math.floor((elapsed - fixedMonths - 1) / every) + 1 : 0;
  let rate = rateAfter(v, adjustments);
  let pay = io > elapsed ? balance * rate / 100 / 12 : payment(balance, rate, months - elapsed);
  let cur = null;
  for (let m = elapsed; m < months && balance > 0; m += 1) {
    const reset = m >= fixedMonths && (m - fixedMonths) % every === 0;
    if (reset) {
      adjustments += 1;
      rate = rateAfter(v, adjustments);
    }
    if (m >= io && (reset || m === Math.max(io, elapsed))) pay = payment(balance, rate, months - m);
    const interest = balance * rate / 100 / 12;
    const scheduled = m < io ? interest : pay;
    if (cur === null || m % 12 === 0) {
      cur = { year: Math.floor(m / 12) + 1, rate, payment: scheduled + extra, scheduled, interest: 0, principal: 0, balance };
      years.push(cur);
    }
    const pmi = v.homePrice > 0 && balance > pmiLimit ? v.loan * v.pmiRate / 100 / 12 : 0;
    if (pmi > 0) { pmiMonths += 1; totalPmi += pmi; }
    if (m === elapsed) firstPmi = pmi;
    const last = m === months - 1;
    const owed = Math.min(balance, extra + Math.max(0, scheduled - interest));
    const principal = last ? balance : owed;
    balance = last || balance - principal < 0.005 ? 0 : balance - principal;
    cur.interest += interest;
    cur.principal += principal;
    cur.balance = balance;
    monthly.push({ month: m + 1, rate, payment: interest + principal, scheduled, interest, principal, balance });
    cur.rate = rate; // the row shows the rate and payment in force at year end
    cur.payment = scheduled + extra;
    cur.scheduled = scheduled;
    cur.pmi = pmi; // PMI as of the year's last month
  }
  for (const y of years) y.total = y.payment + y.pmi + escrow;
  const sum = (key) => years.reduce((s, y) => s + y[key], 0);
  const remaining = months - elapsed;
  const fixedPay = payment(v.loan, v.initialRate, remaining);
  const fixedInterest = fixedPay * remaining - v.loan;
  const required = monthly.map((x) => x.scheduled);
  const maxPayment = Math.max(...required);
  const peak = required.findIndex((p) => maxPayment - p < 0.005); // within half a cent: capped months differ by float noise
  // The month the first rate change takes effect, if it is still ahead and the loan runs that long.
  // `monthly` starts at loan month elapsed + 1, so index it from today; years count from the loan's start.
  const reset = elapsed <= fixedMonths ? monthly[fixedMonths - elapsed] : undefined;
  return {
    years,
    monthly,
    months,
    remaining,
    payoffMonths: monthly.length,
    totalInterest: sum('interest'),
    totalPaid: v.loan + sum('interest'),
    firstPayment: required[0],
    escrow,
    firstPmi,
    firstTotal: required[0] + extra + firstPmi + escrow, // what goes out in month 1, extra payment included
    pmiMonths,
    totalPmi,
    hasExtras: escrow > 0 || totalPmi > 0,
    downPayment: v.homePrice > 0 ? v.homePrice - v.loan : 0,
    cashToClose: (v.homePrice > 0 ? v.homePrice - v.loan : 0) + v.closingCosts,
    maxPayment,
    maxPaymentYear: Math.floor((elapsed + peak) / 12) + 1,
    firstReset: reset && { year: Math.floor(fixedMonths / 12) + 1, payment: reset.scheduled },
    maxRate: Math.max(...years.map((y) => y.rate)),
    noReset: fixedMonths >= months, // the first change falls at or after the end of the loan
    fixed: { payment: fixedPay, totalInterest: fixedInterest },
    extraInterest: sum('interest') - fixedInterest,
  };
}

// What the totals and schedule cover, so interest already paid on an existing loan is not mistaken for part of them.
export function scopeNote(v) {
  const n = v.elapsed || 0;
  if (n <= 0) return 'Totals and schedules cover the whole loan as entered, from its first payment. If this is a loan you already have, enter the months you have already paid under \u201cMonths already elapsed\u201d.';
  return `Totals and schedules are forward-looking: they start at month ${n + 1} of the loan, and the interest and principal already paid in the first ${n} months are not included. Year numbers are the loan\u2019s own, so the table starts at year ${Math.floor(n / 12) + 1}.`;
}

// How much interest and time the monthly extra payment saves: the same loan with and without it.
export function extraSavings(v) {
  const base = simulate({ ...v, extra: 0 });
  const r = simulate(v);
  return { interestSaved: base.totalInterest - r.totalInterest, monthsSaved: base.payoffMonths - r.payoffMonths };
}

// Compares keeping the loan with refinancing it after `refiMonth` payments into a new fixed-rate
// loan (with the same monthly extra and the closing costs paid in cash). Returns null when no
// refinance is asked for or the loan is already paid off by then. `breakEvenMonths` counts months
// after the refinance until the cumulative cost of refinancing drops to the cost of staying (null if never).
export function refinance(v) {
  const k = v.refiMonth;
  if (!(k > 0)) return null;
  const stay = simulate(v);
  if (k >= stay.monthly.length) return null;
  const balance = stay.monthly[k - 1].balance;
  const n = Math.round(v.refiTerm * 12);
  const pay = payment(balance, v.refiRate, n);
  const extra = v.extra || 0;
  const rate = v.refiRate / 100 / 12;
  const stayPaid = stay.monthly.slice(k).map((m) => m.payment);
  const refiPaid = [];
  let owed = balance;
  while (owed > 0 && refiPaid.length < n) {
    const interest = owed * rate;
    const principal = refiPaid.length === n - 1 ? owed : Math.min(owed, extra + Math.max(0, pay - interest));
    refiPaid.push(interest + principal);
    owed = refiPaid.length === n || owed - principal < 0.005 ? 0 : owed - principal;
  }
  const costs = v.refiCosts || 0;
  let stayCum = 0;
  let refiCum = costs;
  let breakEvenMonths = costs <= 0 ? 0 : null;
  for (let t = 0; t < Math.max(stayPaid.length, refiPaid.length); t += 1) {
    stayCum += stayPaid[t] || 0;
    refiCum += refiPaid[t] || 0;
    if (breakEvenMonths === null && refiCum <= stayCum) breakEvenMonths = t + 1;
  }
  return {
    balance,
    stayPayment: stay.monthly[k].scheduled + extra,
    refiPayment: pay + extra,
    costs,
    stayMonths: stayPaid.length,
    refiMonths: refiPaid.length,
    stayTotal: stayCum,
    refiTotal: refiCum,
    savings: stayCum - refiCum,
    breakEvenMonths,
  };
}

// The best, expected and worst-case paths. Best: the rate falls by the full
// per-adjustment cap at every reset (down to the floor). Expected: the user's
// assumed change. Worst: it rises by the full cap at every reset (up to the
// lifetime cap). `shock` is how much the highest payment exceeds the first.
export function scenarios(v) {
  const cap = Math.max(v.firstCap, v.periodicCap);
  // Best and worst move by the full cap whatever the rate basis; expected
  // follows the user's own assumptions (index path or fixed change).
  const inputs = {
    best: { ...v, rateBasis: 'change', change: -cap },
    expected: v,
    worst: { ...v, rateBasis: 'change', change: cap },
  };
  return Object.fromEntries(Object.entries(inputs).map(([key, input]) => {
    const r = simulate(input);
    return [key, { ...r, shock: r.maxPayment / r.firstPayment - 1 }];
  }));
}

// Returns the names of fields whose values are missing or out of range.
export function invalidFields(v) {
  return MORTGAGE_FIELDS.filter((f) => {
    if (f.showIf && !f.showIf(v)) return false;
    const n = v[f.id];
    if (f.type === 'select') return !f.options.some((o) => o.value === n);
    if (f.id === 'elapsed' && Number.isFinite(n) && n >= Math.round(v.term * 12)) return true;
    return !Number.isFinite(n) || n < f.min || (f.max !== undefined && n > f.max) || (f.integer && !Number.isInteger(n));
  }).map((f) => f.label);
}

// Returns a message when the home price or PMI entries do not fit together.
export function priceProblem(v) {
  if (v.homePrice > 0 && v.homePrice < v.loan) return `The home price (${v.homePrice}) is below the loan amount (${v.loan}). Raise the price or lower the loan.`;
  if (v.pmiRate > 0 && !(v.homePrice > 0)) return 'PMI needs a home price, since it stops at 80% of the price. Enter a home price or set PMI to 0.';
  return '';
}

// Returns a message when the interest-only period swallows the whole loan, or the refinance
// month falls after the loan is paid off; '' when the loan options are consistent.
export function loanProblem(v) {
  const months = Math.round(v.term * 12);
  if (v.ioMonths >= months) return `The interest-only period (${v.ioMonths} months) must be shorter than the loan term (${months} months).`;
  if (v.refiMonth > 0 && v.refiMonth >= simulate(v).monthly.length) return `The loan is paid off before month ${v.refiMonth}, so there is nothing to refinance. Lower the refinance month.`;
  return '';
}

export const MORTGAGE_INPUTS_KEY = 'fincalc.mortgage.inputs';

// Inputs as a URL fragment (and a localStorage string) so a scenario can be
// shared and survives reload. Only values that differ from the defaults are
// written. Pure (no DOM), so it runs under node.
export function encodeMortgage(v) {
  const defaults = mortgageDefaults();
  const params = new URLSearchParams();
  for (const f of MORTGAGE_FIELDS) {
    const x = v[f.id];
    if (x === defaults[f.id]) continue;
    if (f.type === 'select' ? f.options.some((o) => o.value === x) : Number.isFinite(x)) params.set(f.id, String(x));
  }
  return params.toString();
}

// Reads an encoded string (with or without a leading # or ?) into a full set of
// values: defaults for anything absent, unknown, not a number or (for a select)
// not one of its options. Never throws.
export function decodeMortgage(text) {
  const values = mortgageDefaults();
  let params;
  try { params = new URLSearchParams(String(text ?? '').replace(/^[#?]/, '')); } catch { return values; }
  for (const f of MORTGAGE_FIELDS) {
    const raw = params.get(f.id);
    if (raw == null || raw.trim() === '') continue;
    if (f.type === 'select') {
      if (f.options.some((o) => o.value === raw)) values[f.id] = raw;
      continue;
    }
    const n = Number(raw);
    if (Number.isFinite(n)) values[f.id] = n;
  }
  return values;
}

// The calendar month `offset` months after a "YYYY-MM" start, as "YYYY-MM"; '' when the start is not valid.
export function addMonths(start, offset) {
  const m = /^(\d{4})-(\d{2})$/.exec(start || '');
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return '';
  const index = Number(m[1]) * 12 + Number(m[2]) - 1 + offset;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}
