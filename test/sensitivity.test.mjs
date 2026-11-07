import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultValues } from '../site/inputs.js';
import { project } from '../site/engine.js';
import { DRIVERS, flipPoint, sensitivityLines } from '../site/sensitivity.js';

const base = { ...defaultValues(), repairs: [] };
const end = (v) => { const r = project(v).rows; return r[r.length - 1].netWorthGainLoss; };

test('the flip point sits on the sign change of the end-of-horizon margin', () => {
  const d = DRIVERS.find((x) => x.id === 'investmentGrowth');
  const flip = flipPoint(base, d);
  assert.ok(flip > 0 && flip < d.max);
  const lo = end({ ...base, investmentGrowth: flip - 0.01 });
  const hi = end({ ...base, investmentGrowth: flip + 0.01 });
  assert.notEqual(lo >= 0, hi >= 0);
});

test('higher investment return favours selling, higher appreciation favours staying', () => {
  const lines = Object.fromEntries(sensitivityLines({ ...base, investmentGrowth: 8 }).map((l) => [l.id, l]));
  assert.match(lines.investmentGrowth.text, /selling wins if it is above/);
  assert.match(lines.appreciation.text, /selling wins if it is below/);
});

test('a driver that never flips the verdict says so', () => {
  const v = { ...base, investmentGrowth: 25, rent: 0, rentersInsurance: 0 };
  const line = sensitivityLines(v).find((l) => l.id === 'rentGrowth');
  assert.equal(line.flip, null);
  assert.match(line.text, /does not change the verdict/);
});
