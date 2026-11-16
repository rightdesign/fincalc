// Refreshes site/data/rates.json with the latest Freddie Mac 30-year fixed average
// (the FRED series MORTGAGE30US). Run it weekly: node scripts/update-rate.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const FRED = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=MORTGAGE30US';
const file = new URL('../site/data/rates.json', import.meta.url);

// The newest row of a FRED CSV that has a number in it (missing weeks are ".").
export function latestObservation(csv) {
  const rows = String(csv).trim().split(/\r?\n/).slice(1).map((line) => line.split(','));
  for (let i = rows.length - 1; i >= 0; i--) {
    const [date, value] = rows[i];
    const rate = Number(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && value !== '' && Number.isFinite(rate)) return { week: date, rate };
  }
  return null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const res = await fetch(FRED);
  if (!res.ok) throw new Error(`FRED answered ${res.status}`);
  const found = latestObservation(await res.text());
  if (!found) throw new Error('no observation found in the FRED data');
  const prev = JSON.parse(readFileSync(file, 'utf8'));
  const next = { ...prev, ...found, updated: new Date().toISOString().slice(0, 10) };
  writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`rates.json: ${next.rate}% for the week of ${next.week}`);
}
