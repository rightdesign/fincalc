import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compoundDefaults, inTodaysDollars, simulateCompound } from '../site/compound.js';
import { faqCard, faqItems, FAQ_SOURCES } from '../site/compound-faq.js';

const v = compoundDefaults();
const r = simulateCompound(v);

test('the four required questions are answered', () => {
  const qs = faqItems(v, r).map((i) => i.q);
  for (const q of ['Is 7% a realistic return?', 'Does compounding work with monthly contributions?', 'What about taxes and fees?', 'What if I increase my contribution every year?']) assert.ok(qs.includes(q), q);
});

test('the 7% answer cites the S&P 500 long-run average', () => {
  const a = faqItems(v, r).find((i) => i.q.startsWith('Is 7%')).a;
  assert.match(a, /S&P 500/);
  assert.match(a, /about 10%/);
  assert.match(a, /about 7% after inflation/);
  assert.match(a, /not a forecast/);
});

test('answers quote the numbers on the page and follow the inputs', () => {
  const text = faqItems(v, r).map((i) => i.a).join(' ');
  assert.ok(text.includes('$190,000') && text.includes('$500 a month'));
  const w = { ...v, rate: 4, monthly: 250 };
  const t2 = faqItems(w, simulateCompound(w)).map((i) => i.a).join(' ');
  assert.ok(t2.includes('4% a year') && t2.includes('$250 a month'));
});

test('taxes: described by the tax input; fees not modelled; yearly increase is described', () => {
  const items = faqItems(v, r);
  assert.match(items.find((i) => i.q.startsWith('What about taxes')).a, /before tax.*Choose an account type.*Fees are not charged/);
  const w = { ...v, taxRate: 25 };
  const a = faqItems(w, simulateCompound(w)).find((i) => i.q.startsWith('What about taxes')).a;
  assert.match(a, /25% tax rate.*after tax/);
  assert.match(items.find((i) => i.q.startsWith('What if I increase')).a, /Increase contribution each year/);
});

test('sources have links and dates, and the card renders them', () => {
  assert.ok(FAQ_SOURCES.length >= 3);
  for (const s of FAQ_SOURCES) assert.match(s.url, /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}\/[^\s]*$/);
  const html = faqCard(v, r);
  assert.ok(html.includes('ro-faq') && html.includes('spglobal.com') && html.includes('as of'));
});

test('page keeps the methodology formula and convention, and ends with the standard footer', () => {
  const page = readFileSync(new URL('../site/compound.html', import.meta.url), 'utf8');
  assert.ok(page.includes('FV = S') && page.includes('Monthly compounding:') && page.includes('Annual compounding:'));
  assert.match(page, /<p class="disclaimer">\s*<strong>Not financial advice\.<\/strong>/);
  assert.ok(readFileSync(new URL('../site/compound-app.js', import.meta.url), 'utf8').includes('faqCard(v, r)'));
});

test("today's-dollars mode quotes the restated figures and says so", () => {
  const w = { ...v, basis: 'today', inflation: 3 };
  const shown = inTodaysDollars(simulateCompound(w), w.inflation);
  const items = faqItems(w, shown);
  const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
  const text = items.map((i) => i.a).join(' ');
  assert.ok(text.includes(money(shown.futureValue)) && text.includes(money(shown.interest)));
  assert.match(items.find((i) => i.q.startsWith('Does compounding work')).a, /growth after inflation/);
  assert.match(items.find((i) => i.q.startsWith('Does compounding work')).a, /today's dollars/);
  assert.match(items.find((i) => i.q.startsWith('Are the results')).a, /^Yes, right now/);
  assert.ok(!text.includes(money(simulateCompound(w).futureValue)));
});

test("future-dollars mode says the results are not in today's dollars; earlier FAQ entries are kept", () => {
  const qs = faqItems(v, r).map((i) => i.q);
  for (const q of ['What is compound interest?', 'What return should I use?', "Are the results in today's dollars?"]) assert.ok(qs.includes(q), q);
  assert.match(faqItems(v, r).find((i) => i.q.startsWith('Are the results')).a, /^Not at the moment/);
});

test('the stop-contributing FAQ quotes the live numbers', () => {
  const w = { ...v, contributeYears: 20 };
  const a = faqItems(w, simulateCompound(w)).find((i) => i.q === 'What if I stop contributing?').a;
  assert.match(a, /stop after 20 years/);
  assert.match(a, /other 10 years/);
  assert.match(a, /stopping early costs \$/);
  const b = faqItems(v, r).find((i) => i.q === 'What if I stop contributing?').a;
  assert.match(b, /stopped after 10 years/);
});

test('with a withdrawal the FAQ never quotes interest as a share of the balance and mentions the money taken out', () => {
  const w = { ...v, withdrawal: 2500, withdrawFrom: 31, years: 50 };
  const wr = simulateCompound(w);
  const items = faqItems(w, wr);
  for (const i of items) assert.doesNotMatch(i.a, /\d+% of the \$/, i.q);
  const first = items.find((i) => i.q === 'What is compound interest?').a;
  assert.match(first, /took out \$/);
  assert.doesNotMatch(first, /of the \$/);
  const monthly = items.find((i) => i.q === 'Does compounding work with monthly contributions?').a;
  assert.match(monthly, /take out \$/);
  assert.match(items.find((i) => i.q === 'What if I stop contributing?').a, /same withdrawals are taken in both plans/);
});
