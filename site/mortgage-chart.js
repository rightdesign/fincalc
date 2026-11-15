// SVG line charts for the variable-rate mortgage calculator: the rate and the
// monthly payment by year, with the peak marked. Pure (data in, strings out).
const W = 480;
const H = 220;
const PAD = { l: 64, r: 16, t: 20, b: 28 };

const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// years: [{ year, ... }]. key picks the plotted value, fmt formats it.
// Returns { svg, description }.
export function mortgageChart(years, { key, title, fmt }) {
  const xs = years.map((y) => y.year);
  const ys = years.map((y) => y[key]);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const pad = (hi - lo) * 0.1 || Math.abs(hi) * 0.1 || 1;
  const yMin = Math.max(0, lo - pad);
  const yMax = hi + pad;
  const sx = (x) => PAD.l + (xMax === xMin ? 0 : ((x - xMin) / (xMax - xMin)) * (W - PAD.l - PAD.r));
  const sy = (y) => H - PAD.b - ((y - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b);
  const f = (n) => n.toFixed(1);

  // The first year within rounding noise of the maximum, so a plateau marks where it starts.
  const peak = years.find((y) => y[key] >= hi - 0.005);
  const first = years[0];
  const last = years[years.length - 1];

  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escape(title)} chart" class="chart">`;
  for (let i = 0; i <= 4; i++) {
    const y = yMin + ((yMax - yMin) * i) / 4;
    svg += `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${f(sy(y))}" y2="${f(sy(y))}" class="grid"/>`;
    svg += `<text x="${PAD.l - 6}" y="${f(sy(y) + 4)}" text-anchor="end" font-size="12">${escape(fmt(y))}</text>`;
  }
  svg += `<text x="${PAD.l}" y="${H - 8}" font-size="12">Year ${xMin}</text>`;
  svg += `<text x="${W - PAD.r}" y="${H - 8}" text-anchor="end" font-size="12">Year ${xMax}</text>`;
  const path = years.map((y, i) => `${i ? 'L' : 'M'}${f(sx(y.year))},${f(sy(y[key]))}`).join('');
  svg += `<path d="${path}" fill="none" style="stroke:var(--series-1)" stroke-width="2.5"/>`;
  const px = sx(peak.year);
  const anchor = peak.year > (xMin + xMax) / 2 ? 'end' : 'start';
  svg += `<circle class="ring" cx="${f(px)}" cy="${f(sy(peak[key]))}" r="4" style="stroke:var(--series-1)" stroke-width="2"/>`;
  svg += `<text x="${f(px + (anchor === 'end' ? -8 : 8))}" y="${f(sy(peak[key]) - 8)}" text-anchor="${anchor}" font-size="12">Peak: ${escape(fmt(peak[key]))}, year ${peak.year}</text>`;
  svg += '</svg>';

  const description = `${title} line chart. Starts at ${fmt(first[key])} in year ${first.year}, ends at ${fmt(last[key])} in year ${last.year}, and peaks at ${fmt(peak[key])} in year ${peak.year}. The full values for every year are in the table below.`;
  return { svg, description };
}

// The best, expected and worst paths on one chart, each labelled at its right end so colour is
// not the only cue. series: [{ name, years, style }] where style is 'best' | 'expected' | 'worst';
// resetYear (optional) marks the first rate change. Returns { svg, description }.
const LINES = {
  best: { color: 'var(--series-3)', dash: ' stroke-dasharray="5 4"' },
  expected: { color: 'var(--series-1)', dash: '' },
  worst: { color: 'var(--series-2)', dash: ' stroke-dasharray="5 4"' },
};

export function mortgageScenarioChart(series, { key, title, fmt, resetYear }) {
  const all = series.flatMap((s) => s.years);
  const xMin = Math.min(...all.map((y) => y.year));
  const xMax = Math.max(...all.map((y) => y.year));
  const vals = all.map((y) => y[key]);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const pad = (hi - lo) * 0.1 || Math.abs(hi) * 0.1 || 1;
  const yMin = Math.max(0, lo - pad);
  const yMax = hi + pad;
  const R = 72; // room on the right for the direct labels
  const sx = (x) => PAD.l + (xMax === xMin ? 0 : ((x - xMin) / (xMax - xMin)) * (W - PAD.l - R));
  const sy = (y) => H - PAD.b - ((y - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b);
  const f = (n) => n.toFixed(1);

  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escape(title)} chart" class="chart">`;
  for (let i = 0; i <= 4; i++) {
    const y = yMin + ((yMax - yMin) * i) / 4;
    svg += `<line x1="${PAD.l}" x2="${W - R}" y1="${f(sy(y))}" y2="${f(sy(y))}" class="grid"/>`;
    svg += `<text x="${PAD.l - 6}" y="${f(sy(y) + 4)}" text-anchor="end" font-size="12">${escape(fmt(y))}</text>`;
  }
  svg += `<text x="${PAD.l}" y="${H - 8}" font-size="12">Year ${xMin}</text>`;
  svg += `<text x="${W - R}" y="${H - 8}" text-anchor="end" font-size="12">Year ${xMax}</text>`;
  if (resetYear && resetYear > xMin && resetYear <= xMax) {
    svg += `<line x1="${f(sx(resetYear))}" x2="${f(sx(resetYear))}" y1="${PAD.t}" y2="${H - PAD.b}" class="guide" stroke-dasharray="2 3"/>`;
    svg += `<text x="${f(sx(resetYear) + 4)}" y="${PAD.t + 8}" font-size="12">First reset, year ${resetYear}</text>`;
  }
  const ends = [];
  for (const s of series) {
    const line = LINES[s.style];
    const path = s.years.map((y, i) => `${i ? 'L' : 'M'}${f(sx(y.year))},${f(sy(y[key]))}`).join('');
    svg += `<path d="${path}" fill="none" style="stroke:${line.color}" stroke-width="2.5"${line.dash}/>`;
    const last = s.years[s.years.length - 1];
    ends.push({ name: s.name, bold: s.style === 'expected', color: line.color, x: sx(last.year), y: sy(last[key]) });
  }
  // Nudge labels apart so equal end values (a flat best case) do not overprint.
  ends.sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) ends[i].y = Math.max(ends[i].y, ends[i - 1].y + 12);
  for (const e of ends) svg += `<text x="${f(e.x + 6)}" y="${f(e.y + 4)}" font-size="12"${e.bold ? ' font-weight="700"' : ''} style="fill:${e.color}">${escape(e.name)}</text>`;
  svg += '</svg>';

  const summary = series.map((s) => `${s.name.toLowerCase()} ends at ${fmt(s.years[s.years.length - 1][key])}`).join(', ');
  const description = `${title} line chart with best, expected and worst cases from year ${xMin} to year ${xMax}: ${summary}.${resetYear ? ` The first rate change is in year ${resetYear}.` : ''} The full values for every year are in the table tab.`;
  return { svg, description };
}

export function mortgageScenarioChartHtml(series, opts) {
  const { svg, description } = mortgageScenarioChart(series, opts);
  const id = `m-chart-${opts.key}`;
  return `<figure class="m-chart">${svg}<p class="visually-hidden" id="${id}">${escape(description)}</p></figure>`;
}
