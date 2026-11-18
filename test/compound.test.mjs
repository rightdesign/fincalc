import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPOUND_PRESETS, choiceEffects, compareStartingLater, compoundDefaults, compoundingExplainer, decodeCompound, doublingMilestones, encodeCompound, headline, inTodaysDollars, invalidCompound, leverTable, roundedMoney, simulateCompound } from '../site/compound.js';

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
  assert.equal(real.contributed, 190000);
  const zero = inTodaysDollars(nominal, 0);
  assert.equal(zero.futureValue, nominal.futureValue);
  assert.equal(zero.interest, nominal.interest);
  assert.match(headline({ ...v, basis: 'today' }, real), /becomes about \$285,000 in today's dollars — about \$95,000 more than you put in\.$/);
  const w = { ...v, basis: 'today', inflation: 2.5 };
  assert.deepEqual(decodeCompound(encodeCompound(w)), w);
  assert.equal(encodeCompound({ ...v, inflation: 3 }), '');
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
  assert.equal(encodeCompound(d), '');
  assert.deepEqual(decodeCompound(encodeCompound({ ...d, timing: 'start' })), { ...d, timing: 'start' });
  assert.equal(decodeCompound('#timing=never').timing, 'end');
});

test('start-early comparison: $500/month at 7% for 40 years versus 30', () => {
  const v = { start: 0, monthly: 500, rate: 7, years: 40, frequency: 'monthly' };
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
  assert.equal(real.now.contributed, 240000);
  assert.equal(real.extraContributed, 60000);
  assert.equal(compareStartingLater({ ...v, basis: 'today', inflation: 0 }).gap, c.gap);
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
  assert.equal(t.best, 'years');
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
  const d = compoundDefaults();
  assert.equal(encodeCompound({ ...d, contributeYears: 10 }), 'contributeYears=10');
  assert.equal(decodeCompound('#contributeYears=10').contributeYears, 10);
  assert.equal(encodeCompound({ ...d, years: 20, contributeYears: 20 }), 'years=20');
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
