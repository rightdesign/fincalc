import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareRentOwn, rentOwnDefaults } from '../site/rentown.js';

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const base = () => rentOwnDefaults();

test('cost waterfall: the buckets sum to the headline gap', () => {
  for (const extra of [{}, { hoa: 300, utilities: 150, moving: 4000 }, { years: 15, down: 5 }, { growth: -5, investment: 8 }, { selling: 0 }]) {
    const r = compareRentOwn({ ...base(), ...extra });
    const w = r.waterfall;
    near(w.upfront.total + w.recurring.total + w.opportunity.total - w.moneyBack.total, -r.final.difference);
    near(w.gap, -r.final.difference);
    near(w.opportunity.upfront + w.opportunity.monthly, w.opportunity.total);
    near(w.moneyBack.value - w.moneyBack.sellingCosts - w.moneyBack.balance - w.moneyBack.repairs, w.moneyBack.total);
  }
});

test('cost waterfall: selling costs of 0% add 6% of the final home value to money back', () => {
  const six = compareRentOwn(base());
  const zero = compareRentOwn({ ...base(), selling: 0 });
  near(zero.waterfall.moneyBack.total - six.waterfall.moneyBack.total, six.waterfall.moneyBack.value * 0.06);
  near(six.waterfall.moneyBack.sellingCosts, six.waterfall.moneyBack.value * 0.06);
});

test('waterfall card: only the bucket rows land in the total column, so it sums to the gap', async () => {
  const { waterfallCard } = await import('../site/rentown/waterfall.js');
  for (const extra of [{}, { hoa: 300, utilities: 150 }]) {
    const v = { ...base(), ...extra };
    const r = compareRentOwn(v);
    const html = waterfallCard({ r, v });
    const rows = [...html.matchAll(/<tr[^>]*>(.*?)<\/tr>/g)].map((m) => m[1]);
    const num = (s) => { const t = s.replace(/<[^>]+>/g, '').trim(); return t ? Number(t.replace(/[−-]/, '-').replace(/[^0-9.-]/g, '')) : null; };
    const totals = rows.map((row) => [...row.matchAll(/<td>(.*?)<\/td>/g)].map((m) => num(m[1]))[1]).filter((n) => n !== null && n !== undefined);
    const buckets = totals.slice(0, -1).reduce((a, b) => a + b, 0);
    assert.equal(totals.length, 5);
    assert.ok(Math.abs(buckets - totals[totals.length - 1]) < 5, `${buckets} vs ${totals[totals.length - 1]}`);
  }
});
