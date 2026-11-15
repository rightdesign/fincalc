import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareRentOwn, rentOwnDefaults } from '../site/rentown.js';

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const base = () => rentOwnDefaults();

test('taxing the renter\'s investments narrows the renting lead', () => {
  const lead = (extra) => -compareRentOwn({ ...base(), ...extra }).final.difference;
  const untaxed = lead({ investDrag: 0, capGains: 0 });
  assert.ok(lead({ investDrag: 1, capGains: 0 }) < untaxed);
  assert.ok(lead({ investDrag: 0, capGains: 15 }) < untaxed);
});

test('with no investment return there is no investment tax', () => {
  const r = compareRentOwn({ ...base(), investment: 0, investDrag: 1, capGains: 50 });
  const none = compareRentOwn({ ...base(), investment: 0, investDrag: 0, capGains: 0 });
  near(r.final.dragPaid, 0);
  near(r.final.saleTax, 0);
  near(r.final.difference, none.final.difference);
  near(compareRentOwn({ ...base(), investment: 0 }).afterTaxReturn, 0);
});

test('tax on investments is reported and the after-tax return shows the drag', () => {
  const r = compareRentOwn(base());
  assert.ok(r.final.dragPaid > 0 && r.final.saleTax > 0);
  near(r.afterTaxReturn, 4.3, 1e-9);
});
