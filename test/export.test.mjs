import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvFilename, tableCsv } from '../site/export.js';
import { buildResults } from '../site/results.js';
import { defaultValues } from '../site/inputs.js';

test('money cells become plain numbers and other text is kept', () => {
  const csv = tableCsv({ id: 'x', columns: ['Year', 'Stay'], rows: [['1', '$1,234'], ['2', '-$56'], ['3', '$0']] });
  assert.equal(csv, 'Year,Stay\r\n1,1234\r\n2,-56\r\n3,0\r\n');
});

test('cells with commas, quotes or newlines are quoted', () => {
  const csv = tableCsv({ id: 'x', columns: ['A, B', 'Say "hi"'], rows: [['line\nbreak', 'ok']] });
  assert.equal(csv, '"A, B","Say ""hi"""\r\n"line\nbreak",ok\r\n');
});

test('every real section exports a header plus one line per row', () => {
  const { sections } = buildResults({ ...defaultValues(), repairs: [] });
  assert.ok(sections.length > 0);
  for (const s of sections) {
    const lines = tableCsv(s).trimEnd().split('\r\n');
    assert.equal(lines.length, s.rows.length + 1);
    assert.ok(!tableCsv(s).includes('$'));
    assert.equal(csvFilename(s), `fincalc-${s.id}.csv`);
  }
});
