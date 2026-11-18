import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPOUND_PRESETS, compoundDefaults, decodeCompound, encodeCompound, headline, inTodaysDollars, invalidCompound, simulateCompound } from '../site/compound.js';

test('worked example: $10,000 + $500/month at 7% monthly for 30 years', () => {
  const v = compoundDefaults();
  const r = simulateCompound(v);
  const closed = 10000 * (1 + 0.07 / 12) ** 360 + 500 * (((1 + 0.07 / 12) ** 360 - 1) / (0.07 / 12));
  assert.ok(Math.abs(r.futureValue - closed) < 0.01);
  assert.equal(r.contributed, 190000);
  assert.ok(Math.abs(r.futureValue - 691000) < 1000);
  assert.ok(Math.abs(r.interest - 501000) < 1000);
  assert.equal(r.years.length, 30);
  assert.match(headline(v, r), /^After 30 years, your \$190,000 becomes about \$691,000 — about \$501,000 of it is interest\.$/);
});

test('zero return grows only by contributions; zero everything is zero', () => {
  const r = simulateCompound({ start: 1000, monthly: 100, rate: 0, years: 2, frequency: 'monthly' });
  assert.equal(r.futureValue, 3400);
  assert.equal(r.interest, 0);
  assert.equal(simulateCompound({ start: 0, monthly: 0, rate: 5, years: 3, frequency: 'annually' }).futureValue, 0);
});

test('annual compounding of a lump sum is balance x (1 + rate)^years', () => {
  const r = simulateCompound({ start: 1000, monthly: 0, rate: 10, years: 3, frequency: 'annually' });
  assert.ok(Math.abs(r.futureValue - 1331) < 1e-9);
});

test('annual compounding gives simple interest on contributions made within the year', () => {
  const r = simulateCompound({ start: 0, monthly: 100, rate: 12, years: 1, frequency: 'annually' });
  assert.ok(Math.abs(r.futureValue - (1200 + 100 * 0.12 * (66 / 12))) < 1e-9);
});

test('encode keeps only changed values and round-trips; bad input falls back to defaults', () => {
  const d = compoundDefaults();
  assert.equal(encodeCompound(d), '');
  const v = { ...d, monthly: 250, frequency: 'annually' };
  assert.deepEqual(decodeCompound(encodeCompound(v)), v);
  assert.deepEqual(decodeCompound('#years=abc&frequency=daily&rate=-3'), d);
  assert.deepEqual(decodeCompound(''), d);
});

test('validation and presets', () => {
  assert.deepEqual(invalidCompound(compoundDefaults()), []);
  assert.deepEqual(invalidCompound({ ...compoundDefaults(), years: 2.5, rate: NaN }), ['Annual return (%)', 'Years']);
  for (const p of COMPOUND_PRESETS) assert.deepEqual(invalidCompound({ ...compoundDefaults(), ...p.values }), [], p.id);
});

test('a preset names every input it sets, and sets only those', () => {
  const fmt = { monthly: (n) => `$${n}/month`, rate: (n) => `${n}%`, years: (n) => `${n} years` };
  for (const p of COMPOUND_PRESETS) {
    assert.deepEqual(Object.keys(p.values).sort(), ['monthly', 'rate', 'years'], p.id);
    for (const [id, n] of Object.entries(p.values)) assert.ok(p.label.includes(fmt[id](n)), `${p.id} label names ${id}`);
  }
  // Applied over a user's own balance and compounding choice, those survive and the link round-trips.
  const mine = { ...compoundDefaults(), start: 2500, frequency: 'annually' };
  const applied = { ...mine, ...COMPOUND_PRESETS[0].values };
  assert.equal(applied.start, 2500);
  assert.equal(applied.frequency, 'annually');
  assert.deepEqual(decodeCompound(encodeCompound(applied)), applied);
});

test("today's dollars: ~$285,000 at 3%, equal at 0%, nominal untouched, basis in link", () => {
  const v = compoundDefaults();
  const nominal = simulateCompound(v);
  const before = JSON.stringify(nominal);
  const real = inTodaysDollars(nominal, 3);
  assert.equal(JSON.stringify(nominal), before);
  assert.ok(Math.abs(real.futureValue - nominal.futureValue / 1.03 ** 30) < 1e-6);
  assert.ok(Math.abs(real.futureValue - 285000) < 1000);
  assert.equal(real.contributed, 190000);
  const zero = inTodaysDollars(nominal, 0);
  assert.equal(zero.futureValue, nominal.futureValue);
  assert.equal(zero.interest, nominal.interest);
  assert.match(headline({ ...v, basis: 'today' }, real), /becomes about \$285,000 in today's dollars — about \$95,000 more than you put in\.$/);
  const w = { ...v, basis: 'today', inflation: 2.5 };
  assert.deepEqual(decodeCompound(encodeCompound(w)), w);
  assert.equal(encodeCompound({ ...v, inflation: 3 }), '');
});

import { compoundChartHtml, compoundTip, crossoverYear } from '../site/compound-chart.js';

test('compound chart marks the year interest passes contributions at the defaults', () => {
  const years = simulateCompound(compoundDefaults()).years;
  const cross = crossoverYear(years);
  assert.ok(cross >= 13 && cross <= 18, `crossover year ${cross}`);
  assert.ok(years[cross - 1].totalInterest > years[cross - 1].totalContributed);
  assert.ok(cross === 1 || years[cross - 2].totalInterest <= years[cross - 2].totalContributed);
  const html = compoundChartHtml(years, (n) => `$${Math.round(n)}`);
  assert.match(html, new RegExp(`Interest passes contributions in year ${cross}`));
  assert.match(html, /cc-hover-line/);
});

test('compound chart has no crossover when interest never catches up', () => {
  const years = simulateCompound({ start: 0, monthly: 500, rate: 1, years: 5, frequency: 'monthly' }).years;
  assert.equal(crossoverYear(years), null);
  assert.doesNotMatch(compoundChartHtml(years, String), /passes contributions/);
});

test('compound tooltip numbers match the table row for every year', () => {
  const years = simulateCompound(compoundDefaults()).years;
  const fmt = (n) => `$${Math.round(n)}`;
  for (const y of years) {
    const tip = compoundTip(y, fmt);
    assert.equal(tip.title, `Year ${y.year}`);
    assert.deepEqual(tip.lines, [['Balance', fmt(y.balance)], ['Put in to date', fmt(y.totalContributed)], ['Interest to date', fmt(y.totalInterest)]]);
  }
});

test('compound chart keeps the crossover label inside the plot and hides hover marks at rest', () => {
  const fmt = (n) => `$${Math.round(n)}`;
  for (const v of [compoundDefaults(), { ...compoundDefaults(), years: 10, rate: 12 }, { ...compoundDefaults(), years: 40, start: 0, monthly: 100, rate: 9 }]) {
    const html = compoundChartHtml(simulateCompound(v).years, fmt);
    const m = html.match(/<text x="([\d.]+)"[^>]*text-anchor="(start|end)"[^>]*class="cc-cross-label">([^<]*)</);
    if (!m) continue;
    const x = Number(m[1]);
    const width = m[3].length * 8;
    const [lo, hi] = m[2] === 'end' ? [x - width, x] : [x, x + width];
    assert.ok(lo >= 80 && hi <= 700, `label ${m[3]} spans ${lo}-${hi}`);
  }
  const html = compoundChartHtml(simulateCompound(compoundDefaults()).years, fmt);
  assert.match(html, /cc-hover-line cc-off/);
  assert.match(html, /cc-hover-dot cc-off/);
  assert.doesNotMatch(html, /<(line|circle)[^>]* hidden/);
});
