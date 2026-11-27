import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareRentOwn, rentOwnDefaults } from '../site/rentown.js';

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const base = () => rentOwnDefaults();

test('monthly breakdown: year 1 components sum to the monthly cost and principal is split out', () => {
  const r = compareRentOwn(base());
  const m = r.monthly[0];
  assert.equal(r.monthly.length, 7);
  near(m.ownTotal, r.firstOwnMonthly);
  near(m.ownTotal, 3194, 1);
  assert.ok(m.interest > 1940 && m.interest < 1960);
  assert.ok(m.principal > 320 && m.principal < 330);
  near(m.interest + m.principal, 2275.3, 0.5);
  near(m.ownCost, m.ownTotal - m.principal);
  near(m.rentTotal, r.firstRentMonthly);
  near(m.rent, 2300);
  assert.ok(r.monthly[6].principal > m.principal && r.monthly[6].interest < m.interest);
});

test('monthly breakdown: displayed components sum to the displayed totals in every year', async () => {
  const { monthlyCard } = await import('../site/rentown/monthly.js');
  const n = (t) => Number(t.replace(/[^0-9.-]/g, ''));
  for (const down of [3, 10, 20]) {
    const r = compareRentOwn({ ...base(), down });
    for (const tbl of monthlyCard({ r }).split('<table').slice(1)) {
      const rows = [...tbl.matchAll(/<th scope="row">([^<]*)<\/th><td>(?:<strong>)?([^<]*)/g)].map(
        (x) => [x[1].replace(/&rsquo;/g, "'"), n(x[2])],
      );
      const at = rows.findIndex((x) => x[0] === 'Total to own');
      const own = rows.slice(0, at);
      assert.equal(
        own.reduce((a, x) => a + x[1], 0),
        rows[at][1],
      );
      assert.equal(
        own.filter((x) => !x[0].startsWith('Mortgage principal')).reduce((a, x) => a + x[1], 0),
        rows[at + 1][1],
      );
    }
  }
});
