// Sensitivity of the verdict: for each key driver, the value at which the
// end-of-horizon comparison of selling vs. staying (and of downsizing vs.
// staying) flips. Pure (no DOM) so it
// runs under node.
import { project } from './engine.js';

// Search ranges are whole percentages (4 means 4%), like the inputs.
export const DRIVERS = [
  { id: 'appreciation', label: 'Home appreciation', max: 20 },
  { id: 'investmentGrowth', label: 'Investment return', max: 25 },
  { id: 'rentGrowth', label: 'Rent growth', max: 20 },
  { id: 'taxRate', label: 'Capital gains tax rate', max: 60 },
];

// Rent growth does not touch the downsize path, so it is not a driver there.
export const DOWNSIZE_DRIVERS = DRIVERS.filter((d) => d.id !== 'rentGrowth');

const STEPS = 200;

// Positive when the path ends ahead of staying. Both read the same projection,
// so they follow the "Use the proceeds" setting like the charts do.
const PATHS = {
  sell: { name: 'Selling', gap: 'netWorthGainLoss', drivers: DRIVERS, idPrefix: '' },
  downsize: { name: 'Downsizing', gap: 'downsizeGainLoss', drivers: DOWNSIZE_DRIVERS, idPrefix: 'downsize-' },
};

const marginFor = (path) => (values) => {
  const rows = project(values).rows;
  return rows[rows.length - 1][PATHS[path].gap];
};

// The nearest value to the current one (searching the driver's range) where
// the margin changes sign, or null if it never does. A scan finds the bracket,
// then bisection narrows it.
export function flipPoint(values, driver, path = 'sell') {
  const margin = marginFor(path);
  const at = (x) => margin({ ...values, [driver.id]: x });
  const current = values[driver.id];
  const xs = Array.from({ length: STEPS + 1 }, (_, i) => (driver.max * i) / STEPS);
  const ms = xs.map(at);
  let best = null;
  for (let i = 0; i < STEPS; i++) {
    if ((ms[i] >= 0) === (ms[i + 1] >= 0)) continue;
    const mid = (xs[i] + xs[i + 1]) / 2;
    if (best == null || Math.abs(mid - current) < Math.abs(best.mid - current)) best = { i, mid };
  }
  if (!best) return null;
  let lo = xs[best.i];
  let hi = xs[best.i + 1];
  const loPositive = ms[best.i] >= 0;
  for (let k = 0; k < 40; k++) {
    const m = (lo + hi) / 2;
    if ((at(m) >= 0) === loPositive) lo = m; else hi = m;
  }
  return (lo + hi) / 2;
}

const fmt = (n) => `${Number(n.toFixed(1))}%`;

// One line per driver and path: "Selling wins if investment return is above
// 7.2%". Direction is read from the margin just beyond the flip, so it holds
// for any driver.
function pathLines(values, path) {
  const { name, drivers, idPrefix } = PATHS[path];
  const margin = marginFor(path);
  const lower = name.toLowerCase();
  return drivers.map((d) => {
    const id = idPrefix + d.id;
    const flip = flipPoint(values, d, path);
    if (flip == null) {
      const verdict = margin(values) >= 0 ? lower : 'staying';
      return { id, path, label: d.label, flip: null, text: `${d.label}: ${verdict} wins across 0–${d.max}%; this assumption does not change the verdict.` };
    }
    const winsAbove = margin({ ...values, [d.id]: Math.min(d.max, flip + 0.05) }) >= 0;
    const winsWhen = winsAbove ? 'above' : 'below';
    const stayWhen = winsAbove ? 'below' : 'above';
    return { id, path, label: d.label, flip, text: `${d.label}: ${lower} wins if it is ${winsWhen} ${fmt(flip)}; staying wins if it is ${stayWhen} (you entered ${fmt(values[d.id])}).` };
  });
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// Cash-flow breakeven for the sell path: the withdrawal rate (or, equivalently,
// the starting monthly rent) at which the after-tax income from the invested
// proceeds pays the first year's rent and renter's insurance in full. Not a
// verdict flip, so it is a separate line placed with the selling drivers.
export function selfFundingRent(values) {
  const capital = project(values).rows[0].investmentCapital;
  const keep = 1 - values.withdrawalTaxRate / 100;
  const annualRent = values.rent * 12 + values.rentersInsurance;
  const entered = `you entered ${fmt(values.investmentWithdrawal)} and ${usd.format(values.rent)} a month`;
  const base = { id: 'selfFunding', path: 'sell', label: 'Self-funding rent' };
  if (capital <= 0 || keep <= 0) {
    return { ...base, rate: null, rent: null, text: 'Self-funding rent: the invested proceeds are nothing after moving and rental costs, so they cannot pay any rent.' };
  }
  const rate = (annualRent / (capital * keep)) * 100;
  const rent = Math.max(0, (capital * (values.investmentWithdrawal / 100) * keep - values.rentersInsurance) / 12);
  const income = capital * (values.investmentWithdrawal / 100) * keep;
  const result = income >= annualRent
    ? 'at your inputs the released equity pays the rent in full'
    : `at your inputs you would top up about ${usd.format((annualRent - income) / 12)} a month`;
  return {
    ...base,
    rate,
    rent,
    text: `Self-funding rent: selling pays the first year's rent in full if you withdraw at least ${fmt(rate)} a year of the ${usd.format(capital)} invested, or if the starting rent is at most ${usd.format(rent)} a month (${entered}); ${result}.`,
  };
}

export const sensitivityLines = (values) => [...pathLines(values, 'sell'), selfFundingRent(values), ...pathLines(values, 'downsize')];
