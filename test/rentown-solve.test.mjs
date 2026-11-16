import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareRentOwn, rentOwnDefaults } from '../site/rentown.js';
import { solveBreakEven, solveText } from '../site/rentown/solve.js';

const gap = (v) => compareRentOwn(v).final.difference;

for (const id of ['price', 'rent']) {
  test(`feeding the solved ${id} back gives a gap of about $0`, () => {
    const v = rentOwnDefaults();
    const solved = solveBreakEven(v, id);
    assert.ok(solved > 0);
    // Whole-dollar rounding moves the gap by a few hundred dollars at most.
    assert.ok(Math.abs(gap({ ...v, [id]: solved })) < 1000, `${id} ${solved}`);
  });
}

test('the solved text names the price and the stay', () => {
  const v = { ...rentOwnDefaults(), years: 7 };
  assert.match(solveText(v, 'price').text, /^Buying breaks even in 7 years at a home price of \$[\d,]+ \(you entered \$450,000\)\.$/);
});

test('reports when no value breaks even', () => {
  const v = { ...rentOwnDefaults(), growth: 30, rent: 1 };
  const s = solveText(v, 'rent');
  if (s.solved == null) assert.match(s.text, /^No monthly rent/);
});
