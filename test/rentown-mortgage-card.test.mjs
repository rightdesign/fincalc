import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rentOwnDefaults, EXCLUSION_BY_FILING } from '../site/rentown.js';
import { mortgageCard, mortgageRows } from '../site/rentown/mortgage-card.js';
import { renderCards } from '../site/rentown/cards.js';
import { buildContext } from '../site/rentown/context.js';

test('one row per year of the stay; the paid column adds up and the balance falls', () => {
  const ctx = buildContext({ ...rentOwnDefaults(), years: 5 }, 'future');
  const rows = mortgageRows(ctx.r);
  assert.equal(rows.length, 5);
  for (const x of rows) {
    assert.equal(x.payment, x.interest + x.principal);
    assert.equal(x.paid, x.payment + x.other);
  }
  assert.ok(rows[1].balance < rows[0].balance && rows[0].balance < ctx.r.program.loan);
  assert.ok(rows[1].principal > rows[0].principal);
});

test('the card shows the loan, the payment and sits on the monthly tab', () => {
  const ctx = buildContext(rentOwnDefaults(), 'future');
  const html = mortgageCard(ctx);
  assert.ok(html.includes('Your mortgage') && html.includes('Paid each month'));
  assert.ok(html.includes(`$${Math.round(ctx.r.firstMortgage).toLocaleString('en-US')}`));
  assert.ok(renderCards(ctx, 'monthly').includes('ro-mortgage-card'));
});

test('a loan paid off before the stay ends shows paid-off rows', () => {
  const ctx = buildContext({ ...rentOwnDefaults(), term: 10, years: 12 }, 'future');
  const rows = mortgageRows(ctx.r);
  assert.equal(rows.length, 12);
  assert.ok(rows[11].paidOff && rows[11].balance === 0);
  assert.ok(mortgageCard(ctx).includes('Paid off'));
});

test('an ARM payment changes at a reset; a 1-year stay gives one row', () => {
  const arm = buildContext({ ...rentOwnDefaults(), arm: 1, armFixedMonths: 24, armIndexChange: 1, years: 5 }, 'future');
  const rows = mortgageRows(arm.r);
  assert.notEqual(rows[0].payment, rows[4].payment);
  assert.equal(mortgageRows(buildContext({ ...rentOwnDefaults(), years: 1 }, 'future').r).length, 1);
});

test('filing status maps to the home-sale exclusion and defaults to married', () => {
  assert.equal(EXCLUSION_BY_FILING[1], 250000);
  assert.equal(EXCLUSION_BY_FILING[2], 500000);
  const d = rentOwnDefaults();
  assert.equal(d.filing, 2);
  assert.equal(d.exclusion, 250000, 'the stored default is unchanged so old shared links keep their number');
});
