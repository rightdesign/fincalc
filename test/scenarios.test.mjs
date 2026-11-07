import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_SCENARIOS, addScenario, compareScenarios, parseStored, removeScenario } from '../site/scenarios.js';
import { defaultValues } from '../site/inputs.js';

test('adds, replaces by name, and caps the list', () => {
  const v = defaultValues();
  let list = addScenario([], ' Base ', v);
  assert.equal(list[0].name, 'Base');
  list = addScenario(list, 'base', { ...v, appreciation: 1 });
  assert.equal(list.length, 1);
  assert.equal(list[0].values.appreciation, 1);
  list = addScenario(list, 'Optimistic', v);
  list = addScenario(list, 'Pessimistic', v);
  assert.equal(list.length, MAX_SCENARIOS);
  assert.match(addScenario(list, 'Fourth', v).error, /up to 3/);
  assert.match(addScenario([], '  ', v).error, /name/);
});

test('removes by name', () => {
  const v = defaultValues();
  const list = addScenario(addScenario([], 'A', v), 'B', v);
  assert.deepEqual(removeScenario(list, 'A').map((s) => s.name), ['B']);
});

test('parseStored tolerates bad input', () => {
  assert.deepEqual(parseStored('nope'), []);
  assert.deepEqual(parseStored('{"a":1}'), []);
  assert.deepEqual(parseStored('[{"name":"A","values":{"x":1}},{"bad":1}]').map((s) => s.name), ['A']);
});

test('compares verdicts side by side', () => {
  const v = defaultValues();
  const list = addScenario(addScenario([], 'Base', v), 'Low growth', { ...v, investmentGrowth: 0 });
  const c = compareScenarios(list);
  assert.deepEqual(c.names, ['Base', 'Low growth']);
  for (const r of c.rows) assert.equal(r.length, 3);
  assert.equal(c.rows[0][1], `${v.horizon} years`);
  assert.equal(c.rows[3][1], c.rows[3][2]);
  assert.notEqual(c.rows[4][1], c.rows[4][2]);
});
