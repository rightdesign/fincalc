import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareRentOwn, decodeView, encodeRentOwn, rentOwnDefaults } from '../site/rentown.js';
import { buildContext } from '../site/rentown/context.js';
import { headlineCard } from '../site/rentown/headline.js';

const base = () => rentOwnDefaults();
const paper = (v = base()) => compareRentOwn({ ...v, view: 'unrealized' });

test('realized is the default and a view of realized changes nothing', () => {
  assert.deepEqual(compareRentOwn({ ...base(), view: 'realized' }), compareRentOwn(base()));
});

test('unrealized owning is home value less loan and repairs, with no selling costs or sale tax', () => {
  const v = { ...base(), repairYear: 0, repairCost: 0 };
  const realized = compareRentOwn(v);
  const unrealized = paper(v);
  const sellingCosts = realized.waterfall.moneyBack.sellingCosts;
  const { value, balance } = realized.waterfall.moneyBack;
  assert.ok(sellingCosts > 0);
  assert.ok(Math.abs(unrealized.final.own - (value - balance)) < 1e-6);
  assert.ok(Math.abs(unrealized.final.own - (realized.final.own + sellingCosts + realized.final.homeTax)) < 1e-6);
  assert.equal(unrealized.final.homeTax, 0);
  assert.equal(unrealized.final.saleTax, 0);
  assert.equal(unrealized.waterfall.moneyBack.sellingCosts, 0);
});

test('unrealized renting is the investment balance before tax', () => {
  assert.ok(paper().final.rent >= compareRentOwn(base()).final.rent);
});

test('the cost breakdown still adds up to the gap in the unrealized view', () => {
  const { waterfall: w, final } = paper();
  assert.ok(Math.abs(w.gap + final.difference) < 1e-6);
});

test('the view round-trips through the fragment and defaults to realized', () => {
  assert.equal(decodeView(encodeRentOwn(base(), 'future', undefined, 'unrealized')), 'unrealized');
  assert.equal(decodeView(encodeRentOwn(base())), 'realized');
  assert.equal(encodeRentOwn(base()), '');
  assert.equal(decodeView('view=bogus'), 'realized');
});

test('the headline names the view it follows', () => {
  assert.match(headlineCard(buildContext(base(), 'future')), /realized \(after selling costs/);
  assert.match(headlineCard(buildContext(base(), 'future', 'unrealized')), /unrealized \(on paper/);
});

test('unrealized results never claim selling costs or sale tax were deducted', async () => {
  const { renderCards } = await import('../site/rentown/cards.js');
  const html = (view) => renderCards(buildContext(base(), 'future', view));
  const paperHtml = html('unrealized');
  assert.ok(!/selling costs/i.test(paperHtml.replace(/no selling costs|Selling costs when you sell/gi, '')), 'mentions selling costs');
  assert.ok(!/after selling/i.test(paperHtml));
  assert.ok(!/sale price less/i.test(paperHtml));
  assert.match(paperHtml, /not counted in the unrealized view/);
  assert.match(html('realized'), /home equity after selling costs/);
});

test('a break-even after year 1 interpolates the cost wording in both views', () => {
  for (const view of ['realized', 'unrealized']) {
    for (const price of [350000, 450000, 550000]) {
      const ctx = buildContext({ ...base(), price }, 'future', view);
      const html = headlineCard(ctx);
      assert.ok(!html.includes('${'), `${view} ${price}: literal placeholder`);
      if (ctx.r.breakEven > 1) {
        assert.match(html, view === 'unrealized' ? /mostly because of closing costs\./ : /mostly because of closing and selling costs\./);
      }
    }
  }
});
