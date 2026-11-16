// Page script for the rent vs own calculator.
import { RENTOWN_FIELDS, applyLiveRate, longDate, parseLiveRate, RENTOWN_GROUPS, RENTOWN_PRESETS, decodeBasis, decodeRentOwn, encodeRentOwn, invalidRentOwn, matchRentOwnPreset, parseAmount, rentOwnDefaults } from './rentown.js';
import { renderCards } from './rentown/cards.js';
import { buildContext } from './rentown/context.js';
import { usd } from './rentown/format.js';

const STORE_KEY = 'fincalc.rentown';

const form = document.getElementById('rentown-inputs');
const out = document.getElementById('rentown-results');
const message = document.getElementById('rentown-message');
// The default rate is the latest published survey average; any failure leaves the built-in default.
let live = null;
try {
  const res = await fetch('data/rates.json', { cache: 'no-cache' });
  if (res.ok) live = parseLiveRate(await res.json());
} catch { /* offline or file missing */ }
if (live) {
  applyLiveRate(live);
  const note = document.getElementById('rentown-rate-source');
  const a = document.createElement('a');
  a.href = live.url;
  a.textContent = live.source;
  note.append(`Default mortgage rate ${live.rate}% \u2014 `, a, `, week of ${longDate(live.week)}.`);
  if (live.updated) note.append(` Defaults as of ${longDate(live.updated)}.`);
  note.hidden = false;
}
const defaults = rentOwnDefaults();
const basisSelect = document.getElementById('rentown-basis');
const show = (f, n) => (n == null ? '' : f.money ? usd.format(n) : n);

for (const g of RENTOWN_GROUPS) {
  const set = document.createElement('fieldset');
  set.className = 'ro-group';
  set.innerHTML = `<legend>${g.label}</legend><div class="m-inputs"></div>`;
  const grid = set.querySelector('.m-inputs');
  for (const f of RENTOWN_FIELDS.filter((x) => x.group === g.id)) {
    const label = document.createElement('label');
    label.className = 'field';
    const text = document.createElement('span');
    text.textContent = f.label;
    const input = document.createElement(f.options ? 'select' : 'input');
    if (f.options) {
      for (const [value, name] of f.options) input.append(new Option(name, value));
    } else input.type = f.money ? 'text' : 'number';
    if (!f.money && !f.options) {
      input.min = f.min;
      input.max = f.max ?? '';
      input.step = f.integer ? '1' : 'any';
    }
    input.inputMode = 'decimal';
    input.name = f.id;
    input.id = `field-${f.id}`;
    input.value = show(f, f.value);
    label.append(text);
    if (f.slider) {
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = f.slider.min;
      slider.max = f.slider.max;
      slider.step = f.slider.step;
      slider.value = f.value;
      slider.id = `slider-${f.id}`;
      slider.setAttribute('aria-label', `${f.label} slider`);
      slider.addEventListener('input', () => { input.value = show(f, Number(slider.value)); });
      input.addEventListener('input', () => {
        const n = parseAmount(input.value);
        if (Number.isFinite(n)) slider.value = n;
      });
      label.append(slider);
    }
    if (f.money) {
      input.addEventListener('focus', () => {
        const n = parseAmount(input.value);
        if (Number.isFinite(n)) input.value = String(n);
      });
      input.addEventListener('blur', () => {
        const n = parseAmount(input.value);
        if (Number.isFinite(n)) input.value = usd.format(n);
      });
    }
    label.append(input);
    grid.append(label);
  }
  form.append(set);
}

function values() {
  return Object.fromEntries(RENTOWN_FIELDS.map((f) => {
    const text = form.elements[f.id].value;
    return [f.id, f.optional && text.trim() === '' ? null : parseAmount(text)];
  }));
}

function setValues(v) {
  for (const f of RENTOWN_FIELDS) {
    form.elements[f.id].value = show(f, v[f.id]);
    const slider = document.getElementById(`slider-${f.id}`);
    if (slider) slider.value = v[f.id];
  }
}

const presetBox = document.getElementById('rentown-presets');
const presetName = document.getElementById('rentown-preset-name');
for (const p of RENTOWN_PRESETS) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = p.label;
  button.dataset.preset = p.id;
  button.addEventListener('click', () => {
    setValues({ ...rentOwnDefaultsFrom(values()), ...p.values });
    message.textContent = '';
    render();
  });
  presetBox.append(button);
}

// Fields the user has blanked or mistyped read as NaN; keep them as they are rather than wiping them.
function rentOwnDefaultsFrom(v) {
  return Object.fromEntries(RENTOWN_FIELDS.map((f) => [f.id, Number.isFinite(v[f.id]) || (f.optional && v[f.id] == null) ? v[f.id] : defaults[f.id]]));
}

function showPreset(v) {
  const match = matchRentOwnPreset(v);
  presetName.textContent = match ? `Preset: ${match.label}` : 'Custom';
  for (const b of presetBox.children) b.setAttribute('aria-pressed', String(b.dataset.preset === match?.id));
}

function render() {
  const v = values();
  showPreset(v);
  const bad = invalidRentOwn(v);
  if (bad.length) {
    out.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'placeholder';
    p.textContent = `Enter a valid value for: ${bad.join(', ')}.`;
    out.append(p);
    return;
  }
  const basis = basisSelect.value === 'today' ? 'today' : 'future';
  save(v, basis);
  out.innerHTML = renderCards(buildContext(v, basis));
}

// Inputs ride along in the address and in browser storage so a scenario survives a reload and can be shared.
function save(v, basis = basisSelect.value) {
  const text = encodeRentOwn(v, basis);
  try { localStorage.setItem(STORE_KEY, text); } catch { /* storage unavailable */ }
  try { history.replaceState(null, '', text ? `#${text}` : location.pathname + location.search); } catch { /* not allowed here */ }
}

let stored = null;
try { stored = localStorage.getItem(STORE_KEY); } catch { /* storage unavailable */ }
const setFrom = (text) => { setValues(decodeRentOwn(text)); basisSelect.value = decodeBasis(text); };
if (location.hash.length > 1 || stored) setFrom(location.hash.length > 1 ? location.hash : stored);
window.addEventListener('hashchange', () => { if (location.hash.length > 1) { setFrom(location.hash); render(); } });

form.addEventListener('input', () => { message.textContent = ''; render(); });
// The selector sits outside the form, so its events never reach the form listener.
basisSelect.addEventListener('change', () => { message.textContent = ''; render(); });
// The solved price or rent goes back into its field, so the page reproduces the break-even it quoted.
out.addEventListener('click', (e) => {
  const button = e.target.closest('button[data-solve]');
  if (!button) return;
  const f = RENTOWN_FIELDS.find((x) => x.id === button.dataset.solve);
  setValues({ ...rentOwnDefaultsFrom(values()), [f.id]: Number(button.dataset.value) });
  message.textContent = '';
  render();
});
form.addEventListener('submit', (e) => e.preventDefault());
document.getElementById('rentown-reset').addEventListener('click', () => {
  setValues(defaults);
  basisSelect.value = 'future';
  render();
  message.textContent = 'Inputs reset to defaults.';
});
// The methodology prints open whichever way the print dialog is reached.
const methodology = document.querySelector('#methodology details');
let wasOpen = false;
window.addEventListener('beforeprint', () => { wasOpen = methodology.open; methodology.open = true; });
window.addEventListener('afterprint', () => { methodology.open = wasOpen; });
document.getElementById('rentown-print').addEventListener('click', () => window.print());
document.getElementById('rentown-copy').addEventListener('click', async () => {
  save(values());
  try { await navigator.clipboard.writeText(location.href); message.textContent = 'Link copied.'; } catch { message.textContent = 'Copy failed; copy the address from the browser bar instead.'; }
});
render();
