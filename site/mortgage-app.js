// Page script for the variable-rate mortgage calculator.
import { MORTGAGE_FIELDS, floorProblem, invalidFields, mortgageDefaults, simulate } from './mortgage.js';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const money = (n) => usd.format(Math.round(n) === 0 ? 0 : n);
const pct = (n) => `${Math.round(n * 1000) / 1000}%`;

const form = document.getElementById('mortgage-inputs');
const out = document.getElementById('mortgage-results');
const defaults = mortgageDefaults();

for (const f of MORTGAGE_FIELDS) {
  const label = document.createElement('label');
  label.className = 'field';
  const text = document.createElement('span');
  text.textContent = f.label;
  const input = document.createElement('input');
  input.type = 'number';
  input.name = f.id;
  input.id = `field-${f.id}`;
  input.min = f.min;
  input.max = f.max ?? '';
  input.step = f.integer ? '1' : 'any';
  input.inputMode = 'decimal';
  input.value = f.value;
  label.append(text, input);
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
    v[f.id] = raw.trim() === '' ? NaN : Number(raw);
  }
  return v;
}

function render() {
  const v = values();
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
  const rows = r.years.map((y) => `<tr><td>${y.year}</td><td>${pct(y.rate)}</td><td>${money(y.payment)}</td><td>${money(y.interest)}</td><td>${money(y.principal)}</td><td>${money(y.balance)}</td></tr>`).join('');
  const diff = r.extraInterest;
  const note = r.noReset ? `<p class="placeholder" role="note">The first rate change comes after the loan ends (${v.fixedYears} years against a ${v.term}-year term), so the rate never resets and this behaves as a fixed-rate loan.</p>` : '';
  out.innerHTML = `
    ${note}
    <div class="m-cards">
      <div class="m-card"><h3>First monthly payment</h3><p class="m-big">${money(r.firstPayment)}</p></div>
      <div class="m-card"><h3>Highest monthly payment</h3><p class="m-big">${money(r.maxPayment)}</p><p>at a peak rate of ${pct(r.maxRate)}</p></div>
      <div class="m-card"><h3>Total interest</h3><p class="m-big">${money(r.totalInterest)}</p></div>
      <div class="m-card"><h3>Compared with holding ${pct(v.initialRate)}</h3><p class="m-big">${money(Math.abs(diff))} ${diff >= 0 ? 'more' : 'less'}</p><p>interest than a fixed loan at the starting rate (${money(r.fixed.payment)} a month, ${money(r.fixed.totalInterest)} interest).</p></div>
    </div>
    <table class="m-table"><caption>Year by year (rate and payment shown as of year end)</caption>
      <thead><tr><th scope="col">Year</th><th scope="col">Rate</th><th scope="col">Monthly payment</th><th scope="col">Interest paid</th><th scope="col">Principal paid</th><th scope="col">Ending balance</th></tr></thead>
      <tbody>${rows}</tbody></table>`;
}

form.addEventListener('input', render);
form.addEventListener('submit', (e) => e.preventDefault());
document.getElementById('mortgage-reset').addEventListener('click', () => {
  for (const f of MORTGAGE_FIELDS) form.elements[f.id].value = defaults[f.id];
  render();
});
render();
