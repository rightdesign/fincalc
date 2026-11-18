// Stacked area chart for the compound interest calculator: what you put in, with the interest it
// has earned on top. Pure (data in, strings out). rows: [{ year, totalContributed, totalInterest, balance }].
const W = 480;
const H = 240;
const PAD = { l: 72, r: 16, t: 20, b: 28 };
const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function compoundChartHtml(rows, fmt) {
  const first = rows[0];
  const last = rows[rows.length - 1];
  const xs = [0, ...rows.map((r) => r.year)];
  const put = [rows[0].totalContributed - rows[0].contributions, ...rows.map((r) => r.totalContributed)];
  const bal = [put[0], ...rows.map((r) => r.balance)];
  const yMax = Math.max(...bal, 1);
  const sx = (x) => PAD.l + (x / last.year) * (W - PAD.l - PAD.r);
  const sy = (y) => H - PAD.b - (y / yMax) * (H - PAD.t - PAD.b);
  const f = (n) => n.toFixed(1);
  const line = (vals) => vals.map((v, i) => `${i ? 'L' : 'M'}${f(sx(xs[i]))},${f(sy(v))}`).join('');
  const base = `L${f(sx(last.year))},${f(sy(0))}L${f(sx(0))},${f(sy(0))}Z`;
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Growth by year chart" class="chart">`;
  for (let i = 0; i <= 4; i++) {
    const y = (yMax * i) / 4;
    svg += `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${f(sy(y))}" y2="${f(sy(y))}" class="grid"/>`;
    svg += `<text x="${PAD.l - 6}" y="${f(sy(y) + 4)}" text-anchor="end" font-size="12">${escape(fmt(y))}</text>`;
  }
  svg += `<text x="${PAD.l}" y="${H - 8}" font-size="12">Today</text>`;
  svg += `<text x="${W - PAD.r}" y="${H - 8}" text-anchor="end" font-size="12">Year ${last.year}</text>`;
  svg += `<path d="${line(bal)}${base}" style="fill:var(--series-2);fill-opacity:0.35;stroke:var(--series-2)" stroke-width="2"/>`;
  svg += `<path d="${line(put)}${base}" style="fill:var(--series-1);fill-opacity:0.45;stroke:var(--series-1)" stroke-width="2"/>`;
  svg += `<text x="${f(sx(last.year) - 8)}" y="${f(sy(bal[bal.length - 1]) + 16)}" text-anchor="end" font-size="12" style="fill:var(--series-2)">Interest earned</text>`;
  svg += `<text x="${f(sx(last.year) - 8)}" y="${f(sy(put[put.length - 1]) - 6)}" text-anchor="end" font-size="12" style="fill:var(--series-1)">What you put in</text>`;
  svg += '</svg>';
  const description = `Stacked area chart over ${last.year} years. What you put in grows to ${fmt(last.totalContributed)} and the interest earned on top of it reaches ${fmt(last.totalInterest)}, for a balance of ${fmt(last.balance)} in year ${last.year}. The full values for every year are in the table below.`;
  return `<figure class="m-chart">${svg}<p class="visually-hidden" id="compound-chart-desc">${escape(description)}</p></figure>`;
}
