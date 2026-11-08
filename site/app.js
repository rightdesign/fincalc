// Entry point for the calculator page. The inputs form mounts into
// #calculator. Saved scenarios and the current inputs are kept in this
// browser's localStorage; the current inputs are also mirrored into the URL
// fragment so the page can be bookmarked and shared.
import { FIELDS, defaultHorizon, defaultValues, parseRepairs, parseValue } from './inputs.js';
import { MAX_SCENARIOS, STORAGE_KEY, addScenario, compareScenarios, parseStored, removeScenario } from './scenarios.js';
import { csvFilename, tableCsv } from './export.js';
import { INPUTS_KEY, decodeInputs, encodeInputs } from './share.js';
import { buildResults, changedInputs, headlineHtml, downsizeWaterfall, downsizeWaterfallHtml, sensitivityHtml, costSummaryHtml, cardHtml, cardText, chartHtml, hoverPoints, tableHtml } from './results.js';

export const root = document.getElementById('calculator');

function renderField(field, value) {
  const label = document.createElement('label');
  label.className = 'field';
  const text = document.createElement('span');
  text.textContent = field.label;
  let input;
  if (field.kind === 'choice') {
    input = document.createElement('select');
    for (const o of field.options) {
      const opt = new Option(o.label, o.value, false, o.value === value);
      input.append(opt);
    }
  } else if (field.kind === 'checkbox') {
    input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = value === 1;
    label.classList.add('checkbox-field');
  } else {
    input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.step = field.kind === 'years' ? '1' : 'any';
    input.inputMode = 'decimal';
    input.value = value;
  }
  input.name = field.id;
  input.id = `field-${field.id}`;
  if (field.hint) {
    const tip = document.createElement('span');
    tip.className = 'hint-text';
    tip.id = `hint-${field.id}`;
    tip.textContent = field.hint;
    const hint = document.createElement('button');
    hint.type = 'button';
    hint.className = 'hint';
    hint.textContent = '?';
    hint.setAttribute('aria-label', `Help: ${field.label}`);
    hint.setAttribute('aria-expanded', 'false');
    hint.setAttribute('aria-controls', tip.id);
    // Help text sits in the page flow (never a floating box), so it cannot be clipped.
    hint.addEventListener('click', (e) => {
      e.preventDefault();
      const open = tip.classList.toggle('open');
      hint.setAttribute('aria-expanded', String(open));
    });
    input.setAttribute('aria-describedby', tip.id);
    text.append(' ', hint);
    // The checkbox's explanation is always shown, directly under it.
    if (field.kind === 'checkbox') {
      tip.classList.add('open');
      hint.setAttribute('aria-expanded', 'true');
    }
    label.hintText = tip;
  }
  if (field.slider) {
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = field.slider.min;
    slider.max = field.slider.max;
    slider.step = field.slider.step;
    slider.value = value;
    slider.name = `${field.id}-slider`;
    slider.id = `slider-${field.id}`;
    slider.setAttribute('aria-label', `${field.label} slider`);
    // Dragging the slider types into the number field, whose input event reaches the form.
    slider.addEventListener('input', (e) => {
      e.stopPropagation();
      input.value = slider.value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    input.addEventListener('input', () => { slider.value = input.value; });
    label.classList.add('has-slider');
    label.append(text, slider, input);
    if (label.hintText) label.append(label.hintText);
    return label;
  }
  if (field.kind === 'checkbox') label.append(input, text);
  else label.append(text, input);
  if (label.hintText) label.append(label.hintText);
  return label;
}

// Optional one-time repairs on the stay path: rows of year + amount that the
// user adds and removes. Rows live in the DOM (.repair-row) and are read by
// readInputs.
function renderRepairs() {
  const box = document.createElement('div');
  box.className = 'repairs';
  const note = document.createElement('p');
  note.className = 'hint-note';
  note.textContent = 'Optional. Lump-sum costs such as a new roof or HVAC, in that year\'s dollars. They are added to your owning costs in the year you choose.';
  const list = document.createElement('div');
  list.className = 'repair-list';
  const add = document.createElement('button');
  add.type = 'button';
  add.textContent = 'Add a repair';
  const addRow = () => {
    const row = document.createElement('div');
    row.className = 'repair-row';
    const mk = (name, label, step) => {
      const l = document.createElement('label');
      l.className = 'field';
      const t = document.createElement('span');
      t.textContent = label;
      const i = document.createElement('input');
      i.type = 'number';
      i.min = name === 'year' ? '1' : '0';
      i.step = step;
      i.inputMode = 'decimal';
      i.name = `repair-${name}`;
      l.append(t, i);
      return l;
    };
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => {
      row.remove();
      list.dispatchEvent(new Event('change', { bubbles: true }));
    });
    row.append(mk('year', 'Repair year', '1'), mk('amount', 'Repair cost', 'any'), remove);
    list.append(row);
    row.querySelector('input').focus();
  };
  add.addEventListener('click', addRow);
  box.append(note, list, add);
  return box;
}

// Groups that share one accordion section in the rail.
const GROUP_TITLES = { Inflation: 'Inflation & horizon', 'Time horizon': 'Inflation & horizon' };
const GROUP_KEY = 'fincalc.group';
const DEFAULT_GROUP = 'Home';

// One collapsible group: a header button (name and input count) over a body.
// Only one group is open at a time; the open one is remembered.
function makeGroup(title, count) {
  const group = document.createElement('div');
  group.className = 'group';
  group.dataset.group = title;
  const id = `group-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const head = document.createElement('h3');
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'group-toggle';
  toggle.id = `${id}-toggle`;
  toggle.setAttribute('aria-controls', id);
  toggle.innerHTML = `<span class="group-name">${esc(title)}</span><span class="group-meta"><span class="group-dot" role="img" aria-label="Needs attention" hidden></span><span class="group-count">${count} ${count === 1 ? 'input' : 'inputs'}</span></span>`;
  head.append(toggle);
  const body = document.createElement('div');
  body.className = 'group-body';
  body.id = id;
  body.setAttribute('role', 'group');
  body.setAttribute('aria-labelledby', toggle.id);
  group.append(head, body);
  return { group, body };
}

function openGroup(form, title) {
  for (const g of form.querySelectorAll('.group')) {
    const open = g.dataset.group === title;
    g.classList.toggle('open', open);
    g.querySelector('.group-toggle').setAttribute('aria-expanded', String(open));
    g.querySelector('.group-body').hidden = !open;
  }
  try { localStorage.setItem(GROUP_KEY, title); } catch { /* storage unavailable */ }
}

function renderForm(container) {
  const values = defaultValues();
  const form = document.createElement('form');
  form.id = 'inputs';
  form.noValidate = true;
  form.addEventListener('submit', (e) => e.preventDefault());

  const helpToggle = document.createElement('label');
  helpToggle.className = 'toggle-all';
  const helpBox = document.createElement('input');
  helpBox.type = 'checkbox';
  helpBox.addEventListener('change', () => form.classList.toggle('show-hints', helpBox.checked));
  helpToggle.append(helpBox, ' Show all help text');
  form.append(helpToggle);

  const titles = [...new Set(FIELDS.map((f) => GROUP_TITLES[f.group] ?? f.group))];
  const bodies = {};
  for (const title of titles) {
    const { group, body } = makeGroup(title, FIELDS.filter((f) => (GROUP_TITLES[f.group] ?? f.group) === title).length);
    bodies[title] = body;
    form.append(group);
  }
  for (const field of FIELDS) bodies[GROUP_TITLES[field.group] ?? field.group].append(renderField(field, values[field.id]));

  const waterfall = document.createElement('div');
  waterfall.className = 'waterfall table-wrap';
  waterfall.setAttribute('aria-live', 'polite');
  bodies['If you downsize'].append(waterfall);

  const { group: repairsGroup, body: repairsBody } = makeGroup('Major repairs', 0);
  repairsBody.append(renderRepairs());
  repairsGroup.querySelector('.group-count').textContent = 'optional';
  form.append(repairsGroup);

  form.addEventListener('click', (e) => {
    const toggle = e.target.closest('.group-toggle');
    if (toggle) openGroup(form, toggle.closest('.group').dataset.group);
  });
  let remembered = null;
  try { remembered = localStorage.getItem(GROUP_KEY); } catch { /* storage unavailable */ }
  openGroup(form, form.querySelector(`.group[data-group="${CSS.escape(remembered ?? '')}"]`) ? remembered : DEFAULT_GROUP);

  // The horizon follows the mortgage term until the user sets it themselves.
  const term = form.elements.mortgageTerm;
  const horizon = form.elements.horizon;
  let horizonEdited = false;
  horizon.addEventListener('input', () => { horizonEdited = true; });
  term.addEventListener('input', () => {
    if (!horizonEdited) horizon.value = defaultHorizon(term.value);
  });

  form.addEventListener('change', () => syncProceedsFields(form));
  syncProceedsFields(form);

  container.append(form);
  return form;
}

// The proceeds-cap fields apply only while the "use the proceeds" box is checked,
// and only the amount or percentage field matching the chosen mode is enabled.
function syncProceedsFields(form) {
  const on = form.elements.useProceeds.checked;
  const mode = form.elements.proceedsMode.value;
  form.elements.proceedsMode.disabled = !on;
  form.elements.proceedsAmount.disabled = !on || mode !== 'amount';
  form.elements.proceedsPercent.disabled = !on || mode !== 'percent';
  // The withdrawal percentage is not used when withdrawals are set to cover the rent.
  form.elements.investmentWithdrawal.disabled = form.elements.withdrawToCoverRent.checked;
}

// Current form contents as numbers (null where blank or invalid).
export function readInputs(form) {
  const out = {};
  for (const field of FIELDS) {
    const el = form.elements[field.id];
    out[field.id] = parseValue(field, field.kind === 'checkbox' ? (el.checked ? '1' : '0') : el.value);
  }
  const rows = [...form.querySelectorAll('.repair-row')].map((r) => ({
    year: r.querySelector('[name="repair-year"]').value,
    amount: r.querySelector('[name="repair-amount"]').value,
  }));
  out.repairs = parseRepairs(rows);
  return out;
}

// Writes saved values back into the form (the inverse of readInputs).
function writeInputs(form, values) {
  for (const field of FIELDS) {
    if (field.kind === 'checkbox') {
      // A scenario saved before a checkbox existed has no value for it: use the default.
      form.elements[field.id].checked = (values[field.id] ?? field.default) === 1;
      continue;
    }
    if (values[field.id] == null) continue;
    form.elements[field.id].value = values[field.id];
    if (field.slider) form.elements[`${field.id}-slider`].value = values[field.id];
  }
  form.querySelectorAll('.repair-row').forEach((r) => r.remove());
  const add = form.querySelector('.repairs > button');
  for (const rep of values.repairs ?? []) {
    add.click();
    const rows = form.querySelectorAll('.repair-row');
    const row = rows[rows.length - 1];
    row.querySelector('[name="repair-year"]').value = rep.year;
    row.querySelector('[name="repair-amount"]').value = rep.amount;
  }
  syncProceedsFields(form);
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Saved named scenarios as chips at the top of the rail: "Current" (the live
// inputs) plus up to MAX_SCENARIOS saved ones. Loading a scenario keeps the
// live inputs aside so the Current chip can bring them back; editing any input
// makes the inputs "Current" again. The side-by-side comparison is a results tab.
function mountScenarios(form, update) {
  const box = document.createElement('section');
  box.className = 'scenarios';
  const state = { list: [] };
  try { state.list = parseStored(localStorage.getItem(STORAGE_KEY)); } catch { /* storage unavailable */ }
  const persist = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.list)); } catch { /* storage unavailable */ } };
  let active = null;
  let stash = null;
  let saving = false;
  let message = '';

  const render = () => {
    const chips = state.list.map((s) => `<span class="chip-group"><button type="button" class="chip" data-act="load" data-name="${esc(s.name)}" aria-pressed="${active === s.name}">${esc(s.name)}</button><button type="button" class="chip-remove" data-act="remove" data-name="${esc(s.name)}" aria-label="Remove scenario ${esc(s.name)}">&times;</button></span>`).join('');
    const full = state.list.length >= MAX_SCENARIOS;
    box.innerHTML = `<div class="scenario-chips"><strong>Scenario</strong> <button type="button" class="chip" data-act="current" aria-pressed="${active == null}">Current</button>${chips} <button type="button" data-act="save-open"${saving ? ' hidden' : ''}>Save as&hellip;</button></div>
      <div class="scenario-save"${saving ? '' : ' hidden'}><label class="field"><span>Scenario name</span><input type="text" name="scenario-name" maxlength="40"></label><button type="button" data-act="save">Save</button><button type="button" data-act="save-cancel">Cancel</button></div>
      <p class="scenario-message" role="status">${esc(message)}</p>`;
    if (saving) box.querySelector('[name="scenario-name"]').focus();
    message = '';
  };
  box.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.name === 'scenario-name') { e.preventDefault(); box.querySelector('[data-act="save"]').click(); }
    if (e.key === 'Escape' && saving) { saving = false; render(); }
  });
  box.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const { act, name } = btn.dataset;
    if (act === 'save-open') {
      if (state.list.length >= MAX_SCENARIOS) message = `You can keep up to ${MAX_SCENARIOS} scenarios. Remove one first.`;
      else saving = true;
      render();
    } else if (act === 'save-cancel') {
      saving = false;
      render();
    } else if (act === 'save') {
      const values = readInputs(form);
      const missing = FIELDS.some((f) => values[f.id] == null) || values.repairs == null;
      if (missing) { message = 'Fix the inputs before saving; some values are missing or invalid.'; return render(); }
      const next = addScenario(state.list, box.querySelector('[name="scenario-name"]').value, values);
      if (next.error) { message = next.error; return render(); }
      state.list = next;
      persist();
      saving = false;
      active = null;
      stash = null;
      message = 'Scenario saved.';
      render();
      update();
    } else if (act === 'load') {
      const s = state.list.find((x) => x.name === name);
      if (!s) return;
      if (active == null) {
        const current = readInputs(form);
        stash = FIELDS.some((f) => current[f.id] == null) || current.repairs == null ? null : current;
      }
      active = s.name;
      writeInputs(form, s.values);
      render();
      update();
    } else if (act === 'current') {
      if (active != null && stash) writeInputs(form, stash);
      active = null;
      stash = null;
      render();
      update();
    } else if (act === 'remove') {
      if (!confirm(`Remove the scenario "${name}"?`)) return;
      state.list = removeScenario(state.list, name);
      persist();
      if (active === name) active = null;
      render();
      update();
    }
  });
  // Typing into an input leaves any loaded scenario behind.
  const edited = (e) => {
    if (active == null || !form.contains(e.target)) return;
    active = null;
    stash = null;
    render();
  };
  form.addEventListener('input', edited);
  form.addEventListener('change', edited);
  render();
  box.state = state;
  return box;
}

// The "Compare scenarios" tab: the saved scenarios side by side.
function compareHtml(list) {
  if (!list.length) return '<p class="placeholder">Save a scenario to compare it.</p>';
  const c = compareScenarios(list);
  return `<div class="table-wrap"><table class="scenario-compare"><thead><tr><th></th>${c.names.map((n) => `<th scope="col">${esc(n)}</th>`).join('')}</tr></thead><tbody>${c.rows.map(([l, ...cells]) => `<tr><th scope="row">${esc(l)}</th>${cells.map((x) => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

// The downsize inputs' notice that the new home is not covered by the sale
// proceeds and new mortgage; empty text hides it.
function showShortfall(form, text, cls = 'shortfall-notice') {
  let note = form.querySelector(`.${cls}`);
  if (!note) {
    note = document.createElement('p');
    note.className = cls;
    note.setAttribute('role', 'status');
    form.querySelector('.group[data-group="If you downsize"] .group-body').append(note);
  }
  note.textContent = text;
  note.hidden = !text;
}

// Inputs the sale-proceeds breakdown reads; it shows once these are all valid.
const DOWNSIZE_INPUTS = ['homeValue', 'sellingCostsPct', 'costBasis', 'exclusion', 'taxRate', 'mortgageBalance', 'newHomePrice', 'newBuyingCostsPct', 'newMortgageAmount', 'movingCosts'];

// The sections last rendered, so a CSV button can find its table.
let shown = [];

// The result tabs, in order. The first five are charts.
const TABS = [
  ['net-worth', 'Net worth'],
  ['pure-net-worth', 'Pure net worth'],
  ['cash-flow', 'Monthly cash flow'],
  ['investable-cash', 'Investable cash'],
  ['cash-needed', 'Cash you must supply'],
  ['cost-summary', 'Cost summary'],
  ['compare', 'Compare scenarios'],
  ['tables', 'Tables'],
];
const ui = { tab: 'net-worth' };

// Shows one tab panel; the chart panels are all shown when printing (see the print CSS).
function selectTab(container, id, focus = false) {
  if (!TABS.some(([t]) => t === id)) id = TABS[0][0];
  ui.tab = id;
  for (const btn of container.querySelectorAll('[role="tab"]')) {
    const on = btn.dataset.tab === id;
    btn.setAttribute('aria-selected', String(on));
    btn.tabIndex = on ? 0 : -1;
    if (on && focus) btn.focus();
  }
  for (const panel of container.querySelectorAll('[role="tabpanel"]')) panel.hidden = panel.dataset.tab !== id;
}

function renderResults(container, form, scenarios) {
  const values = readInputs(form);
  const missing = FIELDS.filter((f) => values[f.id] == null).map((f) => f.label);
  if (values.repairs == null) missing.push('Major repairs (each needs a whole year of 1 or more and a cost)');
  // A new mortgage needs a term; a term of 0 is only tolerated while there is no new mortgage.
  const termInvalid = values.newMortgageAmount > 0 && values.newMortgageTerm != null && values.newMortgageTerm < 1;
  if (termInvalid) missing.push('New mortgage term (years) (at least 1 when there is a new mortgage amount)');
  const waterfall = form.querySelector('.waterfall');
  const downsizeMissing = DOWNSIZE_INPUTS.some((id) => values[id] == null);
  waterfall.innerHTML = downsizeMissing ? '' : downsizeWaterfallHtml(downsizeWaterfall(values));
  // A group header shows a dot while its inputs are invalid or it carries a notice, even when closed.
  const flag = (title, on) => { const dot = form.querySelector(`.group[data-group="${title}"] .group-dot`); if (dot) dot.hidden = !on; };
  for (const g of form.querySelectorAll('.group')) {
    const title = g.dataset.group;
    flag(title, FIELDS.some((f) => (GROUP_TITLES[f.group] ?? f.group) === title && values[f.id] == null) || (title === 'If you downsize' && termInvalid) || (title === 'Major repairs' && values.repairs == null));
  }
  if (missing.length) {
    showShortfall(form, '');
    showShortfall(form, '', 'no-mortgage-notice');
    container.innerHTML = `<p class="placeholder">Enter a valid value for: ${missing.join(', ')}.</p>`;
    shown = [];
    return;
  }
  const { sections, sensitivity, costSummary, shortfallNotice, noMortgageNotice, headline } = buildResults(values);
  shown = sections;
  showShortfall(form, shortfallNotice);
  showShortfall(form, noMortgageNotice, 'no-mortgage-notice');
  if (shortfallNotice) flag('If you downsize', true);
  const changed = changedInputs(values, FIELDS, defaultValues());
  const printSummary = `<section class="print-summary"><h2>Scenario inputs (changed from default)</h2>${changed.length ? `<ul>${changed.map(([l, v]) => `<li>${esc(l)}: ${esc(v)}</li>`).join('')}</ul>` : '<p>All inputs are at their defaults.</p>'}</section>`;
  const chartPanel = (s) => `<section class="result" id="${s.id}"><h2>${s.title}</h2><p>${s.summary}</p>${chartHtml(s)}<details class="chart-table"><summary>Show table</summary>${tableHtml(s)}</details><p class="no-print"><button type="button" data-csv="${s.id}">Download CSV</button></p></section>`;
  const panels = {
    'net-worth': chartPanel(sections[0]),
    'pure-net-worth': chartPanel(sections[4]),
    'cash-flow': chartPanel(sections[1]),
    'investable-cash': chartPanel(sections[2]),
    'cash-needed': chartPanel(sections[3]),
    'cost-summary': costSummaryHtml(costSummary) + sensitivityHtml(sensitivity),
    compare: compareHtml(scenarios.state.list),
    tables: sections.map((s) => `<section class="result"><h2>${s.title}</h2>${tableHtml(s)}<p class="no-print"><button type="button" data-csv="${s.id}">Download CSV</button></p></section>`).join(''),
  };
  const tabs = TABS.map(([id, label]) => `<button type="button" role="tab" class="tab" id="tab-${id}" data-tab="${id}" aria-controls="panel-${id}">${label}</button>`).join('');
  const body = TABS.map(([id]) => `<div role="tabpanel" class="tab-panel${id === 'tables' || (id === 'compare' && !scenarios.state.list.length) ? ' print-skip' : ''}" id="panel-${id}" data-tab="${id}" aria-labelledby="tab-${id}" tabindex="0">${panels[id]}</div>`).join('');
  container.innerHTML = `${headlineHtml(headline)}${printSummary}<div role="tablist" class="tabs" aria-label="Results">${tabs}</div>${body}`;
  sections.forEach((s) => attachHover(container.querySelector(`#${s.id} .chart-wrap`), s));
  selectTab(container, ui.tab);
}

// Saves one section's table as a CSV file.
function downloadCsv(section) {
  const url = URL.createObjectURL(new Blob([tableCsv(section)], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = csvFilename(section);
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Printing ignores the tabs (every chart prints) and leaves out the data
// tables unless the Print button was used with "Include data tables" ticked,
// which marks the body for the duration; the closed <details> are then opened
// around printing and put back afterwards.
function mountPrinting(container) {
  const opened = [];
  window.addEventListener('beforeprint', () => {
    if (!document.body.classList.contains('print-tables')) return;
    container.querySelectorAll('details:not([open])').forEach((d) => { d.open = true; opened.push(d); });
  });
  window.addEventListener('afterprint', () => {
    document.body.classList.remove('print-tables');
    opened.splice(0).forEach((d) => { d.open = false; });
  });
}

// Pointer, touch and keyboard all drive one "active year": a crosshair, a
// ring per line and a card of values.
function attachHover(wrap, section) {
  const points = hoverPoints(section);
  if (!wrap || !points.length) return;
  const svg = wrap.querySelector('svg');
  const g = svg.querySelector('.hover');
  const crosshair = g.querySelector('.crosshair');
  const rings = g.querySelectorAll('.ring');
  const card = wrap.querySelector('.chart-card');
  const live = wrap.querySelector('[aria-live]');
  const width = svg.viewBox.baseVal.width;
  let active = null;

  const hide = () => {
    active = null;
    g.style.display = 'none';
    card.hidden = true;
  };
  const show = (i, announce) => {
    active = i;
    const p = points[i];
    crosshair.setAttribute('x1', p.x);
    crosshair.setAttribute('x2', p.x);
    rings.forEach((r, k) => {
      r.setAttribute('cx', p.x);
      r.setAttribute('cy', p.ys[k]);
    });
    g.style.display = '';
    card.innerHTML = cardHtml(p);
    card.hidden = false;
    const pct = (p.x / width) * 100;
    card.classList.toggle('flip', pct > 50);
    card.style.left = `${pct}%`;
    if (announce) live.textContent = cardText(p);
  };
  const nearest = (clientX) => {
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * width;
    let best = 0;
    points.forEach((p, i) => { if (Math.abs(p.x - x) < Math.abs(points[best].x - x)) best = i; });
    return best;
  };

  wrap.addEventListener('pointermove', (e) => show(nearest(e.clientX), false));
  wrap.addEventListener('pointerdown', (e) => show(nearest(e.clientX), false));
  wrap.addEventListener('pointerleave', hide);
  wrap.addEventListener('keydown', (e) => {
    const last = points.length - 1;
    const next = { ArrowRight: active == null ? 0 : Math.min(last, active + 1), ArrowLeft: active == null ? last : Math.max(0, active - 1), Home: 0, End: last }[e.key];
    if (e.key === 'Escape') hide();
    else if (next != null) {
      e.preventDefault();
      show(next, true);
    }
  });
}

// Keeps the URL fragment and localStorage in step with the form, restores them
// on load (a link beats stored inputs) and adds Copy link / Reset buttons.
function mountSharing(form, update) {
  const box = document.createElement('div');
  box.className = 'share';
  box.innerHTML = `<details class="share-menu"><summary>Share &amp; export</summary><div class="share-items"><button type="button" data-act="copy">Copy link to these inputs</button><button type="button" data-act="reset">Reset to defaults</button><div class="print-options"><label><input type="checkbox" id="print-tables"> Include data tables</label><button type="button" data-act="print">Print&hellip;</button></div></div></details><span class="share-message" role="status"></span>`;
  const message = box.querySelector('.share-message');
  const say = (text) => { message.textContent = text; };

  const restore = (text) => {
    writeInputs(form, decodeInputs(text));
    const tab = new URLSearchParams(String(text).replace(/^[#?]/, '')).get('tab');
    if (tab) ui.tab = tab;
    update();
  };
  let stored = null;
  try { stored = localStorage.getItem(INPUTS_KEY); } catch { /* storage unavailable */ }
  const fromLink = location.hash.length > 1;
  if (fromLink || stored) restore(fromLink ? location.hash : stored);

  const save = () => {
    const values = readInputs(form);
    if (FIELDS.some((f) => values[f.id] == null) || values.repairs == null) return;
    const text = encodeInputs(values);
    try { localStorage.setItem(INPUTS_KEY, text); } catch { /* storage unavailable */ }
    // The tab rides along in the address (not in the stored inputs).
    const params = new URLSearchParams(text);
    if (ui.tab !== TABS[0][0]) params.set('tab', ui.tab);
    const hash = params.toString();
    try { history.replaceState(null, '', hash ? `#${hash}` : location.pathname + location.search); } catch { /* not allowed here */ }
  };
  form.addEventListener('input', save);
  form.addEventListener('change', save);
  window.addEventListener('hashchange', () => { if (location.hash.length > 1) restore(location.hash); });
  save();
  box.save = save;

  box.addEventListener('click', async (e) => {
    const act = e.target.closest('button[data-act]')?.dataset.act;
    if (act === 'copy') {
      save();
      try { await navigator.clipboard.writeText(location.href); say('Link copied.'); } catch { say('Copy failed; copy the address from the browser bar instead.'); }
    } else if (act === 'print') {
      document.body.classList.toggle('print-tables', box.querySelector('#print-tables').checked);
      window.print();
    } else if (act === 'reset') {
      restore('');
      save();
      say('Inputs reset to defaults.');
    }
  });
  return box;
}

if (root) {
  const rail = document.createElement('aside');
  rail.className = 'rail';
  rail.setAttribute('aria-label', 'Inputs and scenarios');
  const main = document.createElement('div');
  main.className = 'results-area';
  const form = renderForm(document.createDocumentFragment());
  const results = document.createElement('div');
  results.id = 'results';
  results.setAttribute('aria-live', 'polite');
  let scenarios;
  const update = () => renderResults(results, form, scenarios);
  scenarios = mountScenarios(form, () => { update(); sharing.save(); });
  results.addEventListener('click', (e) => {
    const tab = e.target.closest('[role="tab"]');
    if (tab) { selectTab(results, tab.dataset.tab); sharing.save(); return; }
    const id = e.target.closest('button[data-csv]')?.dataset.csv;
    const section = shown.find((s) => s.id === id);
    if (section) downloadCsv(section);
  });
  // Arrow keys, Home and End move between tabs.
  results.addEventListener('keydown', (e) => {
    const tab = e.target.closest('[role="tab"]');
    if (!tab) return;
    const ids = TABS.map(([id]) => id);
    const i = ids.indexOf(tab.dataset.tab);
    const next = { ArrowRight: ids[(i + 1) % ids.length], ArrowLeft: ids[(i + ids.length - 1) % ids.length], Home: ids[0], End: ids[ids.length - 1] }[e.key];
    if (!next) return;
    e.preventDefault();
    selectTab(results, next, true);
    sharing.save();
  });
  mountPrinting(results);
  const sharing = mountSharing(form, update);
  // Loading a scenario rewrites the form without form events, so save explicitly.
  const head = document.createElement('div');
  head.className = 'results-head';
  head.append(sharing);
  rail.append(scenarios);
  rail.append(form);
  main.append(head, results);
  root.replaceChildren(rail, main);
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();
}
