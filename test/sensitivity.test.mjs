import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultValues } from '../site/inputs.js';
import { project } from '../site/engine.js';
import { DRIVERS, flipPoint, selfFundingRent, sensitivityLines } from '../site/sensitivity.js';

const base = { ...defaultValues(), repairs: [], investmentWithdrawal: 0 };
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

test('downsize lines compare downsizing with staying and skip rent growth', () => {
  const lines = sensitivityLines(base).filter((l) => l.path === 'downsize');
  assert.deepEqual(lines.map((l) => l.id), ['downsize-appreciation', 'downsize-investmentGrowth', 'downsize-taxRate']);
  for (const l of lines) assert.match(l.text, /downsizing wins|staying wins/);
});

test('the downsize flip point follows the downsize margin and the proceeds setting', () => {
  const d = DRIVERS.find((x) => x.id === 'appreciation');
  const v = { ...base, newHomePrice: 300000, newMortgageAmount: 0 };
  const endGap = (x) => { const r = project(x).rows; return r[r.length - 1].downsizeGainLoss; };
  const flip = flipPoint(v, d, 'downsize');
  assert.ok(flip > 0 && flip < d.max);
  assert.notEqual(endGap({ ...v, appreciation: flip - 0.01 }) >= 0, endGap({ ...v, appreciation: flip + 0.01 }) >= 0);
  const off = flipPoint({ ...v, useProceeds: 0 }, d, 'downsize');
  assert.ok(off > flip);
});

test('self-funding rent: income at the breakeven rate equals the first year of rent', () => {
  const v = { ...base, investmentWithdrawal: 4, withdrawalTaxRate: 10 };
  const line = selfFundingRent(v);
  const capital = project(v).rows[0].investmentCapital;
  const annualRent = v.rent * 12 + v.rentersInsurance;
  assert.ok(Math.abs(capital * (line.rate / 100) * 0.9 - annualRent) < 0.01);
  const income = capital * (v.investmentWithdrawal / 100) * 0.9;
  assert.ok(Math.abs(income - v.rentersInsurance - line.rent * 12) < 0.01);
  assert.match(line.text, /Self-funding rent/);
});

test('self-funding rent says so when the proceeds cover the rent, or cannot', () => {
  const covered = selfFundingRent({ ...base, investmentWithdrawal: 100, withdrawalTaxRate: 0 });
  assert.match(covered.text, /pays the rent in full/);
  const topUp = selfFundingRent({ ...base, investmentWithdrawal: 0.1 });
  assert.match(topUp.text, /top up about/);
  const broke = selfFundingRent({ ...base, homeValue: 100000, mortgageBalance: 100000, movingCosts: 5000 });
  assert.equal(broke.rate, null);
  assert.match(broke.text, /cannot pay any rent/);
});
