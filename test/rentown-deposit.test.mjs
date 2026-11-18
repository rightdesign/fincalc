import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareRentOwn, decodeRentOwn, encodeRentOwn, invalidRentOwn, rentOwnDefaults } from '../site/rentown.js';

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const base = () => rentOwnDefaults();

test('a $0 deposit leaves the T0 gap at $12,002; the default is one month\'s rent', () => {
  near(compareRentOwn({ ...base(), deposit: 0 }).final.difference, -12001.84, 0.5);
  const dflt = compareRentOwn(base());
  const explicit = compareRentOwn({ ...base(), deposit: 2300 });
  near(dflt.final.difference, explicit.final.difference);
  assert.equal(dflt.cash.deposit, 2300);
});

test('the deposit moves the gap by its forgone return, untaxed 2300 x (1.05^7 - 1) = $936', () => {
  const untaxed = { investDrag: 0, capGains: 0 };
  const gap = (deposit) => -compareRentOwn({ ...base(), ...untaxed, deposit }).final.difference;
  near(gap(0) - gap(2300), 936.33, 0.01);
  // with the default tax drag and capital gains tax the forgone return is smaller
  const taxed = (deposit) => -compareRentOwn({ ...base(), deposit }).final.difference;
  const moved = taxed(0) - taxed(2300);
  assert.ok(moved > 600 && moved < 936);
});

test('the deposit is returned in full when there is no investment return', () => {
  const zero = { investment: 0, investDrag: 0, capGains: 0 };
  near(compareRentOwn({ ...base(), ...zero, deposit: 5000 }).final.difference, compareRentOwn({ ...base(), ...zero, deposit: 0 }).final.difference);
});

test('the deposit shows in the first month and the waterfall still adds up', () => {
  const r = compareRentOwn(base());
  near(r.monthly[0].deposit, 2300);
  assert.equal(r.monthly[1].deposit, 0);
  const w = r.waterfall;
  near(w.upfront.total + w.recurring.total + w.opportunity.total - w.moneyBack.total, -r.final.difference);
  near(w.opportunity.upfront + w.opportunity.monthly, w.opportunity.total);
});

test('deposit is optional, must be valid when given, and round-trips through the link', () => {
  assert.deepEqual(invalidRentOwn({ ...base(), deposit: -1 }), ["Security deposit"]);
  assert.deepEqual(invalidRentOwn({ ...base(), deposit: 0 }), []);
  assert.equal(decodeRentOwn(encodeRentOwn({ ...base(), deposit: 0 })).deposit, 0);
  assert.equal(decodeRentOwn(encodeRentOwn({ ...base(), deposit: 1500 })).deposit, 1500);
  assert.equal(decodeRentOwn('').deposit, null);
});
