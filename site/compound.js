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

// A preset sets only the inputs it names (its label spells them out) and leaves the rest as the user had them.
export const COMPOUND_PRESETS = [
  { id: 'retirement', label: 'Retirement saver: $500/month, 7%, 30 years', values: { monthly: 500, rate: 7, years: 30 } },
  { id: 'first100k', label: 'First $100K: $250/month, 7%, 15 years', values: { monthly: 250, rate: 7, years: 15 } },
  { id: 'college', label: 'College fund: $300/month, 6%, 18 years', values: { monthly: 300, rate: 6, years: 18 } },
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
    const doubling = 72 / v.rate;
    const shown = doubling >= 10 ? String(Math.round(doubling)) : doubling.toFixed(1);
    points.push({
      id: 'rule-of-72',
      title: 'The Rule of 72',
      text: `Divide 72 by the return and you get roughly how many years it takes money to double: 72 ÷ ${v.rate} ≈ ${shown} years. At ${v.rate}% your money doubles about every ${shown} years, and each doubling is bigger than the last.`,
    });
  }
  const lastN = Math.floor(v.years / 3);
  if (lastN >= 1 && v.rate > 0) {
    const firstN = v.years - lastN;
    const early = balanceAt(v, r, firstN);
    const late = last.balance - early;
    points.push({
      id: 'back-loaded',
      title: 'The payoff comes late',
      text: `Your last ${plural(lastN, 'year')} add about ${roundedMoney(late)}, ${late > early ? 'more than' : 'compared with'} the ${roundedMoney(early)} your first ${plural(firstN, 'year')} built. The money you invest early does the most work, because it has the most time left to compound.`,
    });
  }
  const milestones = doublingMilestones(v, r);
  if (milestones.length > 1) {
    const faster = milestones.slice(1).every((m) => m.after < milestones[0].after);
    const steps = milestones.map((m, i) => `${roundedMoney(m.amount)} in year ${m.year}${i === 0 ? '' : ` (${plural(m.after, 'year')} after the last)`}`);
    points.push({
      id: 'milestones',
      title: 'Each doubling comes faster',
      text: `Your balance passes ${steps.join(', then ')}. ${faster ? 'After the first, each doubling takes fewer years than the first one did, because growth starts to outweigh what you contribute.' : ''}`.trim(),
    });
  }
  return points;
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
