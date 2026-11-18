// Page script for the compound interest calculator.
import { compoundChartHtml, compoundTip } from './compound-chart.js';
import { groupWhileTyping } from './grouping.js';
import { groupAmount } from './mortgage.js';
import { COMPOUND_FIELDS, COMPOUND_INPUTS_KEY, COMPOUND_PRESETS, compoundDefaults, compoundingExplainer, decodeCompound, encodeCompound, headline, inTodaysDollars, invalidCompound, parseNumber, simulateCompound } from './compound.js';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const money = (n) => usd.format(Math.round(n) === 0 ? 0 : n);

const form = document.getElementById('compound-inputs');
const hero = document.getElementById('compound-hero');
const out = document.getElementById('compound-results');
const explainer = document.getElementById('compound-explainer');
const explainerBody = document.getElementById('compound-explainer-body');
const message = document.getElementById('compound-message');
const group = form.querySelector('fieldset');

// On wide screens the headline sits above the results so it stays in view; on narrow screens it
// comes first on the page, ahead of the inputs (same as the mortgage page).
const layout = document.getElementById('compound-layout');
const resultsCol = document.getElementById('compound-results-col');
const wide = window.matchMedia('(min-width: 900px)');
const placeHero = () => (wide.matches ? resultsCol : layout).prepend(hero);
wide.addEventListener('change', placeHero);
placeHero();

const presetsLabel = document.getElementById('compound-presets-label');
const sliders = {};
const inputs = {};
for (const f of COMPOUND_FIELDS) {
  const label = document.createElement('label');
  label.className = 'field';
  const text = document.createElement('span');
  text.textContent = f.label;
  let input;
  if (f.kind === 'choice') {
    input = document.createElement('select');
    for (const o of f.options) input.add(new Option(o.label, o.value));
  } else {
    input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'decimal';
  }
  input.name = f.id;
  input.id = `field-${f.id}`;
  label.append(text, input);
  inputs[f.id] = input;
  const show = (n) => (f.kind === 'money' ? usd.format(n) : String(n));
  if (f.slider) {
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = f.slider.min;
    slider.max = f.slider.max;
    slider.step = f.slider.step;
    slider.id = `slider-${f.id}`;
    slider.setAttribute('aria-label', `${f.label} slider`);
    slider.addEventListener('input', () => { input.value = show(Number(slider.value)); render(); persist(); });
    label.append(slider);
    sliders[f.id] = slider;
  }
  if (f.kind === 'money') {
    groupWhileTyping(input);
    input.addEventListener('focus', () => { const n = parseNumber(input.value); if (Number.isFinite(n)) input.value = groupAmount(String(n)); });
    input.addEventListener('blur', () => { const n = parseNumber(input.value); if (Number.isFinite(n)) input.value = usd.format(n); });
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
    hint.addEventListener('click', (e) => { e.preventDefault(); hint.setAttribute('aria-expanded', String(tip.classList.toggle('open'))); });
    text.append(' ', hint);
    input.setAttribute('aria-describedby', tip.id);
    label.append(tip);
  }
  group.insertBefore(label, presetsLabel);
}

function values() {
  const v = {};
  for (const f of COMPOUND_FIELDS) v[f.id] = f.kind === 'choice' ? inputs[f.id].value : parseNumber(inputs[f.id].value);
  return v;
}

function writeValues(v) {
  for (const f of COMPOUND_FIELDS) {
    inputs[f.id].value = f.kind === 'money' ? usd.format(v[f.id]) : v[f.id];
    const s = sliders[f.id];
    if (s) s.value = v[f.id];
  }
}

const presets = document.getElementById('compound-presets');
for (const p of COMPOUND_PRESETS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = p.label;
  b.dataset.preset = p.id;
  b.addEventListener('click', () => { writeValues({ ...values(), ...p.values }); render(); persist(); say(''); });
  presets.append(b);
}

function render() {
  const v = values();
  for (const b of presets.children) {
    const p = COMPOUND_PRESETS.find((x) => x.id === b.dataset.preset);
    b.setAttribute('aria-pressed', String(Object.keys(p.values).every((id) => p.values[id] === v[id])));
  }
  const bad = invalidCompound(v);
  if (bad.length) {
    hero.innerHTML = '';
    explainer.hidden = true;
    out.innerHTML = `<p class="placeholder" role="alert">Enter a valid value for: ${bad.join(', ')}.</p>`;
    return;
  }
  for (const f of COMPOUND_FIELDS) if (sliders[f.id]) sliders[f.id].value = v[f.id];
  const nominal = simulateCompound(v);
  const today = v.basis === 'today';
  const r = today ? inTodaysDollars(nominal, v.inflation) : nominal;
  const unit = today ? " (today's dollars)" : '';
  const rows = r.years.map((y) => `<tr><td>${y.year}</td><td>${money(y.contributions)}</td><td>${money(y.interest)}</td><td>${money(y.totalContributed)}</td><td>${money(y.totalInterest)}</td><td>${money(y.balance)}</td></tr>`).join('');
  const headlineEl = document.createElement('p');
  headlineEl.textContent = headline(v, r);
  hero.innerHTML = `<div class="m-hero"><p class="m-hero-label">Future value after ${v.years} year${v.years === 1 ? '' : 's'}${unit}</p><p class="m-hero-figure"><span>${money(r.futureValue)}</span></p><p class="m-hero-sub">${headlineEl.innerHTML}</p></div>`;
  const share = r.futureValue > 0 ? Math.round((r.interest / r.futureValue) * 100) : 0;
  out.innerHTML = `
    <div class="m-tiles">
      <div class="m-tile"><h3>Future value${unit}</h3><p class="m-big">${money(r.futureValue)}</p><p>After ${v.years} year${v.years === 1 ? '' : 's'}</p></div>
      <div class="m-tile"><h3>Total contributed</h3><p class="m-big">${money(r.contributed)}</p><p>${money(v.start)} to start plus ${money(v.monthly)} a month</p></div>
      <div class="m-tile"><h3>${today ? 'Growth after inflation' : 'Total interest earned'}</h3><p class="m-big m-better">${money(r.interest)}</p><p>${today ? 'Balance in today\'s dollars minus what you put in' : `${share}% of the final balance`}</p></div>
    </div>
    <div class="m-panelbox">${compoundChartHtml(r.years, money)}</div>
    <div class="m-table-wrap"><table class="m-table"><caption>Year by year (contributions at the end of each month)</caption>
      <thead><tr><th scope="col">Year</th><th scope="col">Contributed this year</th><th scope="col">Interest this year</th><th scope="col">Total contributed</th><th scope="col">${today ? 'Growth after inflation' : 'Total interest'}</th><th scope="col">Balance${unit}</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  explainerBody.innerHTML = compoundingExplainer(v, r).map((p) => `<h3>${p.title}</h3><p>${p.text}</p>`).join('');
  explainer.hidden = false;
  wireChart(out.querySelector('.cc-wrap'), r.years);
}

// Hover, tap and arrow keys show one year's balance, contributions and interest in a tooltip.
function wireChart(wrap, years) {
  const points = JSON.parse(wrap.dataset.points);
  const line = wrap.querySelector('.cc-hover-line');
  const dot = wrap.querySelector('.cc-hover-dot');
  const tip = wrap.querySelector('.cc-tip');
  const svg = wrap.querySelector('svg');
  const [, , vw, vh] = svg.getAttribute('viewBox').split(' ').map(Number);
  let index = -1;
  const show = (i) => {
    index = Math.max(0, Math.min(points.length - 1, i));
    const p = points[index];
    const t = compoundTip(years[index], money);
    line.setAttribute('x1', p.x * vw); line.setAttribute('x2', p.x * vw);
    dot.setAttribute('cx', p.x * vw); dot.setAttribute('cy', p.y * vh);
    line.classList.remove('cc-off'); dot.classList.remove('cc-off');
    tip.innerHTML = `<strong>${t.title}</strong>${t.lines.map(([k, v]) => `<span>${k}: ${v}</span>`).join('')}`;
    tip.hidden = false;
    tip.classList.toggle('flip', p.x > 0.55);
    tip.style.left = `${p.x * 100}%`;
  };
  const hide = () => { index = -1; line.classList.add('cc-off'); dot.classList.add('cc-off'); tip.hidden = true; };
  const nearest = (clientX) => {
    const box = svg.getBoundingClientRect();
    const x = (clientX - box.left) / box.width;
    let best = 0;
    points.forEach((p, i) => { if (Math.abs(p.x - x) < Math.abs(points[best].x - x)) best = i; });
    return best;
  };
  wrap.addEventListener('pointermove', (e) => show(nearest(e.clientX)));
  wrap.addEventListener('pointerdown', (e) => show(nearest(e.clientX)));
  wrap.addEventListener('pointerleave', hide);
  wrap.addEventListener('blur', hide);
  wrap.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (step !== undefined) { e.preventDefault(); show(index < 0 ? (step > 0 ? 0 : points.length - 1) : index + step); }
    else if (e.key === 'Escape') hide();
  });
}

const say = (text) => { message.textContent = text; };

// Keeps the URL fragment and localStorage in step with the form; a link beats stored inputs.
function persist() {
  const v = values();
  if (invalidCompound(v).length) return;
  const text = encodeCompound(v);
  try { localStorage.setItem(COMPOUND_INPUTS_KEY, text); } catch { /* storage unavailable */ }
  try { history.replaceState(null, '', text ? `#${text}` : location.pathname + location.search); } catch { /* not allowed here */ }
}

form.addEventListener('input', () => {
  for (const f of COMPOUND_FIELDS) {
    const s = sliders[f.id];
    const n = parseNumber(inputs[f.id].value);
    if (s && Number.isFinite(n)) s.value = n;
  }
  render();
  persist();
  say('');
});

let stored = '';
try { stored = localStorage.getItem(COMPOUND_INPUTS_KEY) ?? ''; } catch { /* storage unavailable */ }
writeValues(decodeCompound(location.hash.length > 1 ? location.hash : stored));
render();

window.addEventListener('hashchange', () => {
  if (location.hash.length > 1) { writeValues(decodeCompound(location.hash)); render(); }
});

document.getElementById('compound-reset').addEventListener('click', () => {
  writeValues(compoundDefaults());
  render();
  persist();
  say('Reset to defaults.');
});
document.getElementById('compound-copy').addEventListener('click', async () => {
  persist();
  try { await navigator.clipboard.writeText(location.href); say('Link copied.'); } catch { say('Copy failed; copy the address from the browser bar instead.'); }
});
