// SVG line chart for the rent vs own calculator: net worth of each choice by
// year, with the break-even year marked. Pure (data in, strings out).
import { monthPoint } from './rentown/format.js';
const W = 480;
const H = 220;
const PAD = { l: 72, r: 16, t: 20, b: 28 };

const escape = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  );

// years: [{ year, own, rent, pureRent?, later? }]; a pureRent adds the pure net worth renter line and a
// later adds the rent-then-buy line.
// stay is the year the visitor plans to leave. Returns { svg, description }.
// breakEvenMonth, when given, is the month (counted from 1) the crossing falls in; the marker sits there.
export function rentOwnChart(years, breakEven, fmt, stay, breakEvenMonth, aheadText = null) {
  const xs = years.map((y) => y.year);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const hasPure = years.every((y) => Number.isFinite(y.pureRent));
  const hasLater = years.every((y) => Number.isFinite(y.later));
  const all = years.flatMap((y) => [
    y.own,
    y.rent,
    ...(hasPure ? [y.pureRent] : []),
    ...(hasLater ? [y.later] : []),
  ]);
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo) * 0.1 || Math.abs(hi) * 0.1 || 1;
  const yMin = lo - pad;
  const yMax = hi + pad;
  const sx = (x) =>
    PAD.l + (xMax === xMin ? 0 : ((x - xMin) / (xMax - xMin)) * (W - PAD.l - PAD.r));
  const sy = (y) => H - PAD.b - ((y - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b);
  const f = (n) => n.toFixed(1);
  const line = (key) =>
    years.map((y, i) => `${i ? 'L' : 'M'}${f(sx(y.year))},${f(sy(y[key]))}`).join('');

  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Net worth if you own and if you rent, by year" class="chart">`;
  for (let i = 0; i <= 4; i++) {
    const y = yMin + ((yMax - yMin) * i) / 4;
    svg += `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${f(sy(y))}" y2="${f(sy(y))}" class="grid"/>`;
    svg += `<text x="${PAD.l - 6}" y="${f(sy(y) + 4)}" text-anchor="end" font-size="12">${escape(fmt(y))}</text>`;
  }
  svg += `<text x="${PAD.l}" y="${H - 8}" font-size="12">Year ${xMin}</text>`;
  svg += `<text x="${W - PAD.r}" y="${H - 8}" text-anchor="end" font-size="12">Year ${xMax}</text>`;
  const repair = years.find((y) => y.repair);
  if (repair) {
    const x = sx(repair.year);
    const anchor = repair.year > (xMin + xMax) / 2 ? 'end' : 'start';
    svg += `<line x1="${f(x)}" x2="${f(x)}" y1="${PAD.t}" y2="${H - PAD.b}" class="grid" stroke-dasharray="2 3"/>`;
    svg += `<text x="${f(x + (anchor === 'end' ? -4 : 4))}" y="${PAD.t + 8}" text-anchor="${anchor}" font-size="12">Major repair: year ${repair.year}</text>`;
  }
  svg += `<path d="${line('own')}" fill="none" style="stroke:var(--series-1)" stroke-width="2.5"/>`;
  svg += `<path d="${line('rent')}" fill="none" style="stroke:var(--series-2)" stroke-width="2.5" stroke-dasharray="6 4"/>`;
  if (hasPure)
    svg += `<path d="${line('pureRent')}" fill="none" style="stroke:var(--series-2)" stroke-width="1.5" stroke-dasharray="2 3"/>`;
  if (hasLater)
    svg += `<path d="${line('later')}" fill="none" style="stroke:var(--series-3)" stroke-width="2.5" stroke-dasharray="10 3 2 3"/>`;
  const last = years[years.length - 1];
  const above = last.own >= last.rent;
  svg += `<text x="${W - PAD.r}" y="${f(sy(last.own) + (above ? -6 : 14))}" text-anchor="end" font-size="12" style="fill:var(--series-1)">Own</text>`;
  svg += `<text x="${W - PAD.r}" y="${f(sy(last.rent) + (above ? 14 : -6))}" text-anchor="end" font-size="12" style="fill:var(--series-2)">Rent${hasPure ? ' (equal-cash)' : ''}</text>`;
  if (hasLater)
    svg += `<text x="${W - PAD.r}" y="${f(sy(last.later) + (last.later >= Math.max(last.own, last.rent) ? -6 : 14))}" text-anchor="end" font-size="12" style="fill:var(--series-3)">Rent, then buy</text>`;
  if (hasPure)
    svg += `<text x="${W - PAD.r}" y="${f(sy(last.pureRent) + (last.pureRent <= last.rent ? 14 : -6))}" text-anchor="end" font-size="12" style="fill:var(--series-2)">Rent (pure)</text>`;
  const mark = (year, label, cls, dash, row) => {
    const x = sx(year);
    const anchor = year > (xMin + xMax) / 2 ? 'end' : 'start';
    return (
      `<line x1="${f(x)}" x2="${f(x)}" y1="${PAD.t}" y2="${H - PAD.b}" class="${cls}" stroke-dasharray="${dash}"/>` +
      `<text x="${f(x + (anchor === 'end' ? -4 : 4))}" y="${PAD.t + 8 + row * 14}" text-anchor="${anchor}" font-size="12">${escape(label)}</text>`
    );
  };
  if (stay != null && stay >= xMin && stay <= xMax)
    svg += mark(stay, `Your stay: year ${stay}`, 'stay', '2 3', 0);
  const crossing = breakEvenMonth == null ? `year ${breakEven}` : monthPoint(breakEvenMonth);
  if (breakEven != null) {
    const b = years.find((y) => y.year === breakEven);
    // The crossing month, placed on the own line between the year points either side of it.
    const at =
      breakEvenMonth == null ? b.year : Math.min(b.year, Math.max(xMin, breakEvenMonth / 12));
    const next = years.findIndex((y) => y.year >= at);
    const hi_ = years[next];
    const lo_ = years[next - 1];
    const own =
      !lo_ || hi_.year === at
        ? hi_.own
        : lo_.own + ((hi_.own - lo_.own) * (at - lo_.year)) / (hi_.year - lo_.year);
    svg += mark(
      at,
      `Break-even: ${crossing}`,
      'breakeven',
      '5 3',
      stay != null && Math.abs(stay - at) < 1 ? 1 : 0,
    );
    svg += `<circle class="ring" cx="${f(sx(at))}" cy="${f(sy(own))}" r="4" style="stroke:var(--series-1)" stroke-width="2"/>`;
  }
  svg += '</svg>';

  const description = `Net worth line chart for owning and renting. In year ${xMin} owning is ${fmt(years[0].own)} and renting with equal cash is ${fmt(years[0].rent)}; in year ${xMax} owning is ${fmt(last.own)} and renting with equal cash is ${fmt(last.rent)}${hasPure ? `; renting on a pure net worth basis is ${fmt(years[0].pureRent)} in year ${xMin} and ${fmt(last.pureRent)} in year ${xMax}` : ''}${hasLater ? `; renting first and buying later is ${fmt(years[0].later)} in year ${xMin} and ${fmt(last.later)} in year ${xMax}` : ''}. ${breakEven == null ? (aheadText ? `Owning is ahead only for stays of ${aheadText}.` : 'Owning does not catch up within the years shown.') : `Owning pulls ahead in ${crossing}.`}${stay == null ? '' : ` You plan to stay ${stay} ${stay === 1 ? 'year' : 'years'}.`} ${repair ? `The major repair is paid in year ${repair.year}. ` : ''}The table beside the chart lists the years of your stay.`;
  return { svg, description };
}

export function rentOwnChartHtml(
  years,
  breakEven,
  fmt,
  stay,
  breakEvenMonth,
  unrealized = false,
  aheadText = null,
) {
  const { svg, description } = rentOwnChart(years, breakEven, fmt, stay, breakEvenMonth, aheadText);
  return `<figure class="chart-box"><figcaption>Net worth by year: own (home equity${unrealized ? ' on paper' : ' after selling costs'}) vs rent (investments, equal-cash dashed and pure dotted)</figcaption>${svg}<p class="visually-hidden">${escape(description)}</p></figure>`;
}
