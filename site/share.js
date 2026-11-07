// Encoding of the inputs as a URL fragment (and a localStorage string) so a
// scenario can be bookmarked, restored on reload and shared. Pure (no DOM) so
// it runs under node; app.js owns the location and storage.
import { FIELDS, defaultHorizon, defaultValues, parseRepairs, parseValue } from './inputs.js';

export const INPUTS_KEY = 'fincalc.inputs';
const MAX_REPAIRS = 20;

// Only values that differ from the defaults are written, so links stay short
// and keep working when a default changes. Repairs are "year:amount" pairs.
export function encodeInputs(values) {
  const defaults = defaultValues();
  const params = new URLSearchParams();
  for (const f of FIELDS) {
    if (values[f.id] == null) continue;
    const isDefault = f.id === 'horizon'
      ? values.horizon === defaultHorizon(values.mortgageTerm)
      : values[f.id] === defaults[f.id];
    if (!isDefault) params.set(f.id, String(values[f.id]));
  }
  if (values.repairs?.length) params.set('repairs', values.repairs.map((r) => `${r.year}:${r.amount}`).join(','));
  return params.toString();
}

// Reads an encoded string (with or without a leading # or ?) into a full set
// of values: defaults for anything absent, unknown or invalid. Never throws.
export function decodeInputs(text) {
  const values = defaultValues();
  let params;
  try { params = new URLSearchParams(String(text ?? '').replace(/^[#?]/, '')); } catch { return values; }
  for (const f of FIELDS) {
    if (!params.has(f.id)) continue;
    const v = parseValue(f, params.get(f.id));
    if (v != null) values[f.id] = v;
  }
  if (!params.has('horizon')) values.horizon = defaultHorizon(values.mortgageTerm);
  const rows = (params.get('repairs') ?? '').split(',').slice(0, MAX_REPAIRS).map((p) => {
    const [year, amount] = p.split(':');
    return { year, amount };
  });
  values.repairs = parseRepairs(rows) ?? [];
  return values;
}
