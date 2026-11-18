// Model and input definitions for the compound interest calculator. Pure (no DOM) so it runs
// under node; compound-app.js owns the page.
export const COMPOUND_INPUTS_KEY = 'fincalc.compound';
export const MAX_YEARS = 100;

// kind: 'money' ($), 'percent' (%), 'years', 'choice'. slider adds a range input beside the box.
export const COMPOUND_FIELDS = [
  { id: 'start', label: 'Starting balance', kind: 'money', default: 10000, slider: { min: 0, max: 500000, step: 1000 }, hint: 'What you have invested today. Enter 0 if you are starting from nothing.' },
  { id: 'monthly', label: 'Monthly contribution', kind: 'money', default: 500, slider: { min: 0, max: 5000, step: 50 }, hint: 'What you add at the end of every month. Enter 0 for a one-time lump sum.' },
  { id: 'rate', label: 'Annual return (%)', kind: 'percent', default: 7, slider: { min: 0, max: 15, step: 0.1 }, hint: 'The yearly growth you expect before inflation and taxes. Stocks have averaged about 7–10% over the long run; savings accounts earn far less. Typical planning range 3–8%.' },
  { id: 'years', label: 'Years', kind: 'years', default: 30, slider: { min: 1, max: 60, step: 1 }, hint: `How long the money stays invested. Whole years, 1–${MAX_YEARS}.` },
  {
    id: 'frequency', label: 'Compounding', kind: 'choice', default: 'monthly',
    hint: 'How often interest is added to the balance. Monthly adds one twelfth of the annual rate each month; annually adds the full rate once a year (contributions made during the year earn simple interest until then).',
    options: [{ value: 'monthly', label: 'Monthly' }, { value: 'annually', label: 'Annually' }],
  },
  { id: 'inflation', label: 'Inflation (% per year)', kind: 'percent', default: 3, slider: { min: 0, max: 10, step: 0.1 }, hint: "Used only for the today's-dollars view: each year's balance is divided by (1 + inflation) for every year that has passed. The long-run US average is about 3%." },
  {
    id: 'basis', label: 'Show results in', kind: 'choice', default: 'future',
    hint: "Future dollars are the plain amounts you will see on the statement. Today's dollars restate the balance in what it could buy at today's prices.",
    options: [{ value: 'future', label: 'Future dollars' }, { value: 'today', label: "Today's dollars" }],
  },
];

export const COMPOUND_PRESETS = [
  { id: 'retirement', label: 'Retirement saver', values: { start: 10000, monthly: 500, rate: 7, years: 30, frequency: 'monthly' } },
  { id: 'lump', label: 'Lump sum, no contributions', values: { start: 50000, monthly: 0, rate: 6, years: 20, frequency: 'annually' } },
  { id: 'savings', label: 'High-yield savings', values: { start: 5000, monthly: 200, rate: 4, years: 10, frequency: 'monthly' } },
  { id: 'late', label: 'Starting late', values: { start: 0, monthly: 1000, rate: 7, years: 15, frequency: 'monthly' } },
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
    if (!Number.isFinite(x) || x < 0) bad.push(f.label);
    else if (f.id === 'years' && (!Number.isInteger(x) || x < 1 || x > MAX_YEARS)) bad.push(f.label);
  }
  return bad;
}

// Year-by-year growth. Contributions are made at the end of each month. Monthly compounding
// adds rate/12 of the balance every month; annual compounding adds the full rate to the balance
// at the start of the year once a year, while the year's contributions earn simple interest
// (rate x months remaining / 12) that joins the balance at year end.
export function simulateCompound(v) {
  const r = v.rate / 100;
  const monthlyMode = v.frequency === 'monthly';
  let balance = v.start;
  let contributed = v.start;
  const years = [];
  for (let y = 1; y <= v.years; y++) {
    const open = balance;
    let interest = 0;
    let added = 0;
    if (monthlyMode) {
      for (let m = 1; m <= 12; m++) {
        const i = balance * (r / 12);
        balance += i + v.monthly;
        interest += i;
        added += v.monthly;
      }
    } else {
      interest = open * r;
      for (let m = 1; m <= 12; m++) { interest += v.monthly * r * ((12 - m) / 12); added += v.monthly; }
      balance = open + added + interest;
    }
    contributed += added;
    years.push({ year: y, contributions: added, interest, balance, totalContributed: contributed, totalInterest: balance - contributed });
  }
  const last = years[years.length - 1];
  return { years, futureValue: last.balance, contributed: last.totalContributed, interest: last.totalInterest };
}

// The same years with each balance restated in today's dollars: divided by (1 + inflation)^year.
// What you contributed stays in the dollars you paid; interest becomes the real balance minus that
// (negative when inflation outruns the return).
export function inTodaysDollars(r, inflation) {
  const years = r.years.map((y) => {
    const balance = y.balance / (1 + inflation / 100) ** y.year;
    return { ...y, balance, totalInterest: balance - y.totalContributed };
  });
  const last = years[years.length - 1];
  return { years, futureValue: last.balance, contributed: last.totalContributed, interest: last.totalInterest };
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// "About" amounts round to the nearest thousand when large, the nearest hundred otherwise.
export function roundedMoney(n) {
  const step = Math.abs(n) >= 10000 ? 1000 : 100;
  return usd.format(Math.round(n / step) * step);
}

export function headline(v, r) {
  const yrs = `${v.years} year${v.years === 1 ? '' : 's'}`;
  if (r.contributed === 0) return `After ${yrs}, nothing has been invested yet.`;
  if (v.basis === 'today') {
    const gap = r.interest >= 0 ? `about ${roundedMoney(r.interest)} more than you put in` : `about ${roundedMoney(-r.interest)} less than you put in`;
    return `After ${yrs}, your ${usd.format(r.contributed)} becomes about ${roundedMoney(r.futureValue)} in today's dollars — ${gap}.`;
  }
  return `After ${yrs}, your ${usd.format(r.contributed)} becomes about ${roundedMoney(r.futureValue)} — about ${roundedMoney(r.interest)} of it is interest.`;
}

// Only values that differ from the defaults are written, so links stay short.
export function encodeCompound(v) {
  const d = compoundDefaults();
  const p = new URLSearchParams();
  for (const f of COMPOUND_FIELDS) if (v[f.id] !== d[f.id] && v[f.id] != null && !Number.isNaN(v[f.id])) p.set(f.id, String(v[f.id]));
  return p.toString();
}

// Anything absent, unknown or unreadable falls back to the default. Never throws.
export function decodeCompound(text) {
  const v = compoundDefaults();
  let p;
  try { p = new URLSearchParams(String(text ?? '').replace(/^[#?]/, '')); } catch { return v; }
  for (const f of COMPOUND_FIELDS) {
    if (!p.has(f.id)) continue;
    const raw = p.get(f.id);
    if (f.kind === 'choice') { if (f.options.some((o) => o.value === raw)) v[f.id] = raw; continue; }
    const n = parseNumber(raw);
    if (Number.isFinite(n) && n >= 0) v[f.id] = n;
  }
  return v;
}
