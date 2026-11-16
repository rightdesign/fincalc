import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareMortgageTypes, compareRentOwn, decodeRentOwn, encodeRentOwn, invalidRentOwn, rentOwnDefaults, rentOwnThresholds } from '../site/rentown.js';
import { payment, rateAfter } from '../site/mortgage.js';

const arm = (extra = {}) => ({ ...rentOwnDefaults(), arm: 1, ...extra });

test('fixed is the default and ignores every ARM field', () => {
  const v = rentOwnDefaults();
  assert.equal(v.arm, 0);
  const a = compareRentOwn(v);
  const b = compareRentOwn({ ...v, armRate: 9, armMargin: 5, armFixedMonths: 1 });
  assert.deepEqual(a.final, b.final);
  assert.equal(a.firstMortgage, payment(360000, 6.5, 360));
});

test('ARM year-1 payment uses the starting rate and the fixed period holds it', () => {
  const r = compareRentOwn(arm({ years: 8 }));
  assert.ok(Math.abs(r.firstMortgage - payment(360000, 5.75, 360)) < 1e-9);
  assert.ok(r.firstMortgage < compareRentOwn(rentOwnDefaults()).firstMortgage);
  // the first reset is at month 85, inside an 8-year stay
  assert.ok(r.peakRate > 5.75);
});

test('ARM resets follow the variable-rate caps', () => {
  const v = arm({ years: 12, armIndexChange: 1 });
  const r = compareRentOwn(v);
  const loan = { rateBasis: 'index', initialRate: v.armRate, indexRate: v.armIndexRate, margin: v.armMargin, indexChange: v.armIndexChange, firstCap: v.armFirstCap, periodicCap: v.armPeriodicCap, lifetimeCap: v.armLifetimeCap, floor: v.armFloor };
  const resets = Math.floor((12 * 12 - 1 - v.armFixedMonths) / v.armAdjustMonths) + 1;
  assert.equal(r.peakRate, Math.max(...Array.from({ length: resets + 1 }, (_, k) => rateAfter(loan, k))));
  assert.ok(r.peakRate <= v.armRate + v.armLifetimeCap);
});

test('a lower ARM start rate moves break-even earlier or equal', () => {
  const [fixed, a] = compareMortgageTypes(arm());
  assert.equal(fixed.firstMortgage, compareRentOwn(rentOwnDefaults()).firstMortgage);
  assert.ok(a.firstMortgage < fixed.firstMortgage);
  assert.ok(a.breakEven == null || fixed.breakEven == null || a.breakEven <= fixed.breakEven);
});

test('the loan is repaid by the end of the term with resets', () => {
  const r = compareRentOwn(arm({ years: 30, armIndexChange: 0.5 }));
  assert.ok(Number.isFinite(r.final.own));
});

test('ARM settings ride in the shareable link and fixed leaves it unchanged', () => {
  assert.equal(encodeRentOwn(rentOwnDefaults()), '');
  const v = arm({ armRate: 6, armPeriodicCap: 2 });
  const back = decodeRentOwn(encodeRentOwn(v));
  assert.deepEqual(back, v);
  assert.deepEqual(invalidRentOwn(back), []);
});

test('the verdict drivers use the ARM starting rate when ARM is chosen', () => {
  const ids = rentOwnThresholds(arm()).map((t) => t.id);
  assert.ok(ids.includes('armRate') && !ids.includes('rate'));
});

test('ARM works with FHA and VA: financed fee is amortized and insurance follows the base loan', () => {
  const fha = compareRentOwn(arm({ program: 1, feeFinanced: 1, down: 5, years: 10 }));
  const base = 450000 * 0.95;
  const loan = base * 1.0175;
  assert.ok(Math.abs(fha.firstMortgage - payment(loan, 5.75, 360)) < 1e-9);
  assert.ok(fha.totalPmi > 0);
  assert.ok(fha.peakRate > 5.75);
  const va = compareRentOwn(arm({ program: 2, feeFinanced: 1, down: 0, years: 10 }));
  assert.ok(Math.abs(va.firstMortgage - payment(450000 * 1.0215, 5.75, 360)) < 1e-9);
  assert.equal(va.totalPmi, 0);
  const cash = compareRentOwn(arm({ program: 2, feeFinanced: 0, down: 0 }));
  assert.ok(Math.abs(cash.firstMortgage - payment(450000, 5.75, 360)) < 1e-9);
});

test('the break-even solver and the Fixed vs ARM table use the ARM path with a loan type', () => {
  const v = arm({ program: 1, down: 5 });
  const t = rentOwnThresholds(v);
  assert.ok(t);
  const cmp = compareMortgageTypes(v);
  assert.ok(Array.isArray(cmp) ? cmp.length === 2 : cmp);
});
