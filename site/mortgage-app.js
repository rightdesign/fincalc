// Page script for the variable-rate mortgage calculator.
import { mortgageChartHtml } from './mortgage-chart.js';
import { INDEXES, MORTGAGE_FIELDS, MORTGAGE_INPUTS_KEY, addMonths, decodeMortgage, encodeMortgage, floorProblem, invalidFields, maxRate, mortgageDefaults, parseAmount, scenarios, simulate } from './mortgage.js';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const money = (n) => usd.format(Math.round(n) === 0 ? 0 : n);
const pct = (n) => `${Math.round(n * 1000) / 1000}%`;

// A range input snaps to its step, so a typed value between steps (4.3 on a 0.125 grid) would
// show a different position than the textbox. Off-grid values switch the slider to free movement.
function setSlider(slider, n) {
  const step = Number(slider.dataset.step);
  const min = Number(slider.min);
  const onGrid = Math.abs((n - min) / step - Math.round((n - min) / step)) < 1e-6;
  slider.step = onGrid ? slider.dataset.step : 'any';
  slider.value = n;
}

const form = document.getElementById('mortgage-inputs');
const out = document.getElementById('mortgage-results');
const defaults = mortgageDefaults();
const startInput = document.getElementById('mortgage-start');
let view = 'annual';
const monthLabel = (ym) => new Date(`${ym}-01T00:00:00`).toLocaleString('en-US', { month: 'short', year: 'numeric' });

for (const f of MORTGAGE_FIELDS) {
  const label = document.createElement('label');
  label.className = 'field';
  const text = document.createElement('span');
  text.textContent = f.label;
  label.dataset.field = f.id;
  let input;
  if (f.type === 'select') {
    input = document.createElement('select');
    for (const o of f.options) input.add(new Option(o.label, o.value));
  } else {
    input = document.createElement('input');
    // A dollar amount is plain text so it can show as $400,000 when not being edited.
    input.type = f.money ? 'text' : 'number';
    if (!f.money) {
      input.min = f.min;
      input.max = f.max ?? '';
      input.step = f.integer ? '1' : 'any';
    }
    input.inputMode = 'decimal';
  }
  input.name = f.id;
  input.id = `field-${f.id}`;
  input.value = f.value;
  label.append(text);
  if (f.slider) {
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = f.slider.min;
    slider.max = f.slider.max;
    slider.step = f.slider.step;
    slider.dataset.step = f.slider.step;
    slider.value = f.value;
    slider.id = `slider-${f.id}`;
    slider.setAttribute('aria-label', `${f.label} slider`);
    slider.addEventListener('input', () => {
      // Dragging goes back to the configured grid after setSlider left it on free movement.
      if (slider.step !== slider.dataset.step) {
        const raw = slider.value;
        slider.step = slider.dataset.step;
        slider.value = raw;
      }
      input.value = f.money ? usd.format(Number(slider.value)) : slider.value;
    });
    input.addEventListener('input', () => {
      const n = parseAmount(input.value);
      if (Number.isFinite(n)) setSlider(slider, n);
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
    input.value = usd.format(f.value);
  }
  label.append(input);
  if (f.id === 'lifetimeCap') {
    const note = document.createElement('span');
    note.className = 'field-note';
    note.id = 'note-lifetimeCap';
    input.setAttribute('aria-describedby', note.id);
    label.append(note);
  }
  if (f.hint) {
    const tip = document.createElement('span');
    tip.className = 'hint-text';
    tip.id = `hint-${f.id}`;
    tip.textContent = f.hint;
    const hint = document.createElement('button');
    hint.type = 'button';
    hint.className = 'hint';
    hint.textContent = '?';
    hint.setAttribute('aria-label', `Help: ${f.label}`);
    hint.setAttribute('aria-expanded', 'false');
    hint.setAttribute('aria-controls', tip.id);
    // Help text shows only on demand and sits in the page flow, so it never covers another field.
    hint.addEventListener('click', (e) => {
      e.preventDefault();
      hint.setAttribute('aria-expanded', String(tip.classList.toggle('open')));
    });
    text.append(' ', hint);
    input.setAttribute('aria-describedby', tip.id);
    label.append(tip);
  }
  form.append(label);
}

function values() {
  const v = {};
  for (const f of MORTGAGE_FIELDS) {
    const raw = form.elements[f.id].value;
    v[f.id] = f.type === 'select' ? raw : parseAmount(raw);
  }
  return v;
}

function render() {
  const v = values();
  for (const f of MORTGAGE_FIELDS) form.querySelector(`[data-field="${f.id}"]`).hidden = !!f.showIf && !f.showIf(v);
  const note = document.getElementById('note-lifetimeCap');
  note.textContent = Number.isFinite(maxRate(v)) ? `The rate can never rise above ${pct(maxRate(v))} (the starting rate plus this cap).` : '';
  const bad = invalidFields(v);
  if (bad.length) {
    out.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'placeholder';
    p.textContent = `Enter a valid value for: ${bad.join(', ')}.`;
    out.append(p);
    return;
  }
  const conflict = floorProblem(v);
  if (conflict) {
    out.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'placeholder';
    p.setAttribute('role', 'alert');
    p.textContent = conflict;
    out.append(p);
    return;
  }
  const r = simulate(v);
  const start = startInput.value;
  const payoff = addMonths(start, r.months - 1);
  const rows = r.years.map((y) => `<tr><td>${y.year}</td><td>${pct(y.rate)}</td><td>${money(y.payment)}</td><td>${money(y.interest)}</td><td>${money(y.principal)}</td><td>${money(y.balance)}</td></tr>`).join('');
  const monthRows = r.monthly.map((m) => `<tr><td>${start ? monthLabel(addMonths(start, m.month - 1)) : m.month}</td><td>${pct(m.rate)}</td><td>${money(m.payment)}</td><td>${money(m.interest)}</td><td>${money(m.principal)}</td><td>${money(m.balance)}</td></tr>`).join('');
  const monthly = view === 'monthly';
  const diff = r.extraInterest;
  const resetNote = r.noReset ? `<p class="placeholder" role="note">The first rate change comes after the loan ends (${v.fixedMonths} months against a ${v.term}-year term), so the rate never resets and this behaves as a fixed-rate loan.</p>` : '';
  const sc = scenarios(v);
  const names = { best: 'Best case', expected: 'Expected case', worst: 'Worst case' };
  const scRows = Object.entries(sc).map(([k, s]) => `<tr><th scope="row">${names[k]}</th><td>${pct(s.maxRate)}</td><td>${money(s.maxPayment)}</td><td>${s.shock >= 0 ? '+' : '−'}${Math.abs(Math.round(s.shock * 100))}%</td><td>${money(s.totalInterest)}</td></tr>`).join('');
  const w = sc.worst;
  const warn = w.shock >= 0.25
    ? `<p class="m-warning" role="alert"><strong>Payment shock:</strong> in the worst case your payment rises from ${money(w.firstPayment)} to ${money(w.maxPayment)} a month (${Math.round(w.shock * 100)}% higher) when the rate reaches ${pct(w.maxRate)}. Make sure you could afford that.</p>`
    : `<p>In the worst case your payment peaks at ${money(w.maxPayment)} a month (${Math.round(w.shock * 100)}% above the first payment).</p>`;
  out.innerHTML = `
    ${resetNote}
    <div class="m-cards">
      <div class="m-card"><h3>First monthly payment</h3><p class="m-big">${money(r.firstPayment)}</p></div>
      <div class="m-card"><h3>Highest monthly payment</h3><p class="m-big">${money(r.maxPayment)}</p><p>at a peak rate of ${pct(r.maxRate)}</p></div>
      <div class="m-card"><h3>Total interest</h3><p class="m-big">${money(r.totalInterest)}</p></div>
      <div class="m-card"><h3>Total of all payments</h3><p class="m-big">${money(r.totalPaid)}</p><p>${money(v.loan)} principal plus interest</p></div>
      ${payoff ? `<div class="m-card"><h3>Payoff date</h3><p class="m-big">${monthLabel(payoff)}</p></div>` : ''}
      <div class="m-card"><h3>Compared with holding ${pct(v.initialRate)}</h3><p class="m-big">${money(Math.abs(diff))} ${diff >= 0 ? 'more' : 'less'}</p><p>interest than a fixed loan at the starting rate (${money(r.fixed.payment)} a month, ${money(r.fixed.totalInterest)} interest).</p></div>
    </div>
    <div class="m-charts">
      ${mortgageChartHtml(r.years, { key: 'rate', title: 'Interest rate by year', fmt: pct })}
      ${mortgageChartHtml(r.years, { key: 'payment', title: 'Monthly payment by year', fmt: money })}
    </div>
    <h2>Best, expected and worst case</h2>
    ${warn}
    <table class="m-table"><caption>Scenarios: best lowers the rate by the full per-adjustment cap at every reset, worst raises it by the full cap each time up to the lifetime cap</caption>
      <thead><tr><th scope="col">Scenario</th><th scope="col">Peak rate</th><th scope="col">Highest monthly payment</th><th scope="col">Rise over first payment</th><th scope="col">Total interest</th></tr></thead>
      <tbody>${scRows}</tbody></table>
    <p><button type="button" id="mortgage-view" aria-pressed="${monthly}">${monthly ? 'Show annual schedule' : 'Show monthly schedule'}</button></p>
    <table class="m-table"><caption>${monthly ? 'Month by month' : 'Year by year (rate and payment shown as of year end)'}</caption>
      <thead><tr><th scope="col">${monthly ? (start ? 'Month' : 'Month number') : 'Year'}</th><th scope="col">Rate</th><th scope="col">Monthly payment</th><th scope="col">Interest paid</th><th scope="col">Principal paid</th><th scope="col">Ending balance</th></tr></thead>
      <tbody>${monthly ? monthRows : rows}</tbody></table>`;
}

const message = document.getElementById('mortgage-message');
const say = (text) => { message.textContent = text; };

function writeValues(v) {
  for (const f of MORTGAGE_FIELDS) {
    form.elements[f.id].value = f.money ? usd.format(v[f.id]) : v[f.id];
    const slider = document.getElementById(`slider-${f.id}`);
    if (slider) setSlider(slider, v[f.id]);
  }
}

// Keeps the URL fragment and localStorage in step with the form; a link beats stored inputs.
function save() {
  const params = new URLSearchParams(encodeMortgage(values()));
  if (startInput.value) params.set('start', startInput.value);
  const text = params.toString();
  try { localStorage.setItem(MORTGAGE_INPUTS_KEY, text); } catch { /* storage unavailable */ }
  try { history.replaceState(null, '', text ? `#${text}` : location.pathname + location.search); } catch { /* not allowed here */ }
}

// The loan start month is not one of MORTGAGE_FIELDS, so it rides along as its own parameter.
function readStart(text) {
  const start = new URLSearchParams(String(text).replace(/^[#?]/, '')).get('start') || '';
  startInput.value = addMonths(start, 0) ? start : '';
}

let stored = null;
try { stored = localStorage.getItem(MORTGAGE_INPUTS_KEY); } catch { /* storage unavailable */ }
const initial = location.hash.length > 1 ? location.hash : stored;
if (initial) { readStart(initial); writeValues(decodeMortgage(initial)); }

// Inputs that differ from the defaults, listed at the top of a printout.
function renderPrintSummary() {
  const v = values();
  const isSet = (f) => (f.type === 'select' ? f.options.some((o) => o.value === v[f.id]) : Number.isFinite(v[f.id]));
  const changed = MORTGAGE_FIELDS.filter((f) => isSet(f) && v[f.id] !== defaults[f.id]);
  const el = document.getElementById('mortgage-print-summary');
  el.innerHTML = '<h2>Scenario inputs</h2>';
  const ul = document.createElement('ul');
  for (const f of MORTGAGE_FIELDS) {
    const li = document.createElement('li');
    li.textContent = `${f.label}: ${!isSet(f) ? 'not set' : f.type === 'select' ? f.options.find((o) => o.value === v[f.id]).label : v[f.id]}${changed.includes(f) ? '' : ' (default)'}`;
    ul.append(li);
  }
  if (startInput.value) {
    const li = document.createElement('li');
    li.textContent = `Loan start month: ${startInput.value}`;
    ul.append(li);
  }
  el.append(ul);
}

form.addEventListener('input', (e) => {
  if (e.target.name === 'indexName') {
    const preset = INDEXES.find((i) => i.value === e.target.value);
    if (preset?.rate != null) {
      form.elements.indexRate.value = preset.rate;
      setSlider(document.getElementById('slider-indexRate'), preset.rate);
    }
  }
  render();
  save();
});
startInput.addEventListener('input', () => { render(); save(); });
out.addEventListener('click', (e) => {
  if (e.target.id !== 'mortgage-view') return;
  view = view === 'monthly' ? 'annual' : 'monthly';
  render();
  document.getElementById('mortgage-view').focus();
});
form.addEventListener('submit', (e) => e.preventDefault());
window.addEventListener('hashchange', () => {
  if (location.hash.length > 1) { readStart(location.hash); writeValues(decodeMortgage(location.hash)); render(); }
});
window.addEventListener('beforeprint', renderPrintSummary);
document.getElementById('mortgage-reset').addEventListener('click', () => {
  for (const f of MORTGAGE_FIELDS) {
    form.elements[f.id].value = f.money ? usd.format(defaults[f.id]) : defaults[f.id];
    const slider = document.getElementById(`slider-${f.id}`);
    if (slider) setSlider(slider, defaults[f.id]);
  }
  startInput.value = '';
  view = 'annual';
  render();
  save();
  say('');
});
document.getElementById('mortgage-copy').addEventListener('click', async () => {
  save();
  try { await navigator.clipboard.writeText(location.href); say('Link copied.'); } catch { say('Copy failed; copy the address from the browser bar instead.'); }
});
document.getElementById('mortgage-print').addEventListener('click', () => window.print());
render();
save();
