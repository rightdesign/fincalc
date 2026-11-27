import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { compareRentOwn, rentOwnDefaults, rentOwnThresholds } from '../site/rentown.js';
import { defaultValues } from '../site/inputs.js';
import { downsizeWaterfall } from '../site/results.js';
import { netSaleProceeds } from '../site/engine.js';
import { CALCULATORS } from '../site/menu.js';

// Regression guardrails (FINC-114): what must survive every change to the calculators.
const page = (name) => readFileSync(new URL(`../site/${name}`, import.meta.url), 'utf8');
// A page's text with runs of whitespace collapsed, so a sentence is found wherever the formatter wraps it.
const prose = (name) => page(name).replace(/\s+/g, ' ');
const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('T0 ($450,000, 20% down, 6.5%, 30 years, $2,300 rent, 7 years) keeps its recorded headline', () => {
  // Renting led by $27,910 before the PMI and investment-tax tickets; with them, and no security deposit, it leads by this much.
  const r = compareRentOwn({ ...rentOwnDefaults(), investDrag: 0.7, deposit: 0 });
  near(r.final.difference, -12001.84);
  // The default one-month deposit (FINC-125) moves it by the return that money forgoes, after investment tax.
  near(compareRentOwn({ ...rentOwnDefaults(), investDrag: 0.7 }).final.difference, -11337.02);
  assert.equal(r.years.length, 7);
  assert.equal(r.breakEven, null);
});

test('the proceeds waterfall for a $5.5M home reconciles', () => {
  assert.equal(5500000 - 357500 - 1732000 - 435000 - 20000, 2955500);
  const v = {
    ...defaultValues(),
    homeValue: 5500000,
    sellingCostsPct: 6.5,
    mortgageBalance: 435000,
    movingCosts: 20000,
    newHomePrice: 100000,
    newBuyingCostsPct: 0,
    newMortgageAmount: 0,
  };
  const sale = netSaleProceeds(v);
  near(sale.sellingCosts, 357500);
  const w = downsizeWaterfall(v);
  const at = w.steps.findIndex((x) => x.label === 'Net proceeds');
  near(
    w.steps.slice(0, at).reduce((t, x) => t + x.amount, 0),
    w.steps[at].amount,
    1e-6,
  );
});

test('the main calculator still has the two lenses and the "What drives the verdict" thresholds', () => {
  const app = page('app.js');
  assert.match(app, /'pure-net-worth', 'Pure net worth'/);
  assert.match(app, /'equal-cash', 'Equal cash contributions'/);
  assert.match(page('results.js'), /What drives the verdict/);
});

test('rent-vs-own keeps its break-even definition and its drivers', () => {
  assert.ok(
    prose('rent-vs-own.html').includes(
      'Break-even is the first year after which owning stays ahead through the end of your stay.',
    ),
  );
  assert.ok(rentOwnThresholds(rentOwnDefaults()).length >= 3);
});

test('Copy link, Print and Reset exist on both pages', () => {
  for (const name of ['app.js', 'rent-vs-own.html']) {
    const text = page(name);
    assert.match(text, /Copy link to these inputs/, name);
    assert.match(text, /Print&hellip;/, name);
    assert.match(text, /Reset/, name);
  }
});

test('the calculators stay linked from the menu, compound interest first', () => {
  assert.deepEqual(
    CALCULATORS.map((c) => c.href),
    ['compound.html', 'index.html', 'rent-vs-own.html', 'mortgage.html'],
  );
});

test('the "Not modelled" list does not claim what is modelled', () => {
  const html = page('rent-vs-own.html');
  const list = html.match(/Not modelled:([^.]*)\./)[1];
  assert.doesNotMatch(list, /PMI|mortgage insurance|capital gains|investment tax|major repair/i);
  assert.ok(rentOwnDefaults().pmi > 0 && rentOwnDefaults().capGains > 0);
});
