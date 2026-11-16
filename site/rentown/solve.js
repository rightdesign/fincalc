import { rentOwnFlipPoint } from '../rentown.js';
import { money } from './format.js';

// The inputs worth solving for: the value at which owning and renting end the stay equal.
export const SOLVE_TARGETS = [
  { id: 'price', label: 'home price', min: 10000, max: 10000000 },
  { id: 'rent', label: 'monthly rent', min: 50, max: 50000 },
];

// The price (or rent) that makes the net worth gap $0 at the chosen stay, holding every other input as entered.
// Null when no value in the range does. Price and rent are whole dollars on the page, so the answer is rounded.
export function solveBreakEven(v, id) {
  const target = SOLVE_TARGETS.find((t) => t.id === id);
  const flip = rentOwnFlipPoint(v, target);
  return flip == null ? null : Math.round(flip);
}

export function solveText(v, id) {
  const target = SOLVE_TARGETS.find((t) => t.id === id);
  const solved = solveBreakEven(v, id);
  const years = `${v.years} ${v.years === 1 ? 'year' : 'years'}`;
  if (solved == null) return { id, solved, text: `No ${target.label} from ${money(target.min)} to ${money(target.max)} makes buying break even in ${years} with your other inputs.` };
  const subject = id === 'price' ? `at a ${target.label} of ${money(solved)}` : `if rent is ${money(solved)} a month`;
  return { id, solved, text: `Buying breaks even in ${years} ${subject} (you entered ${money(v[id])}).` };
}
