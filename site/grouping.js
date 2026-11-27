import { groupAmount } from './mortgage.js';

// Puts thousands commas into a text field as digits are typed or pasted, so 1000000 reads
// 1,000,000. The caret stays after the same digit it was after, and backspace (or delete)
// next to a comma removes the digit beside it instead of only stepping over the comma.
// Only text fields are touched: the same field can switch to a percent number box.
// The field's value is read back with parseAmount, which ignores the commas.
export function groupWhileTyping(input) {
  // Regroups the value and puts the caret after the same number of digits it followed in `text`.
  const regroup = (text, caret) => {
    const keep = text.slice(0, caret).replace(/[^\d.]/g, '').length;
    const grouped = groupAmount(text);
    input.value = grouped;
    let seen = 0;
    let pos = 0;
    while (pos < grouped.length && seen < keep) if (/[\d.]/.test(grouped[pos++])) seen++;
    input.setSelectionRange(pos, pos);
  };
  input.addEventListener('beforeinput', (e) => {
    if (input.type !== 'text') return;
    if (input.selectionStart !== input.selectionEnd) return;
    const at = input.selectionStart;
    const v = input.value;
    // Moving the caret here does not change what the browser deletes, so do the delete ourselves.
    const gone =
      e.inputType === 'deleteContentBackward' && v[at - 1] === ','
        ? at - 2
        : e.inputType === 'deleteContentForward' && v[at] === ','
          ? at + 1
          : -1;
    if (gone < 0 || gone >= v.length) return;
    e.preventDefault();
    const next = v.slice(0, gone) + v.slice(gone + 1);
    regroup(next, gone);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  input.addEventListener('input', () => {
    if (input.type !== 'text') return;
    const before = input.value;
    if (groupAmount(before) === before) return;
    regroup(before, input.selectionStart ?? before.length);
  });
}
