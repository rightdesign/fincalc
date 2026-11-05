// Entry point for the calculator page. The inputs form mounts into
// #calculator; the page is stateless, so nothing is persisted.
import { FIELDS, defaultHorizon, defaultValues, parseValue } from './inputs.js';
import { buildResults, cardHtml, cardText, chartHtml, hoverPoints, tableHtml } from './results.js';

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
  return out;
}

function renderResults(container, form) {
  const values = readInputs(form);
  const missing = FIELDS.filter((f) => values[f.id] == null);
  if (missing.length) {
    container.innerHTML = `<p class="placeholder">Enter a valid value for: ${missing.map((f) => f.label).join(', ')}.</p>`;
    return;
  }
  const { sections } = buildResults(values);
  container.innerHTML = sections.map((s) => `<section class="result" id="${s.id}"><h2>${s.title}</h2><p>${s.summary}</p>${chartHtml(s)}<details><summary>Table</summary>${tableHtml(s)}</details></section>`).join('');
  sections.forEach((s) => attachHover(container.querySelector(`#${s.id} .chart-wrap`), s));
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

if (root) {
  const form = renderForm(root);
  const results = document.createElement('div');
  results.id = 'results';
  results.setAttribute('aria-live', 'polite');
  root.append(results);
  const update = () => renderResults(results, form);
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();
}
