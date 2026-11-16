// Page script for the rent vs own calculator.
import { RENTOWN_FIELDS, RENTOWN_UNITS, applyLiveRate, decodeUnits, defaultUnits, longDate, parseLiveRate, RENTOWN_GROUPS, RENTOWN_PRESETS, RENTOWN_TAX_CAPS, RETURN_PRESETS, decodeBasis, decodeRentOwn, encodeRentOwn, invalidRentOwn, matchRentOwnPreset, parseAmount, rentOwnDefaults } from './rentown.js';
import { renderCards } from './rentown/cards.js';
import { buildContext } from './rentown/context.js';
import { TABLE_COLUMNS, tableRows } from './rentown/chart.js';
import { tableCsv } from './export.js';
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
// Down payment and maintenance may be typed as dollars; the model keeps percentages, so these convert at the current price.
let units = defaultUnits();
let lastPct = {};
const priceNow = () => parseAmount(document.getElementById('field-price').value);
const inUsd = (f) => units[f.id] === 'usd';
const plain = (n) => String(Math.round(n * 100) / 100);
function shown(f, pct) {
  if (pct == null || !RENTOWN_UNITS[f.id] || !inUsd(f)) return show(f, pct);
  const price = priceNow();
  return Number.isFinite(pct) && Number.isFinite(price) ? usd.format(RENTOWN_UNITS[f.id].toUsd(pct, price)) : '';
}
function readValue(f) {
  const n = parseAmount(form.elements[f.id].value);
  return RENTOWN_UNITS[f.id] && inUsd(f) ? RENTOWN_UNITS[f.id].toPct(n, priceNow()) : n;
}
function applyUnit(f) {
  const input = form.elements[f.id];
  input.type = inUsd(f) ? 'text' : 'number';
  document.getElementById(`unit-label-${f.id}`).textContent = RENTOWN_UNITS[f.id].label[units[f.id]];
  document.getElementById(`unit-${f.id}`).value = units[f.id];
  const pct = lastPct[f.id];
  input.value = Number.isFinite(pct) ? (inUsd(f) ? shown(f, pct) : String(Math.round(pct * 1e6) / 1e6)) : '';
}

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
    text.id = `unit-label-${f.id}`;
    label.dataset.field = f.id;
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
      slider.addEventListener('input', () => { input.value = shown(f, Number(slider.value)); });
      input.addEventListener('input', () => {
        const n = readValue(f);
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
    if (!RENTOWN_UNITS[f.id]) label.append(input);
    else {
      const pair = document.createElement('div');
      pair.className = 'ro-pair';
      pair.append(input);
      label.append(pair);
      const choice = document.createElement('select');
      choice.id = `unit-${f.id}`;
      choice.className = 'ro-unit';
      choice.setAttribute('aria-label', `${f.label.replace(/ \(.*\)$/, '')} unit`);
      for (const [value, name] of Object.entries(RENTOWN_UNITS[f.id].choices)) choice.append(new Option(name, value));
      choice.addEventListener('change', () => { units[f.id] = choice.value; applyUnit(f); render(); });
      pair.append(choice);
      for (const e of ['focus', 'blur']) {
        input.addEventListener(e, () => {
          if (!inUsd(f)) return;
          const n = parseAmount(input.value);
          if (Number.isFinite(n)) input.value = e === 'focus' ? plain(n) : usd.format(n);
        });
      }
      if (f.id === 'down') {
        const loan = document.createElement('small');
        loan.id = 'rentown-loan';
        loan.setAttribute('aria-live', 'polite');
        label.append(loan);
      }
    }
    if (f.id === 'investment') {
      const row = document.createElement('span');
      row.className = 'no-print ro-return-presets';
      row.setAttribute('role', 'group');
      row.setAttribute('aria-label', 'Investment return presets');
      for (const p of RETURN_PRESETS) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = p.label;
        button.title = `${p.detail}; a long-run nominal average, not a forecast. Also sets the tax drag to ${p.investDrag}%.`;
        button.addEventListener('click', () => {
          form.elements.investment.value = p.investment;
          form.elements.investDrag.value = p.investDrag;
          message.textContent = '';
          render();
        });
        row.append(button);
      }
      const note = document.createElement('small');
      note.textContent = 'Long-run nominal averages, not forecasts. A preset also sets the tax drag below.';
      label.append(row, note);
    }
    grid.append(label);
    if (f.id === 'assessed') {
      const caps = document.createElement('div');
      caps.className = 'ro-presets';
      caps.setAttribute('role', 'group');
      caps.setAttribute('aria-label', 'Property tax caps');
      for (const c of RENTOWN_TAX_CAPS) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = c.label;
        button.addEventListener('click', () => {
          setValues({ ...rentOwnDefaultsFrom(values()), ...c.values });
          message.textContent = '';
          render();
        });
        caps.append(button);
      }
      grid.append(caps);
    }
  }
  form.append(set);
}

function values() {
  return Object.fromEntries(RENTOWN_FIELDS.map((f) => {
    const text = form.elements[f.id].value;
    return [f.id, f.optional && text.trim() === '' ? null : readValue(f)];
  }));
}

// Fields that only apply to one mortgage type (the ARM terms, the fixed rate) show only for that type.
function showFields(v) {
  for (const f of RENTOWN_FIELDS) if (f.showIf) form.querySelector(`[data-field="${f.id}"]`).hidden = !f.showIf(v);
}

function setValues(v) {
  for (const f of RENTOWN_FIELDS) {
    form.elements[f.id].value = shown(f, v[f.id]);
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

function showLoan(v) {
  const loan = document.getElementById('rentown-loan');
  const amount = v.price * (1 - v.down / 100);
  loan.textContent = Number.isFinite(amount) && v.down >= 0 && v.down <= 100 ? `Down payment ${usd.format(v.price - amount)} (${plain(v.down)}%); loan amount ${usd.format(amount)}` : '';
}

function render() {
  const v = values();
  for (const id of Object.keys(RENTOWN_UNITS)) if (Number.isFinite(v[id])) lastPct[id] = v[id];
  showLoan(v);
  showPreset(v);
  showFields(v);
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
  const ctx = buildContext(v, basis);
  tableCsvText = tableCsv({ columns: TABLE_COLUMNS, rows: tableRows(ctx.r, ctx.today) });
  out.innerHTML = renderCards(ctx);
}

// The CSV of the table last drawn, so the download always matches what is on screen.
let tableCsvText = '';
function downloadCsv() {
  const url = URL.createObjectURL(new Blob([tableCsvText], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'rent-vs-own.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// Inputs ride along in the address and in browser storage so a scenario survives a reload and can be shared.
function save(v, basis = basisSelect.value) {
  const text = encodeRentOwn(v, basis, units);
  try { localStorage.setItem(STORE_KEY, text); } catch { /* storage unavailable */ }
  try { history.replaceState(null, '', text ? `#${text}` : location.pathname + location.search); } catch { /* not allowed here */ }
}

let stored = null;
try { stored = localStorage.getItem(STORE_KEY); } catch { /* storage unavailable */ }
const setFrom = (text) => {
  const v = decodeRentOwn(text);
  units = decodeUnits(text);
  lastPct = { down: v.down, maintenance: v.maintenance };
  for (const f of RENTOWN_FIELDS.filter((x) => RENTOWN_UNITS[x.id])) applyUnit(f);
  setValues(v);
  basisSelect.value = decodeBasis(text);
};
if (location.hash.length > 1 || stored) setFrom(location.hash.length > 1 ? location.hash : stored);
window.addEventListener('hashchange', () => { if (location.hash.length > 1) { setFrom(location.hash); render(); } });

form.addEventListener('input', (e) => {
  // A new price moves the dollar amounts (the percentages are what stay put).
  if (e.target.id === 'field-price' && Number.isFinite(priceNow())) {
    for (const f of RENTOWN_FIELDS) if (RENTOWN_UNITS[f.id] && inUsd(f) && Number.isFinite(lastPct[f.id])) form.elements[f.id].value = shown(f, lastPct[f.id]);
  }
  message.textContent = '';
  render();
});
// The selector sits outside the form, so its events never reach the form listener.
basisSelect.addEventListener('change', () => { message.textContent = ''; render(); });
// The solved price or rent goes back into its field, so the page reproduces the break-even it quoted.
out.addEventListener('click', (e) => {
  if (e.target.closest('#rentown-csv')) { downloadCsv(); return; }
  const button = e.target.closest('button[data-solve]');
  if (!button) return;
  const f = RENTOWN_FIELDS.find((x) => x.id === button.dataset.solve);
  setValues({ ...rentOwnDefaultsFrom(values()), [f.id]: Number(button.dataset.value) });
  message.textContent = '';
  render();
});
form.addEventListener('submit', (e) => e.preventDefault());
document.getElementById('rentown-reset').addEventListener('click', () => {
  units = defaultUnits();
  lastPct = { down: defaults.down, maintenance: defaults.maintenance };
  for (const f of RENTOWN_FIELDS.filter((x) => RENTOWN_UNITS[x.id])) applyUnit(f);
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
