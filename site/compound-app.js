// Page script for the compound interest calculator.
import { faqCard } from './compound-faq.js';
import { compareChartHtml, compoundChartHtml, compoundTip, crossoverYear, stopYear } from './compound-chart.js';
import { groupWhileTyping } from './grouping.js';
import { csvFilename, tableCsv } from './export.js';
import { groupAmount } from './mortgage.js';
import { contribUnit, contributes, contributionPhrase, yearsCaption, COMPOUND_FIELDS, balanceBreakdown, LIMITS, limitText, advancedChanged, choiceEffects, frequencyLabel, interestTax, contributionMonths, monthsText, termMonths, yearLabel, COMPOUND_INPUTS_KEY, COMPOUND_PRESETS, compoundDefaults, compoundingExplainer, decodeCompound, doubleTileText, encodeCompound, compareStartingLater, effectiveAnnualRate, feeEffect, growthRates, headline, inTodaysDollars, invalidCompound, leverTable, parseNumber, roundedMoney, returnRange, simulateCompound, solveGoal, withdrawsOn, WAIT_YEARS, MAX_YEARS, SLIDER_STEPS, sliderPos, sliderValue } from './compound.js';

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
// Moves a slider to a typed value; a value outside its range pins the thumb at the end and says so.
function setSlider(f, n) {
  const s = sliders[f.id];
  s.value = sliderPos(f, n);
  const over = n > f.slider.max, under = n < f.slider.min;
  s.classList.toggle('out-of-range', over || under);
  s.title = over || under ? `The value is ${over ? 'above' : 'below'} this slider's range (${f.slider.min}–${f.slider.max}); the slider is held at its end.` : '';
  s.setAttribute('aria-valuetext', over || under ? `${n}, ${over ? 'above' : 'below'} the slider range` : String(n));
}
// The four inputs everyone needs sit in the group; the rest go under an Advanced disclosure.
const advanced = document.createElement('details');
advanced.className = 'm-advanced';
advanced.innerHTML = '<summary><span class="m-group-title">Advanced</span> <span class="m-badge" id="compound-advanced-badge" hidden></span> <span class="m-group-summary">Contribution length and step-up, return range, compounding, tax, inflation</span></summary>';
const advancedBadge = advanced.querySelector('#compound-advanced-badge');
group.insertBefore(advanced, presetsLabel);
// "Contribute for" follows the term (Years and Months) until the user sets it shorter; it never runs past it.
let follow = true;
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
  const curved = Boolean(f.slider?.curve);
  const show = (n) => (f.kind === 'money' ? usd.format(n) : String(n));
  if (f.slider) {
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = curved ? 0 : f.slider.min;
    slider.max = curved ? SLIDER_STEPS : f.slider.max;
    slider.step = curved ? 1 : f.slider.step;
    slider.id = `slider-${f.id}`;
    slider.setAttribute('aria-label', `${f.label} slider`);
    slider.addEventListener('input', () => { input.value = show(sliderValue(f, slider.value)); if (f.id === 'contributeYears') markFollow(); render(); persist(); });
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
  if (f.advanced) advanced.append(label); else group.insertBefore(label, advanced);
}

// A box read as a number; a half-typed one is NaN, and a blank months box counts as 0 in the term arithmetic.
const num = (el) => parseNumber(el.value);

function markFollow() {
  const n = num(inputs.contributeYears) * 12 + (num(inputs.contributeMonths) || 0);
  const t = num(inputs.years) * 12 + (num(inputs.months) || 0);
  if (Number.isFinite(n) && Number.isFinite(t)) follow = n >= t;
}
inputs.contributeYears.addEventListener('input', markFollow);
inputs.contributeMonths.addEventListener('input', markFollow);

// Keeps the Contribute for boxes and slider in line with the term (following it, or held down to it).
function syncContribute() {
  const y = num(inputs.years);
  if (!Number.isFinite(y)) return;
  const m = num(inputs.months) || 0;
  const n = num(inputs.contributeYears) * 12 + (num(inputs.contributeMonths) || 0);
  if (follow || n > y * 12 + m) { inputs.contributeYears.value = y; inputs.contributeMonths.value = m; setSlider(COMPOUND_FIELDS.find((x) => x.id === 'contributeYears'), y); }
  sliders.contributeYears.max = Math.max(1, Math.min(y, MAX_YEARS));
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
    if (s) setSlider(f, v[f.id]);
  }
  follow = v.contributeYears * 12 + v.contributeMonths >= termMonths(v);
}

const presets = document.getElementById('compound-presets');
for (const p of COMPOUND_PRESETS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = p.label;
  b.dataset.preset = p.id;
  b.addEventListener('click', () => { const next = { ...values(), ...p.values }; if ('years' in p.values) next.months = 0; if ('contributeYears' in p.values) next.contributeMonths = 0; if (follow && !('contributeYears' in p.values)) { next.contributeYears = next.years; next.contributeMonths = next.months; } writeValues(next); render(); persist(); say(''); });
  presets.append(b);
}

// The three answers to "what would it take to reach the target?"; empty when no target is set.
function goalPanel(v, g, unit) {
  if (!g) return '';
  const yrs = (n) => `${n} year${n === 1 ? '' : 's'}`;
  const gap = g.met ? `Your plan as entered already reaches it, ending at ${money(g.current)}.` : `Your plan as entered ends at ${money(g.current)}, ${money(g.target - g.current)} short.`;
  const monthly = { ok: `<strong>${money(Math.ceil(g.monthly.value))} ${contribUnit(v)}</strong>`, already: '<strong>Nothing more</strong>', none: '<strong>Not enough</strong>' }[g.monthly.status];
  const monthlyNote = { ok: `instead of ${money(v.monthly)}${v.stepUp > 0 ? ' (the yearly increase still applies)' : ''}`, already: 'your starting balance alone grows to the target', none: contributionMonths(v) === 0 ? 'you contribute for 0 months, so the contribution changes nothing' : 'no contribution amount reaches it in this time' }[g.monthly.status];
  const years = g.years.status === 'ok' ? `<strong>${yrs(g.years.value)}</strong>` : '<strong>Not in 100 years</strong>';
  const yearsNote = g.years.status === 'ok' ? `instead of ${monthsText(termMonths(v))}${contributionMonths(v) < termMonths(v) ? '; contributions still stop when they do now' : ''}` : 'at this return and contribution';
  const rate = { ok: `<strong>${g.rate.value}% a year</strong>`, already: `<strong>Any return</strong>`, none: '<strong>Not reachable</strong>' }[g.rate.status];
  const rateNote = { ok: `instead of ${v.rate}%`, already: `even at ${g.rate.value}%, the lowest the page accepts`, none: `even at ${LIMITS.rate.max}%, the highest the page accepts` }[g.rate.status];
  return `<div class="m-panelbox m-goal" id="compound-goal"><h3>Reaching ${money(g.target)}${unit}</h3>
    <p>${gap} Changing one thing at a time and leaving the rest as entered, you would need:</p>
    <div class="m-tiles">
      <div class="m-tile"><h3>Contribution ${contribUnit(v)}</h3><p class="m-big">${monthly}</p><p>${monthlyNote}</p></div>
      <div class="m-tile"><h3>Time</h3><p class="m-big">${years}</p><p>${yearsNote}</p></div>
      <div class="m-tile"><h3>Annual return</h3><p class="m-big">${rate}</p><p>${rateNote}</p></div>
    </div></div>`;
}

// What the effective rate shrinks to after tax and, in today's dollars, after inflation.
function rateBreakdown(v) {
  const g = growthRates(v);
  const parts = [];
  if (interestTax(v) > 0) parts.push(`<strong>${g.afterTax.toFixed(2)}%</strong> after tax`);
  if (g.real !== null) parts.push(`<strong>${g.real.toFixed(2)}%</strong> after inflation`);
  return parts.length ? `, ${parts.join(', ')}` : '';
}

// The schedule under the results: one row per year or per month, with a CSV of whatever is showing and a print button.
let schedule = null;
let scheduleView = 'yearly';
let scheduleCsv = '';
function scheduleSection({ r, today, unit, cross, taking }) {
  const monthly = scheduleView === 'monthly';
  const rows = monthly ? r.months : r.years;
  const cell = (x) => [monthly ? x.month : yearLabel(x.year), money(x.contributions), ...(taking ? [money(x.withdrawals)] : []), money(x.interest), money(x.totalContributed), money(x.totalInterest), money(x.balance)];
  return {
    id: `compound-${scheduleView}`,
    rows: rows.map(cell),
    columns: [monthly ? 'Month' : 'Year', monthly ? 'Contributed this month' : 'Contributed this year', ...(taking ? [monthly ? 'Taken out this month' : 'Taken out this year'] : []), monthly ? 'Interest this month' : 'Interest this year', 'Total contributed', today ? 'Growth after inflation' : 'Total interest', `Balance${unit}`],
    crossRow: monthly ? -1 : r.years.findIndex((y) => y.year === cross),
  };
}

function drawSchedule() {
  const host = document.getElementById('compound-schedule');
  const { caption, today, unit, cross, taking } = schedule;
  const intCol = taking ? 3 : 2;
  const sec = scheduleSection(schedule);
  const monthly = scheduleView === 'monthly';
  scheduleCsv = tableCsv(sec);
  const body = sec.rows.map((row, i) => `<tr${i === sec.crossRow ? ` class="m-cross" aria-label="Year ${yearLabel(cross)}, the year interest to date passes contributions to date"` : ''}>${row.map((c, j) => `<td${j === intCol ? ' class="m-int"' : j === intCol + 2 ? ' class="m-int m-int-total"' : ''}>${c}</td>`).join('')}</tr>`).join('');
  const heads = sec.columns.map((c, j) => `<th scope="col"${j === intCol ? ' class="m-int"' : j === intCol + 2 ? ' class="m-int m-int-total"' : ''}>${c}</th>`).join('');
  const note = monthly && schedule.r.months.some((m) => m.interest === 0 && m.balance > 0) ? ' Below monthly compounding, interest joins the balance only when each compounding period ends.' : '';
  host.innerHTML = `<div class="m-schedule-bar no-print"><div class="m-toggle" role="group" aria-label="Schedule detail"><button type="button" data-view="yearly" aria-pressed="${!monthly}">Yearly</button><button type="button" data-view="monthly" aria-pressed="${monthly}">Monthly</button></div> <button type="button" class="ghost" id="compound-csv">Download table (CSV)</button> <button type="button" class="ghost" id="compound-print">Print&hellip;</button></div>
    <p class="m-table-caption" id="compound-years-caption">${monthly ? caption.replace('Year by year', 'Month by month') : caption}${!monthly && cross ? `. The highlighted row, year ${yearLabel(cross)}, is when interest to date first passes contributions to date.` : ''}${note}</p>
    <div class="m-table-wrap"><table class="m-table m-years" aria-labelledby="compound-years-caption"><thead><tr>${heads}</tr></thead><tbody>${body}</tbody></table></div>`;
  for (const b of host.querySelectorAll('[data-view]')) b.addEventListener('click', () => { scheduleView = b.dataset.view; drawSchedule(); host.querySelector(`[data-view="${scheduleView}"]`).focus(); });
  host.querySelector('#compound-csv').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([scheduleCsv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = csvFilename(sec);
    a.click();
    URL.revokeObjectURL(url);
  });
  host.querySelector('#compound-print').addEventListener('click', () => window.print());
}

// The inputs as a plain list for the printed page, where the form is hidden.
function printInputs(v) {
  const items = COMPOUND_FIELDS.map((f) => {
    const text = f.kind === 'choice' ? inputs[f.id].selectedOptions[0].textContent : f.kind === 'money' ? usd.format(v[f.id]) : v[f.id];
    return `<li>${f.label}: <strong>${text}</strong></li>`;
  }).join('');
  return `<div class="print-only m-print-inputs"><h3>Your inputs</h3><ul>${items}</ul></div>`;
}

function render() {
  syncContribute();
  const v = values();
  for (const b of presets.children) {
    const p = COMPOUND_PRESETS.find((x) => x.id === b.dataset.preset);
    b.setAttribute('aria-pressed', String(Object.keys(p.values).every((id) => p.values[id] === v[id])));
  }
  const changed = advancedChanged(v);
  advancedBadge.hidden = !changed.length;
  advancedBadge.textContent = `${changed.length} changed`;
  advancedBadge.title = `Changed from the default: ${changed.join(', ')}`;
  const bad = invalidCompound(v);
  if (bad.length) {
    hero.innerHTML = '';
    explainer.hidden = true;
    out.innerHTML = `<p class="placeholder" role="alert">Enter a valid value for: ${bad.map((l) => { const f = COMPOUND_FIELDS.find((x) => x.label === l); return f && LIMITS[f.id] ? `${l} (${limitText(f.id)})` : l; }).join(', ')}.</p>`;
    return;
  }
  const nominal = simulateCompound(v);
  const today = v.basis === 'today';
  const r = today ? inTodaysDollars(nominal, v.inflation) : nominal;
  const unit = today ? " (today's dollars)" : '';
  const cross = crossoverYear(r.years);
  const doubleTile = doubleTileText(v);
  const taking = r.withdrawn > 0;
  const withdrawNote = taking ? (r.runsOut ? `Withdrawals of ${money(r.withdrawn)}${today ? " (today's dollars)" : ''} in all. The balance runs out in year ${r.runsOut.year}, so later withdrawals could not be paid.` : `Withdrawals of ${money(r.withdrawn)}${today ? " (today's dollars)" : ''} in all. The balance lasts the full ${v.years} year${v.years === 1 ? '' : 's'}.`) : (withdrawsOn(v) ? `No withdrawals are taken: they start in year ${v.withdrawFrom}, after the ${v.years} years shown.` : '');
  const headlineEl = document.createElement('p');
  headlineEl.textContent = headline(v, r);
  // Show both dollar bases so Inflation always visibly matters, whichever view the tables and chart use.
  const infl = `${v.inflation}% inflation`;
  const otherDollars = today ? `About ${roundedMoney(nominal.futureValue)} in future dollars` : `About ${roundedMoney(inTodaysDollars(nominal, v.inflation).futureValue)} in today's dollars (${infl})`;
  hero.innerHTML = `<div class="m-hero"><p class="m-hero-label">Future value after ${monthsText(termMonths(v))}${unit}</p><p class="m-hero-figure"><span>${money(r.futureValue)}</span></p><p class="m-hero-sub">${headlineEl.innerHTML}</p><p class="m-hero-sub" id="compound-other-dollars">${otherDollars}</p><p class="m-hero-sub" id="compound-effective-rate">Effective annual rate: <strong>${effectiveAnnualRate(v).toFixed(2)}%</strong>${v.rateBasis === 'nominal' ? ` (from a ${v.rate}% nominal rate)` : ''}${rateBreakdown(v)}</p>${withdrawNote ? `<p class="m-hero-sub" id="compound-withdrawals">${withdrawNote}</p>` : ''}</div>`;
  const fx = choiceEffects(v, r, today ? v.inflation : null);
  const sign = (n) => `${n < 0 ? '−' : '+'}${money(Math.abs(n))}`;
  const effectRow = (name, now, other, e) => `<tr><th scope="row">${name}</th><td>${now}</td><td>${other}</td><td>${money(e.futureValue)}</td><td>${sign(-e.gap)}</td></tr>`;
  const fee = feeEffect(v, r, today ? v.inflation : null);
  const feeRow = fee ? `<tr><th scope="row">Annual fees</th><td>${v.fee}% a year</td><td>No fees</td><td>${money(fee.futureValue)}</td><td>${sign(fee.gap)}</td></tr>` : '';
  const feeNote = fee ? `<p class="m-strip" id="compound-fees">With ${v.fee}% annual fees the balance after ${monthsText(termMonths(v))} is <strong>${money(r.futureValue)}</strong>${unit}, <strong>${money(fee.gap)}</strong> less than the ${money(fee.futureValue)} you would have with no fees. Fees charged along the way total ${money(fee.paid)}${unit}; the rest of the gap is the growth that money would have earned.</p>` : '';
  const range = returnRange(v);
  const rangeNote = range ? `<p class="m-strip" id="compound-range">At a return of ${range.lowRate}% to ${range.highRate}% (${v.rate}% ± ${v.variance} points), the balance after ${monthsText(termMonths(v))} lands between <strong>${money(range.low.futureValue)}</strong> and <strong>${money(range.high.futureValue)}</strong>${unit}, with ${money(r.futureValue)} at ${v.rate}%. The shaded band on the chart shows that range.</p>` : '';
  const goal = goalPanel(v, solveGoal(v), unit);
  const levers = leverTable(v);
  const leverRows = levers.rows.map((l) => `<tr><th scope="row">${l.label}</th><td>${money(l.balance)}</td><td>${l.gain >= 0 ? '+' : ''}${money(l.gain)}</td><td>+${money(l.extra)}</td></tr>`).join('');
  const bd = balanceBreakdown(v, today ? v.inflation : null);
  const parts = [['Starting balance', bd.start, 1], [bd.withdrawn ? 'Contributions, net of withdrawals' : 'Contributions', bd.contributions, 2], ['Interest on starting balance', bd.startInterest, 3], ['Interest on contributions', bd.contributionInterest, 4]];
  const barOk = parts.every(([, n]) => n >= -0.005) && bd.total > 0;
  const breakdown = `<div class="m-panelbox m-breakdown" id="compound-breakdown"><h3>Where the final balance comes from${unit}</h3>
      ${barOk ? `<div class="m-bar" role="img" aria-label="${parts.map(([n, a]) => `${n} ${money(a)}`).join(', ')}">${parts.map(([n, a, i]) => `<span class="m-bar-${i}" style="flex-grow:${Math.max(a, 0)}"></span>`).join('')}</div>` : ''}
      <ul class="m-legend">${parts.map(([n, a, i]) => `<li><span class="m-swatch m-bar-${i}" aria-hidden="true"></span>${n}: <strong>${money(a)}</strong>${barOk ? ` (${Math.round((a / bd.total) * 100)}%)` : ''}</li>`).join('')}</ul></div>`;
  const share = r.futureValue > 0 ? Math.round((r.interest / r.futureValue) * 100) : 0;
  const c = compareStartingLater(v);
  const compare = withdrawsOn(v) ? '' : c ? `
    <div class="m-panelbox m-compare"><h3>The cost of waiting ${c.waitYears} years${unit}</h3>
      <p>Same ${contributionPhrase(v, money)}${v.monthly > 0 && v.stepUp > 0 ? `, rising ${v.stepUp}% a year (the later plan restarts that schedule at ${money(v.monthly)} in its first year),` : ''} and ${v.rate}% return, same end date: starting now versus starting ${c.waitYears} years later (${monthsText(termMonths(v) - c.waitYears * 12)} of saving${contributionMonths(v) < termMonths(v) ? `; contributions run for ${monthsText(contributionMonths(v))} from the start, or the whole ${monthsText(termMonths(v) - c.waitYears * 12)} if that is shorter` : ''}).</p>
      ${v.start > 0 ? `<p class="m-strip">The ${money(v.start)} starting balance is assumed to sit idle (earning 0%) during the ${c.waitYears}-year wait and is invested only when the later plan starts. If that money would be invested anyway, the real cost of waiting is smaller than shown.</p>` : ''}
      ${compareChartHtml(c, money)}
      <div class="m-table-wrap"><table class="m-table m-stack"><thead><tr><th scope="col"></th><th scope="col">Start now</th><th scope="col">Start ${c.waitYears} years later</th><th scope="col">Difference</th></tr></thead>
        <tbody><tr><th scope="row">Total contributed</th><td>${money(c.now.contributed)}</td><td>${money(c.later.contributed)}</td><td>${money(c.extraContributed)}</td></tr>
        <tr><th scope="row">End balance</th><td>${money(c.now.futureValue)}</td><td>${money(c.later.futureValue)}</td><td>${money(c.gap)}</td></tr></tbody></table></div>
      <p>Starting ${c.waitYears} years earlier means ${c.extraContributed > 0 ? `contributing ${money(c.extraContributed)} more` : 'contributing the same amount'} and ending with ${money(c.gap)} more.</p></div>` : `
    <p class="m-strip">Set the term above ${WAIT_YEARS} years to compare starting now with starting ${WAIT_YEARS} years later.</p>`;
  out.innerHTML = `
    ${printInputs(v)}
    <div class="m-tiles">
      <div class="m-tile" id="compound-double"><h3>Time to double</h3><p class="m-big">${doubleTile.value}</p><p>${doubleTile.caption}</p></div>
      <div class="m-tile"><h3>Total contributed</h3><p class="m-big">${money(r.contributed)}</p><p>${money(v.start)} to start plus ${contributionPhrase(v, money)}${v.monthly > 0 && v.stepUp > 0 ? `, rising ${v.stepUp}% a year` : ''}${v.annual > 0 && v.annualStepUp > 0 ? `, the lump sum rising ${v.annualStepUp}% a year` : ''}${contributes(v) && contributionMonths(v) < termMonths(v) ? `${v.stepUp > 0 || v.annualStepUp > 0 ? ',' : ''} for ${monthsText(contributionMonths(v))}` : ''}</p></div>
      <div class="m-tile"><h3>${today ? 'Growth after inflation' : 'Total interest earned'}</h3><p class="m-big m-better">${money(r.interest)}</p><p>${today ? 'Balance in today\'s dollars minus what you put in' : (taking ? 'All interest earned, including what was withdrawn' : `${share}% of the final balance`)}</p></div>
    </div>
    ${breakdown}
    <div class="m-table-wrap"><table class="m-table m-stack"><caption>What your choices are worth (change one at a time)</caption>
      <thead><tr><th scope="col">Choice</th><th scope="col">You chose</th><th scope="col">Instead</th><th scope="col">Future value${unit}</th><th scope="col">Difference</th></tr></thead>
      <tbody>${effectRow('Compounding', frequencyLabel(v.frequency), frequencyLabel(fx.frequency.alt), fx.frequency)}${effectRow('Contribution timing', v.timing === 'end' ? 'End of period' : 'Beginning of period', fx.timing.alt === 'end' ? 'End of period' : 'Beginning of period', fx.timing)}${feeRow}</tbody></table></div>
    ${feeNote}
    ${goal}
    ${rangeNote}
    <div class="m-panelbox">${compoundChartHtml(r.years, money, range && { low: range.low.years, high: range.high.years, lowRate: range.lowRate, highRate: range.highRate }, v.basis, v.target > 0 ? v.target : null)}</div>
    <div class="m-table-wrap"><table class="m-table m-stack" id="compound-levers"><caption>What moves the needle: change one thing at a time${unit}. The changes cost different amounts, so compare each gain with the extra you put in.</caption>
      <thead><tr><th scope="col">Change</th><th scope="col">Balance after ${monthsText(termMonths(v))}</th><th scope="col">Difference</th><th scope="col">Extra you put in</th></tr></thead>
      <tbody><tr><th scope="row">Your inputs</th><td>${money(levers.base)}</td><td>&mdash;</td><td>&mdash;</td></tr>${leverRows}</tbody></table></div>
    ${compare}
    <div id="compound-schedule"></div>
    ${faqCard(v, r)}`;
  schedule = { r, today, unit, cross, caption: yearsCaption(v), taking };
  drawSchedule();
  for (const t of out.querySelectorAll('.m-stack')) {
    const heads = [...t.querySelectorAll('thead th')].map((h) => h.textContent);
    for (const tr of t.querySelectorAll('tbody tr')) [...tr.querySelectorAll('td')].forEach((td, i) => td.setAttribute('data-label', heads[i + 1] ?? ''));
  }
  explainerBody.innerHTML = compoundingExplainer(v, r).map((p) => `<h3>${p.title}</h3><p>${p.text}</p>`).join('');
  explainer.hidden = false;
  wireChart(out.querySelector('.cc-wrap'), r.years);
  for (const b of out.querySelectorAll('.cc-basis button')) {
    b.addEventListener('click', () => {
      if (inputs.basis.value === b.dataset.basis) return;
      inputs.basis.value = b.dataset.basis;
      render();
      persist();
      out.querySelector(`.cc-basis [data-basis="${b.dataset.basis}"]`)?.focus();
    });
  }
}

// Hover, tap and arrow keys show one year's balance, contributions and interest in a tooltip.
function wireChart(wrap, years) {
  const points = JSON.parse(wrap.dataset.points);
  const stop = stopYear(years);
  const line = wrap.querySelector('.cc-hover-line');
  const dot = wrap.querySelector('.cc-hover-dot');
  const tip = wrap.querySelector('.cc-tip');
  const svg = wrap.querySelector('svg');
  const [, , vw, vh] = svg.getAttribute('viewBox').split(' ').map(Number);
  let index = -1;
  const show = (i) => {
    index = Math.max(0, Math.min(points.length - 1, i));
    const p = points[index];
    const t = compoundTip(years[index], money, stop);
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
    if (s && Number.isFinite(n)) setSlider(f, n);
  }
  render();
  persist();
  say('');
});

let stored = '';
try { stored = localStorage.getItem(COMPOUND_INPUTS_KEY) ?? ''; } catch { /* storage unavailable */ }
writeValues(decodeCompound(location.hash.length > 1 ? location.hash : stored));
render();
advanced.open = !advancedBadge.hidden;

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
