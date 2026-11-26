import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareRentOwn, rentOwnDefaults } from '../site/rentown.js';
import { lensesCard } from '../site/rentown/lenses.js';
import { tableRows } from '../site/rentown/chart.js';

// FINC-147: the lens summaries and the year-by-year table must tell the same story. For a spread of
// inputs and every combination of view (realized/unrealized) and dollars (future/today), each lens
// summary's winner, gap and break-even are read back out of the rendered card and checked against the
// table rows the page shows.
const LENSES = [
  { title: 'Equal-cash view', col: 3, key: 'difference', breakEven: 'breakEven', month: 'breakEvenMonth', final: 'difference' },
  { title: 'Pure net worth view', col: 6, key: 'pureDifference', breakEven: 'pureBreakEven', month: 'pureBreakEvenMonth', final: 'pureDifference' },
];

const INPUTS = [
  {},
  { years: 1 },
  { years: 3 },
  { years: 15 },
  { years: 30 },
  { years: 10, rate: 3 },
  { years: 10, rate: 8 },
  { years: 7, down: 3 },
  { years: 7, down: 50 },
  { years: 12, investment: 2 },
  { years: 12, investment: 12 },
  { years: 7, rent: 4000 },
  { years: 7, rent: 900 },
  { years: 20, selling: 10, capGains: 25 },
  { years: 7, inflation: 6 },
];

const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&mdash;/g, '—').replace(/\s+/g, ' ');
const lastBehind = (rows, col) => rows.map((row) => row[col] < 0).lastIndexOf(true);

for (const input of INPUTS) {
  for (const view of ['realized', 'unrealized']) {
    for (const today of [false, true]) {
      const name = `${JSON.stringify(input)} ${view} ${today ? 'today' : 'future'}`;
      test(`lens summaries match the table: ${name}`, () => {
        const v = { ...rentOwnDefaults(), ...input, view };
        const r = compareRentOwn(v);
        const rows = tableRows(r, today);
        const final = today ? r.finalReal : r.final;
        const card = text(lensesCard({ r, final, label: 'x', span: 'y', view }));
        for (const l of LENSES) {
          const sentence = card.split(l.title)[1].split(' Owner:')[0].split(' Both sides')[0];
          const diff = rows[rows.length - 1][l.col];
          // Gap after the stay: same amount and the same winner as the last table row.
          const gap = sentence.match(/(Owning|Renting) leaves you about \$([\d,]+) ahead/);
          if (diff === 0) assert.match(sentence, /come out about even/, name);
          else {
            assert.ok(gap, `${name} ${l.title}: ${sentence}`);
            assert.equal(gap[1], diff > 0 ? 'Owning' : 'Renting', `${name} ${l.title} winner`);
            assert.ok(Math.abs(Number(gap[2].replace(/,/g, '')) - Math.abs(diff)) <= 1, `${name} ${l.title} gap ${gap[2]} vs ${diff}`);
          }
          // Break-even: the first table year after which owning stays ahead, and the month inside it.
          const behind = lastBehind(rows, l.col);
          const year = behind === rows.length - 1 ? null : rows[behind + 1][0];
          assert.equal(r[l.breakEven], year, `${name} ${l.title} break-even year`);
          if (year == null) assert.match(sentence, /does not catch up/, name);
          else {
            const m = sentence.match(/year (\d+), month (\d+) \(year (\d+) on a yearly basis\)/);
            assert.ok(m, `${name} ${l.title}: ${sentence}`);
            assert.equal(Number(m[3]), year, `${name} ${l.title} yearly basis`);
            assert.equal(Number(m[1]), year, `${name} ${l.title} month falls in the table's break-even year`);
            assert.equal(r[l.month], (Number(m[1]) - 1) * 12 + Number(m[2]), name);
          }
        }
      });
    }
  }
}
