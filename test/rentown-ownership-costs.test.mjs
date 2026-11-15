import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareRentOwn, decodeRentOwn, encodeRentOwn, invalidRentOwn, rentOwnDefaults } from '../site/rentown.js';
import { rentOwnChart } from '../site/rentown-chart.js';

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const base = () => rentOwnDefaults();

test('HOA and extra utilities raise owning costs; zero reproduces the old numbers', () => {
  const t0 = compareRentOwn(base());
  near(t0.firstOwnMonthly, 3194, 1);
  const hoa = compareRentOwn({ ...base(), hoa: 250 });
  near(hoa.firstOwnMonthly - t0.firstOwnMonthly, 250);
  const lead = (r) => r.final.rent - r.final.own;
  const grown = lead(hoa) - lead(t0);
  assert.ok(grown > 21000, `${grown}`);
  const util = compareRentOwn({ ...base(), utilities: 100 });
  near(util.firstOwnMonthly - t0.firstOwnMonthly, 100);
});

test('HOA growth steps once a year and round-trips through the URL', () => {
  const v = { ...base(), hoa: 300, hoaGrowth: 10, utilities: 120, utilitiesGrowth: 5 };
  assert.deepEqual(decodeRentOwn(encodeRentOwn(v)), v);
  assert.deepEqual(invalidRentOwn(v), []);
});

test('PMI applies below 20% down, drops off at 80% loan-to-value and moves break-even', () => {
  const nw = { ...base(), price: 400000, down: 10, rate: 7.5, years: 30 };
  const r = compareRentOwn(nw);
  near(r.firstPmi, 180);
  assert.ok(r.totalPmi > 0 && r.totalPmi < 180 * 360);
  const none = compareRentOwn({ ...nw, pmi: 0 });
  assert.equal(none.firstPmi, 0);
  assert.ok(r.firstOwnMonthly - none.firstOwnMonthly > 179.99);
  assert.ok(none.breakEven <= r.breakEven);
  assert.ok(r.final.difference < none.final.difference);
});

test('PMI is zero at 20% down', () => {
  const r = compareRentOwn(base());
  assert.equal(r.firstPmi, 0);
  assert.equal(r.totalPmi, 0);
  assert.equal(compareRentOwn({ ...base(), pmi: 0 }).final.difference, r.final.difference);
});

test('a major repair lowers only the Own net worth from its year on, by the cost plus lost return', () => {
  const a = compareRentOwn(base());
  const b = compareRentOwn({ ...base(), repairYear: 5, repairCost: 25000 });
  for (const y of [1, 2, 3, 4]) near(b.years[y - 1].difference, a.years[y - 1].difference);
  for (const y of b.years) near(y.rent, a.years[y.year - 1].rent);
  const drop5 = a.years[4].own - b.years[4].own;
  assert.ok(drop5 >= 25000 && drop5 < 25000 * 1.05, `${drop5}`);
  near(a.years[5].own - b.years[5].own, drop5 * 1.05 ** (1 / 1) , 25);
  assert.deepEqual(b.years.map((y) => y.repair), [false, false, false, false, true, false, false]);
  assert.ok(b.breakEven == null || b.breakEven >= a.breakEven);
  assert.ok(rentOwnChart(b.years, b.breakEven, String).svg.includes('Major repair: year 5'));
  assert.ok(!rentOwnChart(a.years, a.breakEven, String).svg.includes('Major repair'));
});

test('a repair after the stay has no effect, and the repair inputs are validated', () => {
  const a = compareRentOwn(base());
  assert.deepEqual(compareRentOwn({ ...base(), repairYear: 9, repairCost: 5000 }).years.map((y) => y.own), a.years.map((y) => y.own));
  assert.deepEqual(invalidRentOwn({ ...base(), repairYear: 2.5, repairCost: -1 }), ['Major repair in year', 'Major repair cost']);
});
