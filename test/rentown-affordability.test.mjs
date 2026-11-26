import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareRentOwn, decodeRentOwn, encodeRentOwn, invalidRentOwn, rentOwnDefaults } from '../site/rentown.js';
import { payment } from '../site/mortgage.js';
import { affordability, affordabilityCard } from '../site/rentown/affordability.js';
import { renderCards } from '../site/rentown/cards.js';
import { buildContext } from '../site/rentown/context.js';

const base = () => rentOwnDefaults();

test('no take-home pay: a prompt, no verdict', () => {
  const v = base();
  assert.equal(affordability(v, compareRentOwn(v)), null);
  assert.match(affordabilityCard(buildContext(v, 'future')), /Enter your after-tax salary/);
});

test('housing share is P&I, tax, insurance, PMI and HOA over take-home pay, flagged above 25%', () => {
  const v = { ...base(), hoa: 300, takeHome: 60000 };
  const r = compareRentOwn(v);
  const m = r.monthly[0];
  const a = affordability(v, r);
  const pi = Math.round(payment(r.program.loan, v.rate, 15 * 12));
  const sum = pi + [m.tax, m.insurance, m.pmi, m.hoa].map(Math.round).reduce((x, y) => x + y);
  assert.equal(a.housing, sum);
  assert.equal(a.termYears, 15);
  assert.equal(a.over, a.share > 25);
  assert.equal(affordability({ ...v, takeHome: 1e6 }, r).over, false);
  assert.match(affordabilityCard(buildContext({ ...v, takeHome: 12000 }, 'future')), /Over the 25% guideline/);
  assert.match(affordabilityCard(buildContext({ ...v, takeHome: 1e6 }, 'future')), /Within the 25% guideline/);
});

test('the card carries Ramsey context and shows in the results', () => {
  const html = renderCards(buildContext({ ...base(), takeHome: 96000 }, 'future'));
  assert.match(html, /15-year fixed-rate mortgage with 20% down/);
  assert.match(html, /3&ndash;4% for closing costs/);
});

test('the after-tax salary is optional, validated when given and kept in the link', () => {
  assert.deepEqual(invalidRentOwn(base()), []);
  assert.equal(invalidRentOwn({ ...base(), takeHome: -1 }).length, 1);
  assert.equal(decodeRentOwn(encodeRentOwn({ ...base(), takeHome: 84000 })).takeHome, 84000);
  assert.equal(decodeRentOwn('').takeHome, null);
});

test('a 30-year loan is tested on its 15-year payment; a shorter term is used as entered', () => {
  const v = { ...base(), takeHome: 60000 };
  const r = compareRentOwn(v);
  assert.ok(affordability(v, r).housing > Math.round(r.monthly[0].principal + r.monthly[0].interest + r.monthly[0].tax + r.monthly[0].insurance + r.monthly[0].pmi + r.monthly[0].hoa));
  const short = { ...v, term: 10 };
  assert.equal(affordability(short, compareRentOwn(short)).termYears, 10);
});
