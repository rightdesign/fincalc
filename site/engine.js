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
//   interest. Principal is not a cost: it builds equity.
// - Both paths cover the same housing need. Each year the sell path invests
//   (owner's unrecoverable cost + principal paid) minus (rent + renter's
//   insurance), so the two paths are compared on equal cash out. A negative
//   amount is drawn from the investment.
// - Monthly own cost is the full cash outlay: unrecoverable cost plus
//   principal (property tax, insurance, maintenance, principal and interest).
// - Investment income is investmentWithdrawal% of capital at the start of the
//   year: what the portfolio could pay out, not deducted from capital.
// - Stay net worth is home equity (value minus mortgage balance); sell net
//   worth is investment capital. Selling costs and taxes are charged up front.
// - breakevenYear is the first year (0 = today) the sell path is at or ahead
//   of the stay path, else null.
export function project(values) {
  const v = values;
  const horizon = Math.max(0, Math.floor(v.horizon));
  const sale = netSaleProceeds(v);
  const loan = amortizationByYear({ ...v, horizon });

  const growth = pct(v.investmentGrowth);
  let capital = sale.netProceeds;
  let homeValue = v.homeValue;
  let cumulativeSell = 0;
  let cumulativeStay = 0;

  const rows = [{
    year: 0,
    homeValue,
    mortgageBalance: v.mortgageBalance,
    equity: homeValue - v.mortgageBalance,
    investmentCapital: capital,
    netWorthGainLoss: capital - (homeValue - v.mortgageBalance),
  }];

  for (let y = 1; y <= horizon; y++) {
    const { interest, principal, balance } = loan[y - 1];
    const startValue = homeValue;
    homeValue = startValue * (1 + pct(v.appreciation));

    const propertyTax = v.propertyTax;
    const insurance = startValue * pct(v.insurancePct);
    const maintenance = startValue * pct(v.maintenancePct);
    const unrecoverableCost = propertyTax + insurance + maintenance + interest;
    const rentCost = v.rent * 12 * (1 + pct(v.rentGrowth)) ** (y - 1) + v.rentersInsurance;

    const investmentIncome = capital * pct(v.investmentWithdrawal);
    const contribution = unrecoverableCost + principal - rentCost;
    capital = capital * (1 + growth) + contribution;

    const equity = homeValue - balance;
    cumulativeStay += unrecoverableCost;
    cumulativeSell += rentCost;
    rows.push({
      year: y,
      homeValue,
      mortgageBalance: balance,
      equity,
      propertyTax,
      insurance,
      maintenance,
      mortgageInterest: interest,
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
      netWorthGainLoss: capital - equity,
    });
  }

  const breakeven = rows.find((r) => r.netWorthGainLoss >= 0);
  return { sale, rows, breakevenYear: breakeven ? breakeven.year : null };
}
