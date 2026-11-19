// Rebuilds site/data/state-insurance.json from Census ACS 5-year table B25141 (homeowners insurance cost, yearly, in dollar
// brackets) and B25077 (median home value). Needs a free Census API key: CENSUS_API_KEY=... node scripts/update-state-insurance.mjs [year]
// B25141 publishes counts per bracket, not a median, so the median is interpolated inside its bracket for owners with a mortgage,
// then divided by the state's median home value to give a rate comparable to the calculator's "% of home value" input.
import { writeFileSync } from 'node:fs';

// Upper edges of B25141_003E..B25141_013E (with a mortgage); B25141_014E is "$4000 or more", open ended.
export const BRACKETS = [[0, 100], [100, 300], [300, 500], [500, 800], [800, 1000], [1000, 1500], [1500, 2000], [2000, 2500], [2500, 3000], [3000, 3500], [3500, 4000]];

// Median of households spread over the brackets (counts has one more entry than BRACKETS: the open top bracket), by linear
// interpolation within the bracket holding the middle household. Null when the median falls in the open top bracket or there are no households.
export function bracketMedian(counts) {
  const total = counts.reduce((a, b) => a + b, 0);
  if (!total) return null;
  let below = 0;
  for (let i = 0; i < BRACKETS.length; i++) {
    const [lo, hi] = BRACKETS[i];
    if (below + counts[i] >= total / 2) return lo + ((total / 2 - below) / counts[i]) * (hi - lo);
    below += counts[i];
  }
  return null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const key = process.env.CENSUS_API_KEY;
  if (!key) throw new Error('set CENSUS_API_KEY (free at https://api.census.gov/data/key_signup.html)');
  const year = process.argv[2] || '2023';
  const vars = [...Array(12)].map((_, i) => `B25141_${String(i + 3).padStart(3, '0')}E`);
  const url = `https://api.census.gov/data/${year}/acs/acs5?get=NAME,B25077_001E,${vars.join(',')}&for=state:*&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Census API answered ${res.status}`);
  const [head, ...rows] = await res.json();
  const col = (r, name) => Number(r[head.indexOf(name)]);
  const insurance = {};
  for (const r of rows) {
    const name = r[head.indexOf('NAME')];
    if (name === 'Puerto Rico') continue;
    const median = bracketMedian(vars.map((v) => col(r, v)));
    const value = col(r, 'B25077_001E');
    if (median == null || !(value > 0)) throw new Error(`no usable figures for ${name}`);
    insurance[name] = Math.round((median / value) * 1e4) / 1e4;
  }
  const out = {
    source: `U.S. Census Bureau, American Community Survey 5-year, tables B25141 (homeowners insurance cost, owners with a mortgage) and B25077 (median home value), ${Number(year) - 4}-${year}; median yearly premium interpolated from the published cost brackets, divided by median home value`,
    asOf: year,
    insurance: Object.fromEntries(Object.entries(insurance).sort(([a], [b]) => a.localeCompare(b))),
  };
  writeFileSync(new URL('../site/data/state-insurance.json', import.meta.url), `${JSON.stringify(out, null, 1)}\n`);
  console.log(`state-insurance.json: ${Object.keys(insurance).length} states, ${year}`);
}
