// Saved named scenarios and their side-by-side comparison. Pure (no DOM) so
// it runs under node; app.js owns the storage and the page.
import { project } from './engine.js';
import { formatMoney } from './results.js';

export const MAX_SCENARIOS = 3;
export const STORAGE_KEY = 'fincalc.scenarios';

// Returns the new list, or { error } when the name is blank or the list is full.
// Saving under an existing name replaces that scenario.
export function addScenario(list, name, values) {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return { error: 'Enter a name for the scenario.' };
  const i = list.findIndex((s) => s.name.toLowerCase() === trimmed.toLowerCase());
  const next = { name: trimmed, values: { ...values } };
  if (i >= 0) return list.map((s, k) => (k === i ? next : s));
  if (list.length >= MAX_SCENARIOS) return { error: `You can keep up to ${MAX_SCENARIOS} scenarios. Remove one first.` };
  return [...list, next];
}

export function removeScenario(list, name) {
  return list.filter((s) => s.name !== name);
}

// Reads a stored JSON string; anything malformed yields an empty list.
export function parseStored(text) {
  try {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) return [];
    return data
      .filter((s) => s && typeof s.name === 'string' && s.name && s.values && typeof s.values === 'object')
      .slice(0, MAX_SCENARIOS);
  } catch {
    return [];
  }
}

const yearText = (y) => (y == null ? 'Not within horizon' : `Year ${y}`);

// One column per scenario: break-even years and the final-year net worth of
// each path, in future dollars.
export function compareScenarios(list) {
  const projections = list.map((s) => project(s.values));
  const last = (p) => p.rows[p.rows.length - 1];
  const lines = [
    ['Time horizon', (s, p) => `${s.values.horizon} years`],
    ['Sell and invest pulls ahead', (s, p) => yearText(p.breakevenYear)],
    ['Downsizing pulls ahead', (s, p) => yearText(p.downsizeBreakevenYear)],
    ['Stay: net worth at end', (s, p) => formatMoney(last(p).stayNetWorth)],
    ['Sell (invested): net worth at end', (s, p) => formatMoney(last(p).investmentCapital)],
    ['Downsize: net worth at end', (s, p) => formatMoney(last(p).downsizeNetWorth)],
  ];
  return {
    names: list.map((s) => s.name),
    rows: lines.map(([label, fn]) => [label, ...list.map((s, i) => fn(s, projections[i]))]),
  };
}
