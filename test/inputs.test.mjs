import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FIELDS, defaultHorizon, defaultValues, parseRepairs, parseValue } from '../site/inputs.js';

const REQUIRED = [
  'homeValue', 'costBasis', 'mortgageBalance', 'mortgageRate', 'mortgageTerm', 'propertyTax',
  'insurancePct', 'maintenancePct', 'propertyTaxGrowth', 'insuranceGrowth', 'maintenanceGrowth', 'appreciation', 'sellingCostsPct', 'taxRate', 'exclusion',
  'investmentGrowth', 'investmentWithdrawal', 'rent', 'rentGrowth', 'rentersInsurance', 'horizon',
  'marginalTaxRate', 'standardDeduction', 'saltCap', 'investmentTaxRate', 'withdrawalTaxRate', 'inflation', 'todaysDollars', 'hoaMonthly', 'hoaGrowth', 'movingCosts', 'rentalUpfront', 'useProceeds', 'proceedsMode', 'proceedsAmount', 'proceedsPercent',
  'newHomePrice', 'newBuyingCostsPct', 'newMortgageAmount', 'newMortgageRate', 'newMortgageTerm', 'newPropertyTax', 'newInsurancePct', 'newMaintenancePct', 'newHoaMonthly',
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

test('parseRepairs skips blank rows and rejects incomplete or invalid ones', () => {
  assert.deepEqual(parseRepairs([]), []);
  assert.deepEqual(parseRepairs([{ year: '', amount: '' }, { year: '5', amount: '15000' }]), [{ year: 5, amount: 15000 }]);
  assert.equal(parseRepairs([{ year: '5', amount: '' }]), null);
  assert.equal(parseRepairs([{ year: '', amount: '100' }]), null);
  assert.equal(parseRepairs([{ year: '0', amount: '100' }]), null);
  assert.equal(parseRepairs([{ year: '2.5', amount: '100' }]), null);
  assert.equal(parseRepairs([{ year: '2', amount: '-1' }]), null);
});

test('the key drivers carry a slider range that contains their default', () => {
  const sliders = FIELDS.filter((f) => f.slider);
  assert.deepEqual(sliders.map((f) => f.id).sort(), ['appreciation', 'homeValue', 'investmentGrowth', 'rent', 'rentGrowth']);
  for (const f of sliders) {
    assert.ok(f.slider.min < f.slider.max && f.slider.step > 0, f.id);
    assert.ok(f.default >= f.slider.min && f.default <= f.slider.max, `${f.id} default within range`);
    assert.equal(f.kind === 'choice', false);
  }
});
