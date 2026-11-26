// Rent vs own model: should you buy a home or rent a similar one and invest the
// difference? Pure functions, no DOM. Rates are annual percentages; the model
// steps monthly and reports year ends.
import { parseAmount, payment, rateAfter } from './mortgage.js';

export { parseAmount };

export const RENTOWN_GROUPS = [
  { id: 'buying', label: 'Buying' },
  { id: 'renting', label: 'Renting' },
  { id: 'both', label: 'Both' },
  { id: 'taxes', label: 'Income tax' },
];

// Federal figures for 2026, as in the main calculator: standard deduction by filing status (indexed to inflation
// for later years of the stay), and the state and local tax (SALT) deduction cap.
export const STANDARD_DEDUCTION = { 1: 16100, 2: 32200 };
// Under IRC 164(b)(7) the cap is $40,400 in 2026 and grows 1% a year through 2029; in 2030 it reverts to $10,000.
// The higher cap is cut by 30% of income above $505,000 in 2026 (also +1% a year), but never below $10,000.
export const SALT_BASE_YEAR = 2026;
export const SALT_CAP = 40400;
export const SALT_FLOOR = 10000;
export const SALT_LAST_HIGH_YEAR = 2029;
export const SALT_PHASE_DOWN_START = 505000;
export const SALT_PHASE_DOWN_RATE = 0.3;

// The SALT cap that applies in the `yearIndex`-th year of the stay (0 = 2026), for income `magi` (null = unknown, so no phase-down).
export function saltCap(yearIndex, magi = null) {
  if (SALT_BASE_YEAR + yearIndex > SALT_LAST_HIGH_YEAR) return SALT_FLOOR;
  const grow = 1.01 ** yearIndex;
  const cap = SALT_CAP * grow;
  if (magi == null || !(magi > 0)) return cap;
  return Math.max(SALT_FLOOR, cap - SALT_PHASE_DOWN_RATE * Math.max(0, magi - SALT_PHASE_DOWN_START * grow));
}

// Mortgage interest is deductible only on the first $750,000 of acquisition debt (single or married filing jointly).
export const MORTGAGE_DEBT_LIMIT = 750000;

// Home-sale exclusion by filing status (v.filing: 1 single, 2 married filing jointly).
export const EXCLUSION_BY_FILING = { 1: 250000, 2: 500000 };

// 0 = a fixed-rate loan, 1 = an adjustable-rate mortgage that resets as in the variable-rate calculator.
export const MORTGAGE_TYPES = [[0, 'Fixed rate'], [1, 'Adjustable rate (ARM)']];
const isArm = (v) => v.arm === 1;

export const RENTOWN_FIELDS = [
  { id: 'price', group: 'buying', label: 'Home price ($)', value: 450000, min: 1, money: true, slider: { min: 100000, max: 1500000, step: 5000 } },
  { id: 'down', group: 'buying', label: 'Down payment (%)', value: 20, min: 0, max: 100, slider: { min: 0, max: 100, step: 1 } },
  { id: 'arm', group: 'buying', label: 'Mortgage type', value: 0, min: 0, max: 1, integer: true, options: MORTGAGE_TYPES },
  { id: 'program', group: 'buying', label: 'Loan type', value: 0, min: 0, max: 2, integer: true, options: [[0, 'Conventional (PMI)'], [1, 'FHA (mortgage insurance premium)'], [2, 'VA (funding fee)']] },
  { id: 'feeFinanced', group: 'buying', label: 'FHA or VA upfront fee', value: 1, min: 0, max: 1, integer: true, options: [[1, 'Financed into the loan'], [0, 'Paid in cash at closing']] },
  { id: 'vaRepeat', group: 'buying', label: 'VA loan: first use or subsequent use', value: 0, min: 0, max: 1, integer: true, options: [[0, 'First use'], [1, 'Subsequent use']] },
  { id: 'rate', group: 'buying', label: 'Mortgage rate (%)', value: 6.5, min: 0, max: 30, showIf: (v) => !v.arm, slider: { min: 0, max: 15, step: 0.125 } },
  { id: 'term', group: 'buying', label: 'Loan term (years)', value: 30, min: 1, max: 50, integer: true },
  { id: 'armRate', group: 'buying', label: 'ARM starting rate (%)', value: 5.75, min: 0, max: 30, showIf: isArm, slider: { min: 0, max: 15, step: 0.125 } },
  { id: 'armFixedMonths', group: 'buying', label: 'ARM months before the first rate change', value: 84, min: 1, max: 600, integer: true, showIf: isArm },
  { id: 'armAdjustMonths', group: 'buying', label: 'ARM months between rate changes after that', value: 6, min: 1, max: 600, integer: true, showIf: isArm },
  { id: 'armIndexRate', group: 'buying', label: 'ARM index value today (%)', value: 4.3, min: 0, max: 30, showIf: isArm },
  { id: 'armMargin', group: 'buying', label: 'ARM margin (percentage points)', value: 2.75, min: 0, max: 15, showIf: isArm },
  { id: 'armIndexChange', group: 'buying', label: 'ARM assumed index change per reset (percentage points)', value: 0, min: -10, max: 10, showIf: isArm },
  { id: 'armFirstCap', group: 'buying', label: 'ARM cap on the first adjustment (percentage points)', value: 5, min: 0, max: 30, showIf: isArm },
  { id: 'armPeriodicCap', group: 'buying', label: 'ARM cap on each later adjustment (percentage points)', value: 1, min: 0, max: 30, showIf: isArm },
  { id: 'armLifetimeCap', group: 'buying', label: 'ARM cap above the starting rate over the loan (percentage points)', value: 5, min: 0, max: 30, showIf: isArm },
  { id: 'armFloor', group: 'buying', label: 'ARM lowest possible rate (%)', value: 2, min: 0, max: 30, showIf: isArm },
  { id: 'closing', group: 'buying', label: 'Closing costs (% of price)', value: 3, min: 0, max: 20 },
  { id: 'moving', group: 'buying', label: 'Moving costs ($)', value: 0, min: 0, money: true },
  { id: 'reserve', group: 'buying', label: 'Cash reserve (months of owning costs)', value: 0, min: 0, max: 60, hint: 'Counted in the cash needed to buy only. It does not change the net worth comparison, because the money stays yours either way.' },
  { id: 'saved', group: 'buying', label: 'Cash you have saved, optional ($)', value: null, min: 0, money: true, optional: true },
  { id: 'takeHome', group: 'buying', label: 'Your after-tax salary, optional ($ per year; for the 33% rule and job-loss check)', value: null, min: 1, money: true, optional: true },
  { id: 'emergency', group: 'buying', label: 'Emergency savings you would keep after buying, optional ($)', value: null, min: 0, money: true, optional: true },
  { id: 'tax', group: 'buying', label: 'Property tax (% of value, per year)', value: 1.1, min: 0, max: 10 },
  { id: 'assessed', group: 'buying', label: 'Assessed value growth for property tax (% per year; blank = same as home value growth)', value: null, min: -20, max: 30, optional: true },
  { id: 'insurance', group: 'buying', label: 'Home insurance (% of value)', value: 0.35, min: 0, max: 10 },
  { id: 'pmi', group: 'buying', label: 'Mortgage insurance, PMI (% of loan, per year; conventional loans only)', value: 0.6, min: 0, max: 5 },
  { id: 'maintenance', group: 'buying', label: 'Maintenance (% of value)', value: 1, min: 0, max: 10 },
  { id: 'repairYear', group: 'buying', label: 'Major repair in year (0 = none)', value: 0, min: 0, max: 50, integer: true },
  { id: 'repairCost', group: 'buying', label: 'Major repair cost ($, one time)', value: 0, min: 0, money: true },
  { id: 'income', group: 'both', label: 'Gross income, optional ($ per year, before tax; for the 28/36 check)', value: null, min: 1, money: true, optional: true },
  { id: 'otherDebt', group: 'both', label: 'Other debt payments, optional ($ per month: car, student loans, cards; for the 28/36 check)', value: 0, min: 0, money: true },
  { id: 'hoa', group: 'buying', label: 'HOA dues ($ per month)', value: 0, min: 0, money: true },
  { id: 'hoaGrowth', group: 'buying', label: 'HOA dues growth (% per year)', value: 3, min: -20, max: 30 },
  { id: 'utilities', group: 'buying', label: 'Extra utilities vs. renting ($ per month; renters usually pay some too)', value: 0, min: 0, money: true },
  { id: 'utilitiesGrowth', group: 'buying', label: 'Utilities growth (% per year)', value: 3, min: -20, max: 30 },
  { id: 'growth', group: 'buying', label: 'Home value growth (% per year)', value: 3, min: -20, max: 30 },
  { id: 'rent', group: 'renting', label: 'Monthly rent ($)', value: 2300, min: 1, money: true },
  { id: 'rentGrowth', group: 'renting', label: 'Rent growth (% per year)', value: 3, min: -20, max: 30 },
  { id: 'deposit', group: 'renting', label: "Security deposit ($, blank = one month's rent; returned when you leave)", value: null, min: 0, money: true, optional: true },
  { id: 'renterInsurance', group: 'renting', label: "Renter's insurance ($ per year)", value: 180, min: 0, money: true },
  { id: 'years', group: 'both', label: 'Years you will stay', value: 7, min: 1, max: 50, integer: true, slider: { min: 1, max: 30, step: 1 } },
  { id: 'waitYears', group: 'both', label: 'Years you rent before buying (rent-then-buy path)', value: 2, min: 0, max: 50, integer: true },
  { id: 'waitRate', group: 'both', label: 'Mortgage rate when you buy later, optional (%; blank = same as above)', value: null, min: 0, max: 30, optional: true },
  { id: 'selling', group: 'both', label: 'Selling costs when you sell (%)', value: 6, min: 0, max: 30 },
  { id: 'exclusion', group: 'both', label: 'Home-sale gain excluded from tax ($)', value: 250000, min: 0, money: true },
  { id: 'inflation', group: 'both', label: 'Inflation (% per year)', value: 2.5, min: -20, max: 30 },
  { id: 'investment', group: 'both', label: 'Investment return on money not spent on the home (% per year)', value: 5, min: -20, max: 30 },
  { id: 'investDrag', group: 'renting', label: 'Annual tax drag on investments (% of balance)', value: 0.4, min: 0, max: 10, hint: 'For a top-bracket California taxpayer, plan on about 0.4% of the balance per year in tax drag from a taxable S&P 500 index fund' },
  { id: 'filing', group: 'taxes', label: 'Filing status', value: 2, min: 1, max: 2, integer: true, options: [[1, 'Single'], [2, 'Married filing jointly']] },
  { id: 'marginalTaxRate', group: 'taxes', label: 'Marginal income tax rate (federal + state, %)', value: 22, min: 0, max: 60 },
  { id: 'stateIncomeTax', group: 'taxes', label: 'State and local income tax you pay, optional ($ per year; shares the SALT cap with property tax)', value: 0, min: 0, money: true },
  { id: 'itemize', group: 'taxes', label: 'Deductions', value: 1, min: 0, max: 1, integer: true, options: [[1, 'I itemize'], [0, 'I take the standard deduction']] },
  { id: 'capGains', group: 'renting', label: 'Capital gains tax when you sell the investments (%)', value: 15, min: 0, max: 100 },
];

export const rentOwnDefaults = () => Object.fromEntries(RENTOWN_FIELDS.map((f) => [f.id, f.value]));

// Which dollars the results are shown in: 'future' (nominal) or 'today' (discounted by inflation).
export const BASES = ['future', 'today'];

// One-click starting points. Each sets down payment, term, stay and maintenance together
// and leaves everything else (price, rent, the mortgage rate, ...) as the user has it. The 20% down preset is the default set.
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
  { id: 'ftb3', label: 'First-time buyer, 3% down', values: { down: 3, term: 30, years: 7, maintenance: 1 } },
  { id: 'ftb10', label: 'First-time buyer, 10% down', values: { down: 10, term: 30, years: 7, maintenance: 1 } },
  { id: 'down20', label: '20% down, 7-year stay', values: { down: 20, term: 30, years: 7, maintenance: 1 } },
  { id: 'longterm', label: 'Long-term owner, 15-year stay', values: { down: 20, term: 30, years: 15, maintenance: 1.5 } },
];

// Places that cap how fast the taxable (assessed) value can rise, whatever the market does.
// Each sets only the assessed growth.
export const RENTOWN_TAX_CAPS = [
  { id: 'ca', label: 'California Prop 13 (2%)', values: { assessed: 2 } },
  { id: 'fl', label: 'Florida Save Our Homes (3%)', values: { assessed: 3 } },
];

// The preset whose four settings all match the inputs, or null ("Custom").
export const matchRentOwnPreset = (v) => RENTOWN_PRESETS.find((p) => Object.entries(p.values).every(([k, n]) => v[k] === n)) ?? null;

// Long-run planning averages for the investment return (nominal, before the tax drag), not forecasts.
// Each also suggests a yearly tax drag: more of a conservative portfolio's return arrives as taxable
// interest rather than lightly taxed stock growth, so the drag rises as the stock share falls.
export const RETURN_PRESETS = [
  { id: 'aggressive', label: 'Aggressive 10%', detail: '100% stocks', investment: 10, investDrag: 0.7 },
  { id: 'moderate', label: 'Moderate 8%', detail: '60% stocks, 40% bonds', investment: 8, investDrag: 0.8 },
  { id: 'conservative', label: 'Conservative 6%', detail: '20% stocks, 80% bonds', investment: 6, investDrag: 0.9 },
  { id: 'savings', label: 'Savings 4%', detail: 'savings account', investment: 4, investDrag: 1 },
];

// Labels of the fields whose value is blank, unreadable or out of range.
export function invalidRentOwn(v) {
  return RENTOWN_FIELDS.filter((f) => {
    const n = v[f.id];
    if (f.optional && n == null) return false;
    return !Number.isFinite(n) || n < f.min || (f.max != null && n > f.max) || (f.integer && !Number.isInteger(n));
  }).map((f) => f.label.replace(/ \(.*\)$/, ''));
}

// Income tax saved in one year by owning (`yearIndex` 0 is 2026): the owner deducts mortgage interest plus
// property tax and state income tax together up to that year's SALT cap, against the standard deduction
// (indexed by inflation). A renter who itemizes would still deduct the state income tax, so the benefit
// is the owner's deduction less the renter's. Nothing counts if you take the standard deduction.
// Interest counts in proportion to the debt limit over the year's average loan balance (all of it when omitted).
export function taxBenefit(v, interest, propertyTax, yearIndex = 0, averageBalance = 0) {
  if (!v.itemize) return 0;
  const share = averageBalance > MORTGAGE_DEBT_LIMIT ? MORTGAGE_DEBT_LIMIT / averageBalance : 1;
  const cap = saltCap(yearIndex, v.income);
  const standard = STANDARD_DEDUCTION[v.filing] * (1 + v.inflation / 100) ** yearIndex;
  const stateTax = v.stateIncomeTax ?? 0;
  const owner = Math.max(standard, interest * share + Math.min(propertyTax + stateTax, cap));
  const renter = Math.max(standard, Math.min(stateTax, cap));
  return Math.max(0, owner - renter) * (v.marginalTaxRate / 100);
}

// Net worth of each choice at the end of every year of the stay, in future
// (nominal) dollars; `real` has the same years discounted to today's dollars by
// the inflation rate.
// Own: home value less the loan balance and selling costs. Rent has two lenses
// that share the same starting cash (the down payment and closing costs,
// invested) and differ in the monthly cash flow:
// - Equal-cash (`rent`, the headline): both sides spend the same each month, so
//   the renter's account also takes in whatever owning costs beyond rent, and
//   the owner invests whatever owning saves.
// - Pure net worth (`pureRent`): the starting cash only grows; the monthly
//   difference is not credited to either side.
// Each grows at the investment return. Each month the tax drag (never more than
// that month's gain) is taken from the account, and the capital gains tax on
// what is left above the money put in is deducted at the end. `difference` and
// `pureDifference` are own minus that lens's renter.
// The renter's security deposit (one month's rent unless entered) comes out of
// that same starting cash, so the renter invests that much less, and is handed
// back untaxed at the end of the stay.
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
// At the end of each year the tax saved by deducting mortgage interest and property tax is a refund to
// the owner: it cuts what owning cost, so the renter's account invests that much less.
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
export function financing(v) {
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

// Pays `need` in cash out of the investments. Selling holdings in proportion realizes the gain in the part sold, and the
// capital gains tax on it comes out of the same sale, so more than `need` is sold. What the holdings cannot cover becomes debt.
// `rate` is the capital gains rate as a fraction; the unrealized (paper) view passes 0.
export function withdraw(portfolio, basis, need, rate) {
  if (need <= 0) return { portfolio, basis };
  if (portfolio <= 0) return { portfolio: portfolio - need, basis };
  const keep = 1 - (Math.max(0, portfolio - basis) / portfolio) * rate;
  if (need >= portfolio * keep) return { portfolio: portfolio * keep - need, basis: 0 };
  const sold = need / keep;
  return { portfolio: portfolio - sold, basis: basis * (1 - sold / portfolio) };
}

// When owning's lead does not last (a sale tax or compounding investments overtake it), the first and last
// months in which owning is ahead; null if owning is never ahead. The end month is null when the lead holds
// through the last month, which is the ordinary crossover that firstAheadMonth reports.
function aheadSpan(months, field = 'difference') {
  const first = months.findIndex((y) => y[field] >= 0);
  if (first < 0) return null;
  const last = months.map((y) => y[field] >= 0).lastIndexOf(true);
  return { startMonth: months[first].month, endMonth: last === months.length - 1 ? null : months[last].month };
}

export function compareRentOwn(v) {
  const fin = financing(v);
  // The unrealized view is the paper number: no selling costs and no tax on a sale, for either side.
  const paper = v.view === 'unrealized';
  const loan = fin.loan;
  const arm = v.arm === 1;
  const armLoan = arm ? { rateBasis: 'index', initialRate: v.armRate, indexRate: v.armIndexRate, margin: v.armMargin, indexChange: v.armIndexChange, firstCap: v.armFirstCap, periodicCap: v.armPeriodicCap, lifetimeCap: v.armLifetimeCap, floor: v.armFloor } : null;
  let loanRate = arm ? v.armRate : v.rate;
  let monthlyRate = loanRate / 100 / 12;
  let pay = payment(loan, loanRate, v.term * 12);
  let resets = 0;
  const growth = (1 + v.growth / 100) ** (1 / 12);
  const invest = (1 + v.investment / 100) ** (1 / 12);
  let balance = loan;
  let value = v.price;
  // Property tax is charged on the assessed value, which follows the home's value unless a cap is entered,
  // and never more than the market value.
  const assessedGrowth = v.assessed == null ? growth : (1 + v.assessed / 100) ** (1 / 12);
  let assessed = v.price;
  const dragRate = v.investDrag / 100 / 12;
  const upfront = v.price * (v.down / 100 + v.closing / 100) + fin.cashFee + v.moving;
  const deposit = v.deposit ?? v.rent;
  let portfolio = upfront - deposit;
  let basis = portfolio;
  // What the owner invests in the months owning costs less than renting (and the tax refund), taxed the same way.
  let ownPortfolio = 0;
  let ownBasis = 0;
  let dragPaid = 0;
  let pure = portfolio;
  const pureStart = pure;
  const all = [];
  const months = [];
  let firstOwn = 0;
  let firstRent = 0;
  let firstPmi = 0;
  let firstMortgage = 0;
  let peakRate = loanRate;
  let totalPmi = 0;
  let yearInterest = 0;
  let yearBalance = 0;
  let yearPropertyTax = 0;
  let firstTaxBenefit = 0;
  let yearBenefit = 0;
  let totalTaxBenefit = 0;
  const monthly = [];
  const yearEndBalances = [];
  const curve = [];
  const sum = { mortgage: 0, tax: 0, insurance: 0, maintenance: 0, hoa: 0, utilities: 0, pmi: 0, rent: 0, renterInsurance: 0 };
  let repairs = 0;
  let stay = null;
  // Month by month, what owning costs (all in), what renting costs, and the part of owning that is not the loan.
  const series = [];
  // The model runs past the stay (to 30 years) so the chart can show where, or
  // whether, owning catches up; everything else is reported for the stay only.
  const stayMonths = v.years * 12;
  for (let m = 1; m <= Math.max(v.years, CHART_YEARS) * 12; m += 1) {
    // An ARM re-amortizes the balance over the months left at each reset, with the rate the caps allow.
    const sinceFixed = m - 1 - v.armFixedMonths;
    if (arm && sinceFixed >= 0 && sinceFixed % v.armAdjustMonths === 0 && m <= v.term * 12) {
      resets += 1;
      loanRate = rateAfter(armLoan, resets);
      monthlyRate = loanRate / 100 / 12;
      pay = payment(balance, loanRate, v.term * 12 - (m - 1));
    }
    const insured = fin.insuranceMonths == null ? balance > value * 0.8 + 0.005 : m <= fin.insuranceMonths;
    const pmi = insured ? (fin.base * fin.insurancePct) / 100 / 12 : 0;
    if (m <= stayMonths) totalPmi += pmi;
    const interest = balance * monthlyRate;
    const mortgage = m <= v.term * 12 ? pay : 0;
    const before = balance;
    balance = Math.max(0, balance + interest - mortgage);
    yearInterest += before > 0 ? Math.min(interest, mortgage) : 0;
    yearBalance += before;
    const repair = v.repairYear > 0 && m === (v.repairYear - 1) * 12 + 1 ? v.repairCost : 0;
    repairs = repairs * invest + repair;
    const yearsIn = Math.floor((m - 1) / 12);
    const hoa = v.hoa * (1 + v.hoaGrowth / 100) ** yearsIn;
    const utilities = v.utilities * (1 + v.utilitiesGrowth / 100) ** yearsIn;
    const tax = (Math.min(assessed, value) * v.tax) / 100 / 12;
    const insurance = (value * v.insurance) / 100 / 12;
    const maintenance = (value * v.maintenance) / 100 / 12;
    yearPropertyTax += tax;
    const own = mortgage + pmi + tax + insurance + maintenance + hoa + utilities;
    const baseRent = v.rent * (1 + v.rentGrowth / 100) ** yearsIn;
    const rent = baseRent + v.renterInsurance / 12;
    if (m % 12 === 1 && m <= stayMonths) {
      const part = { deposit: m === 1 ? deposit : 0, interest: before > 0 ? Math.min(interest, mortgage) : 0, principal: before - balance, tax, insurance, pmi, maintenance, hoa, utilities, rent: baseRent, renterInsurance: v.renterInsurance / 12 };
      monthly.push(monthlyCosts(part, yearsIn + 1));
    }
    Object.assign(sum, {
      mortgage: sum.mortgage + mortgage, tax: sum.tax + tax, insurance: sum.insurance + insurance, maintenance: sum.maintenance + maintenance,
      hoa: sum.hoa + hoa, utilities: sum.utilities + utilities, pmi: sum.pmi + pmi, rent: sum.rent + baseRent, renterInsurance: sum.renterInsurance + v.renterInsurance / 12,
    });
    // `own` is the cash outlay; `cost` leaves out the principal, which builds equity rather than being spent.
    curve.push({ month: m, own, cost: own - (before - balance), rent });
    if (m <= stayMonths) peakRate = Math.max(peakRate, loanRate);
    const point = { own, rent, carry: tax + insurance + maintenance + hoa + utilities, tax };
    series.push(point);
    if (m === 1) { firstMortgage = mortgage; firstOwn = own; firstRent = rent; firstPmi = pmi; }
    // A renter whose deposit exceeds the cash put in starts in debt and borrows the shortfall at the mortgage rate; it earns nothing and owes no drag.
    const gain = portfolio < 0 ? portfolio * monthlyRate : portfolio * (invest - 1);
    const drag = portfolio > 0 ? Math.min(portfolio * dragRate, Math.max(0, gain)) : 0;
    dragPaid += drag;
    portfolio += gain - drag;
    const ownGain = ownPortfolio * (invest - 1);
    ownPortfolio += ownGain - Math.min(ownPortfolio * dragRate, Math.max(0, ownGain));
    // Whichever side costs less that month invests the difference.
    const put = own - rent;
    if (put > 0) { portfolio += put; basis += put; } else { ownPortfolio -= put; ownBasis -= put; }
    if (m % 12 === 0) {
      if (m <= stayMonths) yearEndBalances.push(balance);
      const benefit = taxBenefit(v, yearInterest, yearPropertyTax, m / 12 - 1, yearBalance / 12);
      yearInterest = 0;
      yearBalance = 0;
      yearPropertyTax = 0;
      if (m === 12) firstTaxBenefit = benefit;
      if (m <= stayMonths) totalTaxBenefit += benefit;
      yearBenefit = benefit;
      // The refund is money the owner gets back and invests, like any other cut in what owning costs.
      ownPortfolio += benefit;
      ownBasis += benefit;
    } else yearBenefit = 0;
    // The renter's account at the end of this month, which the rent-then-buy path follows while it rents.
    point.portfolio = portfolio;
    point.basis = basis;
    // Pure lens: the starting cash alone, with the same tax drag and no monthly flow.
    const pureGain = pure * (invest - 1);
    pure += pureGain - Math.min(pure * dragRate, Math.max(0, pureGain));
    value *= growth;
    assessed *= assessedGrowth;
    // Net worth if everything were sold at the end of this month. The home-sale gain is what is left after
    // selling costs and the price plus closing costs paid. The exclusion needs two years in the home; the
    // capital gains rate is the one the renter's gains use.
    const homeGain = value * (1 - v.selling / 100) - v.price * (1 + v.closing / 100);
    const homeTax = paper ? 0 : Math.max(0, homeGain - (m >= 24 ? v.exclusion : 0)) * (v.capGains / 100);
    const ownEquity = (paper ? value : value * (1 - v.selling / 100)) - balance - repairs - homeTax;
    const ownSaleTax = paper ? 0 : Math.max(0, ownPortfolio - ownBasis) * (v.capGains / 100);
    const ownWorth = ownEquity + ownPortfolio - ownSaleTax;
    const saleTax = paper ? 0 : Math.max(0, portfolio - basis) * (v.capGains / 100);
    const rentWorth = portfolio - saleTax + deposit;
    const pureWorth = (paper ? pure : pure - Math.max(0, pure - pureStart) * (v.capGains / 100)) + deposit;
    months.push({ month: m, difference: ownWorth - rentWorth, pureDifference: ownEquity - pureWorth });
    if (m % 12 === 0) {
      all.push({ year: m / 12, own: ownWorth, rent: rentWorth, difference: ownWorth - rentWorth, pureOwn: ownEquity, pureRent: pureWorth, pureDifference: ownEquity - pureWorth, dragPaid, saleTax, homeTax, taxBenefit: yearBenefit, repair: v.repairYear === m / 12 && v.repairCost > 0 });
    }
    // The cost breakdown describes the end of the stay, not the end of the longer chart run.
    if (m === stayMonths) stay = { sum: { ...sum }, taxBenefit: totalTaxBenefit, value, balance, portfolio, repairs, ownSavings: ownPortfolio - ownSaleTax };
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
  const chartAheadSpan = aheadSpan(months);
  const chartYears = all.slice(0, Math.max(v.years, chartBreakEven ?? CHART_YEARS));
  // Yearly return after the tax drag, before the tax on sale.
  const afterTaxReturn = v.investment - Math.min(v.investDrag, Math.max(0, v.investment));
  const deflate = (rows) => rows.map((y) => {
    const d = (1 + v.inflation / 100) ** y.year;
    return { year: y.year, repair: y.repair, own: y.own / d, pureOwn: y.pureOwn / d, rent: y.rent / d, difference: y.difference / d, pureRent: y.pureRent / d, pureDifference: y.pureDifference / d, dragPaid: y.dragPaid / d, saleTax: y.saleTax / d, homeTax: y.homeTax / d, taxBenefit: y.taxBenefit / d };
  });
  // Monthly lines cross when renting stays the dearer one from some month on.
  const lastCheaper = curve.map((c) => c.cost > c.rent).lastIndexOf(true);
  const monthlyCross = lastCheaper === curve.length - 1 ? null : curve[lastCheaper + 1].month;
  const real = deflate(years);
  const chartReal = deflate(chartYears);
  const cash = cashNeeded(v, firstOwn, firstRent, fin.cashFee, deposit);
  const final = years[years.length - 1];
  const finalReal = real[real.length - 1];
  const waterfall = costWaterfall(v, { upfront, deposit, cashFee: fin.cashFee, ...stay, ownWorth: final.pureOwn, invest, saleTax: final.saleTax, homeTax: final.homeTax });
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
    monthlyCurve: curve,
    monthlyCross,
    chartBreakEvenMonth,
    chartAheadSpan,
    afterTaxReturn,
    final,
    finalReal,
    firstOwnMonthly: firstOwn,
    firstRentMonthly: firstRent,
    firstPmi,
    firstTaxBenefit,
    firstMortgage,
    peakRate,
    totalPmi,
    program: { id: v.program, fee: fin.fee, feeName: fin.feeName, financed: fin.fee > 0 && v.feeFinanced === 1, loan, insuranceName: fin.insuranceName },
    yearEndBalances,
    cash,
    waterfall,
    series,
    startPortfolio: upfront - deposit,
  };
}

// 71 months as "5 years 11 months".
export function durationText(months) {
  const y = Math.floor(months / 12);
  const m = months % 12;
  const part = (n, unit) => `${n} ${unit}${n === 1 ? '' : 's'}`;
  return [y && part(y, 'year'), m && part(m, 'month')].filter(Boolean).join(' ');
}

// The monthly rent (first year) at which renting and owning leave you equally
// well off after the stay; any cheaper similar home makes renting the better deal.
export function equivalentRent(v) {
  const gap = (rent) => compareRentOwn({ ...v, rent }).final.difference;
  let lo = 0;
  let hi = Math.max(v.rent, 1) * 2;
  for (let i = 0; i < 40 && gap(hi) < 0; i += 1) { lo = hi; hi *= 2; }
  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2;
    if (gap(mid) < 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// Where the gap at the end of the stay comes from. Renting ahead = upfront cash
// + recurring (owning costs beyond renting) + opportunity cost (growth the
// investments earned on that money, after the tax on it) - money back from the sale. All four buckets
// are what the model above already adds up, so they sum to -final.difference.
// Moving costs are part of the upfront cash: the owner spends them and never gets them back, and the
// renter invests the same money. The cash reserve is not: it is cash held back on both sides, so it
// changes neither net worth.
function costWaterfall(v, { upfront, deposit, cashFee, sum, taxBenefit, value, balance, portfolio, ownSavings, ownWorth, invest, repairs, saleTax, homeTax }) {
  const down = (v.price * v.down) / 100;
  const closing = (v.price * v.closing) / 100;
  const ownCosts = sum.mortgage + sum.pmi + sum.tax + sum.insurance + sum.maintenance + sum.hoa + sum.utilities;
  const rentCosts = sum.rent + sum.renterInsurance;
  // Income tax refunds from the home deductions cut what owning cost.
  const recurring = ownCosts - taxBenefit - rentCosts;
  // What the owner invests along the way offsets the renter's account, so the buckets stay on the net basis.
  const opportunity = portfolio - ownSavings - saleTax + deposit - upfront - recurring;
  // The deposit is part of the starting cash but earns nothing while the landlord holds it.
  const opportunityUpfront = (upfront - deposit) * (invest ** (v.years * 12) - 1);
  const sellingCosts = v.view === 'unrealized' ? 0 : (value * v.selling) / 100;
  return {
    upfront: { down, closing, fee: cashFee, moving: v.moving, deposit, total: upfront },
    recurring: { mortgage: sum.mortgage, pmi: sum.pmi, tax: sum.tax, insurance: sum.insurance, maintenance: sum.maintenance, hoa: sum.hoa, utilities: sum.utilities, taxBenefit, rent: sum.rent, renterInsurance: sum.renterInsurance, total: recurring },
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

// Kevin O'Leary's rule of thumb: keep housing costs under a third of after-tax pay. Housing here is
// the first month's mortgage payment (interest and principal) plus property tax, home insurance and
// mortgage insurance. With emergency savings entered, also how many months of that payment they cover
// if income stops (six months is the usual test).
export const OLEARY_SHARE = 33;
export const JOB_LOSS_MONTHS = 6;
export function affordability(v, r) {
  if (v.takeHome == null) return null;
  const m = r.monthly[0];
  const monthly = m.interest + m.principal + m.tax + m.insurance + m.pmi + m.hoa;
  const income = v.takeHome / 12;
  const share = (monthly / income) * 100;
  const months = v.emergency == null ? null : monthly > 0 ? v.emergency / monthly : Infinity;
  return { monthly, income, share, over: share > OLEARY_SHARE, maxMonthly: income * OLEARY_SHARE / 100, months, covered: months == null ? null : months >= JOB_LOSS_MONTHS };
}

// What to do once the verdict is in. Renting ahead: the renter must put the Year-1 monthly gap
// (owning cost less rent, not the total difference spread over the stay) into investments.
// Owning ahead: the same gap is what owning costs per month beyond rent, so the budget has to hold.
// `monthly` is the size of that gap, `direction` says which way it runs.
export function followThrough(r) {
  const gap = r.firstOwnMonthly - r.firstRentMonthly;
  return { winner: r.final.difference >= 0 ? 'own' : 'rent', monthly: Math.abs(gap), direction: gap > 0.5 ? 'ownCostsMore' : gap < -0.5 ? 'rentCostsMore' : 'same' };
}

// The 28/36 rule of thumb: housing costs at most 28% of gross monthly income, and all debt payments
// (housing included) at most 36%. Housing is the first month's mortgage interest and principal, property tax,
// insurance, mortgage insurance and HOA dues; maintenance and extra utilities are left out. Null without an income.
export const HOUSING_CAP = 28;
// After-tax pay can never exceed gross pay; when both are entered and it does, the affordability checks disagree.
export function incomeConflict(v) {
  if (v.income == null || !(v.income > 0) || v.takeHome == null || !(v.takeHome > 0)) return null;
  return v.takeHome > v.income ? { income: v.income, takeHome: v.takeHome } : null;
}
export const DEBT_CAP = 36;
export function rule2836(v, r) {
  if (v.income == null) return null;
  const m = r.monthly[0];
  const housing = m.interest + m.principal + m.tax + m.insurance + m.pmi + m.hoa;
  const gross = v.income / 12;
  const debt = housing + v.otherDebt;
  const housingRatio = (housing / gross) * 100;
  const debtRatio = (debt / gross) * 100;
  return { gross, housing, debt, housingRatio, debtRatio, housingOver: housingRatio > HOUSING_CAP, debtOver: debtRatio > DEBT_CAP };
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
function cashNeeded(v, ownMonthly, rentMonthly, fee = 0, deposit = 0) {
  const down = (v.price * v.down) / 100;
  const closing = (v.price * v.closing) / 100;
  const moving = v.moving;
  const reserve = v.reserve * ownMonthly;
  const total = down + closing + fee + moving + reserve;
  const hasSaved = v.saved != null;
  const shortfall = hasSaved ? Math.max(0, total - v.saved) : 0;
  const monthlyGap = ownMonthly - rentMonthly;
  const monthsToClose = shortfall > 0 && monthlyGap > 0 ? Math.ceil(shortfall / monthlyGap) : null;
  return { down, closing, fee, moving, reserve, deposit, total, saved: hasSaved ? v.saved : null, shortfall, monthlyGap, monthsToClose };
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

// The same inputs with a fixed-rate loan and with the ARM, side by side. Only meaningful when the ARM is chosen.
export function compareMortgageTypes(v) {
  return [{ id: 'fixed', label: 'Fixed rate', arm: 0 }, { id: 'arm', label: 'Adjustable rate (ARM)', arm: 1 }].map((t) => {
    const r = compareRentOwn({ ...v, arm: t.arm });
    return { id: t.id, label: t.label, startRate: t.arm ? v.armRate : v.rate, peakRate: r.peakRate, firstMortgage: r.firstMortgage, breakEven: r.breakEven, difference: r.final.difference, differenceReal: r.finalReal.difference };
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
  // An ARM has no single mortgage rate to flip, so its starting rate takes that place.
  const drivers = v.arm === 1 ? RENTOWN_DRIVERS.map((d) => (d.id === 'rate' ? { ...d, id: 'armRate', label: 'ARM starting rate' } : d)) : RENTOWN_DRIVERS;
  const ahead = (x, d) => compareRentOwn({ ...v, [d.id]: x }).final.difference >= 0;
  return drivers.map((d) => {
    const flip = rentOwnFlipPoint(v, d);
    const entered = `${+Number(v[d.id]).toFixed(3)}%`;
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

// Fields that can be entered as a percentage (the model's own unit) or in dollars. The dollar amount is
// derived from the percentage and the home price, so changing the price moves the dollars, not the percentage.
export const RENTOWN_UNITS = {
  down: { label: { pct: 'Down payment (%)', usd: 'Down payment ($)' }, choices: { pct: '%', usd: '$' }, toUsd: (pct, price) => (price * pct) / 100, toPct: (usd, price) => (usd / price) * 100 },
  maintenance: { label: { pct: 'Maintenance (% of value)', usd: 'Maintenance ($ per month)' }, choices: { pct: '% of value', usd: '$ per month' }, toUsd: (pct, price) => (price * pct) / 100 / 12, toPct: (usd, price) => (usd * 12 * 100) / price },
};

export const defaultUnits = () => ({ down: 'pct', maintenance: 'pct' });

// Inputs that differ from the defaults, as a URL fragment (and a stored string).
export function encodeRentOwn(v, basis = 'future', units = defaultUnits(), view = 'realized') {
  const defaults = rentOwnDefaults();
  const params = new URLSearchParams();
  for (const f of RENTOWN_FIELDS) if (Number.isFinite(v[f.id]) && v[f.id] !== defaults[f.id]) params.set(f.id, String(v[f.id]));
  if (basis === 'today') params.set('dollars', 'today');
  if (view === 'unrealized') params.set('view', 'unrealized');
  for (const id of Object.keys(RENTOWN_UNITS)) if (units[id] === 'usd') params.set(`${id}Unit`, 'usd');
  return params.toString();
}

// Which unit each flexible field is shown in; percent unless the fragment says 'usd'. The values themselves are always percentages.
export function decodeUnits(text) {
  const units = defaultUnits();
  try {
    const params = new URLSearchParams(String(text ?? '').replace(/^[#?]/, ''));
    for (const id of Object.keys(RENTOWN_UNITS)) if (params.get(`${id}Unit`) === 'usd') units[id] = 'usd';
  } catch { /* keep defaults */ }
  return units;
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

// Which net worth the results show: 'realized' (after selling costs and tax, the default) unless it says 'unrealized'.
export function decodeView(text) {
  try { return new URLSearchParams(String(text ?? '').replace(/^[#?]/, '')).get('view') === 'unrealized' ? 'unrealized' : 'realized'; } catch { return 'realized'; }
}
