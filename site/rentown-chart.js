// SVG line chart for the rent vs own calculator: net worth of each choice by
// year, with the break-even year marked. Pure (data in, strings out).
const W = 480;
const H = 220;
const PAD = { l: 72, r: 16, t: 20, b: 28 };

const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// years: [{ year, own, rent }]. Returns { svg, description }.
export function rentOwnChart(years, breakEven, fmt) {
  const xs = years.map((y) => y.year);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const all = years.flatMap((y) => [y.own, y.rent]);
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo) * 0.1 || Math.abs(hi) * 0.1 || 1;
  const yMin = lo - pad;
  const yMax = hi + pad;
  const sx = (x) => PAD.l + (xMax === xMin ? 0 : ((x - xMin) / (xMax - xMin)) * (W - PAD.l - PAD.r));
  const sy = (y) => H - PAD.b - ((y - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b);
  const f = (n) => n.toFixed(1);
  const line = (key) => years.map((y, i) => `${i ? 'L' : 'M'}${f(sx(y.year))},${f(sy(y[key]))}`).join('');

  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Net worth if you own and if you rent, by year" class="chart">`;
  for (let i = 0; i <= 4; i++) {
    const y = yMin + ((yMax - yMin) * i) / 4;
    svg += `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${f(sy(y))}" y2="${f(sy(y))}" class="grid"/>`;
    svg += `<text x="${PAD.l - 6}" y="${f(sy(y) + 4)}" text-anchor="end" font-size="10">${escape(fmt(y))}</text>`;
  }
  svg += `<text x="${PAD.l}" y="${H - 8}" font-size="10">Year ${xMin}</text>`;
  svg += `<text x="${W - PAD.r}" y="${H - 8}" text-anchor="end" font-size="10">Year ${xMax}</text>`;
  const repair = years.find((y) => y.repair);
  if (repair) {
    const x = sx(repair.year);
    const anchor = repair.year > (xMin + xMax) / 2 ? 'end' : 'start';
    svg += `<line x1="${f(x)}" x2="${f(x)}" y1="${PAD.t}" y2="${H - PAD.b}" class="grid" stroke-dasharray="2 3"/>`;
    svg += `<text x="${f(x + (anchor === 'end' ? -4 : 4))}" y="${PAD.t + 8}" text-anchor="${anchor}" font-size="10">Major repair: year ${repair.year}</text>`;
  }
  svg += `<path d="${line('own')}" fill="none" style="stroke:var(--series-1)" stroke-width="2.5"/>`;
  svg += `<path d="${line('rent')}" fill="none" style="stroke:var(--series-2)" stroke-width="2.5" stroke-dasharray="6 4"/>`;
  const last = years[years.length - 1];
  const above = last.own >= last.rent;
  svg += `<text x="${W - PAD.r}" y="${f(sy(last.own) + (above ? -6 : 14))}" text-anchor="end" font-size="10" style="fill:var(--series-1)">Own</text>`;
  svg += `<text x="${W - PAD.r}" y="${f(sy(last.rent) + (above ? 14 : -6))}" text-anchor="end" font-size="10" style="fill:var(--series-2)">Rent</text>`;
  if (breakEven != null) {
    const b = years.find((y) => y.year === breakEven);
    const x = sx(b.year);
    const anchor = b.year > (xMin + xMax) / 2 ? 'end' : 'start';
    svg += `<circle class="ring" cx="${f(x)}" cy="${f(sy(b.own))}" r="4" style="stroke:var(--series-1)" stroke-width="2"/>`;
    svg += `<text x="${f(x + (anchor === 'end' ? -8 : 8))}" y="${f(sy(b.own) + 16)}" text-anchor="${anchor}" font-size="10">Break-even: year ${b.year}</text>`;
  }
  svg += '</svg>';

  const description = `Net worth line chart for owning and renting. In year ${xMin} owning is ${fmt(years[0].own)} and renting is ${fmt(years[0].rent)}; in year ${xMax} owning is ${fmt(last.own)} and renting is ${fmt(last.rent)}. ${breakEven == null ? 'Owning does not catch up within your stay.' : `Owning pulls ahead in year ${breakEven}.`} ${repair ? `The major repair is paid in year ${repair.year}. ` : ''}The values for every year are in the table beside the chart.`;
  return { svg, description };
}

export function rentOwnChartHtml(years, breakEven, fmt) {
  const { svg, description } = rentOwnChart(years, breakEven, fmt);
  return `<figure class="m-chart"><figcaption>Net worth by year: own (home equity after selling costs) vs rent (investments)</figcaption>${svg}<p class="visually-hidden">${escape(description)}</p></figure>`;
}
