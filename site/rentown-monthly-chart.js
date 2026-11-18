// SVG line chart of the monthly cost of owning against renting, with the month the lines cross
// marked. Pure (data in, strings out). Shares the net worth chart's time axis, in years.
const W = 480;
const H = 220;
const PAD = { l: 72, r: 16, t: 20, b: 28 };

const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const when = (month) => `year ${Math.ceil(month / 12)}, month ${((month - 1) % 12) + 1}`;

// curve: [{ month, own, rent }]; cross is the month renting becomes the dearer one for good (or null);
// stay is the year the visitor plans to leave; inflation (%) deflates to today's dollars; minYears is the
// shortest the chart may run (the same span as the net worth chart). Returns { svg, description }.
export function monthlyChart(curve, cross, fmt, stay, inflation = 0, minYears = 0) {
  const crossYears = cross == null ? 0 : Math.ceil(cross / 12);
  const months = Math.min(curve.length, Math.max(minYears, crossYears, stay ?? 0) * 12) || curve.length;
  const d = (m) => (1 + inflation / 100) ** (m / 12);
  const pts = curve.slice(0, months).map((c) => ({ x: c.month / 12, own: c.own / d(c.month), rent: c.rent / d(c.month) }));
  const xMin = pts[0].x;
  const xMax = pts[pts.length - 1].x;
  const all = pts.flatMap((p) => [p.own, p.rent]);
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo) * 0.1 || Math.abs(hi) * 0.1 || 1;
  const yMin = lo - pad;
  const yMax = hi + pad;
  const sx = (x) => PAD.l + (xMax === xMin ? 0 : ((x - xMin) / (xMax - xMin)) * (W - PAD.l - PAD.r));
  const sy = (y) => H - PAD.b - ((y - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b);
  const f = (n) => n.toFixed(1);
  const line = (key) => pts.map((p, i) => `${i ? 'L' : 'M'}${f(sx(p.x))},${f(sy(p[key]))}`).join('');

  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Monthly cost of owning and of renting, by year" class="chart">`;
  for (let i = 0; i <= 4; i++) {
    const y = yMin + ((yMax - yMin) * i) / 4;
    svg += `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${f(sy(y))}" y2="${f(sy(y))}" class="grid"/>`;
    svg += `<text x="${PAD.l - 6}" y="${f(sy(y) + 4)}" text-anchor="end" font-size="10">${escape(fmt(y))}</text>`;
  }
  svg += `<text x="${PAD.l}" y="${H - 8}" font-size="10">Year ${Math.ceil(xMin)}</text>`;
  svg += `<text x="${W - PAD.r}" y="${H - 8}" text-anchor="end" font-size="10">Year ${Math.ceil(xMax)}</text>`;
  svg += `<path d="${line('own')}" fill="none" style="stroke:var(--series-1)" stroke-width="2.5"/>`;
  svg += `<path d="${line('rent')}" fill="none" style="stroke:var(--series-2)" stroke-width="2.5" stroke-dasharray="6 4"/>`;
  const last = pts[pts.length - 1];
  const above = last.own >= last.rent;
  svg += `<text x="${W - PAD.r}" y="${f(sy(last.own) + (above ? -6 : 14))}" text-anchor="end" font-size="10" style="fill:var(--series-1)">Own</text>`;
  svg += `<text x="${W - PAD.r}" y="${f(sy(last.rent) + (above ? 14 : -6))}" text-anchor="end" font-size="10" style="fill:var(--series-2)">Rent</text>`;
  const mark = (x0, label, cls, dash, row) => {
    const x = sx(x0);
    const anchor = x0 > (xMin + xMax) / 2 ? 'end' : 'start';
    return `<line x1="${f(x)}" x2="${f(x)}" y1="${PAD.t}" y2="${H - PAD.b}" class="${cls}" stroke-dasharray="${dash}"/>`
      + `<text x="${f(x + (anchor === 'end' ? -4 : 4))}" y="${PAD.t + 8 + row * 12}" text-anchor="${anchor}" font-size="10">${escape(label)}</text>`;
  };
  const showCross = cross != null && cross > 1 && cross <= months;
  const stayX = stay == null ? null : stay;
  if (stayX != null && stayX >= xMin && stayX <= xMax) svg += mark(stayX, `Your stay: year ${stay}`, 'stay', '2 3', 0);
  if (showCross) {
    const p = pts[cross - 1];
    svg += mark(p.x, `Monthly break-even: ${when(cross)}`, 'breakeven', '5 3', stay != null && Math.abs(stay - p.x) < 2 ? 1 : 0);
    svg += `<circle class="ring" cx="${f(sx(p.x))}" cy="${f(sy(p.own))}" r="4" style="stroke:var(--series-1)" stroke-width="2"/>`;
  }
  svg += '</svg>';

  const first = pts[0];
  const verdict = cross == null ? 'Owning stays the dearer month to month through the whole run.'
    : cross === 1 ? 'Owning costs no more than renting every month.'
      : `Owning becomes the cheaper month to month in ${when(cross)}.`;
  const description = `Line chart of the monthly cost of owning and renting. In month 1 owning costs ${fmt(first.own)} and renting costs ${fmt(first.rent)}; in year ${Math.ceil(xMax)} owning costs ${fmt(last.own)} and renting costs ${fmt(last.rent)}. ${verdict}`;
  return { svg, description };
}

export function monthlyChartHtml(curve, cross, fmt, stay, inflation, minYears) {
  const { svg, description } = monthlyChart(curve, cross, fmt, stay, inflation, minYears);
  return `<figure class="chart-box"><figcaption>Monthly cost by year: own (mortgage, tax, insurance, maintenance, HOA and mortgage insurance) vs rent (rent and renter&rsquo;s insurance)</figcaption>${svg}<p class="visually-hidden">${escape(description)}</p></figure>`;
}
