// Variable-rate (adjustable) mortgage model. Pure functions, no DOM.
// Rates are annual percentages; the loan is amortized monthly.

export const MORTGAGE_FIELDS = [
  { id: 'loan', label: 'Loan amount ($)', value: 400000, min: 1 },
  { id: 'term', label: 'Loan term (years)', value: 30, min: 1, max: 50, integer: true },
  { id: 'initialRate', label: 'Starting interest rate (%)', value: 5.5, min: 0, max: 30 },
  { id: 'fixedYears', label: 'Years before the first rate change', value: 5, min: 1, max: 50, integer: true },
  { id: 'adjustYears', label: 'Years between rate changes after that', value: 1, min: 1, max: 50, integer: true },
  { id: 'change', label: 'Rate change at each adjustment (percentage points)', value: 0.5, min: -10, max: 10, hint: 'Your assumption for how the rate moves each time it resets. Use a negative number for falling rates.' },
  { id: 'periodicCap', label: 'Cap on a single adjustment (percentage points)', value: 2, min: 0, max: 30, hint: 'The most the rate can move at one reset, up or down.' },
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

// The rate in force after `adjustments` resets, applying the per-reset cap, the
// lifetime cap above the starting rate, and the floor.
export function rateAfter(v, adjustments) {
  const ceiling = v.initialRate + v.lifetimeCap;
  const step = Math.max(-v.periodicCap, Math.min(v.periodicCap, v.change));
  let rate = v.initialRate;
  for (let i = 0; i < adjustments; i += 1) rate = Math.min(ceiling, Math.max(Math.min(v.floor, v.initialRate), rate + step));
  return rate;
}

// Month-by-month simulation, summed by year. Returns the yearly rows and totals,
// plus the same loan held at the starting rate for comparison.
export function simulate(v) {
  const months = Math.round(v.term * 12);
  const fixedMonths = Math.round(v.fixedYears * 12);
  const every = Math.round(v.adjustYears * 12);
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
    fixed: { payment: fixedPay, totalInterest: fixedInterest },
    extraInterest: sum('interest') - fixedInterest,
  };
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
