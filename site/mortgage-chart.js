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
    svg += `<text x="${PAD.l - 6}" y="${f(sy(y) + 4)}" text-anchor="end" font-size="10">${escape(fmt(y))}</text>`;
  }
  svg += `<text x="${PAD.l}" y="${H - 8}" font-size="10">Year ${xMin}</text>`;
  svg += `<text x="${W - PAD.r}" y="${H - 8}" text-anchor="end" font-size="10">Year ${xMax}</text>`;
  const path = years.map((y, i) => `${i ? 'L' : 'M'}${f(sx(y.year))},${f(sy(y[key]))}`).join('');
  svg += `<path d="${path}" fill="none" style="stroke:var(--series-1)" stroke-width="2.5"/>`;
  const px = sx(peak.year);
  const anchor = peak.year > (xMin + xMax) / 2 ? 'end' : 'start';
  svg += `<circle class="ring" cx="${f(px)}" cy="${f(sy(peak[key]))}" r="4" style="stroke:var(--series-1)" stroke-width="2"/>`;
  svg += `<text x="${f(px + (anchor === 'end' ? -8 : 8))}" y="${f(sy(peak[key]) - 8)}" text-anchor="${anchor}" font-size="10">Peak: ${escape(fmt(peak[key]))}, year ${peak.year}</text>`;
  svg += '</svg>';

  const description = `${title} line chart. Starts at ${fmt(first[key])} in year ${first.year}, ends at ${fmt(last[key])} in year ${last.year}, and peaks at ${fmt(peak[key])} in year ${peak.year}. The full values for every year are in the table below.`;
  return { svg, description };
}

// A titled chart with a text equivalent for screen readers.
export function mortgageChartHtml(years, opts) {
  const { svg, description } = mortgageChart(years, opts);
  const id = `m-chart-${opts.key}`;
  return `<figure class="m-chart"><figcaption>${escape(opts.title)}</figcaption>${svg}<p class="visually-hidden" id="${id}">${escape(description)}</p></figure>`;
}
