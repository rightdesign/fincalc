import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareRentOwn, compareScenarios, rentOwnDefaults } from '../site/rentown.js';

const base = () => rentOwnDefaults();

test('scenarios bracket the expected case and move the three rates together', () => {
  const v = base();
  const [opt, exp, pes] = compareScenarios(v);
  assert.equal(exp.difference, compareRentOwn(v).final.difference);
  assert.equal(exp.breakEven, compareRentOwn(v).breakEven);
  assert.ok(opt.difference > exp.difference && exp.difference > pes.difference);
  assert.ok(opt.breakEven == null ? false : exp.breakEven == null || opt.breakEven <= exp.breakEven);
  assert.ok(pes.breakEven == null || (exp.breakEven != null && pes.breakEven >= exp.breakEven));
  const w = compareScenarios({ ...v, growth: 5 });
  assert.deepEqual(w.map((s) => s.growth), [7, 5, 3]);
  assert.deepEqual(w.map((s) => s.rentGrowth), [4, 3, 2]);
  assert.deepEqual(w.map((s) => s.investment), [4, 5, 6]);
});

test('scenario cases carry a today\'s-dollars gap that matches the basis at 0% inflation', () => {
  const v = { ...rentOwnDefaults(), inflation: 0 };
  for (const s of compareScenarios(v)) assert.equal(s.differenceReal, s.difference);
  const w = { ...rentOwnDefaults(), inflation: 2.5 };
  for (const s of compareScenarios(w)) assert.ok(Math.abs(s.differenceReal) < Math.abs(s.difference) || s.difference === 0);
});
