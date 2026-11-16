// What every results card is handed: the model result, the inputs and the dollars basis, with the
// few values several cards share worked out once.
import { compareRentOwn } from '../rentown.js';
import { compareRentThenBuy } from '../rentown-later.js';
import { word } from './format.js';

export function buildContext(v, basis) {
  const r = compareRentOwn(v);
  const later = compareRentThenBuy(v, r);
  const today = basis === 'today';
  return {
    v,
    r,
    later,
    today,
    final: today ? r.finalReal : r.final,
    label: today ? "in today's dollars" : 'in future dollars',
    span: word(v.years, 'year'),
  };
}
