import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { RENTOWN_FIELDS, RENTOWN_PRESETS, matchRentOwnPreset, compareRentOwn, compareScenarios, decodeBasis, decodeRentOwn, encodeRentOwn, invalidRentOwn, rentOwnDefaults, rentOwnThresholds } from '../site/rentown.js';
import { rentOwnChart } from '../site/rentown-chart.js';
import { CALCULATORS } from '../site/menu.js';

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const base = () => rentOwnDefaults();

test('the menu lists rent vs own second and the page exists', () => {
  assert.equal(CALCULATORS[1].href, 'rent-vs-own.html');
  const html = readFileSync(new URL('../site/rent-vs-own.html', import.meta.url), 'utf8');
  assert.ok(html.includes('menu.js'));
});

test('defaults are valid and give one row per year', () => {
  assert.deepEqual(invalidRentOwn(base()), []);
  assert.equal(compareRentOwn(base()).years.length, 7);
});

test('with a free home and no growth, owning loses exactly the costs paid', () => {
  // No loan, no costs but selling, flat value, no investment return, rent 0.01: renting keeps the cash.
  const v = { ...base(), down: 100, rate: 0, closing: 0, tax: 0, insurance: 0, maintenance: 0, growth: 0, selling: 10, investment: 0, rent: 1, rentGrowth: 0, renterInsurance: 0, years: 2, price: 120000 };
  const r = compareRentOwn(v);
  near(r.final.own, 108000);
  near(r.final.rent, 120000 - 24);
  assert.equal(r.breakEven, null);
});

test('a loan is repaid over its term and the owner net worth is equity after selling costs', () => {
  const v = { ...base(), years: 30, term: 30, growth: 0, selling: 0 };
  const r = compareRentOwn(v);
  near(r.final.own, v.price, 1);
});

test('break-even is the first year after which owning stays ahead', () => {
  const v = { ...base(), years: 15 };
  const r = compareRentOwn(v);
  const after = r.years.filter((y) => y.year >= r.breakEven);
  assert.ok(after.every((y) => y.difference >= 0));
  if (r.breakEven > 1) assert.ok(r.years[r.breakEven - 2].difference < 0);
});

test('invalid and out of range values are reported by label', () => {
  assert.deepEqual(invalidRentOwn({ ...base(), price: NaN, years: 0 }), ['Home price', 'Years you will stay']);
  assert.deepEqual(invalidRentOwn({ ...base(), term: 2.5 }), ['Loan term']);
});

test('inputs round-trip through the URL fragment, writing only changes', () => {
  const v = { ...base(), price: 500000, rate: 5.75 };
  const text = encodeRentOwn(v);
  assert.equal(text, 'price=500000&rate=5.75');
  assert.deepEqual(decodeRentOwn(`#${text}`), v);
  assert.deepEqual(decodeRentOwn('price=abc&years=0&bogus=1'), base());
  assert.equal(RENTOWN_FIELDS.length, Object.keys(base()).length);
});

test('the chart marks the break-even year and describes itself', () => {
  const r = compareRentOwn({ ...base(), years: 15 });
  const { svg, description } = rentOwnChart(r.years, r.breakEven, (n) => `$${Math.round(n)}`);
  assert.ok(svg.includes('Break-even'));
  assert.ok(description.includes('Owning pulls ahead'));
  assert.ok(!rentOwnChart(r.years, null, String).svg.includes('Break-even'));
});

test('inflation defaults to 2.5% and today\'s dollars shrink the gap', () => {
  assert.equal(rentOwnDefaults().inflation, 2.5);
  const r = compareRentOwn(base());
  near(r.final.difference, -12002, 1);
  assert.ok(Math.abs(r.finalReal.difference) < Math.abs(r.final.difference));
  near(r.finalReal.difference, r.final.difference / 1.025 ** 7);
});

test('at 0% inflation the two bases agree', () => {
  const r = compareRentOwn({ ...base(), inflation: 0 });
  assert.deepEqual(r.real, r.years);
});

test('the dollar basis round-trips through the fragment', () => {
  assert.equal(decodeBasis(encodeRentOwn(base(), 'today')), 'today');
  assert.equal(decodeBasis(encodeRentOwn(base())), 'future');
  assert.equal(decodeBasis('dollars=bogus'), 'future');
});

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

test('thresholds flip the verdict at the default scenario', () => {
  const v = base();
  const t = Object.fromEntries(rentOwnThresholds(v).map((x) => [x.id, x]));
  assert.ok(t.growth.flip > 3);
  assert.ok(t.rentGrowth.flip > 3); // faster rent growth favors owning, so the flip is above the entered 3%
  assert.match(t.growth.text, /^Owning wins if home value growth is above /);
  for (const x of Object.values(t)) {
    if (x.flip == null) continue;
    assert.ok(Math.abs(compareRentOwn({ ...v, [x.id]: x.flip }).final.difference) < 500, x.id);
  }
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

test('T0: the expected case has renting ahead by about $12,002 after 7 years (after investment tax)', () => {
  const exp = compareScenarios(base())[1];
  assert.ok(Math.abs(exp.difference + 12002) < 50, String(exp.difference));
});

test('cash needed to buy: down payment, closing, moving, reserve and the shortfall', () => {
  const c = compareRentOwn(base()).cash;
  near(c.down, 90000);
  near(c.closing, 13500);
  assert.equal(c.moving, 0);
  near(c.total, 103500);
  assert.equal(c.saved, null);
  assert.equal(c.shortfall, 0);
  const short = compareRentOwn({ ...base(), saved: 60000 }).cash;
  near(short.shortfall, 43500);
  assert.ok(short.monthsToClose == null || short.monthsToClose > 0);
  const r = compareRentOwn({ ...base(), moving: 2000, reserve: 2 });
  near(r.cash.total, 105500 + 2 * r.firstOwnMonthly);
  assert.equal(compareRentOwn({ ...base(), saved: 200000 }).cash.shortfall, 0);
});

test('cash saved is optional but must be valid when given', () => {
  assert.deepEqual(invalidRentOwn(base()), []);
  assert.deepEqual(invalidRentOwn({ ...base(), saved: -1 }), ['Cash you have saved, optional']);
  assert.equal(decodeRentOwn(encodeRentOwn({ ...base(), saved: 60000 })).saved, 60000);
  assert.equal(decodeRentOwn('').saved, null);
});

test('the chart runs past the stay to the break-even year; the table and verdict stay on the stay', () => {
  const nw = { ...base(), price: 400000, down: 10, rate: 7.5, years: 4 };
  const r = compareRentOwn(nw);
  assert.equal(r.years.length, 4);
  assert.equal(r.breakEven, null);
  assert.ok(r.chartBreakEven >= 12 && r.chartBreakEven <= 16);
  assert.equal(r.chartYears.length, r.chartBreakEven);
  const { svg, description } = rentOwnChart(r.chartYears, r.chartBreakEven, String, nw.years);
  assert.ok(svg.includes(`Break-even: year ${r.chartBreakEven}`));
  assert.ok(svg.includes('Your stay: year 4'));
  assert.ok(description.includes('plan to stay 4 years'));
});

test('with no crossover inside 30 years the chart runs 30 years and draws no break-even', () => {
  const r = compareRentOwn({ ...base(), growth: 0, investment: 7 });
  assert.equal(r.chartBreakEven, null);
  assert.equal(r.chartYears.length, 30);
  const { svg } = rentOwnChart(r.chartYears, r.chartBreakEven, String, 7);
  assert.ok(!svg.includes('Break-even'));
  assert.ok(svg.includes('Your stay: year 7'));
});

test('a stay longer than 30 years keeps the whole stay on the chart', () => {
  assert.equal(compareRentOwn({ ...base(), years: 40 }).chartYears.length, 40);
});

test('the chart in today\'s dollars is deflated and keeps the same break-even year', () => {
  const r = compareRentOwn({ ...base(), inflation: 3 });
  assert.equal(r.chartReal.length, r.chartYears.length);
  assert.ok(Math.abs(r.chartReal.at(-1).own) < Math.abs(r.chartYears.at(-1).own));
  assert.equal(r.chartReal.findIndex((y) => y.difference >= 0), r.chartYears.findIndex((y) => y.difference >= 0));
});

test('scenario cases carry a today\'s-dollars gap that matches the basis at 0% inflation', () => {
  const v = { ...rentOwnDefaults(), inflation: 0 };
  for (const s of compareScenarios(v)) assert.equal(s.differenceReal, s.difference);
  const w = { ...rentOwnDefaults(), inflation: 2.5 };
  for (const s of compareScenarios(w)) assert.ok(Math.abs(s.differenceReal) < Math.abs(s.difference) || s.difference === 0);
});

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

test('presets set the five settings together and are recognised again', () => {
  for (const p of RENTOWN_PRESETS) {
    const v = { ...base(), ...p.values };
    assert.equal(matchRentOwnPreset(v), p);
    assert.equal(matchRentOwnPreset({ ...v, down: v.down + 1 }), null);
  }
});

test('the default inputs are the 20% down preset and 10% down changes the headline', () => {
  assert.equal(matchRentOwnPreset(base()).id, 'down20');
  const ftb = { ...base(), ...RENTOWN_PRESETS.find((p) => p.id === 'ftb10').values };
  assert.equal(ftb.down, 10);
  assert.ok(compareRentOwn(ftb).firstPmi > 0);
  assert.notEqual(compareRentOwn(ftb).final.difference, compareRentOwn(base()).final.difference);
});
