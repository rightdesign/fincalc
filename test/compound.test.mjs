import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPOUND_FIELDS, COMPOUND_PRESETS, balanceBreakdown, choiceEffects, compareStartingLater, compoundDefaults as modelDefaults, compoundingExplainer, decodeCompound, doublingMilestones, doubleTileText, effectiveAnnualRate, encodeCompound, headline, inTodaysDollars, invalidCompound, leverTable, roundedMoney, growthRates, interestTax, SLIDER_STEPS, sliderPos, sliderValue, simulateCompound, withdrawsOn, yearsCaption, yearsToDouble } from '../site/compound.js';

// The closed forms below are written for a nominal (APR) rate; the effective default has its own tests.
const compoundDefaults = () => ({ ...modelDefaults(), rateBasis: 'nominal' });

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
  const d = modelDefaults();
  assert.equal(encodeCompound(d), '');
  const v = { ...d, monthly: 250, frequency: 'annually' };
  assert.deepEqual(decodeCompound(encodeCompound(v)), v);
  assert.deepEqual(decodeCompound('#years=abc&frequency=weekly&rate=500'), d);
  assert.deepEqual(decodeCompound(''), d);
});

test('validation and presets', () => {
  assert.deepEqual(invalidCompound(compoundDefaults()), []);
  assert.deepEqual(invalidCompound({ ...compoundDefaults(), years: 2.5, rate: NaN }), ['Years', 'Annual return (%)']);
  for (const p of COMPOUND_PRESETS) assert.deepEqual(invalidCompound({ ...compoundDefaults(), ...p.values }), [], p.id);
});

test('input limits: runaway values are rejected, negative return and inflation are allowed', () => {
  const d = compoundDefaults();
  assert.deepEqual(invalidCompound({ ...d, rate: -2, inflation: -1 }), []);
  assert.deepEqual(invalidCompound({ ...d, rate: 500, stepUp: 80, variance: 40, inflation: 50 }), ['Increase contribution each year (%)', 'Annual return (%)', 'Return range (± percentage points)', 'Inflation (% per year)']);
  assert.deepEqual(invalidCompound({ ...d, rate: -21 }), ['Annual return (%)']);
  assert.deepEqual(invalidCompound({ ...d, rate: 30, stepUp: 20, variance: 15, inflation: -10 }), []);
  assert.equal(decodeCompound('#rate=-2&inflation=-1').rate, -2);
  assert.equal(decodeCompound('#rate=-2&inflation=-1').inflation, -1);
  assert.equal(decodeCompound('#rate=500&stepUp=80').rate, d.rate);
  assert.equal(decodeCompound('#stepUp=80').stepUp, d.stepUp);
  assert.ok(simulateCompound({ ...d, rate: -5, years: 10 }).futureValue < simulateCompound({ ...d, rate: 0, years: 10 }).futureValue);
});

test('a preset names every input it sets, and sets only those', () => {
  const fmt = { monthly: (n) => `$${n}/month`, rate: (n) => `${n}%`, years: (n) => `${n} years`, contributeYears: (n) => `contribute ${n} years` };
  for (const p of COMPOUND_PRESETS) {
    assert.deepEqual(Object.keys(p.values).sort(), p.id === 'stopearly' ? ['contributeYears', 'monthly', 'rate', 'years'] : ['monthly', 'rate', 'years'], p.id);
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
  // Each year's contributions are deflated at that year's factor, so contributed shrinks and growth rises.
  const expected = nominal.years.reduce((sum, y) => sum + y.contributions / 1.03 ** y.year, 10000);
  assert.ok(Math.abs(real.contributed - expected) < 1e-6);
  assert.ok(real.contributed < 190000);
  assert.ok(Math.abs(real.interest - (real.futureValue - real.contributed)) < 1e-6);
  assert.ok(Math.abs(real.years.reduce((sum, y) => sum + y.interest, 0) - real.interest) < 1e-6);
  const zero = inTodaysDollars(nominal, 0);
  assert.equal(zero.futureValue, nominal.futureValue);
  assert.equal(zero.interest, nominal.interest);
  assert.match(headline({ ...v, basis: 'today' }, real), /becomes about \$285,000 in today's dollars — about \$157,000 more than you put in\.$/);
  const w = { ...modelDefaults(), basis: 'today', inflation: 2.5 };
  assert.deepEqual(decodeCompound(encodeCompound(w)), w);
  assert.equal(encodeCompound({ ...modelDefaults(), inflation: 3 }), '');
});

test('beginning-of-month contributions match the closed form and beat end-of-month', () => {
  const v = { ...compoundDefaults(), timing: 'start' };
  const i = 0.07 / 12;
  const closed = 10000 * (1 + i) ** 360 + 500 * (1 + i) * (((1 + i) ** 360 - 1) / i);
  const early = simulateCompound(v);
  const late = simulateCompound(compoundDefaults());
  assert.ok(Math.abs(early.futureValue - closed) < 0.01);
  assert.ok(Math.abs(early.futureValue - 695000) < 1500);
  assert.ok(Math.abs(early.futureValue - late.futureValue - 3500) < 500);
  assert.equal(early.contributed, late.contributed);
});

test('beginning-of-month with annual compounding earns one more month of simple interest', () => {
  const r = simulateCompound({ start: 0, monthly: 100, rate: 12, years: 1, frequency: 'annually', timing: 'start' });
  assert.ok(Math.abs(r.futureValue - (1200 + 100 * 0.12 * (78 / 12))) < 1e-9);
});

test('annual compounding lowers the result; timing round-trips through the link', () => {
  const d = compoundDefaults();
  const r = simulateCompound(d);
  const fx = choiceEffects(d, r, null);
  assert.equal(fx.frequency.alt, 'annually');
  assert.ok(fx.frequency.futureValue < r.futureValue && fx.frequency.gap > 0);
  assert.equal(fx.timing.alt, 'start');
  assert.ok(fx.timing.futureValue > r.futureValue && fx.timing.gap < 0);
  assert.equal(encodeCompound(modelDefaults()), '');
  assert.deepEqual(decodeCompound(encodeCompound({ ...modelDefaults(), timing: 'start' })), { ...modelDefaults(), timing: 'start' });
  assert.equal(decodeCompound('#timing=never').timing, 'end');
});

test('start-early comparison: $500/month at 7% for 40 years versus 30', () => {
  const v = { start: 0, monthly: 500, rate: 7, rateBasis: 'nominal', years: 40, frequency: 'monthly' };
  const c = compareStartingLater(v);
  assert.equal(c.now.contributed, 240000);
  assert.equal(c.later.contributed, 180000);
  assert.equal(c.extraContributed, 60000);
  assert.ok(Math.abs(c.now.futureValue - 1312000) < 1000);
  assert.ok(Math.abs(c.later.futureValue - 610000) < 1000);
  assert.ok(Math.abs(c.gap - 702000) < 1000);
  assert.equal(c.now.futureValue, simulateCompound(v).futureValue);
  assert.ok(compareStartingLater({ ...v, monthly: 1000 }).gap > c.gap);
  assert.equal(compareStartingLater({ ...v, years: 10 }), null);
  const real = compareStartingLater({ ...v, basis: 'today', inflation: 3 });
  const d = 1.03 ** 40;
  assert.ok(real.todaysDollars);
  assert.ok(Math.abs(real.now.futureValue - c.now.futureValue / d) < 0.01);
  assert.ok(Math.abs(real.later.futureValue - c.later.futureValue / d) < 0.01);
  assert.ok(Math.abs(real.gap - (c.now.futureValue - c.later.futureValue) / d) < 0.01);
  // Contributions are restated at the year they are paid: now pays in years 1-40, the later plan in years 11-40.
  const paid = (from, to) => { let t = 0; for (let y = from; y <= to; y++) t += 6000 / 1.03 ** y; return t; };
  assert.ok(Math.abs(real.now.contributed - paid(1, 40)) < 1e-6);
  assert.ok(Math.abs(real.later.contributed - paid(11, 40)) < 1e-6);
  assert.ok(Math.abs(real.extraContributed - paid(1, 10)) < 1e-6);
  assert.equal(compareStartingLater({ ...v, basis: 'today', inflation: 0 }).gap, c.gap);
});

import { axisLabel, niceTicks, compoundChartHtml, compoundTip, crossoverYear } from '../site/compound-chart.js';

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

test('lever table: base equals the headline and each row matches a direct rerun', () => {
  const v = compoundDefaults();
  const t = leverTable(v);
  assert.equal(t.base, simulateCompound(v).futureValue);
  const by = Object.fromEntries(t.rows.map((r) => [r.id, r]));
  assert.equal(by.monthly.balance, simulateCompound({ ...v, monthly: 600 }).futureValue);
  assert.equal(by.rate.balance, simulateCompound({ ...v, rate: 8 }).futureValue);
  assert.equal(by.years.balance, simulateCompound({ ...v, years: 35, contributeYears: 35 }).futureValue);
  assert.ok(Math.abs(by.monthly.gain - 122000) < 2000);
  assert.ok(Math.abs(by.rate.gain - 163400) < 100);
  assert.ok(Math.abs(by.years.gain - 324400) < 100);
  assert.equal(t.best, undefined);
  const base = simulateCompound(v).contributed;
  assert.equal(by.monthly.extra, simulateCompound({ ...v, monthly: 600 }).contributed - base);
  assert.equal(by.rate.extra, 0);
  assert.equal(by.years.extra, simulateCompound({ ...v, years: 35, contributeYears: 35 }).contributed - base);
});

test('lever table: today\'s dollars, and extra years stop at the maximum', () => {
  const v = { ...compoundDefaults(), basis: 'today' };
  const t = leverTable(v);
  assert.equal(t.base, inTodaysDollars(simulateCompound(v), v.inflation).futureValue);
  const long = leverTable({ ...compoundDefaults(), years: 98 });
  assert.equal(long.rows.find((r) => r.id === 'years').label, '+2 years');
  assert.equal(leverTable({ ...compoundDefaults(), years: 100 }).rows.some((r) => r.id === 'years'), false);
});

const explain = (over = {}) => {
  const v = { ...compoundDefaults(), ...over };
  return Object.fromEntries(compoundingExplainer(v, simulateCompound(v)).map((p) => [p.id, p.text]));
};

test('explainer at the defaults: Rule of 72, last 10 vs first 20 years, doubling milestones', () => {
  const e = explain();
  assert.match(e['rule-of-72'], /72 ÷ 7 ≈ 10 years/);
  assert.match(e['back-loaded'], /last 10 years add about \$390,000, more than the \$301,000 your first 20 years/);
  assert.match(e.milestones, /\$100,000 in year 10.*\$200,000 in year 16.*\$400,000 in year 24/);
  assert.ok(e['interest-on-interest']);
});

test('milestones heading only claims "faster" when the gaps shrink, and labels the first step from the start', () => {
  const titles = (o) => compoundingExplainer({ ...compoundDefaults(), ...o }, simulateCompound({ ...compoundDefaults(), ...o })).find((p) => p.id === 'milestones');
  const m = titles({ start: 100000, monthly: 534, stepUp: 3.5, rate: 9, years: 26 });
  assert.equal(m.title, 'When your balance doubles');
  assert.doesNotMatch(m.text, /fewer years/);
  assert.match(m.text, /year \d+ \(\d+ years from your \$100,000 start\)/);
  const shrinkThenGrow = titles({ start: 10000, monthly: 500, rate: 7, years: 30 });
  assert.equal(shrinkThenGrow.title, 'When your balance doubles');
  assert.doesNotMatch(shrinkThenGrow.text, /fewer years/);
  const growing = titles({ start: 0, monthly: 500, rate: 7, years: 40 });
  assert.equal(growing.title, 'When your balance doubles');
});

test('explainer follows the inputs: 5% gives a 14-year Rule of 72 and moved figures', () => {
  const e = explain({ rate: 5 });
  assert.match(e['rule-of-72'], /72 ÷ 5 ≈ 14 years/);
  assert.match(e.milestones, /\$100,000 in year 11/);
  const v = { ...compoundDefaults(), rate: 5 };
  const r = simulateCompound(v);
  assert.deepEqual(doublingMilestones(v, r).map((m) => m.year), [11, 19, 28]);
  assert.ok(r.years[10].balance >= 100000 && r.years[9].balance < 100000);
});

test('explainer leaves out points that do not apply', () => {
  const zero = explain({ rate: 0 });
  assert.equal(zero['rule-of-72'], undefined);
  assert.equal(zero['back-loaded'], undefined);
  assert.match(zero['interest-on-interest'], /0% return/);
  assert.equal(explain({ years: 2 })['back-loaded'], undefined);
});

test('contribute for: contributions stop, compounding continues (worked example)', () => {
  const v = { ...compoundDefaults(), contributeYears: 10 };
  const r = simulateCompound(v);
  assert.equal(r.contributed, 70000);
  assert.ok(Math.abs(r.futureValue - 431000) < 1000);
  assert.ok(Math.abs(r.interest - 361000) < 1000);
  assert.equal(r.years.length, 30);
  assert.equal(r.years[10].contributions, 0);
  assert.match(headline(v, r), /^After 30 years, your \$70,000 becomes about \$431,000 — you contributed for the first 10 years, then let it grow\.$/);
  assert.ok(Math.abs(simulateCompound(compoundDefaults()).futureValue - 691000) < 1000);
});

test('contribute for: equal to Years matches today, longer is clamped, zero means none, $0/month says nothing', () => {
  const d = compoundDefaults();
  for (const timing of ['end', 'start']) for (const frequency of ['monthly', 'annually']) {
    const base = simulateCompound({ ...d, timing, frequency });
    assert.equal(simulateCompound({ ...d, timing, frequency, contributeYears: 30 }).futureValue, base.futureValue);
    assert.equal(simulateCompound({ ...d, timing, frequency, contributeYears: 99 }).futureValue, base.futureValue);
    assert.equal(simulateCompound({ ...d, timing, frequency, contributeYears: undefined }).futureValue, base.futureValue);
  }
  const none = simulateCompound({ ...d, contributeYears: 0 });
  assert.equal(none.contributed, 10000);
  assert.ok(Math.abs(none.futureValue - 10000 * (1 + 0.07 / 12) ** 360) < 0.01);
  const lump = { ...d, monthly: 0, contributeYears: 5 };
  assert.doesNotMatch(headline(lump, simulateCompound(lump)), /contributed for/);
});

test('contribute for: link round-trip, follows Years when absent, held to Years, Reset restores it', () => {
  const d = modelDefaults();
  assert.equal(encodeCompound({ ...d, contributeYears: 10 }), 'contributeYears=10');
  assert.equal(decodeCompound('#contributeYears=10').contributeYears, 10);
  assert.equal(encodeCompound({ ...d, years: 20, contributeYears: 20 }), 'years=20&contributeYears=20');
  assert.equal(decodeCompound('#years=26&contributeYears=26').contributeYears, 26);
  assert.equal(decodeCompound('#years=30&contributeYears=26').contributeYears, 26);
  const long = { ...d, years: 40, contributeYears: 30 };
  assert.equal(encodeCompound(long), 'years=40&contributeYears=30');
  assert.deepEqual(decodeCompound('#' + encodeCompound(long)), long);
  assert.equal(encodeCompound({ ...d }), '');
  assert.equal(decodeCompound('#years=20').contributeYears, 20);
  assert.equal(decodeCompound('#years=20&contributeYears=40').contributeYears, 20);
  assert.equal(decodeCompound('#years=20&contributeYears=abc').contributeYears, 20);
  const v = { ...d, years: 20, contributeYears: 0 };
  assert.deepEqual(decodeCompound(encodeCompound(v)), v);
  assert.equal(compoundDefaults().contributeYears, compoundDefaults().years);
  assert.deepEqual(invalidCompound({ ...d, contributeYears: 2.5 }), ['Contribute for (years)']);
});

test('the stop-contributing preset lands on about $605,000 from the default start', () => {
  const p = COMPOUND_PRESETS.find((x) => x.id === 'stopearly');
  const r = simulateCompound({ ...compoundDefaults(), ...p.values });
  assert.ok(Math.abs(r.futureValue - 605000) < 5000, String(r.futureValue));
  assert.equal(Math.round(r.contributed), 130000);
});

test('contribute for: explainer, cost of waiting and levers follow the stop year', () => {
  const v = { ...compoundDefaults(), start: 10000, monthly: 500, years: 30, rate: 7, contributeYears: 10 };
  const r = simulateCompound(v);
  const text = compoundingExplainer(v, r).find((p) => p.id === 'back-loaded').text;
  const late = r.futureValue - r.years[19].balance;
  assert.ok(text.includes(`about ${roundedMoney(late)} with no new contributions`));
  assert.ok(Math.abs(r.futureValue - 430687) < 1 && Math.abs(late - 216379) < 1);
  const c = compareStartingLater(v);
  assert.equal(c.extraContributed, 0);
  assert.equal(c.later.contributed, simulateCompound({ ...v, years: 20 }).contributed);
  const by = Object.fromEntries(leverTable(v).rows.map((l) => [l.id, l]));
  assert.equal(by.monthly.balance, simulateCompound({ ...v, monthly: 600 }).futureValue);
  assert.equal(by.years.balance, simulateCompound({ ...v, years: 35 }).futureValue);
  const full = { ...v, contributeYears: 30 };
  assert.ok(!compoundingExplainer(full, simulateCompound(full)).find((p) => p.id === 'back-loaded').text.includes('no new contributions'));
});

import { stopYear } from '../site/compound-chart.js';

test('compound chart marks the stop year and the tooltip shows the $0 years after it', () => {
  const v = { ...compoundDefaults(), start: 10000, monthly: 500, rate: 7, years: 30, contributeYears: 10 };
  const years = simulateCompound(v).years;
  const fmt = (n) => `$${Math.round(n)}`;
  assert.equal(stopYear(years), 10);
  assert.equal(Math.round(years[9].totalContributed), 70000);
  assert.equal(years[10].contributions, 0);
  assert.equal(years[29].totalContributed, years[9].totalContributed);
  assert.ok(Math.abs(years[29].balance - 431000) < 1500);
  const html = compoundChartHtml(years, fmt);
  assert.match(html, /Contributions stop after year 10/);
  assert.match(html, /cc-stop-dot/);
  const after = compoundTip(years[10], fmt, 10);
  assert.deepEqual(after.lines.slice(3), [['Put in this year', '$0'], ['Interest this year', fmt(years[10].interest)]]);
  assert.equal(compoundTip(years[9], fmt, 10).lines.length, 3);
});

test('compound chart has no stop marker when contributions run to the end or never happen', () => {
  const fmt = String;
  for (const v of [compoundDefaults(), { ...compoundDefaults(), monthly: 0 }, { ...compoundDefaults(), contributeYears: 0 }]) {
    const years = simulateCompound(v).years;
    assert.equal(stopYear(years), null);
    assert.doesNotMatch(compoundChartHtml(years, fmt), /cc-stop/);
  }
});

test('stepUp raises the monthly contribution each year and defaults to flat', () => {
  const base = { ...compoundDefaults(), start: 0, monthly: 100, years: 3, contributeYears: 3, rate: 0 };
  assert.equal(compoundDefaults().stepUp, 0);
  const flat = simulateCompound(base);
  assert.deepEqual(flat.years.map((y) => y.contributions), [1200, 1200, 1200]);
  const up = simulateCompound({ ...base, stepUp: 10 });
  assert.deepEqual(up.years.map((y) => Math.round(y.contributions * 100) / 100), [1200, 1320, 1452]);
  assert.ok(Math.abs(up.contributed - 3972) < 1e-9);
});

test('stepUp stops with the contribution period and round-trips in a link', () => {
  const v = { ...compoundDefaults(), start: 0, monthly: 100, years: 4, contributeYears: 2, rate: 0, stepUp: 5 };
  assert.deepEqual(simulateCompound(v).years.map((y) => Math.round(y.contributions)), [1200, 1260, 0, 0]);
  assert.equal(decodeCompound(encodeCompound(v)).stepUp, 5);
  assert.ok(!encodeCompound({ ...v, stepUp: 0 }).includes('stepUp'));
  assert.deepEqual(invalidCompound({ ...v, stepUp: -1 }), ['Increase contribution each year (%)']);
});

test('tax on interest: 0% changes nothing; monthly closed form uses r/12 x (1 - t)', () => {
  const v = compoundDefaults();
  assert.equal(simulateCompound({ ...v, taxRate: 0 }).futureValue, simulateCompound(v).futureValue);
  const t = simulateCompound({ ...v, taxRate: 25 });
  const g = 1 + (0.07 / 12) * 0.75;
  const closed = 10000 * g ** 360 + 500 * ((g ** 360 - 1) / (g - 1));
  assert.ok(Math.abs(t.futureValue - closed) < 0.01);
  assert.equal(t.contributed, 190000);
  assert.ok(Math.abs(t.interest - (t.futureValue - 190000)) < 1e-6);
  assert.ok(t.futureValue < simulateCompound(v).futureValue);
});

test('tax on interest: annual compounding taxes the year\'s interest; 100% leaves only contributions', () => {
  const a = { start: 1000, monthly: 0, rate: 10, years: 1, frequency: 'annually', timing: 'end', taxRate: 20 };
  assert.ok(Math.abs(simulateCompound(a).futureValue - 1080) < 1e-9);
  const all = simulateCompound({ ...compoundDefaults(), taxRate: 100 });
  assert.ok(Math.abs(all.futureValue - 190000) < 1e-6);
});

test('tax rate is validated 0-100 and survives encode/decode', () => {
  const v = { ...compoundDefaults(), taxRate: 24 };
  assert.deepEqual(invalidCompound(v), []);
  assert.deepEqual(invalidCompound({ ...v, taxRate: 101 }), ['Tax rate (%)']);
  assert.equal(decodeCompound(encodeCompound(v)).taxRate, 24);
  assert.ok(!encodeCompound(compoundDefaults()).includes('taxRate'));
});

test('every compounding frequency: more frequent ends higher, and each matches its closed form', () => {
  const base = { start: 1000, monthly: 0, rate: 8, rateBasis: 'nominal', years: 5, timing: 'end' };
  const fv = (frequency) => simulateCompound({ ...base, frequency }).futureValue;
  const order = ['annually', 'semiannually', 'quarterly', 'monthly', 'daily', 'continuous'].map(fv);
  for (let i = 1; i < order.length; i++) assert.ok(order[i] > order[i - 1]);
  assert.ok(Math.abs(fv('annually') - 1000 * 1.08 ** 5) < 1e-6);
  assert.ok(Math.abs(fv('semiannually') - 1000 * 1.04 ** 10) < 1e-6);
  assert.ok(Math.abs(fv('quarterly') - 1000 * 1.02 ** 20) < 1e-6);
  assert.ok(Math.abs(fv('monthly') - 1000 * (1 + 0.08 / 12) ** 60) < 1e-6);
  assert.ok(Math.abs(fv('daily') - 1000 * (1 + 0.08 / 365) ** 1825) < 1e-6);
  assert.ok(Math.abs(fv('continuous') - 1000 * Math.exp(0.4)) < 1e-6);
});

test('every compounding frequency is accepted and handles contributions and zero return', () => {
  for (const frequency of ['annually', 'semiannually', 'quarterly', 'monthly', 'daily', 'continuous']) {
    for (const timing of ['end', 'start']) {
      assert.equal(simulateCompound({ start: 1000, monthly: 100, rate: 0, years: 2, frequency, timing }).futureValue, 3400);
      assert.ok(simulateCompound({ start: 0, monthly: 100, rate: 6, years: 3, frequency, timing }).futureValue > 3600);
    }
    assert.deepEqual(invalidCompound({ ...compoundDefaults(), frequency }), []);
  }
});

test('tax on interest applies to every compounding frequency', () => {
  const base = { start: 1000, monthly: 0, rate: 8, rateBasis: 'nominal', years: 5, timing: 'end', taxRate: 25 };
  const fv = (frequency, extra = {}) => simulateCompound({ ...base, frequency, ...extra }).futureValue;
  assert.ok(Math.abs(fv('quarterly') - 1000 * (1 + 0.08 * 0.75 / 4) ** 20) < 1e-6);
  assert.ok(Math.abs(fv('semiannually') - 1000 * (1 + 0.08 * 0.75 / 2) ** 10) < 1e-6);
  assert.ok(Math.abs(fv('daily') - 1000 * (1 + 0.08 * 0.75 / 365) ** 1825) < 1e-6);
  assert.ok(Math.abs(fv('continuous') - 1000 * Math.exp(0.08 * 0.75 * 5)) < 1e-6);
  for (const f of ['annually', 'semiannually', 'quarterly', 'monthly', 'daily', 'continuous']) {
    assert.ok(fv(f) < fv(f, { taxRate: 0 }));
    assert.ok(Math.abs(fv(f, { taxRate: 100 }) - 1000) < 1e-6);
  }
});

import { returnRange, decodeCompound as _dec, encodeCompound as _enc, compoundDefaults as _def, simulateCompound as _sim } from '../site/compound.js';
import { compoundChartHtml as _chart } from '../site/compound-chart.js';

test('returnRange is null without variance and brackets the base case with it', () => {
  const v = _def();
  assert.equal(returnRange(v), null);
  const r = returnRange({ ...v, variance: 2 });
  assert.equal(r.lowRate, 5);
  assert.equal(r.highRate, 9);
  const base = _sim(v).futureValue;
  assert.ok(r.low.futureValue < base && base < r.high.futureValue);
  assert.equal(returnRange({ ...v, rate: 1, variance: 2 }).lowRate, -1);
});

test('variance round-trips through the link and is omitted at 0', () => {
  assert.equal(_enc(_def()), '');
  assert.equal(_dec(_enc({ ..._def(), variance: 1.5 })).variance, 1.5);
});

test('chart draws the band only when given one', () => {
  const v = _def();
  const rows = _sim(v).years;
  assert.ok(!_chart(rows, String).includes('cc-band'));
  const rg = returnRange({ ...v, variance: 2 });
  assert.ok(_chart(rows, String, { low: rg.low.years, high: rg.high.years }).includes('cc-band'));
});

test('effective annual rate: 9% grows exactly 9% in a year at every frequency, and is the default', () => {
  assert.equal(modelDefaults().rateBasis, 'effective');
  for (const frequency of ['annually', 'semiannually', 'quarterly', 'monthly', 'daily', 'continuous']) {
    const r = simulateCompound({ ...modelDefaults(), start: 100000, monthly: 0, rate: 9, years: 1, frequency });
    assert.ok(Math.abs(r.futureValue - 109000) < 1e-6, frequency);
  }
});

test('nominal rate: 9% compounded monthly grows 9.38% a year, and the basis round-trips through the link', () => {
  const v = { ...modelDefaults(), start: 100000, monthly: 0, rate: 9, years: 1, rateBasis: 'nominal' };
  assert.ok(Math.abs(simulateCompound(v).futureValue - 100000 * (1 + 0.09 / 12) ** 12) < 1e-6);
  assert.equal(decodeCompound(encodeCompound(v)).rateBasis, 'nominal');
  assert.equal(decodeCompound(encodeCompound(modelDefaults())).rateBasis, 'effective');
  assert.equal(encodeCompound(modelDefaults()).includes('rateBasis'), false);
});

test('effectiveAnnualRate shows the yearly growth the stated rate produces', () => {
  const base = { ...modelDefaults(), rate: 9 };
  for (const frequency of ['annually', 'monthly', 'daily', 'continuous']) {
    assert.ok(Math.abs(effectiveAnnualRate({ ...base, frequency, rateBasis: 'effective' }) - 9) < 1e-9);
  }
  assert.ok(Math.abs(effectiveAnnualRate({ ...base, frequency: 'annually', rateBasis: 'nominal' }) - 9) < 1e-9);
  assert.ok(Math.abs(effectiveAnnualRate({ ...base, frequency: 'monthly', rateBasis: 'nominal' }) - 9.3807) < 1e-3);
  assert.equal(effectiveAnnualRate({ ...base, rate: 0, frequency: 'monthly', rateBasis: 'nominal' }), 0);
});

test('Rule of 72 uses the rate the model compounds at: after tax, and after inflation in the todays-dollars basis', () => {
  const taxed = explain({ rate: 9, taxRate: 40 });
  assert.match(taxed['rule-of-72'], /72 ÷ 5\.4 ≈ 13 years/);
  assert.match(taxed['rule-of-72'], /5\.4% \(your 9% return after tax\)/);
  const real = explain({ rate: 9, basis: 'today', inflation: 3 });
  assert.match(real['rule-of-72'], /72 ÷ 5\.83 ≈ 12 years/);
  assert.match(real['rule-of-72'], /after inflation\)/);
  assert.match(explain({ rate: 9, taxRate: 40, basis: 'today' })['rule-of-72'], /after tax and inflation\)/);
  assert.match(explain({ rate: 2, basis: 'today', inflation: 3 })['rule-of-72'], /never doubles/);
  assert.match(explain({ rate: 7 })['rule-of-72'], /At 7% your money/);
});

test('every compound slider covers the allowed input range for years and holds its default', async () => {
  const { COMPOUND_FIELDS, MAX_YEARS } = await import('../site/compound.js');
  for (const f of COMPOUND_FIELDS.filter((x) => x.slider)) assert.ok(f.default >= f.slider.min && f.default <= f.slider.max, f.id);
  for (const id of ['years', 'contributeYears']) assert.equal(COMPOUND_FIELDS.find((f) => f.id === id).slider.max, MAX_YEARS);
});

test('curved sliders map a typed value to the right thumb position and back', () => {
  const f = (id) => COMPOUND_FIELDS.find((x) => x.id === id);
  assert.equal(sliderPos(f('start'), 1000000), Math.round(Math.sqrt(0.1) * SLIDER_STEPS));
  assert.equal(sliderPos(f('monthly'), 50000), Math.round(Math.sqrt(0.5) * SLIDER_STEPS));
  assert.equal(sliderPos(f('start'), 20000000), SLIDER_STEPS);
  for (const id of ['start', 'monthly']) for (const p of [0, 30, 50, 250, 500, 999, SLIDER_STEPS]) {
    assert.ok(Math.abs(sliderPos(f(id), sliderValue(f(id), p)) - p) <= 20, `${id} ${p}`);
  }
});

test('yearsToDouble uses the effective rate after tax', () => {
  const v = { ...modelDefaults(), rate: 9, rateBasis: 'effective', taxRate: 0 };
  assert.ok(Math.abs(yearsToDouble(v) - Math.log(2) / Math.log(1.09)) < 1e-9);
  assert.ok(yearsToDouble({ ...v, taxRate: 50 }) > yearsToDouble(v));
  assert.equal(yearsToDouble({ ...v, rate: 0 }), null);
});

test('double tile caption does not claim a 0% return when the rate is negative', () => {
  const v = { ...modelDefaults(), rate: -5, rateBasis: 'effective', taxRate: 0 };
  assert.deepEqual(doubleTileText(v), { value: 'Never', caption: 'Needs a positive return after tax' });
  assert.equal(doubleTileText({ ...v, rate: 0 }).value, 'Never');
  assert.equal(doubleTileText({ ...v, rate: 9 }).value, '8.0 years');
});

test('double tile is about a lump sum, so a withdrawal leaves it unchanged', () => {
  const v = { ...modelDefaults(), rate: 7, rateBasis: 'effective', taxRate: 0 };
  const w = { ...v, withdrawal: 2500, withdrawFrom: 31, years: 50 };
  assert.deepEqual(doubleTileText(w), doubleTileText(v));
  assert.equal(doubleTileText(w).value, '10.2 years'.replace('10.2', String(Math.round(Math.log(2) / Math.log(1.07)))));
});

test('compound chart y-axis uses round ticks with compact labels and tops out at a tick', () => {
  assert.deepEqual(niceTicks(2958683), [0, 500000, 1000000, 1500000, 2000000, 2500000, 3000000]);
  assert.deepEqual(niceTicks(1), [0, 0.2, 0.4, 0.6, 0.8, 1]);
  assert.deepEqual(niceTicks(95000), [0, 20000, 40000, 60000, 80000, 100000]);
  assert.deepEqual([0, 500, 50000, 1500000, 3000000].map(axisLabel), ['$0', '$500', '$50k', '$1.5M', '$3M']);
  const html = compoundChartHtml(simulateCompound({ start: 100000, monthly: 534, rate: 9, years: 26, frequency: 'monthly' }).years, (n) => `$${Math.round(n)}`);
  const labels = [...html.matchAll(/text-anchor="end" font-size="13">([^<]*)</g)].map((m) => m[1]);
  assert.deepEqual(labels.slice(0, 5), ['$0', '$500k', '$1M', '$1.5M', '$2M']);
});

const zero = { ...modelDefaults(), start: 0, rate: 0, years: 2 };

test('contribution frequency: deposits per year, with no growth at a 0% return', () => {
  const total = (contribFrequency) => simulateCompound({ ...zero, monthly: 100, contribFrequency }).contributed;
  assert.equal(total('weekly'), 100 * 52 * 2);
  assert.equal(total('biweekly'), 100 * 26 * 2);
  assert.equal(total('semimonthly'), 100 * 24 * 2);
  assert.equal(total('monthly'), 100 * 12 * 2);
  assert.equal(total('quarterly'), 100 * 4 * 2);
  assert.equal(total('annually'), 100 * 2);
});

test('contribution frequency: the default stays monthly and an unset frequency behaves the same', () => {
  const v = modelDefaults();
  assert.equal(v.contribFrequency, 'monthly');
  assert.equal(v.annual, 0);
  const { contribFrequency, annual, annualStepUp, ...old } = v;
  assert.equal(simulateCompound(old).futureValue, simulateCompound(v).futureValue);
});

test('contribution frequency: the same yearly total earns more when paid more often', () => {
  const run = (contribFrequency, monthly) => simulateCompound({ ...modelDefaults(), start: 0, monthly, contribFrequency }).futureValue;
  const yearly = 12000;
  assert.ok(run('weekly', yearly / 52) > run('monthly', yearly / 12));
  assert.ok(run('monthly', yearly / 12) > run('quarterly', yearly / 4));
  assert.ok(run('quarterly', yearly / 4) > run('annually', yearly));
});

test('contribution frequency: an annual deposit made at the start of the year earns a full year', () => {
  const end = simulateCompound({ ...zero, rate: 6, frequency: 'annually', rateBasis: 'nominal', years: 1, monthly: 1000, contribFrequency: 'annually', timing: 'end' });
  const start = simulateCompound({ ...zero, rate: 6, frequency: 'annually', rateBasis: 'nominal', years: 1, monthly: 1000, contribFrequency: 'annually', timing: 'start' });
  assert.equal(end.futureValue, 1000);
  assert.ok(Math.abs(start.futureValue - 1060) < 1e-9);
});

test('annual lump sum: adds to the regular contribution, steps up on its own, and stops with Contribute for', () => {
  const v = { ...zero, years: 3, monthly: 100, annual: 1000, annualStepUp: 10, stepUp: 0 };
  const r = simulateCompound(v);
  assert.deepEqual(r.years.map((y) => Math.round(y.contributions)), [2200, 2300, 2410]);
  const stopped = simulateCompound({ ...v, contributeYears: 1 });
  assert.deepEqual(stopped.years.map((y) => Math.round(y.contributions)), [2200, 0, 0]);
  assert.equal(simulateCompound({ ...v, monthly: 0 }).contributed, 1000 + 1100 + 1210);
});

test('annual lump sum and frequency round-trip through the link and validate', () => {
  const v = { ...modelDefaults(), contribFrequency: 'biweekly', annual: 6500, annualStepUp: 3 };
  const back = decodeCompound(encodeCompound(v));
  assert.equal(back.contribFrequency, 'biweekly');
  assert.equal(back.annual, 6500);
  assert.equal(back.annualStepUp, 3);
  assert.deepEqual(invalidCompound(v), []);
  assert.ok(invalidCompound({ ...v, contribFrequency: 'daily' }).length > 0);
  assert.ok(invalidCompound({ ...v, annualStepUp: 25 }).length > 0);
  assert.ok(invalidCompound({ ...v, annual: -1 }).length > 0);
});

test('headline and levers name the contribution frequency', () => {
  const v = { ...modelDefaults(), contribFrequency: 'weekly' };
  assert.match(leverTable(v).rows[0].label, /a week/);
  const stopped = { ...v, contributeYears: 0 };
  assert.match(headline(stopped, simulateCompound(stopped)), /you made no contributions/);
});

test('the year-by-year caption names the contribution period instead of always saying month', () => {
  const v = { ...modelDefaults(), timing: 'end' };
  assert.equal(yearsCaption(v), 'Year by year (contributions at the end of each month)');
  assert.equal(yearsCaption({ ...v, contribFrequency: 'weekly', timing: 'start' }), 'Year by year (contributions at the beginning of each week)');
  assert.equal(yearsCaption({ ...v, contribFrequency: 'quarterly' }), 'Year by year (contributions at the end of each quarter)');
  assert.equal(yearsCaption({ ...v, contribFrequency: 'annually', annual: 1000 }), 'Year by year (contributions at the end of each year, the annual lump sum at the end of each year)');
});

test('balance breakdown: four parts add to the final balance and match a hand calculation', () => {
  const v = { start: 10000, monthly: 500, rate: 7, years: 30, frequency: 'monthly', rateBasis: 'nominal', timing: 'end', stepUp: 0, taxRate: 0 };
  const b = balanceBreakdown(v);
  const r = simulateCompound(v);
  assert.ok(Math.abs(b.start + b.contributions + b.startInterest + b.contributionInterest - r.futureValue) < 1e-6);
  assert.equal(b.start, 10000);
  assert.equal(b.contributions, 180000);
  assert.ok(Math.abs(b.startInterest - (10000 * (1 + 0.07 / 12) ** 360 - 10000)) < 1e-6);
});

test('balance breakdown in today\'s dollars adds to the deflated balance and can go negative', () => {
  const v = { start: 10000, monthly: 200, rate: 1, years: 20, frequency: 'monthly', rateBasis: 'nominal', timing: 'end', stepUp: 0, taxRate: 0 };
  const b = balanceBreakdown(v, 5);
  assert.ok(Math.abs(b.start + b.contributions + b.startInterest + b.contributionInterest - b.total) < 1e-6);
  assert.ok(Math.abs(b.total - simulateCompound(v).futureValue / 1.05 ** 20) < 1e-6);
  assert.ok(b.startInterest < 0);
});

test('Basics come first, then the advanced inputs, and advancedChanged names what differs from default', async () => {
  const { COMPOUND_FIELDS, advancedChanged, compoundDefaults } = await import('../site/compound.js');
  assert.deepEqual(COMPOUND_FIELDS.filter((f) => !f.advanced).map((f) => f.id), ['start', 'monthly', 'years', 'months', 'rate']);
  const v = compoundDefaults();
  assert.deepEqual(advancedChanged(v), []);
  assert.deepEqual(advancedChanged({ ...v, years: 20, contributeYears: 20 }), []);
  assert.deepEqual(advancedChanged({ ...v, contributeYears: 10, stepUp: 3.5, timing: 'start' }), ['Contribute for (years)', 'Increase contribution each year (%)', 'Contributions made']);
});

test('growthRates steps the effective rate down for tax, then inflation in today\'s dollars', () => {
  const v = { ...modelDefaults(), rate: 9, rateBasis: 'effective', taxRate: 20, basis: 'future', inflation: 3 };
  const g = growthRates(v);
  assert.ok(Math.abs(g.effective - 9) < 1e-9);
  assert.ok(Math.abs(g.afterTax - 7.2) < 1e-9);
  assert.equal(g.real, null);
  assert.equal(g.net, g.afterTax);
  const t = growthRates({ ...v, basis: 'today' });
  assert.ok(Math.abs(t.real - ((1.072 / 1.03) - 1) * 100) < 1e-9);
  assert.equal(t.net, t.real);
});

test('growthRates takes no tax step for a non-interest account even with a tax rate set', () => {
  const v = { ...modelDefaults(), rate: 9, rateBasis: 'effective', taxRate: 20, basis: 'future' };
  for (const accountType of ['stocks', 'deferred', 'free']) {
    assert.equal(interestTax({ ...v, accountType }), 0);
    const g = growthRates({ ...v, accountType });
    assert.equal(g.afterTax, g.effective);
  }
  assert.equal(interestTax({ ...v, accountType: 'interest' }), 20);
});

test('yearsToDouble and its tile use the after-inflation rate in today\'s dollars', () => {
  const v = { ...modelDefaults(), rate: 9, rateBasis: 'effective', taxRate: 0, basis: 'today', inflation: 3 };
  const real = (1.09 / 1.03 - 1);
  assert.ok(Math.abs(yearsToDouble(v) - Math.log(2) / Math.log1p(real)) < 1e-9);
  assert.match(doubleTileText(v).caption, /after inflation/);
  assert.deepEqual(doubleTileText({ ...v, rate: 2 }), { value: 'Never', caption: 'Needs a positive return after inflation' });
});

test('account types: tax-free ignores the rate, deferred taxes the balance, stocks taxes dividends and gain', () => {
  const v = { ...compoundDefaults(), start: 1000, monthly: 0, rate: 10, years: 10, frequency: 'annually', timing: 'end' };
  const plain = simulateCompound({ ...v, taxRate: 0 }).futureValue;
  assert.equal(simulateCompound({ ...v, accountType: 'free', taxRate: 30 }).futureValue, plain);
  assert.ok(Math.abs(simulateCompound({ ...v, accountType: 'deferred', taxRate: 30 }).futureValue - plain * 0.7) < 1e-9);
  const stocks = simulateCompound({ ...v, accountType: 'stocks', taxRate: 20 });
  assert.ok(stocks.futureValue < plain && stocks.futureValue > plain * 0.7);
  assert.equal(simulateCompound({ ...v, accountType: 'stocks', taxRate: 0 }).futureValue, plain);
  const one = simulateCompound({ ...v, years: 1, accountType: 'stocks', taxRate: 20 });
  // 1100 balance; dividend 22 taxed 4.4 -> 1095.6, basis 1000 + 17.6; gain tax 20% of 78
  assert.ok(Math.abs(one.futureValue - (1095.6 - 0.2 * (1095.6 - 1017.6))) < 1e-9);
});

test('account type is a choice that round-trips and defaults to taxable interest', () => {
  assert.equal(compoundDefaults().accountType, 'interest');
  const v = { ...compoundDefaults(), accountType: 'deferred', taxRate: 22 };
  assert.deepEqual(invalidCompound({ ...v, accountType: 'bogus' }), ['Account type']);
  assert.equal(decodeCompound(encodeCompound(v)).accountType, 'deferred');
  assert.ok(!encodeCompound(compoundDefaults()).includes('accountType'));
});

test('monthly schedule: 12 rows a year, each December matches its year row, in every compounding mode', () => {
  for (const frequency of ['monthly', 'daily', 'quarterly', 'annually']) {
    for (const timing of ['end', 'start']) {
      const r = simulateCompound({ ...compoundDefaults(), years: 5, frequency, timing, stepUp: 3, taxRate: 20 });
      assert.equal(r.months.length, 60);
      r.years.forEach((y, i) => {
        const dec = r.months[i * 12 + 11];
        assert.ok(Math.abs(dec.balance - y.balance) < 1e-6, `${frequency}/${timing} year ${y.year}`);
        assert.ok(Math.abs(dec.totalContributed - y.totalContributed) < 1e-6);
        const mi = r.months.slice(i * 12, i * 12 + 12).reduce((a, m) => a + m.interest, 0);
        assert.ok(Math.abs(mi - y.interest) < 1e-6);
      });
    }
  }
});

test('withdrawals: zero rate takes the amount out each month, from the start year, with a yearly increase', () => {
  const base = { start: 12000, monthly: 0, rate: 0, years: 3, frequency: 'monthly', timing: 'end' };
  const r = simulateCompound({ ...base, withdrawal: 100, withdrawFrom: 2, withdrawStep: 0 });
  assert.equal(r.years[0].withdrawals, 0);
  assert.equal(r.years[1].withdrawals, 1200);
  assert.equal(r.futureValue, 12000 - 2400);
  assert.equal(r.withdrawn, 2400);
  assert.equal(r.runsOut, null);
  const up = simulateCompound({ ...base, withdrawal: 100, withdrawFrom: 1, withdrawStep: 10 });
  assert.ok(Math.abs(up.years[1].withdrawals - 1320) < 1e-9);
  assert.equal(r.years[2].totalInterest, 0);
});

test('withdrawals never take the balance below zero and report when the money runs out', () => {
  for (const frequency of ['monthly', 'annually']) {
    const r = simulateCompound({ start: 10000, monthly: 0, rate: 5, years: 10, frequency, timing: 'end', withdrawal: 500, withdrawFrom: 1 });
    assert.equal(r.futureValue, 0, frequency);
    assert.ok(r.years.every((y) => y.balance >= 0));
    assert.ok(r.runsOut.year >= 2 && r.runsOut.year <= 3, `${frequency} ran out in ${r.runsOut.year}`);
    assert.ok(Math.abs(r.futureValue - (r.contributed - r.withdrawn + r.interest)) < 1e-6, frequency);
    assert.match(headline({ years: 10, basis: 'future' }, r), /the money runs out in year \d/);
  }
});

test('withdrawals: interest is total earned, so balance = put in - taken out + interest; todays dollars keeps that', () => {
  const v = { ...compoundDefaults(), withdrawal: 1000, withdrawFrom: 31, years: 40, contributeYears: 30 };
  const r = simulateCompound(v);
  assert.ok(Math.abs(r.futureValue - (r.contributed - r.withdrawn + r.interest)) < 1e-6);
  const t = inTodaysDollars(r, 3);
  assert.ok(Math.abs(t.futureValue - (t.contributed - t.withdrawn + t.interest)) < 1e-6);
  assert.equal(compareStartingLater(v), null);
});

test('withdrawal inputs: validated, encoded in links and defaulted to none', () => {
  assert.equal(compoundDefaults().withdrawal, 0);
  assert.deepEqual(invalidCompound({ ...compoundDefaults(), withdrawFrom: 0 }), ['Start withdrawing in year']);
  assert.deepEqual(invalidCompound({ ...compoundDefaults(), withdrawStep: 25 }), ['Increase withdrawal each year (%)']);
  assert.deepEqual(invalidCompound({ ...compoundDefaults(), withdrawal: -5 }), ['Withdrawal amount']);
  const v = { ...modelDefaults(), withdrawal: 2000, withdrawFrom: 31, withdrawStep: 3 };
  const back = decodeCompound(encodeCompound(v));
  assert.equal(back.withdrawal, 2000);
  assert.equal(back.withdrawFrom, 31);
  assert.equal(back.withdrawStep, 3);
  assert.equal(encodeCompound(modelDefaults()), '');
});

test('a withdrawal that overdraws pays out the whole balance at every compounding frequency, with no negative interest', () => {
  for (const frequency of ['monthly', 'quarterly', 'semiannually', 'annually']) {
    for (const timing of ['end', 'start']) {
      const r = simulateCompound({ start: 10000, monthly: 0, rate: 6, rateBasis: 'effective', years: 10, frequency, timing, withdrawal: 2000, withdrawFrom: 1 });
      assert.ok(r.withdrawn >= 10000, `${frequency}/${timing} withdrew ${r.withdrawn}`);
      assert.ok(r.interest >= 0, `${frequency}/${timing} interest ${r.interest}`);
      assert.ok(r.runsOut && r.runsOut.year === 1, `${frequency}/${timing} runs out in year 1`);
    }
  }
});

test("monthly schedule in today's dollars ends each year at that year's real balance", () => {
  const r = inTodaysDollars(simulateCompound({ ...compoundDefaults(), years: 4 }), 3);
  r.years.forEach((y, i) => assert.ok(Math.abs(r.months[i * 12 + 11].balance - y.balance) < 1e-6));
  assert.ok(Math.abs(r.months[47].totalInterest - r.interest) < 1e-6);
});

test('a negative return never drives the balance below zero with withdrawals, and the totals still reconcile', () => {
  for (const frequency of ['monthly', 'quarterly', 'semiannually', 'annually']) {
    for (const timing of ['end', 'start']) {
      const r = simulateCompound({ start: 50000, monthly: 0, rate: -5, rateBasis: 'effective', years: 10, frequency, timing, withdrawal: 20000, withdrawFrom: 2, withdrawStep: 3 });
      for (const y of r.years) assert.ok(y.balance >= 0, `${frequency}/${timing} year ${y.year} balance ${y.balance}`);
      assert.ok(r.runsOut, `${frequency}/${timing} reports the run-out`);
      assert.ok(Math.abs(r.futureValue - (r.contributed - r.withdrawn + r.interest)) < 1e-6, `${frequency}/${timing} reconciles`);
      const small = simulateCompound({ start: 50000, monthly: 0, rate: -5, rateBasis: 'effective', years: 10, frequency, timing, withdrawal: 500, withdrawFrom: 2 });
      for (const y of small.years) assert.ok(y.balance >= 0, `${frequency}/${timing} small year ${y.year} balance ${y.balance}`);
    }
  }
});

test('hero shows the balance in both future and today\'s dollars, so Inflation always has a visible effect', () => {
  const app = readFileSync(new URL('../site/compound-app.js', import.meta.url), 'utf8');
  assert.match(app, /id="compound-other-dollars"/);
  assert.match(app, /in today's dollars \(\$\{infl\}\)/);
});

test('compound chart has a legend entry for the return range, labels the band ends and offers a dollars switch', () => {
  const v = { start: 100000, monthly: 534, rate: 9, years: 26, frequency: 'monthly' };
  const years = simulateCompound(v).years;
  const low = simulateCompound({ ...v, rate: 7 }).years;
  const high = simulateCompound({ ...v, rate: 11 }).years;
  const fmt = (n) => `$${Math.round(n)}`;
  const html = compoundChartHtml(years, fmt, { low, high, lowRate: 7, highRate: 11 }, 'future');
  assert.match(html, /Range at 7%–11% return/);
  assert.match(html, /class="cc-band-label"[^>]*>\$\d+</);
  assert.ok(html.includes(`>${fmt(high[high.length - 1].balance)}<`) && html.includes(`>${fmt(low[low.length - 1].balance)}<`));
  assert.match(html, /data-basis="future" aria-pressed="true"/);
  assert.match(html, /data-basis="today" aria-pressed="false"/);
  assert.match(compoundChartHtml(years, fmt, null, 'today'), /data-basis="today" aria-pressed="true"/);
  const plain = compoundChartHtml(years, fmt);
  assert.doesNotMatch(plain, /Range at|cc-band-label|data-basis/);
  assert.match(plain, /What you put in/);
});

test('withdrawals combine with contribution frequency and the annual lump sum, and the totals still reconcile', () => {
  for (const frequency of ['monthly', 'quarterly', 'annually']) {
    for (const timing of ['end', 'start']) {
      const r = simulateCompound({ ...modelDefaults(), start: 5000, monthly: 50, contribFrequency: 'weekly', annual: 1000, rate: 6, years: 5, frequency, timing, withdrawal: 400, withdrawFrom: 2 });
      assert.ok(r.withdrawn > 0 && r.years[0].withdrawals === 0, `${frequency}/${timing}`);
      assert.ok(r.years.every((y) => y.balance >= 0), `${frequency}/${timing}`);
      assert.ok(Math.abs(r.futureValue - (r.contributed - r.withdrawn + r.interest)) < 1e-6, `${frequency}/${timing} reconciles`);
    }
  }
});

test('balance breakdown with withdrawals nets them out of the contributions and still adds to the balance', () => {
  const v = { start: 20000, monthly: 300, rate: 6, years: 20, frequency: 'monthly', rateBasis: 'nominal', timing: 'end', stepUp: 0, taxRate: 0, withdrawal: 100, withdrawFrom: 11, withdrawStep: 0 };
  for (const inflation of [null, 3]) {
    const b = balanceBreakdown(v, inflation);
    const r = simulateCompound(v);
    assert.ok(b.withdrawn > 0);
    assert.ok(Math.abs(b.start + b.contributions + b.startInterest + b.contributionInterest - b.total) < 1e-6);
    if (inflation == null) assert.ok(Math.abs(b.contributions - (r.contributed - r.start - r.withdrawn)) < 1e-6);
  }
});

test('monthly schedule with withdrawals: each December matches its year row, withdrawals and totals included', () => {
  for (const frequency of ['monthly', 'quarterly', 'annually']) {
    const r = simulateCompound({ ...compoundDefaults(), years: 6, frequency, withdrawal: 500, withdrawFrom: 3 });
    for (const t of [r, inTodaysDollars(r, 3)]) {
      t.years.forEach((y, i) => {
        const dec = t.months[i * 12 + 11];
        const w = t.months.slice(i * 12, i * 12 + 12).reduce((a, m) => a + m.withdrawals, 0);
        assert.ok(Math.abs(dec.balance - y.balance) < 1e-6, `${frequency} balance ${y.year}`);
        assert.ok(Math.abs(w - y.withdrawals) < 1e-6, `${frequency} withdrawals ${y.year}`);
        assert.ok(Math.abs(dec.totalInterest - y.totalInterest) < 1e-6, `${frequency} interest ${y.year}`);
      });
    }
  }
});

test('monthly schedule with weekly contributions and a lump sum: months add up to the year rows', () => {
  for (const frequency of ['monthly', 'quarterly', 'annually']) {
    for (const timing of ['end', 'start']) {
      const r = simulateCompound({ ...modelDefaults(), start: 1000, monthly: 25, contribFrequency: 'weekly', annual: 600, rate: 6, years: 4, frequency, timing, withdrawal: 100, withdrawFrom: 2 });
      assert.equal(r.months.length, 48);
      r.years.forEach((y, i) => {
        const ms = r.months.slice(i * 12, i * 12 + 12);
        const sum = (key) => ms.reduce((a, m) => a + m[key], 0);
        assert.ok(Math.abs(ms[11].balance - y.balance) < 1e-6, `${frequency}/${timing} balance ${y.year}`);
        assert.ok(Math.abs(sum('contributions') - y.contributions) < 1e-6, `${frequency}/${timing} contributions ${y.year}`);
        assert.ok(Math.abs(sum('withdrawals') - y.withdrawals) < 1e-6, `${frequency}/${timing} withdrawals ${y.year}`);
        assert.ok(Math.abs(sum('interest') - y.interest) < 1e-6, `${frequency}/${timing} interest ${y.year}`);
      });
    }
  }
});

test('withdrawals: quarterly, half-yearly and yearly amounts are taken on their schedule', () => {
  const base = { start: 10000, monthly: 0, rate: 0, years: 3, frequency: 'monthly', timing: 'end', rateBasis: 'effective', withdrawal: 100, withdrawFrom: 1 };
  assert.equal(simulateCompound({ ...base, withdrawFreq: 'monthly' }).years[0].withdrawals, 1200);
  assert.equal(simulateCompound({ ...base, withdrawFreq: 'quarterly' }).years[0].withdrawals, 400);
  assert.equal(simulateCompound({ ...base, withdrawFreq: 'semiannually' }).years[0].withdrawals, 200);
  const yearly = simulateCompound({ ...base, withdrawFreq: 'yearly', withdrawFrom: 2 });
  assert.deepEqual(yearly.years.map((y) => y.withdrawals), [0, 100, 100]);
  assert.equal(yearly.months.filter((m) => m.withdrawals > 0).map((m) => m.month).join(), '24,36');
  assert.equal(simulateCompound({ ...base, withdrawFreq: 'yearly', timing: 'start' }).months.filter((m) => m.withdrawals > 0).map((m) => m.month).join(), '1,13,25');
});

test('withdrawals: a percent of the balance and of the earnings', () => {
  const base = { start: 10000, monthly: 0, rate: 12, years: 3, frequency: 'annually', timing: 'end', rateBasis: 'effective', withdrawFrom: 1, withdrawFreq: 'yearly' };
  const bal = simulateCompound({ ...base, withdrawMode: 'percentBalance', withdrawPercent: 10 });
  // Below monthly compounding the interest joins the balance only at period end, so the percent applies to the cash on hand.
  assert.ok(Math.abs(bal.years[0].withdrawals - 1000) < 1e-9);
  assert.ok(Math.abs(bal.futureValue - (bal.contributed - bal.withdrawn + bal.interest)) < 1e-6);
  const earn = simulateCompound({ ...base, withdrawMode: 'percentEarnings', withdrawPercent: 50 });
  assert.ok(Math.abs(earn.years[0].withdrawals - 600) < 1e-9);
  assert.equal(earn.runsOut, null);
  assert.equal(simulateCompound({ ...base, withdrawMode: 'percentBalance', withdrawPercent: 0 }).withdrawn, 0);
  assert.equal(withdrawsOn({ withdrawMode: 'percentBalance', withdrawal: 500, withdrawPercent: 0 }), false);
  assert.equal(withdrawsOn({ withdrawal: 500 }), true);
  assert.deepEqual(invalidCompound({ ...modelDefaults(), withdrawPercent: 101 }), ['Withdrawal percent (%)']);
});

test('a term in years and months ends with a partial final year', () => {
  const v = { ...compoundDefaults(), years: 1, months: 6, contributeYears: 1, contributeMonths: 6 };
  const r = simulateCompound(v);
  const i = 1 + 0.07 / 12;
  const closed = 10000 * i ** 18 + 500 * ((i ** 18 - 1) / (0.07 / 12));
  assert.ok(Math.abs(r.futureValue - closed) < 0.01);
  assert.equal(r.contributed, 10000 + 500 * 18);
  assert.deepEqual(r.years.map((y) => y.year), [1, 1.5]);
  assert.equal(r.years[1].contributions, 3000);
  assert.match(headline(v, r), /^After 1 year 6 months, your \$19,000 becomes/);
  // Months alone: a 9-month term, and the same plan as whole years when months is 0.
  assert.equal(simulateCompound({ ...v, years: 0, months: 9, contributeYears: 0, contributeMonths: 9 }).years.length, 1);
  assert.equal(simulateCompound({ ...v, months: 0, contributeMonths: 0 }).futureValue, simulateCompound({ ...v, months: undefined, contributeMonths: undefined }).futureValue);
});

test('contributions can stop partway through a year, and with periodic compounding the last period is pro rata', () => {
  const v = { ...compoundDefaults(), start: 0, years: 2, months: 3, contributeYears: 1, contributeMonths: 4 };
  const r = simulateCompound(v);
  assert.equal(r.contributed, 500 * 16);
  assert.equal(r.years[1].contributions, 500 * 4);
  assert.equal(r.years[2].contributions, 0);
  const q = simulateCompound({ ...compoundDefaults(), frequency: 'annually', start: 1000, monthly: 0, years: 0, months: 6 });
  assert.ok(Math.abs(q.futureValue - 1000 * (1 + 0.07 / 2)) < 1e-9);
});

test('months validate, round-trip through the link, and fall back safely', () => {
  const v = { ...compoundDefaults(), years: 2, months: 5, contributeYears: 1, contributeMonths: 7 };
  assert.deepEqual(invalidCompound(v), []);
  const back = decodeCompound(encodeCompound(v));
  assert.equal(back.months, 5);
  assert.equal(back.contributeYears, 1);
  assert.equal(back.contributeMonths, 7);
  assert.deepEqual(invalidCompound({ ...v, months: 12 }), ['Months']);
  assert.deepEqual(invalidCompound({ ...v, years: 0, months: 0, contributeYears: 0, contributeMonths: 0 }), ['Years']);
  assert.deepEqual(invalidCompound({ ...v, years: 100, months: 1 }), ['Years']);
  assert.equal(decodeCompound('months=12').months, 0);
  assert.equal(decodeCompound('years=0&months=0').years, 30);
  assert.equal(encodeCompound(compoundDefaults()), 'rateBasis=nominal');
  assert.equal(decodeCompound('years=1&months=6&contributeYears=5').contributeMonths, 6);
});

test('cost of waiting and the extra-years lever honour months', () => {
  const v = { ...compoundDefaults(), years: 12, months: 6, contributeYears: 12, contributeMonths: 6 };
  const c = compareStartingLater(v);
  assert.ok(c.gap > 0);
  assert.equal(compareStartingLater({ ...v, years: 10, months: 0 }), null);
  assert.equal(compareStartingLater({ ...v, years: 10, months: 1 }) !== null, true);
  const lever = leverTable({ ...v, years: 99, months: 6 }).rows.find((r) => r.id === 'years');
  assert.equal(lever, undefined);
});
