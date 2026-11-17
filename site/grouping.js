import { groupAmount } from './mortgage.js';

// Puts thousands commas into a text field as digits are typed or pasted, so 1000000 reads
// 1,000,000. The caret stays after the same digit it was after, and backspace (or delete)
// next to a comma removes the digit beside it instead of only stepping over the comma.
// Only text fields are touched: the same field can switch to a percent number box.
// The field's value is read back with parseAmount, which ignores the commas.
export function groupWhileTyping(input) {
  input.addEventListener('beforeinput', (e) => {
    if (input.type !== 'text') return;
    if (input.selectionStart !== input.selectionEnd) return;
    const at = input.selectionStart;
    if (e.inputType === 'deleteContentBackward' && input.value[at - 1] === ',') input.setSelectionRange(at - 1, at - 1);
    else if (e.inputType === 'deleteContentForward' && input.value[at] === ',') input.setSelectionRange(at + 1, at + 1);
  });
  input.addEventListener('input', () => {
    if (input.type !== 'text') return;
    const before = input.value;
    const grouped = groupAmount(before);
    if (grouped === before) return;
    const caret = input.selectionStart ?? before.length;
    const keep = before.slice(0, caret).replace(/[^\d.]/g, '').length;
    input.value = grouped;
    let seen = 0;
    let pos = 0;
    while (pos < grouped.length && seen < keep) if (/[\d.]/.test(grouped[pos++])) seen++;
    input.setSelectionRange(pos, pos);
  });
}
