// Sensitivity of the verdict: for each key driver, the value at which the
// end-of-horizon comparison of selling vs. staying flips. Pure (no DOM) so it
// runs under node.
import { project } from './engine.js';

// Search ranges are whole percentages (4 means 4%), like the inputs.
export const DRIVERS = [
  { id: 'appreciation', label: 'Home appreciation', max: 20 },
  { id: 'investmentGrowth', label: 'Investment return', max: 25 },
  { id: 'rentGrowth', label: 'Rent growth', max: 20 },
  { id: 'taxRate', label: 'Capital gains tax rate', max: 60 },
];

const STEPS = 200;

// Positive when selling and investing ends ahead of staying.
const margin = (values) => {
  const rows = project(values).rows;
  return rows[rows.length - 1].netWorthGainLoss;
};

// The nearest value to the current one (searching the driver's range) where
// the margin changes sign, or null if it never does. A scan finds the bracket,
// then bisection narrows it.
export function flipPoint(values, driver) {
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

// One line per driver: "Selling wins if investment return is above 7.2%".
// Direction is read from the margin just beyond the flip, so it holds for any
// driver.
export function sensitivityLines(values) {
  return DRIVERS.map((d) => {
    const flip = flipPoint(values, d);
    if (flip == null) {
      const verdict = margin(values) >= 0 ? 'Selling' : 'Staying';
      return { id: d.id, label: d.label, flip: null, text: `${d.label}: ${verdict.toLowerCase()} wins across 0–${d.max}%; this assumption does not change the verdict.` };
    }
    const sellAbove = margin({ ...values, [d.id]: Math.min(d.max, flip + 0.05) }) >= 0;
    const sellWins = sellAbove ? 'above' : 'below';
    const stayWins = sellAbove ? 'below' : 'above';
    return { id: d.id, label: d.label, flip, text: `${d.label}: selling wins if it is ${sellWins} ${fmt(flip)}; staying wins if it is ${stayWins} (you entered ${fmt(values[d.id])}).` };
  });
}
