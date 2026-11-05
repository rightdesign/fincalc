// Entry point for the calculator page. The inputs form mounts into
// #calculator; the page is stateless, so nothing is persisted.
import { FIELDS, defaultHorizon, defaultValues, parseValue } from './inputs.js';

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

if (root) renderForm(root);
