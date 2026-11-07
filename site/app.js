// Entry point for the calculator page. The inputs form mounts into
// #calculator. Saved scenarios and the current inputs are kept in this
// browser's localStorage; the current inputs are also mirrored into the URL
// fragment so the page can be bookmarked and shared.
import { FIELDS, defaultHorizon, defaultValues, parseRepairs, parseValue } from './inputs.js';
import { MAX_SCENARIOS, STORAGE_KEY, addScenario, compareScenarios, parseStored, removeScenario } from './scenarios.js';
import { csvFilename, tableCsv } from './export.js';
import { INPUTS_KEY, decodeInputs, encodeInputs } from './share.js';
import { buildResults, sensitivityHtml, costSummaryHtml, cardHtml, cardText, chartHtml, hoverPoints, tableHtml } from './results.js';

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
    const hint = document.createElement('span');
    hint.className = 'hint';
    hint.tabIndex = 0;
    hint.textContent = '?';
    hint.setAttribute('role', 'note');
    hint.setAttribute('aria-label', field.hint);
    const tip = document.createElement('span');
    tip.className = 'hint-text';
    tip.textContent = field.hint;
    hint.append(tip);
    text.append(' ', hint);
  }
  label.append(text, input);
  return label;
}

// Optional one-time repairs on the stay path: rows of year + amount that the
// user adds and removes. Rows live in the DOM (.repair-row) and are read by
// readInputs.
function renderRepairs() {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'repairs';
  const legend = document.createElement('legend');
  legend.textContent = 'Major repairs';
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
  fieldset.append(legend, note, list, add);
  return fieldset;
}

function renderForm(container) {
  const values = defaultValues();
  const form = document.createElement('form');
  form.id = 'inputs';
  form.noValidate = true;
  form.addEventListener('submit', (e) => e.preventDefault());

  let fieldset = null;
  let group = null;
  for (const field of FIELDS) {
    if (field.group !== group) {
      group = field.group;
      fieldset = document.createElement('fieldset');
      const legend = document.createElement('legend');
      legend.textContent = group;
      fieldset.append(legend);
      form.append(fieldset);
    }
    fieldset.append(renderField(field, values[field.id]));
  }

  form.append(renderRepairs());

  // The horizon follows the mortgage term until the user sets it themselves.
  const term = form.elements.mortgageTerm;
  const horizon = form.elements.horizon;
  let horizonEdited = false;
  horizon.addEventListener('input', () => { horizonEdited = true; });
  term.addEventListener('input', () => {
    if (!horizonEdited) horizon.value = defaultHorizon(term.value);
  });

  container.replaceChildren(form);
  return form;
}

// Current form contents as numbers (null where blank or invalid).
export function readInputs(form) {
  const out = {};
  for (const field of FIELDS) out[field.id] = parseValue(field, form.elements[field.id].value);
  const rows = [...form.querySelectorAll('.repair-row')].map((r) => ({
    year: r.querySelector('[name="repair-year"]').value,
    amount: r.querySelector('[name="repair-amount"]').value,
  }));
  out.repairs = parseRepairs(rows);
  return out;
}

// Writes saved values back into the form (the inverse of readInputs).
function writeInputs(form, values) {
  for (const field of FIELDS) if (values[field.id] != null) form.elements[field.id].value = values[field.id];
  form.querySelectorAll('.repair-row').forEach((r) => r.remove());
  const add = form.querySelector('.repairs > button');
  for (const rep of values.repairs ?? []) {
    add.click();
    const rows = form.querySelectorAll('.repair-row');
    const row = rows[rows.length - 1];
    row.querySelector('[name="repair-year"]').value = rep.year;
    row.querySelector('[name="repair-amount"]').value = rep.amount;
  }
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Save/load/remove named scenarios and a comparison table of their verdicts.
function mountScenarios(form, update) {
  const box = document.createElement('section');
  box.className = 'scenarios';
  let list = [];
  try { list = parseStored(localStorage.getItem(STORAGE_KEY)); } catch { /* storage unavailable */ }
  const persist = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* storage unavailable */ } };

  const render = (message = '') => {
    const comparison = list.length ? compareScenarios(list) : null;
    box.innerHTML = `<h2>Scenarios</h2>
      <p class="hint-note">Save up to ${MAX_SCENARIOS} named variants of your inputs (for example base, optimistic and pessimistic) and compare their verdicts side by side. They are stored only in this browser.</p>
      <div class="scenario-save"><label class="field"><span>Scenario name</span><input type="text" name="scenario-name" maxlength="40"></label><button type="button" data-act="save">Save current inputs</button></div>
      <p class="scenario-message" role="status">${esc(message)}</p>
      <ul class="scenario-list">${list.map((s) => `<li>${esc(s.name)} <button type="button" data-act="load" data-name="${esc(s.name)}">Load</button> <button type="button" data-act="remove" data-name="${esc(s.name)}">Remove</button></li>`).join('')}</ul>
      ${comparison ? `<div class="table-wrap"><table class="scenario-compare"><thead><tr><th></th>${comparison.names.map((n) => `<th scope="col">${esc(n)}</th>`).join('')}</tr></thead><tbody>${comparison.rows.map(([l, ...c]) => `<tr><th scope="row">${esc(l)}</th>${c.map((x) => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''}`;
  };
  box.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const { act, name } = btn.dataset;
    if (act === 'save') {
      const values = readInputs(form);
      const missing = FIELDS.some((f) => values[f.id] == null) || values.repairs == null;
      if (missing) return render('Fix the inputs before saving; some values are missing or invalid.');
      const next = addScenario(list, box.querySelector('[name="scenario-name"]').value, values);
      if (next.error) return render(next.error);
      list = next;
      persist();
      render('Scenario saved.');
    } else if (act === 'load') {
      const s = list.find((x) => x.name === name);
      if (s) { writeInputs(form, s.values); update(); }
    } else if (act === 'remove') {
      list = removeScenario(list, name);
      persist();
      render();
    }
  });
  render();
  return box;
}

// The sections last rendered, so a CSV button can find its table.
let shown = [];

function renderResults(container, form) {
  const values = readInputs(form);
  const missing = FIELDS.filter((f) => values[f.id] == null).map((f) => f.label);
  if (values.repairs == null) missing.push('Major repairs (each needs a whole year of 1 or more and a cost)');
  if (missing.length) {
    container.innerHTML = `<p class="placeholder">Enter a valid value for: ${missing.join(', ')}.</p>`;
    shown = [];
    return;
  }
  const { sections, sensitivity, costSummary } = buildResults(values);
  shown = sections;
  container.innerHTML = costSummaryHtml(costSummary) + sections.map((s) => `<section class="result" id="${s.id}"><h2>${s.title}</h2><p>${s.summary}</p>${chartHtml(s)}<details><summary>Table</summary>${tableHtml(s)}</details><p class="no-print"><button type="button" data-csv="${s.id}">Download table as CSV</button></p></section>`).join('') + sensitivityHtml(sensitivity);
  sections.forEach((s) => attachHover(container.querySelector(`#${s.id} .chart-wrap`), s));
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

// Every table is printed, so closed <details> are opened around printing and
// put back afterwards.
function mountPrinting(container) {
  const opened = [];
  window.addEventListener('beforeprint', () => {
    container.querySelectorAll('details:not([open])').forEach((d) => { d.open = true; opened.push(d); });
  });
  window.addEventListener('afterprint', () => {
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
  box.innerHTML = `<button type="button" data-act="copy">Copy link to these inputs</button> <button type="button" data-act="reset">Reset to defaults</button> <button type="button" data-act="print">Print or save as PDF</button> <span class="share-message" role="status"></span>`;
  const message = box.querySelector('.share-message');
  const say = (text) => { message.textContent = text; };

  const restore = (text) => {
    writeInputs(form, decodeInputs(text));
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
    try { history.replaceState(null, '', text ? `#${text}` : location.pathname + location.search); } catch { /* not allowed here */ }
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
  const form = renderForm(root);
  const results = document.createElement('div');
  results.id = 'results';
  results.setAttribute('aria-live', 'polite');
  const update = () => renderResults(results, form);
  results.addEventListener('click', (e) => {
    const id = e.target.closest('button[data-csv]')?.dataset.csv;
    const section = shown.find((s) => s.id === id);
    if (section) downloadCsv(section);
  });
  mountPrinting(results);
  const sharing = mountSharing(form, update);
  // Loading a scenario rewrites the form without form events, so save explicitly.
  root.append(sharing, mountScenarios(form, () => { update(); sharing.save(); }), results);
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();
}
