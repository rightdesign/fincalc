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
export function housingTaxSavings(v, interest, propertyTax = v.propertyTax) {
  const itemized = interest + Math.min(propertyTax, v.saltCap);
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

// How the downsize path is funded at year 0: the sale proceeds, less the new
// home, its buying costs and the moving costs, plus any new mortgage. `invested`
// is what is left to invest, negative for a shortfall drawn from investments.
export function downsizeFunding(v) {
  const sale = netSaleProceeds(v);
  const buyingCosts = v.newHomePrice * pct(v.newBuyingCostsPct);
  const useProceeds = v.useProceeds !== 0;
  const needed = v.newHomePrice + buyingCosts - v.newMortgageAmount;
  // The most the user allows from the proceeds; the rest of the purchase is paid
  // from money outside the model (as when useProceeds is off).
  const cap = v.proceedsMode === 'amount' ? v.proceedsAmount
    : v.proceedsMode === 'percent' ? Math.max(0, sale.netProceeds) * pct(v.proceedsPercent) : Infinity;
  const fromProceeds = useProceeds ? Math.min(needed, Number.isFinite(cap) ? cap : needed) : 0;
  const invested = sale.netProceeds - v.movingCosts - fromProceeds;
  return {
    salePrice: sale.proceeds,
    sellingCosts: sale.sellingCosts,
    taxesDue: sale.taxesDue,
    mortgagePayoff: sale.mortgageBalance,
    netProceeds: sale.netProceeds,
    newHomePrice: v.newHomePrice,
    buyingCosts,
    newMortgage: v.newMortgageAmount,
    movingCosts: v.movingCosts,
    outsideFunds: useProceeds ? needed - fromProceeds : needed,
    invested,
  };
}

// Modelling rules (the ticket leaves these open):
// - HOA dues are monthly dues x 12 in year 1 and grow at hoaGrowth; they are not
//   tax deductible.
// - Renter's insurance is flat; rent grows at rentGrowth, year 1 at the
//   quoted rent.
// - Property tax is the quoted dollars in year 1; home insurance and
//   maintenance are their % of today's home value in year 1. Each then grows
//   at its own rate (propertyTaxGrowth, insuranceGrowth, maintenanceGrowth),
//   independent of the home's appreciation.
// - Major repairs are optional one-time expenses (v.repairs: [{ year, amount }],
//   amounts in the year's own dollars, several allowed per year). They are a
//   cost of owning in that year, not tax deductible and not added to the
//   cost basis.
// - Unrecoverable cost = property tax + maintenance + insurance + HOA dues + major
//   repairs + mortgage interest, less the income tax saved by deducting interest and property
//   tax (see housingTaxSavings). Principal is not a cost: it builds equity.
// - Both paths cover the same housing need. Each year the sell path invests
//   (owner's unrecoverable cost + principal paid) minus (rent + renter's
//   insurance), so the two paths are compared on equal cash out. A negative
//   amount is drawn from the investment.
// - Monthly own cost is the full cash outlay: unrecoverable cost plus
//   principal (property tax, insurance, maintenance, principal and interest).
// - Monthly out-of-pocket cash (the cash-flow lens, not net worth) is the year's
//   housing cash outflow less the after-tax investment income applied to it,
//   never below zero: stay has no portfolio, so it is the full monthly own
//   cost; sell is rent + renter's insurance; downsize is the new home's
//   carrying costs and mortgage payments.
// - Each year's investment growth is taxed at investmentTaxRate (tax drag on
//   a taxable account); a year with no gain (or a loss) owes nothing
//   and a loss is not cushioned.
// - Investment income is investmentWithdrawal% of capital at the start of the
//   year, less withdrawalTaxRate (tax-deferred money is taxed when taken out):
//   what the portfolio could pay out after tax, not deducted from capital.
// - With withdrawToCoverRent on, the income is instead just what pays that
//   year's rent (the downsize path: its housing outflow), capped at what the
//   capital can pay after tax; the withdrawal rate is ignored.
// - Leaving costs the sell path two one-time amounts up front, taken out of
//   the net proceeds before investing: moving costs and the rental's upfront
//   cash (security deposit, first/last month's rent), counted as spent.
// - Stay net worth compounds before taxes until the period ends: in years 1 up
//   to the horizon it is the home's equity (value less mortgage). Only in the
//   final year is the home sold: value less selling costs and capital-gains
//   tax (same chain as netSaleProceeds, on the then-current value and mortgage
//   balance). Year 0 is shown after sale, as if selling today, so it is level
//   with the sell path, whose investment capital had its selling costs and
//   taxes charged up front.
// - breakevenYear is the first year (1 or later) the sell path is at or
//   ahead of the stay path, else null.
// - The downsize path sells the home (same proceeds and moving costs as the
//   sell path), buys the new home for newHomePrice plus buying costs, funded by
//   the sale proceeds and any new mortgage (a shortfall is drawn from the
//   investments, so capital can start negative; `downsizeShortfall` reports
//   how much, so the page can say so), and invests the rest. The new
//   home appreciates at the same rate as the old one; its property tax,
//   insurance, maintenance and HOA grow at the same rates as the old home's, and
//   the same tax-deduction rules apply. Each year it invests the stay path's
//   cash outlay less its own (unrecoverable cost + principal), so all three paths
//   cover the same housing need on equal cash out. Its net worth is investment
//   capital plus the new home's value less mortgage; in year 0 and the final
//   year the value is also net of selling costs and capital-gains tax (cost
//   basis = price paid), the same basis as stay.
//   With useProceeds off (v.useProceeds === 0) the purchase is not drawn from the
//   sale proceeds: the net proceeds less moving costs are invested at year 0 as
//   in the sell path, and the new mortgage plus funds outside the model pay for
//   the home. proceedsMode 'amount' / 'percent' (of net proceeds) caps what is
//   drawn from the proceeds when useProceeds is on; the rest is outside funds.
//   Outside money (`outsideFunds`: price + buying costs - mortgage, less any
//   part drawn from the proceeds) is not part of the comparison, so the downsize
//   net worth is reduced by it, in the capped mode as well as the unchecked one.
//   That keeps year 0 level and the three paths comparable. Anything else
//   (including absent) keeps the default, on.
//   downsizeBreakevenYear is the first year (1 or later) the downsize path is at
//   or ahead of the stay path, else null.
// Monthly cash the household must supply for a year's housing outflow: the
// outflow less the after-tax portfolio withdrawals applied to it. Withdrawals
// only offset housing (never more than it costs) and a negative portfolio
// pays nothing.
function outOfPocket(annualOutflow, annualWithdrawal) {
  return Math.max(0, annualOutflow - Math.max(0, annualWithdrawal)) / 12;
}

// After-tax portfolio income for a year. Normally the withdrawal rate times
// the capital at the start of the year, less tax on withdrawals. With
// v.withdrawToCoverRent === 1 the rate is ignored: the household withdraws just
// enough to pay `need` (the rent, or the new home's housing outflow), capped at
// what the capital can pay after tax, and nothing when capital is not positive.
function portfolioIncome(v, capital, need) {
  const keep = 1 - pct(v.withdrawalTaxRate);
  if (v.withdrawToCoverRent !== 1) return capital * pct(v.investmentWithdrawal) * keep;
  return Math.min(Math.max(0, need), Math.max(0, capital) * keep);
}

export function project(values) {
  const v = values;
  const horizon = Math.max(0, Math.floor(v.horizon));
  const sale = netSaleProceeds(v);
  const loan = amortizationByYear({ ...v, horizon });

  const gross = pct(v.investmentGrowth);
  const growth = gross > 0 ? gross * (1 - pct(v.investmentTaxRate)) : gross;
  let capital = sale.netProceeds - v.movingCosts - v.rentalUpfront;

  const newLoan = amortizationByYear({
    mortgageBalance: v.newMortgageAmount, mortgageRate: v.newMortgageRate, mortgageTerm: v.newMortgageTerm, horizon,
  });
  const newNetSale = (homeValue, mortgageBalance) => netSaleProceeds({
    ...v, homeValue, costBasis: v.newHomePrice, mortgageBalance,
  }).netProceeds;
  const funding = downsizeFunding(v);
  const outsideFunds = funding.outsideFunds;
  let downsizeCapital = funding.invested;
  const downsizeShortfall = v.useProceeds !== 0 ? Math.max(0, -downsizeCapital) : 0;
  let newHomeValue = v.newHomePrice;
  let downsizeNetWorth = downsizeCapital + newNetSale(newHomeValue, v.newMortgageAmount) - outsideFunds;
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
    downsizeHomeValue: newHomeValue,
    downsizeMortgageBalance: v.newMortgageAmount,
    downsizeInvestmentCapital: downsizeCapital,
    downsizeNetWorth,
    downsizeGainLoss: downsizeNetWorth - sale.netProceeds,
  }];

  for (let y = 1; y <= horizon; y++) {
    const { interest, principal, balance } = loan[y - 1];
    homeValue *= 1 + pct(v.appreciation);

    const propertyTax = v.propertyTax * (1 + pct(v.propertyTaxGrowth)) ** (y - 1);
    const insurance = v.homeValue * pct(v.insurancePct) * (1 + pct(v.insuranceGrowth)) ** (y - 1);
    const maintenance = v.homeValue * pct(v.maintenancePct) * (1 + pct(v.maintenanceGrowth)) ** (y - 1);
    const hoa = v.hoaMonthly * 12 * (1 + pct(v.hoaGrowth)) ** (y - 1);
    const repairs = (v.repairs ?? []).reduce((sum, e) => (e.year === y ? sum + e.amount : sum), 0);
    const taxSavings = housingTaxSavings(v, interest, propertyTax);
    const unrecoverableCost = propertyTax + insurance + maintenance + hoa + repairs + interest - taxSavings;
    const rentCost = v.rent * 12 * (1 + pct(v.rentGrowth)) ** (y - 1) + v.rentersInsurance;

    const investmentIncome = portfolioIncome(v, capital, rentCost);
    const contribution = unrecoverableCost + principal - rentCost;
    capital = capital * (1 + growth) + contribution;

    const newPay = newLoan[y - 1];
    newHomeValue *= 1 + pct(v.appreciation);
    const newPropertyTax = v.newPropertyTax * (1 + pct(v.propertyTaxGrowth)) ** (y - 1);
    const newInsurance = v.newHomePrice * pct(v.newInsurancePct) * (1 + pct(v.insuranceGrowth)) ** (y - 1);
    const newMaintenance = v.newHomePrice * pct(v.newMaintenancePct) * (1 + pct(v.maintenanceGrowth)) ** (y - 1);
    const newHoa = v.newHoaMonthly * 12 * (1 + pct(v.hoaGrowth)) ** (y - 1);
    const newTaxSavings = housingTaxSavings(v, newPay.interest, newPropertyTax);
    const downsizeCost = newPropertyTax + newInsurance + newMaintenance + newHoa + newPay.interest - newTaxSavings;
    const downsizeIncome = portfolioIncome(v, downsizeCapital, downsizeCost + newPay.principal);
    downsizeCapital = downsizeCapital * (1 + growth) + (unrecoverableCost + principal - downsizeCost - newPay.principal);
    const lastYear = y === horizon;
    downsizeNetWorth = downsizeCapital - outsideFunds
      + (lastYear ? newNetSale(newHomeValue, newPay.balance) : newHomeValue - newPay.balance);

    const equity = homeValue - balance;
    const stayNetWorth = lastYear ? netSaleProceeds({ ...v, homeValue, mortgageBalance: balance }).netProceeds : equity;
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
      hoa,
      repairs,
      mortgageInterest: interest,
      taxSavings,
      mortgagePrincipal: principal,
      unrecoverableCost,
      rentCost,
      monthlyOwnCost: (unrecoverableCost + principal) / 12,
      monthlyRentCost: rentCost / 12,
      monthlyStayOutOfPocket: (unrecoverableCost + principal) / 12,
      monthlySellOutOfPocket: outOfPocket(rentCost, investmentIncome),
      monthlyDownsizeOutOfPocket: outOfPocket(downsizeCost + newPay.principal, downsizeIncome),
      cumulativeUnrecoverableCost: cumulativeStay,
      cumulativeRentCost: cumulativeSell,
      investmentIncome,
      monthlyInvestmentIncome: investmentIncome / 12,
      investmentCapital: capital,
      netWorthGainLoss: capital - stayNetWorth,
      downsizeHomeValue: newHomeValue,
      downsizeMortgageBalance: newPay.balance,
      downsizeUnrecoverableCost: downsizeCost,
      monthlyDownsizeCost: (downsizeCost + newPay.principal) / 12,
      downsizeInvestmentIncome: downsizeIncome,
      monthlyDownsizeInvestmentIncome: downsizeIncome / 12,
      downsizeInvestmentCapital: downsizeCapital,
      downsizeNetWorth,
      downsizeGainLoss: downsizeNetWorth - stayNetWorth,
    });
  }

  const breakeven = rows.slice(1).find((r) => r.netWorthGainLoss >= 0);
  const downsizeBreakeven = rows.slice(1).find((r) => r.downsizeGainLoss >= 0);
  return {
    sale,
    rows,
    investmentGrowth: growth,
    breakevenYear: breakeven ? breakeven.year : null,
    downsizeBreakevenYear: downsizeBreakeven ? downsizeBreakeven.year : null,
    downsizeShortfall,
  };
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
