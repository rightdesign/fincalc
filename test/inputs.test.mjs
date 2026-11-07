import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FIELDS, defaultHorizon, defaultValues, parseValue } from '../site/inputs.js';

const REQUIRED = [
  'homeValue', 'costBasis', 'mortgageBalance', 'mortgageRate', 'mortgageTerm', 'propertyTax',
  'insurancePct', 'maintenancePct', 'propertyTaxGrowth', 'insuranceGrowth', 'maintenanceGrowth', 'appreciation', 'sellingCostsPct', 'taxRate', 'exclusion',
  'investmentGrowth', 'investmentWithdrawal', 'rent', 'rentGrowth', 'rentersInsurance', 'horizon',
  'marginalTaxRate', 'standardDeduction', 'saltCap', 'investmentTaxRate', 'withdrawalTaxRate', 'inflation', 'todaysDollars',
];

test('every calculator variable has a field', () => {
  assert.deepEqual(FIELDS.map((f) => f.id).sort(), [...REQUIRED].sort());
});

test('maintenance defaults to 1%', () => {
  assert.equal(defaultValues().maintenancePct, 1);
});

test('horizon defaults to the lesser of 30 years or the remaining mortgage term', () => {
  assert.equal(defaultHorizon(12), 12);
  assert.equal(defaultHorizon(30), 30);
  assert.equal(defaultHorizon(40), 30);
  assert.equal(defaultHorizon(''), 30);
  const values = defaultValues();
  assert.equal(values.horizon, Math.min(30, values.mortgageTerm));
});

test('parseValue reads numbers, rejects blank, negative and junk', () => {
  const money = FIELDS.find((f) => f.id === 'homeValue');
  assert.equal(parseValue(money, '250000'), 250000);
  assert.equal(parseValue(money, ''), null);
  assert.equal(parseValue(money, '-5'), null);
  assert.equal(parseValue(money, 'abc'), null);
  const choice = FIELDS.find((f) => f.id === 'exclusion');
  assert.equal(parseValue(choice, 'married'), 'married');
  assert.equal(parseValue(choice, 'bogus'), null);
});

test('every field has a hint describing it', () => {
  for (const f of FIELDS) assert.ok(typeof f.hint === 'string' && f.hint.length > 20, `${f.id} has a hint`);
});
