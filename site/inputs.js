// Homeowner input definitions for the stay vs. sell-and-rent calculator.
// Pure data and helpers (no DOM) so they can be tested under node.

export const MAX_HORIZON_YEARS = 30;

// kind: 'money' ($), 'percent' (%), 'years', 'choice'.
export const FIELDS = [
  { id: 'homeValue', label: 'Home value', kind: 'money', default: 500000, group: 'Home' },
  { id: 'costBasis', label: 'Cost basis', kind: 'money', default: 300000, group: 'Home' },
  { id: 'appreciation', label: 'Appreciation (per year)', kind: 'percent', default: 3, group: 'Home' },
  { id: 'propertyTax', label: 'Property tax (per year)', kind: 'money', default: 5000, group: 'Owning costs' },
  { id: 'insurancePct', label: 'Insurance (% of home value per year)', kind: 'percent', default: 0.5, group: 'Owning costs' },
  { id: 'maintenancePct', label: 'Maintenance (% of home value per year)', kind: 'percent', default: 1, group: 'Owning costs' },
  { id: 'mortgageBalance', label: 'Mortgage balance', kind: 'money', default: 200000, group: 'Mortgage' },
  { id: 'mortgageRate', label: 'Mortgage rate', kind: 'percent', default: 4, group: 'Mortgage' },
  { id: 'mortgageTerm', label: 'Remaining mortgage term (years)', kind: 'years', default: 25, group: 'Mortgage' },
  { id: 'sellingCostsPct', label: 'Selling costs (% of sale price)', kind: 'percent', default: 6, group: 'Selling' },
  { id: 'taxRate', label: 'Capital gains tax rate (federal + state)', kind: 'percent', default: 20, group: 'Selling' },
  {
    id: 'exclusion', label: 'Primary-residence exclusion', kind: 'choice', default: 'single', group: 'Selling',
    options: [
      { value: 'none', label: 'None' },
      { value: 'single', label: 'Single filer ($250,000)' },
      { value: 'married', label: 'Married filing jointly ($500,000)' },
    ],
  },
  { id: 'investmentGrowth', label: 'Investment growth (per year)', kind: 'percent', default: 6, group: 'If you sell and invest' },
  { id: 'investmentWithdrawal', label: 'Investment withdrawal (% per year)', kind: 'percent', default: 4, group: 'If you sell and invest' },
  { id: 'rent', label: 'Comparable rent (per month)', kind: 'money', default: 2500, group: 'If you rent' },
  { id: 'rentGrowth', label: 'Rent growth (per year)', kind: 'percent', default: 3, group: 'If you rent' },
  { id: 'rentersInsurance', label: "Renter's insurance (per year)", kind: 'money', default: 200, group: 'If you rent' },
  { id: 'horizon', label: 'Time horizon (years)', kind: 'years', group: 'Time horizon' },
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
  if (field.kind === 'choice') return field.options.some((o) => o.value === raw) ? raw : null;
  if (raw === '' || raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
