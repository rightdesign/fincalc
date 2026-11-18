// Optional location defaults: a ZIP code sets the property tax rate from a small published table of
// state effective rates (site/data/state-property-tax.json). Pure helpers, no DOM, so node can test them.
// Only the fields in LOCATION_FIELDS are ever filled; everything else stays as the user has it.

export const LOCATION_FIELDS = ['tax'];

// First three digits of a ZIP code to a state, as [first, last, state] ranges. A prefix in no range
// (military mail, territories, unassigned prefixes) has no state. Exceptions are checked first.
const ZIP3_EXCEPTIONS = [
  [200, 200, 'District of Columbia'], [201, 201, 'Virginia'], [202, 205, 'District of Columbia'], [569, 569, 'District of Columbia'],
  [733, 733, 'Texas'], [885, 885, 'Texas'], [398, 399, 'Georgia'], [5, 5, 'New York'],
];
const ZIP3_RANGES = [
  [10, 27, 'Massachusetts'], [28, 29, 'Rhode Island'], [30, 38, 'New Hampshire'], [39, 49, 'Maine'], [50, 59, 'Vermont'],
  [60, 69, 'Connecticut'], [70, 89, 'New Jersey'], [100, 149, 'New York'], [150, 196, 'Pennsylvania'], [197, 199, 'Delaware'],
  [206, 219, 'Maryland'], [220, 246, 'Virginia'], [247, 268, 'West Virginia'], [270, 289, 'North Carolina'], [290, 299, 'South Carolina'],
  [300, 319, 'Georgia'], [320, 339, 'Florida'], [341, 342, 'Florida'], [344, 344, 'Florida'], [346, 347, 'Florida'], [349, 349, 'Florida'],
  [350, 369, 'Alabama'], [370, 385, 'Tennessee'], [386, 397, 'Mississippi'], [400, 427, 'Kentucky'], [430, 459, 'Ohio'],
  [460, 479, 'Indiana'], [480, 499, 'Michigan'], [500, 528, 'Iowa'], [530, 549, 'Wisconsin'], [550, 567, 'Minnesota'],
  [570, 577, 'South Dakota'], [580, 588, 'North Dakota'], [590, 599, 'Montana'], [600, 629, 'Illinois'], [630, 658, 'Missouri'],
  [660, 679, 'Kansas'], [680, 693, 'Nebraska'], [700, 715, 'Louisiana'], [716, 729, 'Arkansas'], [730, 749, 'Oklahoma'],
  [750, 799, 'Texas'], [800, 816, 'Colorado'], [820, 831, 'Wyoming'], [832, 838, 'Idaho'], [840, 847, 'Utah'], [850, 865, 'Arizona'],
  [870, 884, 'New Mexico'], [889, 898, 'Nevada'], [900, 961, 'California'], [967, 968, 'Hawaii'], [970, 979, 'Oregon'],
  [980, 994, 'Washington'], [995, 999, 'Alaska'],
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
  if (!data || typeof data !== 'object' || !data.taxRate || typeof data.taxRate !== 'object') return null;
  const rates = Object.entries(data.taxRate);
  if (!rates.length || rates.some(([, r]) => typeof r !== 'number' || !Number.isFinite(r) || r < 0 || r > 0.1)) return null;
  return { source: String(data.source || 'Tax Foundation'), asOf: String(data.asOf || ''), taxRate: data.taxRate };
}

// What a ZIP fills in: { values: { tax: <percent> }, state, source } for a known state, null otherwise.
export function locationDefaults(zip, table) {
  const state = stateForZip(zip);
  const rate = state && table?.taxRate[state];
  if (typeof rate !== 'number') return null;
  return { values: { tax: Math.round(rate * 1e4) / 100 }, state, source: `Property tax: Tax Foundation, ${table.asOf} (Census ACS 5-yr)` };
}
