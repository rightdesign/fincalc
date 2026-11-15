import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { floorProblem, invalidFields, mortgageDefaults, payment, rateAfter, scenarios, simulate } from '../site/mortgage.js';
import { mortgageChart } from '../site/mortgage-chart.js';
import { CALCULATORS, menuHtml } from '../site/menu.js';

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('payment matches the standard amortizing formula and handles 0%', () => {
  near(payment(100000, 6, 360), 599.55);
  near(payment(1200, 0, 12), 100);
});

test('with no rate change the loan equals a fixed loan and pays off exactly', () => {
  const v = { ...mortgageDefaults(), change: 0 };
  const r = simulate(v);
  near(r.extraInterest, 0, 0.5);
  assert.equal(r.years.length, 30);
  near(r.years[29].balance, 0);
  near(r.years.reduce((s, y) => s + y.principal, 0), v.loan, 0.5);
});

test('rising rates raise the payment after the initial period and total interest', () => {
  const r = simulate(mortgageDefaults());
  near(r.years[0].payment, r.years[4].payment);
  assert.ok(r.years[5].payment > r.years[4].payment);
  assert.ok(r.extraInterest > 0);
  near(r.years[29].balance, 0);
});

test('caps and floor limit the rate', () => {
  const v = { ...mortgageDefaults(), change: 3, firstCap: 1, periodicCap: 1, lifetimeCap: 2.5 };
  assert.equal(rateAfter(v, 1), 6.5);
  assert.equal(rateAfter(v, 10), 8);
  assert.equal(rateAfter({ ...v, change: -5, firstCap: 5, periodicCap: 5 }, 10), 2);
});

test('the first adjustment has its own cap', () => {
  const v = { ...mortgageDefaults(), change: 3, firstCap: 2, periodicCap: 1, lifetimeCap: 5 };
  assert.equal(rateAfter(v, 1), 7.5);
  assert.equal(rateAfter(v, 2), 8.5);
  assert.equal(rateAfter(v, 3), 9.5);
  assert.equal(rateAfter(v, 4), 10.5);
});

test('invalid values are named', () => {
  assert.deepEqual(invalidFields(mortgageDefaults()), []);
  assert.equal(invalidFields({ ...mortgageDefaults(), loan: NaN, term: 2.5 }).length, 2);
  assert.deepEqual(invalidFields({ ...mortgageDefaults(), fixedYears: 0 }), ['Years before the first rate change']);
});

test('a floor above the starting rate is reported', () => {
  assert.equal(floorProblem(mortgageDefaults()), '');
  assert.equal(floorProblem({ ...mortgageDefaults(), floor: 5.5 }), '');
  assert.match(floorProblem({ ...mortgageDefaults(), floor: 7 }), /above the starting rate/);
});

test('the menu lists every calculator, and each page exists', () => {
  const html = menuHtml('mortgage.html');
  for (const c of CALCULATORS) {
    assert.ok(html.includes(`href="${c.href}"`));
    assert.ok(readFileSync(new URL(`../site/${c.href}`, import.meta.url), 'utf8').includes('menu.js'));
  }
  assert.ok(html.includes('aria-current="page">Variable-rate'));
});

test('the mortgage charts mark the peak payment and describe themselves', () => {
  const r = simulate(mortgageDefaults());
  const c = mortgageChart(r.years, { key: 'payment', title: 'Monthly payment by year', fmt: (n) => `$${Math.round(n)}` });
  assert.match(c.svg, /<svg[^>]*role="img"/);
  assert.ok(c.svg.includes(`Peak: $${Math.round(r.maxPayment)}, year 15`));
  assert.ok(c.description.includes(`peaks at $${Math.round(r.maxPayment)} in year 15`));
  const flat = mortgageChart(simulate({ ...mortgageDefaults(), change: 0 }).years, { key: 'rate', title: 'Rate', fmt: String });
  assert.ok(!flat.svg.includes('NaN'));
  const rate = mortgageChart(r.years, { key: 'rate', title: 'Rate', fmt: (n) => `${n.toFixed(1)}%` });
  assert.ok(rate.svg.includes('Peak: 10.5%, year 15'));
});

test('the mortgage page renders both charts', () => {
  const src = readFileSync(new URL('../site/mortgage-app.js', import.meta.url), 'utf8');
  assert.match(src, /key: 'rate'/);
  assert.match(src, /key: 'payment'/);
});

test('best, expected and worst cases bracket the expected path', () => {
  const sc = scenarios(mortgageDefaults());
  assert.equal(sc.worst.maxRate, 10.5);
  assert.equal(sc.best.maxRate, 5.5);
  assert.equal(sc.best.years[29].rate, 2);
  assert.ok(sc.best.maxPayment <= sc.expected.maxPayment && sc.expected.maxPayment < sc.worst.maxPayment);
  assert.ok(sc.best.totalInterest < sc.expected.totalInterest && sc.expected.totalInterest < sc.worst.totalInterest);
  assert.ok(sc.worst.shock > 0.25);
  near(sc.worst.years[29].balance, 0);
});

test('a first rate change at or past the end of the term never resets', () => {
  const d = mortgageDefaults();
  assert.equal(simulate(d).noReset, false);
  assert.equal(simulate({ ...d, fixedYears: 40 }).noReset, true);
  assert.equal(simulate({ ...d, fixedYears: 30 }).noReset, true);
  near(simulate({ ...d, fixedYears: 40 }).extraInterest, 0);
});
