import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RENTOWN_FIELDS, compareRentOwn, decodeBasis, decodeRentOwn, encodeRentOwn, invalidRentOwn, rentOwnDefaults } from '../site/rentown.js';

const base = () => rentOwnDefaults();

test('inputs round-trip through the URL fragment, writing only changes', () => {
  const v = { ...base(), price: 500000, rate: 5.75 };
  const text = encodeRentOwn(v);
  assert.equal(text, 'price=500000&rate=5.75');
  assert.deepEqual(decodeRentOwn(`#${text}`), v);
  assert.deepEqual(decodeRentOwn('price=abc&years=0&bogus=1'), base());
  assert.equal(RENTOWN_FIELDS.length, Object.keys(base()).length);
});

test('the dollar basis round-trips through the fragment', () => {
  assert.equal(decodeBasis(encodeRentOwn(base(), 'today')), 'today');
  assert.equal(decodeBasis(encodeRentOwn(base())), 'future');
  assert.equal(decodeBasis('dollars=bogus'), 'future');
});

test('every input survives the link round trip and reproduces the same headline', () => {
  const changed = Object.fromEntries(RENTOWN_FIELDS.map((f) => {
    const alt = f.integer ? (f.value === 0 ? 2 : f.value + 1) : (f.value ?? 1000) + 1;
    const pick = f.max != null && alt > f.max ? f.max - 1 : alt;
    return [f.id, pick === f.value ? f.max : pick];
  }));
  assert.deepEqual(invalidRentOwn(changed), []);
  const text = encodeRentOwn(changed);
  assert.equal(new URLSearchParams(text).size, RENTOWN_FIELDS.length);
  assert.deepEqual(decodeRentOwn(`#${text}`), changed);
  const t0 = { ...base(), rent: 2000, growth: 4 };
  const back = decodeRentOwn(encodeRentOwn(t0));
  assert.equal(Math.round(compareRentOwn(back).final.difference), Math.round(compareRentOwn(t0).final.difference));
  assert.equal(Math.round(compareRentOwn(base()).final.difference), -12002);
  assert.equal(decodeBasis(`#${encodeRentOwn(changed, 'today')}`), 'today');
  assert.equal(decodeBasis(`#${encodeRentOwn(changed)}`), 'future');
  assert.deepEqual(decodeRentOwn(`#${encodeRentOwn(changed, 'today')}`), changed);
});
