import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeInputs, encodeInputs } from '../site/share.js';
import { defaultValues } from '../site/inputs.js';

test('default inputs encode to an empty string and decode back to defaults', () => {
  const v = { ...defaultValues(), repairs: [] };
  assert.equal(encodeInputs(v), '');
  assert.deepEqual(decodeInputs(''), v);
});

test('changed values round-trip, including choices and repairs', () => {
  const v = { ...defaultValues(), homeValue: 650000, exclusion: 'married', mortgageTerm: 10, horizon: 20, repairs: [{ year: 3, amount: 12000 }, { year: 8, amount: 5500.5 }] };
  const text = encodeInputs(v);
  assert.match(text, /homeValue=650000/);
  assert.deepEqual(decodeInputs(`#${text}`), v);
});

test('horizon follows the mortgage term unless it was changed', () => {
  const v = { ...defaultValues(), mortgageTerm: 12, horizon: 12, repairs: [] };
  assert.ok(!encodeInputs(v).includes('horizon'));
  assert.equal(decodeInputs(encodeInputs(v)).horizon, 12);
});

test('invalid, unknown and malicious entries fall back to defaults', () => {
  const d = defaultValues();
  const v = decodeInputs('homeValue=abc&rent=-5&exclusion=bogus&unknown=1&repairs=0:5,x:y&__proto__=1');
  assert.equal(v.homeValue, d.homeValue);
  assert.equal(v.rent, d.rent);
  assert.equal(v.exclusion, d.exclusion);
  assert.deepEqual(v.repairs, []);
});

test('garbage input does not throw', () => {
  assert.doesNotThrow(() => decodeInputs('%E0%A4%A'));
  assert.doesNotThrow(() => decodeInputs(null));
});

test('useProceeds defaults to checked and round-trips when unchecked', () => {
  assert.equal(defaultValues().useProceeds, 1);
  assert.equal(decodeInputs('').useProceeds, 1);
  assert.equal(encodeInputs(defaultValues()), '');
  const off = { ...defaultValues(), useProceeds: 0 };
  assert.match(encodeInputs(off), /useProceeds=0/);
  assert.equal(decodeInputs(encodeInputs(off)).useProceeds, 0);
  assert.equal(decodeInputs('useProceeds=junk').useProceeds, 1);
});

test('the proceeds cap defaults to as much as needed and round-trips', () => {
  assert.equal(defaultValues().proceedsMode, 'all');
  const capped = { ...defaultValues(), proceedsMode: 'amount', proceedsAmount: 500000 };
  assert.match(encodeInputs(capped), /proceedsMode=amount/);
  const back = decodeInputs(encodeInputs(capped));
  assert.equal(back.proceedsMode, 'amount');
  assert.equal(back.proceedsAmount, 500000);
  assert.equal(decodeInputs('proceedsMode=junk').proceedsMode, 'all');
});
