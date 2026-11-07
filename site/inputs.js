// Homeowner input definitions for the stay vs. sell-and-rent calculator.
// Pure data and helpers (no DOM) so they can be tested under node.

export const MAX_HORIZON_YEARS = 30;

// slider: { min, max, step } adds a range slider beside the number field (the
// field itself still accepts any value). kind: 'money' ($), 'percent' (%), 'years', 'choice', 'checkbox' (stored as 1 or 0).
export const FIELDS = [
  { id: 'homeValue', label: 'Home value', kind: 'money', default: 500000, group: 'Home', slider: { min: 50000, max: 2000000, step: 5000 }, hint: "What your home would sell for today. Typical range: your local market value, often $150,000–$1,000,000." },
  { id: 'costBasis', label: 'Cost basis', kind: 'money', default: 300000, group: 'Home', hint: "What you paid for the home plus purchase closing costs and major improvements. Used to work out your taxable gain. Typically 40–90% of the home value." },
  { id: 'appreciation', label: 'Appreciation (per year)', kind: 'percent', default: 3, group: 'Home', slider: { min: 0, max: 10, step: 0.1 }, hint: "Expected yearly rise in your home's value. Long-run US average is about 3–4%; typical range 0–5%." },
  { id: 'propertyTax', label: 'Property tax (per year)', kind: 'money', default: 5000, group: 'Owning costs', hint: "Annual property tax bill. Typically 0.3–2% of the home value per year." },
  { id: 'insurancePct', label: 'Insurance (% of home value per year)', kind: 'percent', default: 0.5, group: 'Owning costs', hint: "Yearly homeowner's insurance cost as a share of home value. Typical range 0.3–1%." },
  { id: 'propertyTaxGrowth', label: 'Property tax growth (per year)', kind: 'percent', default: 2, group: 'Owning costs', hint: "Expected yearly rise in your property tax. Some states cap it (California's Prop 13 limits it to 2%); elsewhere it follows reassessments. Typical range 1–5%." },
  { id: 'insuranceGrowth', label: 'Insurance growth (per year)', kind: 'percent', default: 5, group: 'Owning costs', hint: "Expected yearly rise in your homeowner's insurance premium. Premiums have recently grown much faster than inflation in many areas. Typical range 3–10%." },
  { id: 'maintenancePct', label: 'Maintenance (% of home value per year)', kind: 'percent', default: 1, group: 'Owning costs', hint: "Yearly upkeep and repairs as a share of home value. A common rule of thumb is 1%; typical range 0.5–2%." },
  { id: 'hoaMonthly', label: 'HOA dues (per month)', kind: 'money', default: 0, group: 'Owning costs', hint: "Monthly homeowners association dues for a condo or townhouse. Enter 0 if you have none. Typically $200–$800 a month." },
  { id: 'hoaGrowth', label: 'HOA dues growth (per year)', kind: 'percent', default: 4, group: 'Owning costs', hint: "Expected yearly rise in your HOA dues, which often outpaces inflation. Typical range 3–6%. Year 1 is the dues you enter." },
  { id: 'maintenanceGrowth', label: 'Maintenance growth (per year)', kind: 'percent', default: 3, group: 'Owning costs', hint: "Expected yearly rise in upkeep and repair costs. Usually close to general inflation; typical range 2–4%." },
  { id: 'mortgageBalance', label: 'Mortgage balance', kind: 'money', default: 200000, group: 'Mortgage', hint: "What you still owe on your mortgage today. Enter 0 if the home is paid off." },
  { id: 'mortgageRate', label: 'Mortgage rate', kind: 'percent', default: 4, group: 'Mortgage', hint: "Your mortgage's annual interest rate. Typical range 2.5–8%." },
  { id: 'mortgageTerm', label: 'Remaining mortgage term (years)', kind: 'years', default: 25, group: 'Mortgage', hint: "Years left until the mortgage is paid off. Typically 0–30." },
  { id: 'marginalTaxRate', label: 'Marginal income tax rate (federal + state)', kind: 'percent', default: 24, group: 'Tax deduction', hint: "Your tax bracket: the rate on your last dollar of income. Each dollar of deductible mortgage interest and property tax above the standard deduction saves this much tax. Federal brackets run 10–37%; add your state rate. Enter 0 to ignore the deduction." },
  { id: 'standardDeduction', label: 'Standard deduction', kind: 'money', default: 32200, group: 'Tax deduction', hint: "What you would deduct without itemizing: about $16,100 for a single filer or $32,200 for a married couple filing jointly (2026). Only housing deductions above this amount count as a benefit of owning." },
  { id: 'saltCap', label: 'Cap on state and local tax deduction', kind: 'money', default: 40000, group: 'Tax deduction', hint: "The most you can deduct for state and local taxes, including property tax. The federal cap is $40,000 for 2025–2029 (less for very high incomes) and $10,000 before and after. Only your property tax is counted here." },
  { id: 'sellingCostsPct', label: 'Selling costs (% of sale price)', kind: 'percent', default: 6, group: 'Selling', hint: "Agent commissions, closing costs and other fees when selling, as a share of the sale price. Typical range 5–8%." },
  { id: 'taxRate', label: 'Capital gains tax rate (federal + state)', kind: 'percent', default: 20, group: 'Selling', hint: "Combined federal and state tax rate on the profit from selling. Federal long-term rates are 0%, 15% or 20%; typical combined range 15–30%." },
  {
    id: 'exclusion', label: 'Primary-residence exclusion', kind: 'choice', default: 'single', group: 'Selling',
    hint: "The IRS lets you exclude part of the gain on a primary residence from tax: $250,000 for a single filer, $500,000 for a married couple filing jointly.",
    options: [
      { value: 'none', label: 'None' },
      { value: 'single', label: 'Single filer ($250,000)' },
      { value: 'married', label: 'Married filing jointly ($500,000)' },
    ],
  },
  { id: 'movingCosts', label: 'Moving and storage costs (one time)', kind: 'money', default: 0, group: 'If you sell and invest', hint: "One-time cost of moving out: movers, truck rental, storage and similar. Taken out of your sale proceeds before they are invested. Optional; typical range $1,000–$10,000." },
  { id: 'investmentGrowth', label: 'Investment growth (per year)', kind: 'percent', default: 6, group: 'If you sell and invest', slider: { min: 0, max: 12, step: 0.1 }, hint: "Expected yearly return on the money you invest after selling. Stocks have averaged about 7–10% before inflation; typical planning range 4–8%." },
  { id: 'investmentWithdrawal', label: 'Investment withdrawal (% per year)', kind: 'percent', default: 4, group: 'If you sell and invest', hint: "Share of the investments you take out each year to live on, before tax. The common 'safe withdrawal' guideline is about 4%; typical range 3–5%." },
  { id: 'investmentTaxRate', label: 'Tax on investment growth (%)', kind: 'percent', default: 15, group: 'If you sell and invest', hint: "Tax paid each year on the gains in your invested money, which lowers the growth you keep. Use 0 for a Roth or tax-deferred account. Taxable accounts typically pay 15–25% on dividends and gains." },
  { id: 'withdrawalTaxRate', label: 'Tax on withdrawals (%)', kind: 'percent', default: 0, group: 'If you sell and invest', hint: "Tax paid on the money you take out each year. Use 0 for a taxable or Roth account (growth is taxed above, or never); use your income tax rate for a tax-deferred account such as a traditional IRA or 401(k)." },
  { id: 'rentalUpfront', label: 'Rental deposit and upfront rent (one time)', kind: 'money', default: 0, group: 'If you rent', hint: "Cash due when you sign a lease: security deposit plus first and last month's rent. Counted as spent, so enter only what you do not expect back. Optional; typically one to three months' rent." },
  { id: 'rent', label: 'Comparable rent (per month)', kind: 'money', default: 2500, group: 'If you rent', slider: { min: 500, max: 8000, step: 50 }, hint: "What it would cost to rent a comparable home, per month. Typically 0.4–0.7% of the home value per month." },
  { id: 'rentGrowth', label: 'Rent growth (per year)', kind: 'percent', default: 3, group: 'If you rent', slider: { min: 0, max: 10, step: 0.1 }, hint: "Expected yearly rise in your rent. Typical range 2–5%." },
  { id: 'rentersInsurance', label: "Renter's insurance (per year)", kind: 'money', default: 200, group: 'If you rent', hint: "Yearly cost of renter's insurance. Typical range $100–$400." },
  {
    id: 'useProceeds', label: 'Use the proceeds from selling my current home to buy the new home', kind: 'checkbox', default: 1, group: 'If you downsize',
    hint: "Checked: the new home is paid for in this order: first the net sale proceeds (after moving costs), then the new mortgage, then other savings. Only what is left is invested; if the proceeds and mortgage fall short, the shortfall is drawn from other savings and invested capital starts negative. Unchecked: all the net proceeds (after moving costs) are invested right away, as in the sell-and-rent path, and the new mortgage plus money from outside this model pay for the new home, so there is no shortfall."
  },
  {
    id: 'proceedsMode', label: 'How much of the proceeds to put into the new home', kind: 'choice', default: 'all', group: 'If you downsize',
    hint: "Only used when the box above is checked. \"As much as needed\" puts in whatever the new home, its buying costs and your new mortgage require. Choosing a dollar amount or a share of the net sale proceeds caps it: you keep the rest invested, and whatever the cap leaves uncovered is paid from money outside this model.",
    options: [
      { value: 'all', label: 'As much as needed' },
      { value: 'amount', label: 'A dollar amount' },
      { value: 'percent', label: 'A percentage of the net proceeds' },
    ],
  },
  { id: 'proceedsAmount', label: 'Proceeds to put into the new home ($)', kind: 'money', default: 0, group: 'If you downsize', hint: "The most you will put into the new home from the net sale proceeds. Used when the choice above is a dollar amount." },
  { id: 'proceedsPercent', label: 'Proceeds to put into the new home (% of net proceeds)', kind: 'percent', default: 100, group: 'If you downsize', hint: "The most you will put into the new home, as a share of the net sale proceeds. Used when the choice above is a percentage." },
  { id: 'newHomePrice', label: 'New home price', kind: 'money', default: 300000, group: 'If you downsize', hint: "What a smaller or cheaper home would cost you today. The third path in the comparison: sell, buy this home, and invest what is left. Typically well below your current home value." },
  { id: 'newBuyingCostsPct', label: 'Buying costs (% of new home price)', kind: 'percent', default: 2, group: 'If you downsize', hint: "Closing costs and fees when buying the new home, as a share of its price, paid up front. Typical range 2–5%." },
  { id: 'newMortgageAmount', label: 'New mortgage amount', kind: 'money', default: 0, group: 'If you downsize', hint: "How much you would borrow to buy the new home. Enter 0 to buy it outright. With the proceeds checkbox checked, the sale proceeds are used first, then this mortgage, and any shortfall is drawn from other savings (so invested capital starts negative). Unchecked, this mortgage plus outside money pays for the home." },
  { id: 'newMortgageRate', label: 'New mortgage rate', kind: 'percent', default: 6, group: 'If you downsize', hint: "Annual interest rate on the new mortgage. Ignored when the new mortgage amount is 0. Typical range 5–8%." },
  { id: 'newMortgageTerm', label: 'New mortgage term (years)', kind: 'years', default: 30, group: 'If you downsize', hint: "Length of the new mortgage in years. Ignored when the new mortgage amount is 0. Typically 15 or 30." },
  { id: 'newPropertyTax', label: 'New home property tax (per year)', kind: 'money', default: 3000, group: 'If you downsize', hint: "Annual property tax on the new home. Grows at the property tax growth rate above. Typically 0.3–2% of its price." },
  { id: 'newInsurancePct', label: 'New home insurance (% of price per year)', kind: 'percent', default: 0.5, group: 'If you downsize', hint: "Yearly homeowner's insurance on the new home as a share of its price. Grows at the insurance growth rate above. Typical range 0.3–1%." },
  { id: 'newMaintenancePct', label: 'New home maintenance (% of price per year)', kind: 'percent', default: 1, group: 'If you downsize', hint: "Yearly upkeep and repairs on the new home as a share of its price. Grows at the maintenance growth rate above. Typical range 0.5–2%." },
  { id: 'newHoaMonthly', label: 'New home HOA dues (per month)', kind: 'money', default: 0, group: 'If you downsize', hint: "Monthly homeowners association dues for the new home. Enter 0 if none. Grows at the HOA growth rate above." },
  { id: 'inflation', label: 'Inflation (per year)', kind: 'percent', default: 3, group: 'Inflation', hint: "Expected yearly rise in prices. Used only when you show results in today's dollars, to discount each future year's amounts. The long-run US average is about 3%; typical range 2–4%." },
  {
    id: 'todaysDollars', label: 'Show results in', kind: 'choice', default: 'nominal', group: 'Inflation',
    hint: "Future dollars (nominal) are the amounts you would actually see in that year. Today's dollars discount them by the inflation rate so they are comparable to money now.",
    options: [
      { value: 'nominal', label: 'Future dollars (not adjusted for inflation)' },
      { value: 'real', label: "Today's dollars (adjusted for inflation)" },
    ],
  },
  { id: 'horizon', label: 'Time horizon (years)', kind: 'years', group: 'Time horizon', hint: "How many years to compare the two options. Defaults to the lesser of 30 years or your remaining mortgage term; maximum 30." },
];

// Default horizon: the lesser of 30 years or the remaining mortgage term.
export function defaultHorizon(mortgageTerm) {
  const term = Number(mortgageTerm);
  if (!Number.isFinite(term) || term <= 0) return MAX_HORIZON_YEARS;
  return Math.min(MAX_HORIZON_YEARS, term);
}

export function defaultValues() {
  const values = {};
  for (const field of FIELDS) if ('default' in field) values[field.id] = field.default;
  values.horizon = defaultHorizon(values.mortgageTerm);
  return values;
}

// Reads raw form strings into numbers (choices stay strings). A blank or
// non-numeric entry becomes null so the calculator can tell it is missing.
export function parseValue(field, raw) {
  if (field.kind === 'checkbox') return raw === '1' ? 1 : raw === '0' ? 0 : null;
  if (field.kind === 'choice') return field.options.some((o) => o.value === raw) ? raw : null;
  if (raw === '' || raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// Reads the major-repair rows ({ year, amount } raw strings) into
// [{ year, amount }]. A row left entirely blank is skipped; a row with a
// missing, negative or non-numeric entry (or a fractional or zero year) makes
// the whole list invalid (null).
export function parseRepairs(rows) {
  const out = [];
  for (const row of rows) {
    const year = String(row.year ?? '').trim();
    const amount = String(row.amount ?? '').trim();
    if (year === '' && amount === '') continue;
    const y = year === '' ? NaN : Number(year);
    const a = amount === '' ? NaN : Number(amount);
    if (!Number.isInteger(y) || y < 1 || !Number.isFinite(a) || a < 0) return null;
    out.push({ year: y, amount: a });
  }
  return out;
}
