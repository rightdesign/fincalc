// Variable-rate (adjustable) mortgage model. Pure functions, no DOM.
// Rates are annual percentages; the loan is amortized monthly.

export const MORTGAGE_FIELDS = [
  { id: 'loan', label: 'Loan amount ($)', value: 400000, min: 1 },
  { id: 'term', label: 'Loan term (years)', value: 30, min: 1, max: 50, integer: true },
  { id: 'initialRate', label: 'Starting interest rate (%)', value: 5.5, min: 0, max: 30 },
  { id: 'fixedMonths', label: 'Months before the first rate change', value: 60, min: 1, max: 600, integer: true },
  { id: 'adjustMonths', label: 'Months between rate changes after that', value: 12, min: 1, max: 600, integer: true },
  { id: 'change', label: 'Rate change at each adjustment (percentage points)', value: 0.5, min: -10, max: 10, hint: 'Your assumption for how the rate moves each time it resets. Use a negative number for falling rates.' },
  { id: 'firstCap', label: 'Cap on the first adjustment (percentage points)', value: 2, min: 0, max: 30, hint: 'The most the rate can move at the first reset, up or down. Many loans allow a larger first move (a 2/1/5 loan allows 2).' },
  { id: 'periodicCap', label: 'Cap on each later adjustment (percentage points)', value: 2, min: 0, max: 30, hint: 'The most the rate can move at each reset after the first, up or down (a 2/1/5 loan allows 1).' },
  { id: 'lifetimeCap', label: 'Cap above the starting rate over the loan (percentage points)', value: 5, min: 0, max: 30 },
  { id: 'floor', label: 'Lowest possible rate (%)', value: 2, min: 0, max: 30 },
];

export const mortgageDefaults = () => Object.fromEntries(MORTGAGE_FIELDS.map((f) => [f.id, f.value]));

// The standard amortizing payment for a balance over n months at an annual rate (%).
export function payment(balance, annualRate, months) {
  if (months <= 0) return 0;
  const r = annualRate / 100 / 12;
  return r === 0 ? balance / months : (balance * r) / (1 - (1 + r) ** -months);
}

// The rate in force after `adjustments` resets, applying the first-reset cap, the
// cap on later resets, the lifetime cap above the starting rate, and the floor.
export function rateAfter(v, adjustments) {
  const ceiling = v.initialRate + v.lifetimeCap;
  const stepWithin = (cap) => Math.max(-cap, Math.min(cap, v.change));
  let rate = v.initialRate;
  for (let i = 0; i < adjustments; i += 1) {
    const step = stepWithin(i === 0 ? v.firstCap : v.periodicCap);
    rate = Math.min(ceiling, Math.max(Math.min(v.floor, v.initialRate), rate + step));
  }
  return rate;
}

// Month-by-month simulation, summed by year. Returns the yearly rows and totals,
// plus the same loan held at the starting rate for comparison.
export function simulate(v) {
  const months = Math.round(v.term * 12);
  const fixedMonths = v.fixedMonths;
  const every = v.adjustMonths;
  const years = [];
  let balance = v.loan;
  let rate = v.initialRate;
  let pay = payment(balance, rate, months);
  let adjustments = 0;
  let cur = null;
  for (let m = 0; m < months; m += 1) {
    if (m >= fixedMonths && (m - fixedMonths) % every === 0) {
      adjustments += 1;
      rate = rateAfter(v, adjustments);
      pay = payment(balance, rate, months - m);
    }
    if (m % 12 === 0) {
      cur = { year: m / 12 + 1, rate, payment: pay, interest: 0, principal: 0, balance };
      years.push(cur);
    }
    const interest = balance * rate / 100 / 12;
    const principal = m === months - 1 ? balance : Math.min(balance, pay - interest);
    balance -= principal;
    cur.interest += interest;
    cur.principal += principal;
    cur.balance = Math.max(0, balance);
    if (rate !== cur.rate) { cur.rate = rate; cur.payment = pay; } // a reset mid-year shows its latest values
  }
  const sum = (key) => years.reduce((s, y) => s + y[key], 0);
  const fixedPay = payment(v.loan, v.initialRate, months);
  const fixedInterest = fixedPay * months - v.loan;
  const payments = years.map((y) => y.payment);
  return {
    years,
    totalInterest: sum('interest'),
    firstPayment: years[0].payment,
    maxPayment: Math.max(...payments),
    maxRate: Math.max(...years.map((y) => y.rate)),
    noReset: fixedMonths >= months, // the first change falls at or after the end of the loan
    fixed: { payment: fixedPay, totalInterest: fixedInterest },
    extraInterest: sum('interest') - fixedInterest,
  };
}

// The best, expected and worst-case paths. Best: the rate falls by the full
// per-adjustment cap at every reset (down to the floor). Expected: the user's
// assumed change. Worst: it rises by the full cap at every reset (up to the
// lifetime cap). `shock` is how much the highest payment exceeds the first.
export function scenarios(v) {
  const cap = Math.max(v.firstCap, v.periodicCap);
  const steps = { best: -cap, expected: v.change, worst: cap };
  return Object.fromEntries(Object.entries(steps).map(([key, change]) => {
    const r = simulate({ ...v, change });
    return [key, { ...r, shock: r.maxPayment / r.firstPayment - 1 }];
  }));
}

// Returns the names of fields whose values are missing or out of range.
export function invalidFields(v) {
  return MORTGAGE_FIELDS.filter((f) => {
    const n = v[f.id];
    return !Number.isFinite(n) || n < f.min || (f.max !== undefined && n > f.max) || (f.integer && !Number.isInteger(n));
  }).map((f) => f.label);
}

// Returns a message when the floor sits above the starting rate (a rate that
// can never fall below the floor would have to start above the starting rate).
export function floorProblem(v) {
  return v.floor > v.initialRate
    ? `The lowest possible rate (${v.floor}%) is above the starting rate (${v.initialRate}%). Lower the floor or raise the starting rate.`
    : '';
}
