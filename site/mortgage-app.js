// Page script for the variable-rate mortgage calculator.
import { mortgageScenarioChartHtml } from './mortgage-chart.js';
import { groupWhileTyping } from './grouping.js';
import { ARM_PRESETS, INDEXES, MORTGAGE_FIELDS, MORTGAGE_INPUTS_KEY, addMonths, decodeMortgage, encodeMortgage, extraSavings, invalidFields, loanProblem, maxRate, groupAmount, mortgageDefaults, parseAmount, priceProblem, refinance, scenarios, scopeNote, simulate } from './mortgage.js';

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
const hero = document.getElementById('mortgage-hero');
const bar = document.getElementById('mortgage-bar-text');
const defaults = mortgageDefaults();

// A card is a titled group of inputs; `fields` lists the MORTGAGE_FIELDS it holds, in order.
const GROUPS = [
  { id: 'loan', title: 'Loan', fields: ['loan', 'initialRate', 'term'] },
  { id: 'rate', title: 'How the rate changes', fields: ['rateBasis', 'indexName', 'indexRate', 'margin', 'indexChange', 'change', 'fixedMonths', 'adjustMonths'] },
  { id: 'caps', title: 'Rate limits (caps)', fields: ['firstCap', 'periodicCap', 'lifetimeCap', 'floor'] },
];
// Rarely used inputs, collapsed by default.
const OPTIONAL = [
  { title: 'Extra payment and interest-only', fields: ['extra', 'ioMonths', 'ioLife'] },
  { title: 'Refinance', fields: ['refiMonth', 'refiRate', 'refiTerm', 'refiCosts'] },
  { title: 'Home price and monthly costs', fields: ['homePrice', 'closingCosts', 'pmiRate', 'propertyTax', 'insurance', 'hoa'] },
];

const startLabel = document.createElement('label');
startLabel.className = 'field wide';
startLabel.innerHTML = '<span>Loan start month (optional, for payoff date)</span><input type="month" id="mortgage-start" name="start">';
const startInput = startLabel.querySelector('input');
let view = 'annual';
let tab = 'payment';
const monthLabel = (ym) => new Date(`${ym}-01T00:00:00`).toLocaleString('en-US', { month: 'short', year: 'numeric' });

const fieldEls = {};
for (const f of MORTGAGE_FIELDS) {
  const label = document.createElement('label');
  label.className = 'field';
  const text = document.createElement('span');
  text.textContent = f.short ?? f.label;
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
  if (f.short) input.setAttribute('aria-label', f.label);
  label.append(text);
  // The editable value sits beside the label, the slider under both: one control, not two stacked boxes.
  label.append(input);
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
    // Commas appear as digits are typed, so 1,700,000 is told from 17,000,000 at a glance.
    groupWhileTyping(input);
    input.addEventListener('focus', () => {
      const n = parseAmount(input.value);
      if (Number.isFinite(n)) input.value = groupAmount(String(n));
    });
    input.addEventListener('blur', () => {
      const n = parseAmount(input.value);
      if (Number.isFinite(n)) input.value = usd.format(n);
    });
    input.value = usd.format(f.value);
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
  fieldEls[f.id] = label;
}

const el = (tag, className, html) => {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (html !== undefined) e.innerHTML = html;
  return e;
};
const card = (title, summaryId) => {
  const c = el('fieldset', 'm-group');
  c.append(el('legend', '', `${title}${summaryId ? ` <span class="m-group-summary" id="${summaryId}"></span>` : ''}`));
  return c;
};
const placed = new Set();
const take = (ids, into) => { for (const id of ids) { placed.add(id); into.append(fieldEls[id]); } };

const presets = el('div', 'm-presets');
presets.setAttribute('role', 'group');
presets.setAttribute('aria-label', 'ARM type presets: fills in the years before the first change and the years between changes');
for (const p of ARM_PRESETS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = p.label;
  b.dataset.fixed = p.fixedMonths;
  b.dataset.adjust = p.adjustMonths;
  b.title = `Fixed for ${p.fixedMonths / 12} years, then adjusts every ${p.adjustMonths / 12} year`;
  b.addEventListener('click', () => {
    for (const id of ['fixedMonths', 'adjustMonths']) {
      form.elements[id].value = p[id];
      form.elements[id].dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  presets.append(b);
}

for (const g of GROUPS) {
  const c = card(g.title, g.id === 'caps' ? 'caps-summary' : '');
  c.classList.add(`m-group-${g.id}`);
  take(g.fields, c);
  if (g.id === 'loan') {
    c.append(el('p', 'm-presets-label', 'ARM type'), presets);
    const partway = el('details', 'm-partway');
    partway.id = 'mortgage-partway';
    partway.innerHTML = '<summary>Already part-way in? <strong id="partway-summary">0 months paid</strong> <span class="m-edit">Edit</span></summary>';
    take(['elapsed', 'balance'], partway);
    partway.append(startLabel);
    c.append(partway);
  }
  if (g.id === 'caps') {
    const note = el('p', 'field-note');
    note.id = 'note-lifetimeCap';
    fieldEls.lifetimeCap.querySelector('input').setAttribute('aria-describedby', note.id);
    c.append(note);
  }
  form.append(c);
}
const optional = el('details', 'm-optional');
optional.id = 'mortgage-optional';
optional.innerHTML = '<summary><span class="m-group-title">Optional</span> <span class="m-dot" id="optional-dot" hidden aria-hidden="true"></span> <span class="m-group-summary" id="optional-summary">Extra payment, interest-only, refinance, home costs</span></summary>';
for (const o of OPTIONAL) {
  const section = el('div', 'm-optional-section');
  section.append(el('h3', '', o.title));
  take(o.fields, section);
  optional.append(section);
}
// A field no group claims still belongs in the form, under Optional.
const rest = MORTGAGE_FIELDS.filter((f) => !placed.has(f.id)).map((f) => f.id);
if (rest.length) { const section = el('div', 'm-optional-section'); take(rest, section); optional.append(section); }
form.append(optional);

// On wide screens the headline result sits above the results so it stays in view; on narrow
// screens it comes first on the page, ahead of the inputs.
const layout = document.getElementById('mortgage-layout');
const resultsCol = document.getElementById('mortgage-results-col');
const wide = window.matchMedia('(min-width: 900px)');
const placeHero = () => (wide.matches ? resultsCol : layout).prepend(hero);
wide.addEventListener('change', placeHero);
placeHero();

function values() {
  const v = {};
  for (const f of MORTGAGE_FIELDS) {
    const raw = form.elements[f.id].value;
    v[f.id] = f.type === 'select' ? raw : parseAmount(raw);
  }
  return v;
}

const TABS = [['payment', 'Payment'], ['rate', 'Interest rate'], ['balance', 'Balance'], ['table', 'Table']];

const OPTIONAL_IDS = ['extra', 'ioMonths', 'refiMonth', 'homePrice', 'closingCosts', 'pmiRate', 'propertyTax', 'insurance', 'hoa'];

// Opens the collapsed groups when the inputs (from a link or saved state) already use them.
function revealActive() {
  const v = values();
  if (v.elapsed > 0 || startInput.value) document.getElementById('mortgage-partway').open = true;
  if (OPTIONAL_IDS.some((id) => v[id] > 0)) document.getElementById('mortgage-optional').open = true;
}

// Summaries on the card headers and the sticky bar follow the inputs, valid or not.
function updateChrome(v) {
  const n = (x) => (Number.isFinite(x) ? String(Math.round(x * 1000) / 1000) : '–');
  document.getElementById('caps-summary').textContent = `${n(v.firstCap)} / ${n(v.periodicCap)} / ${n(v.lifetimeCap)} · floor ${n(v.floor)}%`;
  const months = Number.isFinite(v.elapsed) ? v.elapsed : 0;
  document.getElementById('partway-summary').textContent = `${months} month${months === 1 ? '' : 's'} paid`;
  const on = OPTIONAL_IDS.filter((id) => v[id] > 0 || (id === 'ioMonths' && v.ioLife === 'yes'));
  const names = { extra: 'Extra payment', ioMonths: 'Interest-only', refiMonth: 'Refinance', homePrice: 'Home price', closingCosts: 'Closing costs', pmiRate: 'PMI', propertyTax: 'Property tax', insurance: 'Insurance', hoa: 'HOA dues' };
  document.getElementById('optional-dot').hidden = !on.length;
  document.getElementById('optional-summary').textContent = on.length ? on.map((id) => names[id]).join(' · ') : 'Extra payment, interest-only, refinance, home costs';
  for (const b of presets.children) {
    b.setAttribute('aria-pressed', String(Number(b.dataset.fixed) === v.fixedMonths && Number(b.dataset.adjust) === v.adjustMonths));
  }
}

function showProblem(text, alert) {
  out.innerHTML = '';
  const p = document.createElement('p');
  p.className = 'placeholder';
  if (alert) p.setAttribute('role', 'alert');
  p.textContent = text;
  hero.replaceChildren(p);
  bar.textContent = '–';
}

function render() {
  const v = values();
  for (const f of MORTGAGE_FIELDS) fieldEls[f.id].hidden = !!f.showIf && !f.showIf(v);
  updateChrome(v);
  const note = document.getElementById('note-lifetimeCap');
  note.textContent = Number.isFinite(maxRate(v)) ? `The rate can never rise above ${pct(maxRate(v))} (the starting rate plus this cap).` : '';
  const bad = invalidFields(v);
  if (bad.length) return showProblem(`Enter a valid value for: ${bad.join(', ')}.`, false);
  const conflict = loanProblem(v) || priceProblem(v);
  if (conflict) return showProblem(conflict, true);
  const r = simulate(v);
  const start = startInput.value;
  const hasExtras = r.hasExtras;
  const payoff = r.monthly.length ? addMonths(start, r.monthly[r.monthly.length - 1].month - 1) : ''; // the schedule's final row, counted from the loan's start
  const rows = r.years.map((y) => `<tr><td>${y.year}</td><td>${pct(y.rate)}</td><td>${money(y.payment)}</td>${hasExtras ? `<td>${money(y.total)}</td>` : ''}<td>${money(y.interest)}</td><td>${money(y.principal)}</td><td>${money(y.balance)}</td></tr>`).join('');
  const monthRows = r.monthly.map((m) => `<tr><td>${start ? monthLabel(addMonths(start, m.month - 1)) : m.month}</td><td>${pct(m.rate)}</td><td>${money(m.payment)}</td><td>${money(m.interest)}</td><td>${money(m.principal)}</td><td>${money(m.balance)}</td></tr>`).join('');
  const monthly = view === 'monthly';
  const diff = r.extraInterest;
  const change = (to) => `${to >= r.firstPayment ? '+' : '−'}${money(Math.abs(to - r.firstPayment))} (${to >= r.firstPayment ? '+' : '−'}${(Math.abs(to / r.firstPayment - 1) * 100).toFixed(1)}%)`;
  const resetNote = r.firstReset
    ? ` The first rate change (year ${r.firstReset.year}) makes the payment ${money(r.firstReset.payment)}, ${change(r.firstReset.payment)}.` : '';
  const noResetNote = r.noReset ? `<p class="placeholder" role="note">The first rate change comes after the loan ends (${v.fixedMonths} months against a ${v.term}-year term), so the rate never resets and this behaves as a fixed-rate loan.</p>` : '';
  const years = (n) => { const y = Math.floor(n / 12); const m = n % 12; return [y && `${y} year${y === 1 ? '' : 's'}`, m && `${m} month${m === 1 ? '' : 's'}`].filter(Boolean).join(' ') || '0 months'; };
  const extra = v.extra > 0 ? extraSavings(v) : null;
  const extraCard = extra ? `<div class="m-card"><h3>Extra ${money(v.extra)} a month</h3><p class="m-big">${money(extra.interestSaved)}</p><p>less interest, and the loan ends ${years(extra.monthsSaved)} early (after ${years(r.payoffMonths)})</p></div>` : '';
  const ioNote = v.ioLife === 'yes' ? `<p role="note">Every payment is interest only: the required payment is ${money(r.firstPayment)} and the balance does not fall (apart from any extra you pay). The remaining balance of ${money(r.balloon)} is due as a balloon payment with the last payment, after ${years(r.months)}.</p>` : v.ioMonths > 0 ? `<p role="note">The first ${v.ioMonths} months are interest only: the required payment is ${money(r.firstPayment)}, then it is recalculated to repay the balance over the remaining ${years(r.months - v.ioMonths)}.</p>` : '';
  const refi = refinance(v);
  const refiHtml = refi ? `
    <h2>Refinance after ${years(v.refiMonth)}</h2>
    <p>Replace the loan's remaining balance of ${money(refi.balance)} with a fixed ${pct(v.refiRate)} loan over ${v.refiTerm} years, paying ${money(refi.costs)} in closing costs.${v.extra > 0 ? ' The monthly extra payment continues on both.' : ''}</p>
    <table class="m-table"><caption>Keeping this loan compared with refinancing, from the refinance month to payoff</caption>
      <thead><tr><th scope="col"></th><th scope="col">Keep this loan</th><th scope="col">Refinance</th></tr></thead>
      <tbody>
        <tr><th scope="row">Monthly payment</th><td>${money(refi.stayPayment)}</td><td>${money(refi.refiPayment)}</td></tr>
        <tr><th scope="row">Months left to payoff</th><td>${refi.stayMonths}</td><td>${refi.refiMonths}</td></tr>
        <tr><th scope="row">Total paid from then on (refinance includes closing costs)</th><td>${money(refi.stayTotal)}</td><td>${money(refi.refiTotal)}</td></tr>
      </tbody></table>
    <p>${refi.savings >= 0 ? `Refinancing costs ${money(refi.savings)} less in total` : `Refinancing costs ${money(-refi.savings)} more in total`}. ${refi.breakEvenMonths === null ? 'Its cumulative cost never drops below keeping the loan.' : refi.breakEvenMonths === 0 ? 'There are no closing costs to recover.' : `The closing costs are recovered after ${years(refi.breakEvenMonths)}, which is the break-even point.`} The comparison ignores that a different payoff time changes how long each loan ties up your money, and it assumes the new loan has a fixed rate.</p>` : '';
  const line = (label, n) => (n > 0 ? `<tr><th scope="row">${label}</th><td>${money(n)}</td></tr>` : '');
  const breakdown = hasExtras ? `
    <table class="m-table m-breakdown"><caption>First month's payment, in full</caption>
      <tbody>
        <tr><th scope="row">${v.ioMonths > 0 || v.ioLife === 'yes' ? 'Interest (interest-only period)' : 'Principal and interest'}</th><td>${money(r.firstPayment)}</td></tr>
        ${line('Extra payment', v.extra)}
        ${line('Property tax', v.propertyTax / 12)}${line('Homeowners insurance', v.insurance / 12)}${line('HOA dues', v.hoa)}${line('PMI', r.firstPmi)}
        <tr class="m-total"><th scope="row">Total monthly payment</th><td>${money(r.firstTotal)}</td></tr>
      </tbody></table>
    ${r.totalPmi > 0 ? `<p>PMI is charged for ${r.pmiMonths} months (${money(r.totalPmi)} in all), until the balance reaches 80% of the home price.</p>` : ''}` : '';
  const closing = r.cashToClose > 0 ? `<div class="m-card"><h3>Cash needed at closing</h3><p class="m-big">${money(r.cashToClose)}</p><p>${r.downPayment > 0 ? `${money(r.downPayment)} down payment plus ` : ''}${money(v.closingCosts)} closing costs.</p></div>` : '';
  const sc = scenarios(v);
  const names = { best: 'Best case', expected: 'Expected case', worst: 'Worst case' };
  const scRows = Object.entries(sc).map(([k, s]) => `<tr><th scope="row">${names[k]}</th><td>${pct(s.maxRate)}</td><td>${money(s.maxPayment)}</td><td>${s.shock >= 0 ? '+' : '−'}${Math.abs(Math.round(s.shock * 100))}%</td><td>${money(s.totalInterest)}</td></tr>`).join('');
  const w = sc.worst;

  // Hero: the first payment against the worst one, with the expected peak marked between them.
  const rises = w.maxPayment > r.firstPayment;
  const spread = w.maxPayment - r.firstPayment;
  const mark = rises ? Math.min(100, Math.max(0, ((r.maxPayment - r.firstPayment) / spread) * 100)) : 0;
  const shocked = w.shock >= 0.25;
  const strip = rises
    ? `<p class="${shocked ? 'm-alert' : 'm-strip'}"${shocked ? ' role="alert"' : ''}><strong>${shocked ? 'Payment shock: ' : 'Worst case: '}${change(w.maxPayment)}</strong> over the first payment, first reached in year ${w.maxPaymentYear} at a ${pct(w.maxRate)} rate.${shocked ? ' Make sure you could afford that.' : ''}${resetNote}</p>`
    : `<p class="m-strip">No scenario takes the payment above the first payment.${resetNote}</p>`;
  hero.innerHTML = `<div class="m-hero">
      <p class="m-hero-label">Your monthly payment</p>
      <p class="m-hero-figure"><span>${money(r.firstPayment)}</span>${rises ? ` <span class="m-arrow" aria-hidden="true">&rarr;</span> <span class="m-hero-peak">up to ${money(w.maxPayment)}</span>` : ''}</p>
      ${rises ? `<div class="m-range"><div class="m-range-bar"><span class="m-range-mark" style="left:${mark.toFixed(1)}%"></span></div>
        <div class="m-range-labels"><span>Start &middot; ${money(r.firstPayment)}</span><span>Expected peak &middot; ${money(r.maxPayment)}</span><span>Worst &middot; ${money(w.maxPayment)}</span></div></div>` : ''}
      ${hasExtras ? `<p class="m-hero-sub">${money(r.firstTotal)} a month with ${[v.propertyTax > 0 && 'taxes', v.insurance > 0 && 'insurance', r.firstPmi > 0 && 'PMI', v.hoa > 0 && 'HOA', v.extra > 0 && 'your extra payment'].filter(Boolean).join(', ') || 'extras'} in the first month.</p>` : ''}
      ${strip}
    </div>`;
  bar.textContent = rises ? `${money(r.firstPayment)} → ${money(w.maxPayment)}` : money(r.firstPayment);

  const series = [['Best', 'best'], ['Expected', 'expected'], ['Worst', 'worst']].map(([name, style]) => ({ name, style, years: sc[style].years }));
  const resetYear = r.firstReset?.year;
  const chart = (key, title, fmt) => mortgageScenarioChartHtml(series, { key, title, fmt, resetYear });
  const panels = {
    payment: chart('payment', 'Monthly payment by year', money),
    rate: chart('rate', 'Interest rate by year', pct),
    balance: chart('balance', 'Loan balance by year', money),
    table: `<p><button type="button" id="mortgage-view" class="ghost" aria-pressed="${monthly}">${monthly ? 'Show annual schedule' : 'Show monthly schedule'}</button></p>
    <div class="m-table-wrap"><table class="m-table"><caption>${monthly ? 'Month by month' : 'Year by year (rate and payment shown as of year end)'}</caption>
      <thead><tr><th scope="col">${monthly ? (start ? 'Month' : 'Month number') : 'Year'}</th><th scope="col">Rate</th><th scope="col">Monthly payment${v.extra > 0 ? ' (with extra)' : hasExtras ? ' (principal and interest)' : ''}</th>${hasExtras ? '<th scope="col">Total monthly</th>' : ''}<th scope="col">Interest paid</th><th scope="col">Principal paid</th><th scope="col">Ending balance</th></tr></thead>
      <tbody>${monthly ? monthRows : rows}</tbody></table></div>`,
  };
  const tabs = TABS.map(([k, name]) => `<button type="button" role="tab" id="m-tab-${k}" aria-selected="${k === tab}" aria-controls="m-panel-${k}" tabindex="${k === tab ? 0 : -1}">${name}</button>`).join('');
  const panelHtml = TABS.map(([k, name]) => `<div role="tabpanel" id="m-panel-${k}" aria-labelledby="m-tab-${k}" class="m-panel"${k === tab ? '' : ' hidden'}><h3 class="m-print-title">${name}</h3>${panels[k]}</div>`).join('');
  out.innerHTML = `
    ${noResetNote}
    <p class="m-scope" role="note">${scopeNote(v)}</p>
    ${v.elapsed > 0 ? `<p class="m-scope" role="note"><strong>Balance today: ${money(r.startBalance)}</strong> after ${v.elapsed} payment${v.elapsed === 1 ? '' : 's'}${v.balance > 0 ? ' (the balance you entered)' : ' (worked out from the original loan amount)'}.</p>` : ''}
    ${ioNote}
    <div class="m-tiles">
      <div class="m-tile"><h3>Total interest</h3><p class="m-big">${money(r.totalInterest)}</p><p>${v.elapsed > 0 ? `still to be paid, from month ${v.elapsed + 1}` : 'Expected case'}</p></div>
      <div class="m-tile"><h3>Total of all payments</h3><p class="m-big">${money(r.totalPaid)}</p><p>${money(r.startBalance)} ${v.elapsed > 0 ? 'balance today' : 'principal'} plus interest</p></div>
      <div class="m-tile"><h3>Compared with holding ${pct(v.initialRate)}</h3><p class="m-big ${diff > 0 ? 'm-worse' : 'm-better'}">${diff >= 0 ? '+' : '−'}${money(Math.abs(diff))}</p><p>${money(r.fixed.payment)} a month, ${money(r.fixed.totalInterest)} interest if fixed</p></div>
    </div>
    ${payoff || extraCard || closing ? `<div class="m-cards">
      ${payoff ? `<div class="m-card"><h3>Payoff date</h3><p class="m-big">${monthLabel(payoff)}</p></div>` : ''}
      ${extraCard}
      ${closing}
    </div>` : ''}
    <div class="m-panelbox">
      <div class="m-tabs" role="tablist" aria-label="Chart or table">${tabs}</div>
      ${panelHtml}
    </div>
    ${breakdown}
    <h2>Best, expected and worst case</h2>
    <table class="m-table"><caption>Scenarios: best lowers the rate by the full per-adjustment cap at every reset, worst raises it by the full cap each time up to the lifetime cap</caption>
      <thead><tr><th scope="col">Scenario</th><th scope="col">Peak rate</th><th scope="col">Highest monthly payment</th><th scope="col">Rise over first payment</th><th scope="col">Total interest</th></tr></thead>
      <tbody>${scRows}</tbody></table>
    ${refiHtml}`;
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
if (initial) { readStart(initial); writeValues(decodeMortgage(initial)); revealActive(); }

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
function selectTab(k) {
  tab = k;
  render();
  document.getElementById(`m-tab-${k}`).focus();
}
out.addEventListener('click', (e) => {
  const t = e.target.closest('[role="tab"]');
  if (t) return selectTab(t.id.replace('m-tab-', ''));
  if (e.target.id !== 'mortgage-view') return;
  view = view === 'monthly' ? 'annual' : 'monthly';
  render();
  document.getElementById('mortgage-view').focus();
});
out.addEventListener('keydown', (e) => {
  if (!e.target.matches('[role="tab"]')) return;
  const keys = TABS.map(([k]) => k);
  const i = keys.indexOf(tab);
  const to = { ArrowRight: keys[(i + 1) % keys.length], ArrowLeft: keys[(i + keys.length - 1) % keys.length], Home: keys[0], End: keys[keys.length - 1] }[e.key];
  if (!to) return;
  e.preventDefault();
  selectTab(to);
});
form.addEventListener('submit', (e) => e.preventDefault());
window.addEventListener('hashchange', () => {
  if (location.hash.length > 1) { readStart(location.hash); writeValues(decodeMortgage(location.hash)); revealActive(); render(); }
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
