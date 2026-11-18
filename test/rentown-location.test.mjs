import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { LOCATION_FIELDS, locationDefaults, parseStateTax, parseZip, stateForZip } from '../site/rentown/location.js';
import { rentOwnDefaults } from '../site/rentown.js';

const table = parseStateTax(JSON.parse(readFileSync(new URL('../site/data/state-property-tax.json', import.meta.url), 'utf8')));

test('the shipped table is usable and covers 50 states and DC', () => {
  assert.ok(table);
  assert.equal(Object.keys(table.taxRate).length, 51);
});

test('bad tables are refused', () => {
  for (const bad of [null, 'x', {}, { taxRate: {} }, { taxRate: { Texas: '1.6' } }, { taxRate: { Texas: 3 } }]) assert.equal(parseStateTax(bad), null);
});

test('ZIP codes parse as five digits, with or without the +4', () => {
  assert.equal(parseZip(' 94103 '), '94103');
  assert.equal(parseZip('94103-1234'), '94103');
  for (const bad of ['', '9410', '941030', 'abcde', '94 103', null]) assert.equal(parseZip(bad), null);
});

test('prefixes map to states', () => {
  const cases = { '10001': 'New York', '00501': 'New York', '90210': 'California', '94103': 'California', '60601': 'Illinois', '75001': 'Texas', '79901': 'Texas', '88510': 'Texas', '73301': 'Texas', '73008': 'Oklahoma', '20001': 'District of Columbia', '20166': 'Virginia', '20850': 'Maryland', '33101': 'Florida', '30301': 'Georgia', '39901': 'Georgia', '96801': 'Hawaii', '99501': 'Alaska', '02108': 'Massachusetts', '03801': 'New Hampshire', '98101': 'Washington' };
  for (const [zip, state] of Object.entries(cases)) assert.equal(stateForZip(zip), state, zip);
});

test('every mapped state has a rate in the table', () => {
  for (let n = 0; n < 1000; n += 1) {
    const state = stateForZip(String(n).padStart(3, '0') + '01');
    if (state) assert.ok(typeof table.taxRate[state] === 'number', state);
  }
});

test('military, territory and unassigned prefixes have no state', () => {
  for (const zip of ['09001', '00601', '96201', '34001', '96401', '00001']) assert.equal(stateForZip(zip), null, zip);
});

test('a ZIP sets only the property tax, as a percent, and names its source', () => {
  const d = locationDefaults('94103', table);
  assert.deepEqual(Object.keys(d.values), LOCATION_FIELDS);
  assert.deepEqual(LOCATION_FIELDS, ['tax']);
  assert.equal(d.values.tax, 0.7);
  assert.equal(d.state, 'California');
  assert.match(d.source, /Tax Foundation, 2024/);
});

test('an unknown or invalid ZIP gives nothing, so the national defaults stay', () => {
  for (const zip of ['09001', 'nope', '', '123']) assert.equal(locationDefaults(zip, table), null);
  assert.equal(locationDefaults('94103', null), null);
  assert.deepEqual([rentOwnDefaults().tax, rentOwnDefaults().insurance, rentOwnDefaults().rentGrowth], [1.1, 0.35, 3]);
});
