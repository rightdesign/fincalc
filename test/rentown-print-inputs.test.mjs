import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rentOwnDefaults } from '../site/rentown.js';
import { renderCards } from '../site/rentown/cards.js';
import { buildContext } from '../site/rentown/context.js';

test('printed inputs show the option label for the mortgage type', () => {
  const fixed = renderCards(buildContext(rentOwnDefaults(), 'future'));
  assert.match(fixed, /Mortgage type<\/th><td>Fixed rate</);
  const arm = renderCards(buildContext({ ...rentOwnDefaults(), arm: 1 }, 'future'));
  assert.match(arm, /Mortgage type<\/th><td>Adjustable rate \(ARM\)</);
});
