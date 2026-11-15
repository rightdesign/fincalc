// Rent vs own model: should you buy a home or rent a similar one and invest the
// difference? Pure functions, no DOM. Rates are annual percentages; the model
// steps monthly and reports year ends.
import { parseAmount, payment } from './mortgage.js';

export { parseAmount };

export const RENTOWN_GROUPS = [
  { id: 'buying', label: 'Buying' },
  { id: 'renting', label: 'Renting' },
  { id: 'both', label: 'Both' },
];

export const RENTOWN_FIELDS = [
  { id: 'price', group: 'buying', label: 'Home price ($)', value: 450000, min: 1, money: true, slider: { min: 100000, max: 1500000, step: 5000 } },
  { id: 'down', group: 'buying', label: 'Down payment (%)', value: 20, min: 0, max: 100, slider: { min: 0, max: 100, step: 1 } },
  { id: 'rate', group: 'buying', label: 'Mortgage rate (%)', value: 6.5, min: 0, max: 30, slider: { min: 0, max: 15, step: 0.125 } },
  { id: 'term', group: 'buying', label: 'Loan term (years)', value: 30, min: 1, max: 50, integer: true },
  { id: 'closing', group: 'buying', label: 'Closing costs (% of price)', value: 3, min: 0, max: 20 },
  { id: 'moving', group: 'buying', label: 'Moving costs ($)', value: 0, min: 0, money: true },
  { id: 'reserve', group: 'buying', label: 'Cash reserve (months of owning costs)', value: 0, min: 0, max: 60 },
  { id: 'saved', group: 'buying', label: 'Cash you have saved, optional ($)', value: null, min: 0, money: true, optional: true },
  { id: 'tax', group: 'buying', label: 'Property tax (% of value, per year)', value: 1.1, min: 0, max: 10 },
  { id: 'insurance', group: 'buying', label: 'Home insurance (% of value)', value: 0.35, min: 0, max: 10 },
  { id: 'pmi', group: 'buying', label: 'Mortgage insurance, PMI (% of loan, per year)', value: 0.6, min: 0, max: 5 },
  { id: 'maintenance', group: 'buying', label: 'Maintenance (% of value)', value: 1, min: 0, max: 10 },
  { id: 'hoa', group: 'buying', label: 'HOA dues ($ per month)', value: 0, min: 0, money: true },
  { id: 'hoaGrowth', group: 'buying', label: 'HOA dues growth (% per year)', value: 3, min: -20, max: 30 },
  { id: 'utilities', group: 'buying', label: 'Extra utilities vs. renting ($ per month; renters usually pay some too)', value: 0, min: 0, money: true },
  { id: 'utilitiesGrowth', group: 'buying', label: 'Utilities growth (% per year)', value: 3, min: -20, max: 30 },
  { id: 'growth', group: 'buying', label: 'Home value growth (% per year)', value: 3, min: -20, max: 30 },
  { id: 'rent', group: 'renting', label: 'Monthly rent ($)', value: 2300, min: 1, money: true },
  { id: 'rentGrowth', group: 'renting', label: 'Rent growth (% per year)', value: 3, min: -20, max: 30 },
  { id: 'renterInsurance', group: 'renting', label: "Renter's insurance ($ per year)", value: 180, min: 0, money: true },
  { id: 'years', group: 'both', label: 'Years you will stay', value: 7, min: 1, max: 50, integer: true, slider: { min: 1, max: 30, step: 1 } },
  { id: 'selling', group: 'both', label: 'Selling costs when you sell (%)', value: 6, min: 0, max: 30 },
  { id: 'investment', group: 'both', label: 'Investment return on money not spent on the home (% per year)', value: 5, min: -20, max: 30 },
];

export const rentOwnDefaults = () => Object.fromEntries(RENTOWN_FIELDS.map((f) => [f.id, f.value]));

// Labels of the fields whose value is blank, unreadable or out of range.
export function invalidRentOwn(v) {
  return RENTOWN_FIELDS.filter((f) => {
    const n = v[f.id];
    if (f.optional && n == null) return false;
    return !Number.isFinite(n) || n < f.min || (f.max != null && n > f.max) || (f.integer && !Number.isInteger(n));
  }).map((f) => f.label.replace(/ \(.*\)$/, ''));
}

// Net worth of each choice at the end of every year of the stay.
// Own: home value less the loan balance and selling costs. Rent: an investment
// account that starts with the down payment and closing costs and then takes in
// each month whatever owning costs beyond rent (or pays out the shortfall when
// owning is cheaper), growing at the investment return.
// PMI is charged on the original loan each month while the balance is above 80%
// of the home's value then, so it stops by itself once paying down the loan and
// appreciation reach that point.
export function compareRentOwn(v) {
  const loan = v.price * (1 - v.down / 100);
  const monthlyRate = v.rate / 100 / 12;
  const pay = payment(loan, v.rate, v.term * 12);
  const growth = (1 + v.growth / 100) ** (1 / 12);
  const invest = (1 + v.investment / 100) ** (1 / 12);
  let balance = loan;
  let value = v.price;
  let portfolio = v.price * (v.down / 100 + v.closing / 100);
  const years = [];
  let firstOwn = 0;
  let firstRent = 0;
  let firstPmi = 0;
  let totalPmi = 0;
  for (let m = 1; m <= v.years * 12; m += 1) {
    const pmi = balance > value * 0.8 + 0.005 ? (loan * v.pmi) / 100 / 12 : 0;
    totalPmi += pmi;
    const interest = balance * monthlyRate;
    const mortgage = m <= v.term * 12 ? pay : 0;
    balance = Math.max(0, balance + interest - mortgage);
    const yearsIn = Math.floor((m - 1) / 12);
    const hoa = v.hoa * (1 + v.hoaGrowth / 100) ** yearsIn;
    const utilities = v.utilities * (1 + v.utilitiesGrowth / 100) ** yearsIn;
    const own = mortgage + pmi + (value * (v.tax + v.insurance + v.maintenance)) / 100 / 12 + hoa + utilities;
    const rent = v.rent * (1 + v.rentGrowth / 100) ** yearsIn + v.renterInsurance / 12;
    if (m === 1) { firstOwn = own; firstRent = rent; firstPmi = pmi; }
    portfolio = portfolio * invest + (own - rent);
    value *= growth;
    if (m % 12 === 0) {
      const ownWorth = value * (1 - v.selling / 100) - balance;
      years.push({ year: m / 12, own: ownWorth, rent: portfolio, difference: ownWorth - portfolio });
    }
  }
  // Owning pulls ahead for good from the year after the last year it trailed.
  const lastBehind = years.map((y) => y.difference < 0).lastIndexOf(true);
  const breakEven = lastBehind === years.length - 1 ? null : years[lastBehind + 1].year;
  const cash = cashNeeded(v, firstOwn, firstRent);
  return { years, breakEven, final: years[years.length - 1], firstOwnMonthly: firstOwn, firstRentMonthly: firstRent, firstPmi, totalPmi, cash };
}

// Cash needed to buy: down payment, closing costs, moving and a reserve of
// months of owning costs. With cash saved entered, also the shortfall and how
// many months it would take to close it by saving what owning would cost beyond
// rent (null when owning costs no more than renting). Ignores interest earned.
function cashNeeded(v, ownMonthly, rentMonthly) {
  const down = (v.price * v.down) / 100;
  const closing = (v.price * v.closing) / 100;
  const moving = v.moving;
  const reserve = v.reserve * ownMonthly;
  const total = down + closing + moving + reserve;
  const hasSaved = v.saved != null;
  const shortfall = hasSaved ? Math.max(0, total - v.saved) : 0;
  const monthlyGap = ownMonthly - rentMonthly;
  const monthsToClose = shortfall > 0 && monthlyGap > 0 ? Math.ceil(shortfall / monthlyGap) : null;
  return { down, closing, moving, reserve, total, saved: hasSaved ? v.saved : null, shortfall, monthlyGap, monthsToClose };
}

// Inputs that differ from the defaults, as a URL fragment (and a stored string).
export function encodeRentOwn(v) {
  const defaults = rentOwnDefaults();
  const params = new URLSearchParams();
  for (const f of RENTOWN_FIELDS) if (Number.isFinite(v[f.id]) && v[f.id] !== defaults[f.id]) params.set(f.id, String(v[f.id]));
  return params.toString();
}

// Defaults for anything absent or invalid. Never throws.
export function decodeRentOwn(text) {
  const v = rentOwnDefaults();
  let params;
  try { params = new URLSearchParams(String(text ?? '').replace(/^[#?]/, '')); } catch { return v; }
  for (const f of RENTOWN_FIELDS) {
    if (!params.has(f.id)) continue;
    const n = parseAmount(params.get(f.id));
    if (!Number.isFinite(n) || n < f.min || (f.max != null && n > f.max) || (f.integer && !Number.isInteger(n))) continue;
    v[f.id] = n;
  }
  return v;
}
