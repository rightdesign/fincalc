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
  { id: 'program', group: 'buying', label: 'Loan type', value: 0, min: 0, max: 2, integer: true, options: [[0, 'Conventional (PMI)'], [1, 'FHA (mortgage insurance premium)'], [2, 'VA (funding fee)']] },
  { id: 'feeFinanced', group: 'buying', label: 'FHA or VA upfront fee', value: 1, min: 0, max: 1, integer: true, options: [[1, 'Financed into the loan'], [0, 'Paid in cash at closing']] },
  { id: 'vaRepeat', group: 'buying', label: 'VA loan: first use or subsequent use', value: 0, min: 0, max: 1, integer: true, options: [[0, 'First use'], [1, 'Subsequent use']] },
  { id: 'rate', group: 'buying', label: 'Mortgage rate (%)', value: 6.5, min: 0, max: 30, slider: { min: 0, max: 15, step: 0.125 } },
  { id: 'term', group: 'buying', label: 'Loan term (years)', value: 30, min: 1, max: 50, integer: true },
  { id: 'closing', group: 'buying', label: 'Closing costs (% of price)', value: 3, min: 0, max: 20 },
  { id: 'moving', group: 'buying', label: 'Moving costs ($)', value: 0, min: 0, money: true },
  { id: 'reserve', group: 'buying', label: 'Cash reserve (months of owning costs)', value: 0, min: 0, max: 60 },
  { id: 'saved', group: 'buying', label: 'Cash you have saved, optional ($)', value: null, min: 0, money: true, optional: true },
  { id: 'tax', group: 'buying', label: 'Property tax (% of value, per year)', value: 1.1, min: 0, max: 10 },
  { id: 'assessed', group: 'buying', label: 'Assessed value growth for property tax (% per year; blank = same as home value growth)', value: null, min: -20, max: 30, optional: true },
  { id: 'insurance', group: 'buying', label: 'Home insurance (% of value)', value: 0.35, min: 0, max: 10 },
  { id: 'pmi', group: 'buying', label: 'Mortgage insurance, PMI (% of loan, per year; conventional loans only)', value: 0.6, min: 0, max: 5 },
  { id: 'maintenance', group: 'buying', label: 'Maintenance (% of value)', value: 1, min: 0, max: 10 },
  { id: 'repairYear', group: 'buying', label: 'Major repair in year (0 = none)', value: 0, min: 0, max: 50, integer: true },
  { id: 'repairCost', group: 'buying', label: 'Major repair cost ($, one time)', value: 0, min: 0, money: true },
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
  { id: 'exclusion', group: 'both', label: 'Home-sale gain excluded from tax ($250,000 single, $500,000 married)', value: 250000, min: 0, money: true },
  { id: 'inflation', group: 'both', label: 'Inflation (% per year)', value: 2.5, min: -20, max: 30 },
  { id: 'investment', group: 'both', label: 'Investment return on money not spent on the home (% per year)', value: 5, min: -20, max: 30 },
  { id: 'investDrag', group: 'renting', label: 'Annual tax drag on investments (% of balance)', value: 0.7, min: 0, max: 10 },
  { id: 'capGains', group: 'renting', label: 'Capital gains tax when you sell the investments (%)', value: 15, min: 0, max: 100 },
];

export const rentOwnDefaults = () => Object.fromEntries(RENTOWN_FIELDS.map((f) => [f.id, f.value]));

// Which dollars the results are shown in: 'future' (nominal) or 'today' (discounted by inflation).
export const BASES = ['future', 'today'];

// One-click starting points. Each sets down payment, rate, term, stay and maintenance together
// and leaves everything else (price, rent, ...) as the user has it. The 20% down preset is the default set.
// The default mortgage rate comes from a small data file (site/data/rates.json) holding the latest
// Freddie Mac 30-year fixed average. Returns the file's content when it is usable, else null.
export function parseLiveRate(data) {
  const f = RENTOWN_FIELDS.find((x) => x.id === 'rate');
  if (!data || typeof data !== 'object') return null;
  const { rate, week, updated, source, url } = data;
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate < f.min || rate > f.max) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(week)) || Number.isNaN(Date.parse(week))) return null;
  if (typeof url !== 'string' || !/^https:\/\//.test(url)) return null;
  return { rate, week, updated: /^\d{4}-\d{2}-\d{2}$/.test(String(updated)) ? updated : null, source: String(source || 'Freddie Mac survey'), url };
}

// Makes the live rate the default for the rate field. Inputs in the address still win over it.
export function applyLiveRate(live) {
  RENTOWN_FIELDS.find((x) => x.id === 'rate').value = live.rate;
}

// "Oct 22, 2026" from an ISO date, in UTC so the day never shifts.
export const longDate = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });

export const RENTOWN_PRESETS = [
  { id: 'ftb3', label: 'First-time buyer, 3% down', values: { down: 3, rate: 7, term: 30, years: 7, maintenance: 1 } },
  { id: 'ftb10', label: 'First-time buyer, 10% down', values: { down: 10, rate: 7.5, term: 30, years: 7, maintenance: 1 } },
  { id: 'down20', label: '20% down, 7-year stay', values: { down: 20, rate: 6.5, term: 30, years: 7, maintenance: 1 } },
  { id: 'longterm', label: 'Long-term owner, 15-year stay', values: { down: 20, rate: 6.5, term: 30, years: 15, maintenance: 1.5 } },
];

// Places that cap how fast the taxable (assessed) value can rise, whatever the market does.
// Each sets only the assessed growth.
export const RENTOWN_TAX_CAPS = [
  { id: 'ca', label: 'California Prop 13 (2%)', values: { assessed: 2 } },
  { id: 'fl', label: 'Florida Save Our Homes (3%)', values: { assessed: 3 } },
];

// The preset whose five settings all match the inputs, or null ("Custom").
export const matchRentOwnPreset = (v) => RENTOWN_PRESETS.find((p) => Object.entries(p.values).every(([k, n]) => v[k] === n)) ?? null;

// Labels of the fields whose value is blank, unreadable or out of range.
export function invalidRentOwn(v) {
  return RENTOWN_FIELDS.filter((f) => {
    const n = v[f.id];
    if (f.optional && n == null) return false;
    return !Number.isFinite(n) || n < f.min || (f.max != null && n > f.max) || (f.integer && !Number.isInteger(n));
  }).map((f) => f.label.replace(/ \(.*\)$/, ''));
}

// Net worth of each choice at the end of every year of the stay, in future
// (nominal) dollars; `real` has the same years discounted to today's dollars by
// the inflation rate.
// Own: home value less the loan balance and selling costs. Rent has two lenses
// that share the same starting cash (the down payment and closing costs,
// invested) and differ in the monthly cash flow:
// - Equal-cash (`rent`, the headline): both sides spend the same each month, so
//   the renter's account also takes in whatever owning costs beyond rent (or
//   pays out the shortfall when owning is cheaper).
// - Pure net worth (`pureRent`): the starting cash only grows; the monthly
//   difference is not credited to either side.
// Each grows at the investment return. Each month the tax drag (never more than
// that month's gain) is taken from the account, and the capital gains tax on
// what is left above the money put in is deducted at the end. `difference` and
// `pureDifference` are own minus that lens's renter.
// An optional one-time major repair (roof, HVAC) is paid by the owner in the
// first month of its year, on top of the smoothed maintenance. It comes off
// the Own net worth along with the return that money would have earned; Rent
// is unaffected.
// Property tax is the rate times the assessed value, which grows at its own rate when one is entered
// (a cap such as California's Prop 13) and otherwise at the home's growth rate.
// Selling the home is taxed too: the gain (sale price less selling costs less the
// price and closing costs paid) above the primary-residence exclusion, which applies
// only once the stay reaches two years, at the capital gains rate. It comes off the
// Own net worth as `homeTax`.
// PMI is charged on the original loan each month while the balance is above 80%
// of the home's value then, so it stops by itself once paying down the loan and
// appreciation reach that point.
const CHART_YEARS = 30;

// Loan programs (v.program): 0 conventional, 1 FHA, 2 VA.
const FHA_UPFRONT = 1.75;
const FHA_ANNUAL_HIGH_LTV = 0.55;
const FHA_ANNUAL_LOW_LTV = 0.5;
// FHA annual insurance lasts the whole loan when the original loan is above 90% of the price,
// and 11 years otherwise; it does not stop at 80%.
const FHA_SHORT_MONTHS = 132;

// VA funding fee (% of the loan) by down payment, for first use and subsequent use.
function vaFundingFeePct(downPct, repeat) {
  if (downPct >= 10) return 1.25;
  if (downPct >= 5) return 1.5;
  return repeat ? 3.3 : 2.15;
}

// The financing the program implies: the upfront fee (FHA MIP or VA funding fee) and whether it
// is added to the loan or paid in cash, and the yearly insurance percentage on the base loan.
function financing(v) {
  const base = v.price * (1 - v.down / 100);
  const ltv = 100 - v.down;
  if (v.program === 1) {
    const fee = (base * FHA_UPFRONT) / 100;
    return { base, fee, loan: v.feeFinanced ? base + fee : base, cashFee: v.feeFinanced ? 0 : fee, insurancePct: ltv > 90 ? FHA_ANNUAL_HIGH_LTV : FHA_ANNUAL_LOW_LTV, insuranceMonths: ltv > 90 ? Infinity : FHA_SHORT_MONTHS, insuranceName: 'FHA mortgage insurance', feeName: 'FHA upfront mortgage insurance premium' };
  }
  if (v.program === 2) {
    const fee = (base * vaFundingFeePct(v.down, v.vaRepeat)) / 100;
    return { base, fee, loan: v.feeFinanced ? base + fee : base, cashFee: v.feeFinanced ? 0 : fee, insurancePct: 0, insuranceMonths: 0, insuranceName: 'Mortgage insurance', feeName: 'VA funding fee' };
  }
  return { base, fee: 0, loan: base, cashFee: 0, insurancePct: v.pmi, insuranceMonths: null, insuranceName: 'Mortgage insurance (PMI)', feeName: '' };
}

// Owning pulls ahead for good from the year after the last year it trailed.
function firstAheadYear(years, field = 'difference') {
  const lastBehind = years.map((y) => y[field] < 0).lastIndexOf(true);
  return lastBehind === years.length - 1 ? null : years[lastBehind + 1].year;
}

// The same rule evaluated monthly: the first month (counted from 1) after which owning stays ahead
// through the last month of `months`, an array of { month, difference, pureDifference }.
function firstAheadMonth(months, field = 'difference') {
  const lastBehind = months.map((y) => y[field] < 0).lastIndexOf(true);
  return lastBehind === months.length - 1 ? null : months[lastBehind + 1].month;
}

export function compareRentOwn(v) {
  const fin = financing(v);
  const loan = fin.loan;
  const monthlyRate = v.rate / 100 / 12;
  const pay = payment(loan, v.rate, v.term * 12);
  const growth = (1 + v.growth / 100) ** (1 / 12);
  const invest = (1 + v.investment / 100) ** (1 / 12);
  let balance = loan;
  let value = v.price;
  // Property tax is charged on the assessed value, which follows the home's value unless a cap is entered,
  // and never more than the market value.
  const assessedGrowth = v.assessed == null ? growth : (1 + v.assessed / 100) ** (1 / 12);
  let assessed = v.price;
  const dragRate = v.investDrag / 100 / 12;
  let portfolio = v.price * (v.down / 100 + v.closing / 100) + fin.cashFee;
  let basis = portfolio;
  let dragPaid = 0;
  let pure = portfolio;
  const all = [];
  const months = [];
  let firstOwn = 0;
  let firstRent = 0;
  let firstPmi = 0;
  let totalPmi = 0;
  const monthly = [];
  const upfront = portfolio;
  const sum = { mortgage: 0, tax: 0, insurance: 0, maintenance: 0, hoa: 0, utilities: 0, pmi: 0, rent: 0, renterInsurance: 0 };
  let repairs = 0;
  let stay = null;
  // The model runs past the stay (to 30 years) so the chart can show where, or
  // whether, owning catches up; everything else is reported for the stay only.
  const stayMonths = v.years * 12;
  for (let m = 1; m <= Math.max(v.years, CHART_YEARS) * 12; m += 1) {
    const insured = fin.insuranceMonths == null ? balance > value * 0.8 + 0.005 : m <= fin.insuranceMonths;
    const pmi = insured ? (fin.base * fin.insurancePct) / 100 / 12 : 0;
    if (m <= stayMonths) totalPmi += pmi;
    const interest = balance * monthlyRate;
    const mortgage = m <= v.term * 12 ? pay : 0;
    const before = balance;
    balance = Math.max(0, balance + interest - mortgage);
    const repair = v.repairYear > 0 && m === (v.repairYear - 1) * 12 + 1 ? v.repairCost : 0;
    repairs = repairs * invest + repair;
    const yearsIn = Math.floor((m - 1) / 12);
    const hoa = v.hoa * (1 + v.hoaGrowth / 100) ** yearsIn;
    const utilities = v.utilities * (1 + v.utilitiesGrowth / 100) ** yearsIn;
    const tax = (Math.min(assessed, value) * v.tax) / 100 / 12;
    const insurance = (value * v.insurance) / 100 / 12;
    const maintenance = (value * v.maintenance) / 100 / 12;
    const own = mortgage + pmi + tax + insurance + maintenance + hoa + utilities;
    const baseRent = v.rent * (1 + v.rentGrowth / 100) ** yearsIn;
    const rent = baseRent + v.renterInsurance / 12;
    if (m % 12 === 1 && m <= stayMonths) {
      const part = { interest: before > 0 ? Math.min(interest, mortgage) : 0, principal: before - balance, tax, insurance, pmi, maintenance, hoa, utilities, rent: baseRent, renterInsurance: v.renterInsurance / 12 };
      monthly.push(monthlyCosts(part, yearsIn + 1));
    }
    Object.assign(sum, {
      mortgage: sum.mortgage + mortgage, tax: sum.tax + tax, insurance: sum.insurance + insurance, maintenance: sum.maintenance + maintenance,
      hoa: sum.hoa + hoa, utilities: sum.utilities + utilities, pmi: sum.pmi + pmi, rent: sum.rent + baseRent, renterInsurance: sum.renterInsurance + v.renterInsurance / 12,
    });
    if (m === 1) { firstOwn = own; firstRent = rent; firstPmi = pmi; }
    const gain = portfolio * (invest - 1);
    const drag = Math.min(portfolio * dragRate, Math.max(0, gain));
    dragPaid += drag;
    portfolio += gain - drag;
    const put = own - rent;
    // Taking money out sells holdings in proportion, so it also shrinks what counts as money put in.
    if (put < 0 && portfolio > 0) basis *= Math.max(0, portfolio + put) / portfolio;
    else basis += put;
    portfolio += put;
    // Pure lens: the starting cash alone, with the same tax drag and no monthly flow.
    const pureGain = pure * (invest - 1);
    pure += pureGain - Math.min(pure * dragRate, Math.max(0, pureGain));
    value *= growth;
    assessed *= assessedGrowth;
    // Net worth if everything were sold at the end of this month. The home-sale gain is what is left after
    // selling costs and the price plus closing costs paid. The exclusion needs two years in the home; the
    // capital gains rate is the one the renter's gains use.
    const homeGain = value * (1 - v.selling / 100) - v.price * (1 + v.closing / 100);
    const homeTax = Math.max(0, homeGain - (m >= 24 ? v.exclusion : 0)) * (v.capGains / 100);
    const ownWorth = value * (1 - v.selling / 100) - balance - repairs - homeTax;
    const saleTax = Math.max(0, portfolio - basis) * (v.capGains / 100);
    const rentWorth = portfolio - saleTax;
    const pureWorth = pure - Math.max(0, pure - upfront) * (v.capGains / 100);
    months.push({ month: m, difference: ownWorth - rentWorth, pureDifference: ownWorth - pureWorth });
    if (m % 12 === 0) {
      all.push({ year: m / 12, own: ownWorth, rent: rentWorth, difference: ownWorth - rentWorth, pureRent: pureWorth, pureDifference: ownWorth - pureWorth, dragPaid, saleTax, homeTax, repair: v.repairYear === m / 12 && v.repairCost > 0 });
    }
    // The cost breakdown describes the end of the stay, not the end of the longer chart run.
    if (m === stayMonths) stay = { sum: { ...sum }, value, balance, portfolio, repairs };
  }
  const years = all.slice(0, v.years);
  const breakEven = firstAheadYear(years);
  const pureBreakEven = firstAheadYear(years, 'pureDifference');
  const stayMonthRows = months.slice(0, stayMonths);
  const breakEvenMonth = firstAheadMonth(stayMonthRows);
  const pureBreakEvenMonth = firstAheadMonth(stayMonthRows, 'pureDifference');
  // The chart runs to the break-even year or 30 years, whichever is first, and never ends before the stay.
  const chartBreakEven = firstAheadYear(all);
  const chartBreakEvenMonth = firstAheadMonth(months);
  const chartYears = all.slice(0, Math.max(v.years, chartBreakEven ?? CHART_YEARS));
  // Yearly return after the tax drag, before the tax on sale.
  const afterTaxReturn = v.investment - Math.min(v.investDrag, Math.max(0, v.investment));
  const deflate = (rows) => rows.map((y) => {
    const d = (1 + v.inflation / 100) ** y.year;
    return { year: y.year, repair: y.repair, own: y.own / d, rent: y.rent / d, difference: y.difference / d, pureRent: y.pureRent / d, pureDifference: y.pureDifference / d, dragPaid: y.dragPaid / d, saleTax: y.saleTax / d, homeTax: y.homeTax / d };
  });
  const real = deflate(years);
  const chartReal = deflate(chartYears);
  const cash = cashNeeded(v, firstOwn, firstRent, fin.cashFee);
  const final = years[years.length - 1];
  const finalReal = real[real.length - 1];
  const waterfall = costWaterfall(v, { upfront, cashFee: fin.cashFee, ...stay, ownWorth: final.own, invest, saleTax: final.saleTax, homeTax: final.homeTax });
  return {
    years,
    monthly,
    breakEven,
    pureBreakEven,
    breakEvenMonth,
    pureBreakEvenMonth,
    real,
    chartYears,
    chartReal,
    chartBreakEven,
    chartBreakEvenMonth,
    afterTaxReturn,
    final,
    finalReal,
    firstOwnMonthly: firstOwn,
    firstRentMonthly: firstRent,
    firstPmi,
    totalPmi,
    program: { id: v.program, fee: fin.fee, feeName: fin.feeName, financed: fin.fee > 0 && v.feeFinanced === 1, loan, insuranceName: fin.insuranceName },
    cash,
    waterfall,
  };
}

// Where the gap at the end of the stay comes from. Renting ahead = upfront cash
// + recurring (owning costs beyond renting) + opportunity cost (growth the
// investments earned on that money, after the tax on it) - money back from the sale. All four buckets
// are what the model above already adds up, so they sum to -final.difference.
// Moving costs and the cash reserve are not part of the net worth comparison.
function costWaterfall(v, { upfront, cashFee, sum, value, balance, portfolio, ownWorth, invest, repairs, saleTax, homeTax }) {
  const down = (v.price * v.down) / 100;
  const closing = (v.price * v.closing) / 100;
  const ownCosts = sum.mortgage + sum.pmi + sum.tax + sum.insurance + sum.maintenance + sum.hoa + sum.utilities;
  const rentCosts = sum.rent + sum.renterInsurance;
  const recurring = ownCosts - rentCosts;
  const opportunity = portfolio - saleTax - upfront - recurring;
  const opportunityUpfront = upfront * (invest ** (v.years * 12) - 1);
  const sellingCosts = (value * v.selling) / 100;
  return {
    upfront: { down, closing, fee: cashFee, total: upfront },
    recurring: { mortgage: sum.mortgage, pmi: sum.pmi, tax: sum.tax, insurance: sum.insurance, maintenance: sum.maintenance, hoa: sum.hoa, utilities: sum.utilities, rent: sum.rent, renterInsurance: sum.renterInsurance, total: recurring },
    opportunity: { upfront: opportunityUpfront, monthly: opportunity - opportunityUpfront, total: opportunity },
    moneyBack: { value, sellingCosts, balance, repairs, homeTax, total: ownWorth },
    gap: upfront + recurring + opportunity - ownWorth,
  };
}

// First month of a year, itemized. Principal builds equity, so the cost of
// owning leaves it out; rent has no such part.
function monthlyCosts(m, year) {
  const ownTotal = m.interest + m.principal + m.tax + m.insurance + m.pmi + m.maintenance + m.hoa + m.utilities;
  return { year, ...m, ownTotal, ownCost: ownTotal - m.principal, rentTotal: m.rent + m.renterInsurance };
}

// What to do once the verdict is in. Renting ahead: the renter must put the Year-1 monthly gap
// (owning cost less rent, not the total difference spread over the stay) into investments.
// Owning ahead: the same gap is what owning costs per month beyond rent, so the budget has to hold.
// `monthly` is the size of that gap, `direction` says which way it runs.
export function followThrough(r) {
  const gap = r.firstOwnMonthly - r.firstRentMonthly;
  return { winner: r.final.difference >= 0 ? 'own' : 'rent', monthly: Math.abs(gap), direction: gap > 0.5 ? 'ownCostsMore' : gap < -0.5 ? 'rentCostsMore' : 'same' };
}

// Things the calculator does not weigh; shown as a short list of questions.
export const RENTOWN_CHECKLIST = [
  { label: 'How long you will stay', ask: 'Is your stay really as long as the years you entered? Selling early usually favors renting.' },
  { label: 'Flexibility vs. roots', ask: 'Do you want to be free to move easily, or settle in and make the place your own?' },
  { label: 'Maintenance appetite', ask: 'Are you happy to handle repairs and upkeep, or do you want a landlord to?' },
  { label: 'Job and location risk', ask: 'How likely is a job change or a move that would force a sale or a lease break?' },
];

// Cash needed to buy: down payment, closing costs, moving and a reserve of
// months of owning costs. With cash saved entered, also the shortfall and how
// many months it would take to close it by saving what owning would cost beyond
// rent (null when owning costs no more than renting). Ignores interest earned.
function cashNeeded(v, ownMonthly, rentMonthly, fee = 0) {
  const down = (v.price * v.down) / 100;
  const closing = (v.price * v.closing) / 100;
  const moving = v.moving;
  const reserve = v.reserve * ownMonthly;
  const total = down + closing + fee + moving + reserve;
  const hasSaved = v.saved != null;
  const shortfall = hasSaved ? Math.max(0, total - v.saved) : 0;
  const monthlyGap = ownMonthly - rentMonthly;
  const monthsToClose = shortfall > 0 && monthlyGap > 0 ? Math.ceil(shortfall / monthlyGap) : null;
  return { down, closing, fee, moving, reserve, total, saved: hasSaved ? v.saved : null, shortfall, monthlyGap, monthsToClose };
}

// Three named cases around the user's own inputs. Owning does better when homes and rents grow
// faster and investments return less, so the optimistic case shifts the three rates that way
// and the pessimistic case the opposite way. Each result is a full compareRentOwn run.
export const RENTOWN_SCENARIOS = [
  { id: 'optimistic', label: 'Good for owning', shift: 1 },
  { id: 'expected', label: 'Expected (your inputs)', shift: 0 },
  { id: 'pessimistic', label: 'Bad for owning', shift: -1 },
];

export function compareScenarios(v) {
  return RENTOWN_SCENARIOS.map((s) => {
    const inputs = { ...v, growth: v.growth + 2 * s.shift, rentGrowth: v.rentGrowth + s.shift, investment: v.investment - s.shift };
    const r = compareRentOwn(inputs);
    return { id: s.id, label: s.label, growth: inputs.growth, rentGrowth: inputs.rentGrowth, investment: inputs.investment, breakEven: r.breakEven, difference: r.final.difference, differenceReal: r.finalReal.difference };
  });
}

// What drives the verdict: for each of these inputs, the value at which the
// winner at the end of the stay flips, holding every other input as entered.
// Ranges are the search span (whole percentages, like the inputs).
export const RENTOWN_DRIVERS = [
  { id: 'growth', label: 'Home value growth', min: -20, max: 30 },
  { id: 'rentGrowth', label: 'Rent growth', min: -20, max: 30 },
  { id: 'investment', label: 'Investment return', min: -20, max: 30 },
  { id: 'rate', label: 'Mortgage rate', min: 0, max: 30 },
  { id: 'maintenance', label: 'Maintenance', min: 0, max: 10 },
];

const STEPS = 200;
const pct = (n) => `${Number(n.toFixed(1))}%`;

// The value nearest the current one where owning-minus-renting changes sign, or
// null if it never does within the range. A scan finds the bracket, bisection
// narrows it.
export function rentOwnFlipPoint(v, driver) {
  const at = (x) => compareRentOwn({ ...v, [driver.id]: x }).final.difference;
  const xs = Array.from({ length: STEPS + 1 }, (_, i) => driver.min + ((driver.max - driver.min) * i) / STEPS);
  const ms = xs.map(at);
  const current = v[driver.id];
  let best = null;
  for (let i = 0; i < STEPS; i += 1) {
    if ((ms[i] >= 0) === (ms[i + 1] >= 0)) continue;
    const mid = (xs[i] + xs[i + 1]) / 2;
    if (best == null || Math.abs(mid - current) < Math.abs(best.mid - current)) best = { i, mid };
  }
  if (!best) return null;
  let lo = xs[best.i];
  let hi = xs[best.i + 1];
  const loOwning = ms[best.i] >= 0;
  for (let k = 0; k < 40; k += 1) {
    const m = (lo + hi) / 2;
    if ((at(m) >= 0) === loOwning) lo = m; else hi = m;
  }
  return (lo + hi) / 2;
}

// One plain-language line per driver, in the order of RENTOWN_DRIVERS.
export function rentOwnThresholds(v) {
  const ahead = (x, d) => compareRentOwn({ ...v, [d.id]: x }).final.difference >= 0;
  return RENTOWN_DRIVERS.map((d) => {
    const flip = rentOwnFlipPoint(v, d);
    const entered = pct(v[d.id]);
    if (flip == null) {
      const winner = ahead(v[d.id], d) ? 'Owning' : 'Renting';
      return { id: d.id, label: d.label, flip: null, text: `${winner} wins at every ${d.label.toLowerCase()} from ${d.min}% to ${d.max}%, so this assumption does not change the verdict (you entered ${entered}).` };
    }
    const owningAbove = ahead(Math.min(d.max, flip + 0.05), d);
    const winner = owningAbove ? 'Owning' : 'Renting';
    const other = owningAbove ? 'renting' : 'owning';
    return { id: d.id, label: d.label, flip, owningAbove, text: `${winner} wins if ${d.label.toLowerCase()} is above ${pct(flip)}; ${other} wins if it is below (you entered ${entered}).` };
  });
}

// Inputs that differ from the defaults, as a URL fragment (and a stored string).
export function encodeRentOwn(v, basis = 'future') {
  const defaults = rentOwnDefaults();
  const params = new URLSearchParams();
  for (const f of RENTOWN_FIELDS) if (Number.isFinite(v[f.id]) && v[f.id] !== defaults[f.id]) params.set(f.id, String(v[f.id]));
  if (basis === 'today') params.set('dollars', 'today');
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

// The dollar basis named in a URL fragment or stored string; 'future' unless it says 'today'.
export function decodeBasis(text) {
  try { return new URLSearchParams(String(text ?? '').replace(/^[#?]/, '')).get('dollars') === 'today' ? 'today' : 'future'; } catch { return 'future'; }
}
