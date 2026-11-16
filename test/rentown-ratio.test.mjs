import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rentOwnDefaults } from '../site/rentown.js';
import { ratioLine } from '../site/rentown/ratio.js';
import { renderCards } from '../site/rentown/cards.js';
import { buildContext } from '../site/rentown/context.js';

test('defaults: 16.3x, rent 6.1% of price, rule recomputed', () => {
  const line = ratioLine(rentOwnDefaults());
  assert.match(line, /^Price-to-rent 16\.3× · rent is 6\.1% of price\/yr · rule of thumb at your 6\.5% rate: renting wins below ~\d+\.\d%\/yr$/);
});

test('the rule share moves with the mortgage rate', () => {
  const share = (rate) => Number(ratioLine({ ...rentOwnDefaults(), rate }).match(/below ~([\d.]+)%/)[1]);
  assert.ok(share(8) > share(4));
});

test('the line shows under the headline', () => {
  const html = renderCards(buildContext(rentOwnDefaults(), 'future'));
  assert.ok(html.indexOf('ro-headline') < html.indexOf('ro-ratio'));
});
