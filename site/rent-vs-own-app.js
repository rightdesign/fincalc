// Page script for the rent vs own calculator.
import { RENTOWN_FIELDS, RENTOWN_GROUPS, compareRentOwn, decodeRentOwn, encodeRentOwn, invalidRentOwn, parseAmount, rentOwnDefaults } from './rentown.js';
import { rentOwnChartHtml } from './rentown-chart.js';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const money = (n) => usd.format(Math.round(n) === 0 ? 0 : n);
const signed = (n) => `${n < 0 ? '−' : '+'}${usd.format(Math.abs(Math.round(n)))}`;
const STORE_KEY = 'fincalc.rentown';

const form = document.getElementById('rentown-inputs');
const out = document.getElementById('rentown-results');
const message = document.getElementById('rentown-message');
const defaults = rentOwnDefaults();
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
    const input = document.createElement('input');
    input.type = f.money ? 'text' : 'number';
    if (!f.money) {
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

function render() {
  const v = values();
  const bad = invalidRentOwn(v);
  if (bad.length) {
    out.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'placeholder';
    p.textContent = `Enter a valid value for: ${bad.join(', ')}.`;
    out.append(p);
    return;
  }
  save(v);
  const r = compareRentOwn(v);
  const { final } = r;
  const ahead = final.difference >= 0;
  const cash = r.cash;
  const short = cash.shortfall > 0;
  const word = (n, one) => `${n} ${one}${n === 1 ? '' : 's'}`;
  const gap = cash.monthsToClose == null
    ? ''
    : ` Setting aside the ${money(cash.monthlyGap)} a month owning would cost beyond rent would close the gap in about ${word(cash.monthsToClose, 'month')}, not counting interest earned.`;
  const headline = short
    ? `You are ${money(cash.shortfall)} short — renting while you save is the only option on these numbers.`
    : Math.round(final.difference) === 0
    ? `After ${v.years} ${v.years === 1 ? 'year' : 'years'}, owning and renting leave you about even.`
    : `After ${v.years} ${v.years === 1 ? 'year' : 'years'}, ${ahead ? 'owning' : 'renting'} leaves you about ${money(Math.abs(final.difference))} ahead.`;
  const detail = short
    ? `You need ${money(cash.total)} in cash to buy and have ${money(cash.saved)}.${gap} Once you have it, the numbers below apply: after ${v.years} ${v.years === 1 ? 'year' : 'years'}, ${ahead ? 'owning' : 'renting'} would leave you about ${money(Math.abs(final.difference))} ahead.`
    : r.breakEven == null
    ? 'Owning does not catch up within your stay: closing and selling costs and the cost of owning outweigh the gains.'
    : `Break-even: owning pulls ahead in year ${r.breakEven}.${r.breakEven > 1 ? ' Renting is ahead before that, mostly because of closing and selling costs.' : ''}`;
  const rows = r.years.map((y) => `<tr><td>${y.year}</td><td>${money(y.own)}</td><td>${money(y.rent)}</td><td>${signed(y.difference)}</td></tr>`).join('');
  out.innerHTML = `
    <div class="m-card ro-headline"><h2 class="m-big">${headline}</h2><p>${detail}</p></div>
    <div class="m-card ro-cash"><h3>Cash needed to buy</h3>
      <table class="m-table"><tbody>
        <tr><th scope="row">Down payment</th><td>${money(cash.down)}</td></tr>
        <tr><th scope="row">Closing costs</th><td>${money(cash.closing)}</td></tr>
        <tr><th scope="row">Moving</th><td>${money(cash.moving)}</td></tr>
        <tr><th scope="row">Reserve (${word(v.reserve, 'month')} of owning costs)</th><td>${money(cash.reserve)}</td></tr>
        <tr><th scope="row">Total cash needed</th><td><strong>${money(cash.total)}</strong></td></tr>
        ${cash.saved == null ? '' : `<tr><th scope="row">Cash you have saved</th><td>${money(cash.saved)}</td></tr><tr><th scope="row">${short ? 'Shortfall' : 'Left over after buying'}</th><td>${money(short ? cash.shortfall : cash.saved - cash.total)}</td></tr>`}
      </tbody></table></div>
    <div class="m-charts">
      ${rentOwnChartHtml(r.years, r.breakEven, money)}
      <div class="ro-table-wrap"><table class="m-table"><caption>Net worth at the end of each year</caption>
        <thead><tr><th scope="col">Year</th><th scope="col">Own</th><th scope="col">Rent</th><th scope="col">Difference</th></tr></thead>
        <tbody>${rows}</tbody></table>
        <p>Monthly cost in year 1: own ${money(r.firstOwnMonthly)}${r.firstPmi > 0 ? ` (including ${money(r.firstPmi)} mortgage insurance)` : ''} · rent ${money(r.firstRentMonthly)}.</p>
        ${r.totalPmi > 0 ? `<p>Mortgage insurance over your stay: ${money(r.totalPmi)} in total, charged only while the loan is above 80% of the home&rsquo;s value.</p>` : ''}</div>
    </div>`;
}

// Inputs ride along in the address and in browser storage so a scenario survives a reload and can be shared.
function save(v) {
  const text = encodeRentOwn(v);
  try { localStorage.setItem(STORE_KEY, text); } catch { /* storage unavailable */ }
  try { history.replaceState(null, '', text ? `#${text}` : location.pathname + location.search); } catch { /* not allowed here */ }
}

let stored = null;
try { stored = localStorage.getItem(STORE_KEY); } catch { /* storage unavailable */ }
if (location.hash.length > 1 || stored) setValues(decodeRentOwn(location.hash.length > 1 ? location.hash : stored));
window.addEventListener('hashchange', () => { if (location.hash.length > 1) { setValues(decodeRentOwn(location.hash)); render(); } });

form.addEventListener('input', () => { message.textContent = ''; render(); });
form.addEventListener('submit', (e) => e.preventDefault());
document.getElementById('rentown-reset').addEventListener('click', () => {
  setValues(defaults);
  render();
  message.textContent = 'Inputs reset to defaults.';
});
document.getElementById('rentown-print').addEventListener('click', () => window.print());
document.getElementById('rentown-copy').addEventListener('click', async () => {
  save(values());
  try { await navigator.clipboard.writeText(location.href); message.textContent = 'Link copied.'; } catch { message.textContent = 'Copy failed; copy the address from the browser bar instead.'; }
});
render();
