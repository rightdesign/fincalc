import assert from 'node:assert/strict';
import { test } from 'node:test';
import { groupWhileTyping } from '../site/grouping.js';

// Minimal text-input stand-in: just the bits groupWhileTyping touches.
function fakeInput(value, caret) {
  const handlers = {};
  const input = {
    type: 'text', value, selectionStart: caret, selectionEnd: caret, inputs: 0,
    addEventListener(name, fn) { handlers[name] = fn; },
    setSelectionRange(a, b) { this.selectionStart = a; this.selectionEnd = b; },
    dispatchEvent() { this.inputs++; },
  };
  globalThis.Event ??= class {};
  groupWhileTyping(input);
  input.press = (inputType) => {
    let prevented = false;
    handlers.beforeinput({ inputType, preventDefault() { prevented = true; } });
    return prevented;
  };
  return input;
}

test('backspace just after a comma deletes the digit before it', () => {
  const input = fakeInput('1,000,000', 6);
  assert.equal(input.press('deleteContentBackward'), true);
  assert.equal(input.value, '100,000');
  assert.equal(input.selectionStart, 3);
  assert.equal(input.inputs, 1);
});

test('forward delete just before a comma deletes the digit after it', () => {
  const input = fakeInput('1,234,567', 5);
  assert.equal(input.press('deleteContentForward'), true);
  assert.equal(input.value, '123,467');
  assert.equal(input.selectionStart, 5);
});

test('backspace away from a comma is left to the browser', () => {
  const input = fakeInput('1,000,000', 7);
  assert.equal(input.press('deleteContentBackward'), false);
  assert.equal(input.value, '1,000,000');
});
