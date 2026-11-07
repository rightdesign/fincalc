// Calculation engine for the stay vs. sell-and-rent comparison.
// Pure functions over the values shaped by inputs.js (percentages are whole
// numbers: 4 means 4%). No DOM, so it runs under node.

const EXCLUSIONS = { none: 0, single: 250000, married: 500000 };

const pct = (n) => n / 100;

// Monthly payment that amortizes `balance` over `termYears` at `ratePct`.
export function monthlyPayment(balance, ratePct, termYears) {
  const n = Math.round(termYears * 12);
  if (balance <= 0 || n <= 0) return 0;
  const r = pct(ratePct) / 12;
  if (r === 0) return balance / n;
  return (balance * r) / (1 - (1 + r) ** -n);
}

// Month-by-month amortization rolled up per year. Years after the loan is
// paid off carry zero interest and principal.
export function amortizationByYear({ mortgageBalance, mortgageRate, mortgageTerm, horizon }) {
  const payment = monthlyPayment(mortgageBalance, mortgageRate, mortgageTerm);
  const r = pct(mortgageRate) / 12;
  const months = Math.round(mortgageTerm * 12);
  let balance = mortgageBalance;
  const years = [];
  for (let y = 1; y <= horizon; y++) {
    let interest = 0;
    let principal = 0;
    for (let m = 0; m < 12 && balance > 0 && (y - 1) * 12 + m < months; m++) {
      const monthInterest = balance * r;
      const monthPrincipal = Math.min(balance, payment - monthInterest);
      interest += monthInterest;
      principal += monthPrincipal;
      balance -= monthPrincipal;
    }
    if (balance < 0.005) balance = 0;
    years.push({ year: y, interest, principal, balance });
  }
  return years;
}

// Tax saved by deducting mortgage interest and property tax. Only the part of
// the itemized deductions above the standard deduction is a benefit of owning;
// property tax counts up to the SALT cap.
export function housingTaxSavings(v, interest) {
  const itemized = interest + Math.min(v.propertyTax, v.saltCap);
  return Math.max(0, itemized - v.standardDeduction) * pct(v.marginalTaxRate);
}

// Selling today: Proceeds -> Selling Costs -> Net Sales -> less Cost Basis ->
// less exclusion -> Cap Gains after Exclusion x Tax Rate -> Taxes Due ->
// minus Mortgage Balance -> Net Proceeds.
export function netSaleProceeds(v) {
  const proceeds = v.homeValue;
  const sellingCosts = proceeds * pct(v.sellingCostsPct);
  const netSales = proceeds - sellingCosts;
  const gain = netSales - v.costBasis;
  const exclusion = EXCLUSIONS[v.exclusion] ?? 0;
  const gainAfterExclusion = Math.max(0, gain - exclusion);
  const taxesDue = gainAfterExclusion * pct(v.taxRate);
  const netProceeds = netSales - taxesDue - v.mortgageBalance;
  return { proceeds, sellingCosts, netSales, gain, exclusion, gainAfterExclusion, taxesDue, mortgageBalance: v.mortgageBalance, netProceeds };
}

// Modelling rules (the ticket leaves these open):
// - Property tax and renter's insurance are flat; rent grows at rentGrowth,
//   year 1 at the quoted rent.
// - Home insurance and maintenance are % of the home's value at the start of
//   the year.
// - Unrecoverable cost = property tax + maintenance + insurance + mortgage
//   interest, less the income tax saved by deducting interest and property
//   tax (see housingTaxSavings). Principal is not a cost: it builds equity.
// - Both paths cover the same housing need. Each year the sell path invests
//   (owner's unrecoverable cost + principal paid) minus (rent + renter's
//   insurance), so the two paths are compared on equal cash out. A negative
//   amount is drawn from the investment.
// - Monthly own cost is the full cash outlay: unrecoverable cost plus
//   principal (property tax, insurance, maintenance, principal and interest).
// - Each year's investment growth is taxed at investmentTaxRate (tax drag on
//   a taxable account); a year with no gain (or a loss) owes nothing
//   and a loss is not cushioned.
// - Investment income is investmentWithdrawal% of capital at the start of the
//   year, less withdrawalTaxRate (tax-deferred money is taxed when taken out):
//   what the portfolio could pay out after tax, not deducted from capital.
// - Stay net worth is what the owner would net by selling at that point:
//   home value less selling costs and capital-gains tax (same chain as
//   netSaleProceeds, on the then-current value and mortgage balance). Sell
//   net worth is investment capital, whose selling costs and taxes were
//   charged up front, so both paths end after sale and after tax. Year 0 is
//   therefore level.
// - breakevenYear is the first year (1 or later) the sell path is at or
//   ahead of the stay path, else null.
export function project(values) {
  const v = values;
  const horizon = Math.max(0, Math.floor(v.horizon));
  const sale = netSaleProceeds(v);
  const loan = amortizationByYear({ ...v, horizon });

  const gross = pct(v.investmentGrowth);
  const growth = gross > 0 ? gross * (1 - pct(v.investmentTaxRate)) : gross;
  let capital = sale.netProceeds;
  let homeValue = v.homeValue;
  let cumulativeSell = 0;
  let cumulativeStay = 0;

  const rows = [{
    year: 0,
    homeValue,
    mortgageBalance: v.mortgageBalance,
    equity: homeValue - v.mortgageBalance,
    stayNetWorth: sale.netProceeds,
    investmentCapital: capital,
    netWorthGainLoss: capital - sale.netProceeds,
  }];

  for (let y = 1; y <= horizon; y++) {
    const { interest, principal, balance } = loan[y - 1];
    const startValue = homeValue;
    homeValue = startValue * (1 + pct(v.appreciation));

    const propertyTax = v.propertyTax;
    const insurance = startValue * pct(v.insurancePct);
    const maintenance = startValue * pct(v.maintenancePct);
    const taxSavings = housingTaxSavings(v, interest);
    const unrecoverableCost = propertyTax + insurance + maintenance + interest - taxSavings;
    const rentCost = v.rent * 12 * (1 + pct(v.rentGrowth)) ** (y - 1) + v.rentersInsurance;

    const investmentIncome = capital * pct(v.investmentWithdrawal) * (1 - pct(v.withdrawalTaxRate));
    const contribution = unrecoverableCost + principal - rentCost;
    capital = capital * (1 + growth) + contribution;

    const equity = homeValue - balance;
    const stayNetWorth = netSaleProceeds({ ...v, homeValue, mortgageBalance: balance }).netProceeds;
    cumulativeStay += unrecoverableCost;
    cumulativeSell += rentCost;
    rows.push({
      year: y,
      homeValue,
      mortgageBalance: balance,
      equity,
      stayNetWorth,
      propertyTax,
      insurance,
      maintenance,
      mortgageInterest: interest,
      taxSavings,
      mortgagePrincipal: principal,
      unrecoverableCost,
      rentCost,
      monthlyOwnCost: (unrecoverableCost + principal) / 12,
      monthlyRentCost: rentCost / 12,
      cumulativeUnrecoverableCost: cumulativeStay,
      cumulativeRentCost: cumulativeSell,
      investmentIncome,
      monthlyInvestmentIncome: investmentIncome / 12,
      investmentCapital: capital,
      netWorthGainLoss: capital - stayNetWorth,
    });
  }

  const breakeven = rows.slice(1).find((r) => r.netWorthGainLoss >= 0);
  return { sale, rows, breakevenYear: breakeven ? breakeven.year : null };
}

// Restates a projection in today's dollars: every money amount in year y is
// divided by (1 + inflation) ** y. Year 0 is today, so it is unchanged.
export function inTodaysDollars(rows, inflationPct) {
  return rows.map((r) => {
    const factor = (1 + pct(inflationPct)) ** r.year;
    const out = {};
    for (const [k, val] of Object.entries(r)) out[k] = k === 'year' ? val : val / factor;
    return out;
  });
}
