// Optional location defaults: a ZIP code sets the property tax rate, rent growth and home insurance from small published tables of
// state figures (site/data/state-property-tax.json, state-rent-growth.json, state-insurance.json). Pure helpers, no DOM, so node can test them.
// Only the fields in LOCATION_FIELDS are ever filled; everything else stays as the user has it.

export const LOCATION_FIELDS = ['tax', 'rentGrowth', 'insurance'];

// First three digits of a ZIP code to a state, as [first, last, state] ranges. A prefix in no range
// (military mail, territories, unassigned prefixes) has no state. Exceptions are checked first.
const ZIP3_EXCEPTIONS = [
  [200, 200, 'District of Columbia'],
  [201, 201, 'Virginia'],
  [202, 205, 'District of Columbia'],
  [569, 569, 'District of Columbia'],
  [733, 733, 'Texas'],
  [885, 885, 'Texas'],
  [398, 399, 'Georgia'],
  [5, 5, 'New York'],
];
const ZIP3_RANGES = [
  [10, 27, 'Massachusetts'],
  [28, 29, 'Rhode Island'],
  [30, 38, 'New Hampshire'],
  [39, 49, 'Maine'],
  [50, 59, 'Vermont'],
  [60, 69, 'Connecticut'],
  [70, 89, 'New Jersey'],
  [100, 149, 'New York'],
  [150, 196, 'Pennsylvania'],
  [197, 199, 'Delaware'],
  [206, 219, 'Maryland'],
  [220, 246, 'Virginia'],
  [247, 268, 'West Virginia'],
  [270, 289, 'North Carolina'],
  [290, 299, 'South Carolina'],
  [300, 319, 'Georgia'],
  [320, 339, 'Florida'],
  [341, 342, 'Florida'],
  [344, 344, 'Florida'],
  [346, 347, 'Florida'],
  [349, 349, 'Florida'],
  [350, 369, 'Alabama'],
  [370, 385, 'Tennessee'],
  [386, 397, 'Mississippi'],
  [400, 427, 'Kentucky'],
  [430, 459, 'Ohio'],
  [460, 479, 'Indiana'],
  [480, 499, 'Michigan'],
  [500, 528, 'Iowa'],
  [530, 549, 'Wisconsin'],
  [550, 567, 'Minnesota'],
  [570, 577, 'South Dakota'],
  [580, 588, 'North Dakota'],
  [590, 599, 'Montana'],
  [600, 629, 'Illinois'],
  [630, 658, 'Missouri'],
  [660, 679, 'Kansas'],
  [680, 693, 'Nebraska'],
  [700, 715, 'Louisiana'],
  [716, 729, 'Arkansas'],
  [730, 749, 'Oklahoma'],
  [750, 799, 'Texas'],
  [800, 816, 'Colorado'],
  [820, 831, 'Wyoming'],
  [832, 838, 'Idaho'],
  [840, 847, 'Utah'],
  [850, 865, 'Arizona'],
  [870, 884, 'New Mexico'],
  [889, 898, 'Nevada'],
  [900, 961, 'California'],
  [967, 968, 'Hawaii'],
  [970, 979, 'Oregon'],
  [980, 994, 'Washington'],
  [995, 999, 'Alaska'],
];

// A five-digit ZIP (a ZIP+4 tail is ignored), else null.
export function parseZip(text) {
  const m = /^\s*(\d{5})(?:-\d{4})?\s*$/.exec(String(text ?? ''));
  return m ? m[1] : null;
}

export function stateForZip(zip) {
  const z = parseZip(zip);
  if (!z) return null;
  const n = Number(z.slice(0, 3));
  const hit = [...ZIP3_EXCEPTIONS, ...ZIP3_RANGES].find(([lo, hi]) => n >= lo && n <= hi);
  return hit ? hit[2] : null;
}

// The table's content when it is usable, else null: a source, a year and a rate between 0 and 10% per state.
export function parseStateTax(data) {
  if (!data || typeof data !== 'object' || !data.taxRate || typeof data.taxRate !== 'object')
    return null;
  const rates = Object.entries(data.taxRate);
  if (
    !rates.length ||
    rates.some(([, r]) => typeof r !== 'number' || !Number.isFinite(r) || r < 0 || r > 0.1)
  )
    return null;
  return {
    source: String(data.source || 'Tax Foundation'),
    asOf: String(data.asOf || ''),
    taxRate: data.taxRate,
  };
}

// The rent growth table's content when it is usable, else null: a source, a year and an annual rate between -20% and 30% per state.
export function parseStateRentGrowth(data) {
  if (!data || typeof data !== 'object' || !data.rentGrowth || typeof data.rentGrowth !== 'object')
    return null;
  const rates = Object.entries(data.rentGrowth);
  if (
    !rates.length ||
    rates.some(([, r]) => typeof r !== 'number' || !Number.isFinite(r) || r < -0.2 || r > 0.3)
  )
    return null;
  return {
    source: String(data.source || 'U.S. Census Bureau'),
    asOf: String(data.asOf || ''),
    rentGrowth: data.rentGrowth,
  };
}

// The insurance table's content when it is usable, else null: a source, a year and a yearly premium between 0 and 5% of home value per state.
export function parseStateInsurance(data) {
  if (!data || typeof data !== 'object' || !data.insurance || typeof data.insurance !== 'object')
    return null;
  const rates = Object.entries(data.insurance);
  if (
    !rates.length ||
    rates.some(([, r]) => typeof r !== 'number' || !Number.isFinite(r) || r < 0 || r > 0.05)
  )
    return null;
  return {
    source: String(data.source || 'U.S. Census Bureau'),
    asOf: String(data.asOf || ''),
    insurance: data.insurance,
  };
}

// What a ZIP fills in: { values: { tax: <percent>, rentGrowth: <percent>, insurance: <percent> }, state, sources } for a known state, null otherwise.
// Any table may be missing (it failed to load); that field is then left out and keeps its default.
export function locationDefaults(zip, taxTable, rentTable = null, insuranceTable = null) {
  const state = stateForZip(zip);
  if (!state) return null;
  const values = {};
  const sources = [];
  const tax = taxTable?.taxRate[state];
  if (typeof tax === 'number') {
    values.tax = Math.round(tax * 1e4) / 100;
    sources.push(`Property tax: Tax Foundation, ${taxTable.asOf} (Census ACS 5-yr)`);
  }
  const growth = rentTable?.rentGrowth[state];
  if (typeof growth === 'number') {
    values.rentGrowth = Math.round(growth * 1e4) / 100;
    sources.push(
      `Rent growth: Census ACS 5-yr median gross rent, 2014-2018 to 2019-${rentTable.asOf}, a past change and not a forecast, not adjusted for inflation`,
    );
  }
  const ins = insuranceTable?.insurance[state];
  if (typeof ins === 'number') {
    values.insurance = Math.round(ins * 1e4) / 100;
    sources.push(
      `Home insurance: Census ACS 5-yr (${insuranceTable.asOf}) median yearly premium for owners with a mortgage as a share of median home value; premiums vary widely within a state`,
    );
  }
  return Object.keys(values).length ? { values, state, sources } : null;
}
