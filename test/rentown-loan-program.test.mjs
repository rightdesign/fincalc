import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  compareRentOwn,
  decodeRentOwn,
  encodeRentOwn,
  invalidRentOwn,
  rentOwnDefaults,
} from '../site/rentown.js';

const t0 = (extra) => ({ ...rentOwnDefaults(), price: 450000, down: 3, ...extra });
const round = (n) => Math.round(n);

test('conventional is the default and unchanged by the new inputs', () => {
  const d = rentOwnDefaults();
  assert.equal(d.program, 0);
  const a = compareRentOwn(t0({}));
  const b = compareRentOwn(t0({ feeFinanced: 0, vaRepeat: 1 }));
  assert.equal(a.final.difference, b.final.difference);
  assert.equal(a.program.fee, 0);
  assert.equal(round(a.firstPmi * 12), 2619);
});

test('FHA at 3% down on $450,000: $7,639 upfront and $2,401 a year of insurance', () => {
  const r = compareRentOwn(t0({ program: 1, feeFinanced: 0 }));
  assert.equal(round(r.program.fee), 7639);
  assert.equal(round(r.firstPmi * 12), 2401);
  assert.equal(round(r.totalPmi), round(2400.75 * 7));
  assert.equal(round(r.cash.fee), 7639);
  assert.equal(round(r.cash.total - compareRentOwn(t0({})).cash.total), 7639);
});

test('FHA costs about $6,000 more than conventional over the stay', () => {
  const fha = compareRentOwn(t0({ program: 1, feeFinanced: 0 }));
  const conv = compareRentOwn(t0({}));
  const cost = (r) => r.program.fee + r.totalPmi;
  assert.ok(cost(fha) - cost(conv) > 5000 && cost(fha) - cost(conv) < 7000);
});

test('FHA insurance does not drop at 80%; it ends after 11 years when the loan is 90% or less', () => {
  const high = compareRentOwn(t0({ program: 1, years: 15 }));
  assert.ok(high.monthly[high.monthly.length - 1].pmi > 0);
  const low = compareRentOwn(t0({ program: 1, down: 10, years: 15 }));
  assert.ok(low.monthly[10].pmi > 0);
  assert.equal(low.monthly[11].pmi, 0);
});

test('a financed fee raises the loan and leaves cash alone', () => {
  const financed = compareRentOwn(t0({ program: 1, feeFinanced: 1 }));
  assert.equal(financed.cash.fee, 0);
  assert.ok(financed.program.financed);
  assert.ok(
    financed.firstOwnMonthly > compareRentOwn(t0({ program: 1, feeFinanced: 0 })).firstOwnMonthly,
  );
});

test('VA has no monthly insurance and a funding fee by use and down payment', () => {
  const first = compareRentOwn(t0({ program: 2, down: 0, feeFinanced: 0 }));
  assert.equal(first.firstPmi, 0);
  assert.equal(first.totalPmi, 0);
  assert.equal(round(first.program.fee), round(450000 * 0.0215));
  assert.equal(
    round(compareRentOwn(t0({ program: 2, down: 0, vaRepeat: 1 })).program.fee),
    round(450000 * 0.033),
  );
  assert.equal(
    round(compareRentOwn(t0({ program: 2, down: 10 })).program.fee),
    round(405000 * 0.0125),
  );
});

test('the loan type and fee choices are valid inputs and survive a link', () => {
  const v = t0({ program: 1, feeFinanced: 0 });
  assert.deepEqual(invalidRentOwn(v), []);
  assert.ok(invalidRentOwn({ ...v, program: 3 }).length > 0);
  const back = decodeRentOwn(encodeRentOwn(v));
  assert.equal(back.program, 1);
  assert.equal(back.feeFinanced, 0);
});

test('the cost waterfall still adds up with an FHA or VA fee', () => {
  for (const extra of [
    { program: 1, feeFinanced: 0 },
    { program: 1 },
    { program: 2, down: 0, feeFinanced: 0 },
  ]) {
    const r = compareRentOwn(t0(extra));
    assert.ok(Math.abs(r.waterfall.gap + r.final.difference) < 0.01, JSON.stringify(extra));
  }
});
