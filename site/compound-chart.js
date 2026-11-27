// Stacked area chart for the compound interest calculator: what you put in on the bottom, the
// interest it has earned stacked on top. Pure (data in, strings out). rows: [{ year, contributions,
// totalContributed, totalInterest, balance }]. compound-app.js wires the hover and tap tooltip.
import { monthsText, yearLabel } from './compound.js';

const W = 720;
const H = 400;
const PAD = { l: 80, r: 20, t: 24, b: 36 };
const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// First year in which the interest earned so far passes everything put in, or null if it never does.
export function crossoverYear(rows) {
  const hit = rows.find((r) => r.totalInterest > r.totalContributed);
  return hit ? hit.year : null;
}

// The last year money is put in, when that is before the final year (contributions stop and the
// balance keeps compounding); null when contributions run to the end or never happen.
export function stopYear(rows) {
  const paid = rows.filter((r) => r.contributions > 0);
  const last = paid.length ? paid[paid.length - 1].year : null;
  return last !== null && last < rows[rows.length - 1].year ? last : null;
}

// Tooltip lines for one year; the same figures as that year's row in the table. After the stop
// year it also says that year's $0 contribution and the interest it earned.
export function compoundTip(row, fmt, stop = null) {
  const lines = [['Balance', fmt(row.balance)], ['Put in to date', fmt(row.totalContributed)], ['Interest to date', fmt(row.totalInterest)]];
  if (row.totalWithdrawn > 0) lines.push(['Taken out to date', fmt(row.totalWithdrawn)]);
  if (stop !== null && row.year > stop) lines.push(['Put in this year', fmt(row.contributions)], ['Interest this year', fmt(row.interest)]);
  return { title: `Year ${yearLabel(row.year)}`, lines };
}

// Chart x position (0..1 across the plot) of each year, for snapping a pointer to the nearest year.
export function compoundPlot(rows) {
  const last = rows[rows.length - 1].year;
  return { left: PAD.l / W, right: (W - PAD.r) / W, last };
}

// Round axis ticks for 0..max: a step of 1, 2, 2.5 or 5 times a power of ten, giving about three to six
// intervals, with the top tick the first step at or above max.
export function niceTicks(max) {
  const raw = max / 6;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((c) => c >= raw);
  const count = Math.ceil(max / step - 1e-9);
  return Array.from({ length: count + 1 }, (_, i) => Number((i * step).toPrecision(12)));
}

// Compact axis label: $0, $500, $50k, $1.5M, $2.5B.
export function axisLabel(n) {
  const units = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'k']];
  const [size, suffix] = units.find(([u]) => n >= u) ?? [1, ''];
  return `$${Number((n / size).toFixed(2))}${suffix}`;
}

// Legend and the Future / Today's dollars switch above the chart. band is { lowRate, highRate } when the
// return range is shaded; basis is 'future' or 'today' (null leaves the switch out).
export function chartKeyHtml(band, basis) {
  const item = (cls, text) => `<li><span class="cc-swatch ${cls}" aria-hidden="true"></span>${escape(text)}</li>`;
  const entries = item('cc-sw-put', 'What you put in') + item('cc-sw-int', 'Interest earned')
    + (band && band.label ? item('cc-sw-band', `Range: ${band.label}`) : band && band.lowRate !== undefined ? item('cc-sw-band', `Range at ${band.lowRate}%\u2013${band.highRate}% return`) : band ? item('cc-sw-band', 'Range of returns') : '');
  const btn = (value, label) => `<button type="button" class="ghost" data-basis="${value}" aria-pressed="${basis === value}">${label}</button>`;
  const toggle = basis === null ? '' : `<div class="cc-basis no-print" role="group" aria-label="Show chart in">${btn('future', 'Future dollars')}${btn('today', "Today's dollars")}</div>`;
  return `<div class="cc-key"><ul class="cc-legend">${entries}</ul>${toggle}</div>`;
}

// band, when set, is { low, high } rows for the worst and best return (plus optional lowRate and highRate for the
// legend); it is shaded around the balance line. basis ('future' or 'today') adds the on-chart dollars switch.
// target, when set, is a goal balance drawn as a dashed line across the plot (the scale grows to include it).
export function compoundChartHtml(rows, fmt, band = null, basis = null, target = null) {
  const last = rows[rows.length - 1];
  const xs = [0, ...rows.map((r) => r.year)];
  const put = [rows[0].totalContributed - rows[0].contributions, ...rows.map((r) => r.totalContributed)];
  const bal = [put[0], ...rows.map((r, i) => Math.max(r.balance, put[i + 1]))];
  const edge = (b) => [put[0], ...b.map((r, i) => Math.max(r.balance, put[i + 1]))];
  const lowBal = band ? edge(band.low) : null;
  const highBal = band ? edge(band.high) : null;
  const ticks = niceTicks(Math.max(...bal, ...(highBal ?? []), target ?? 0, 1));
  const yMax = ticks[ticks.length - 1];
  const sx = (x) => PAD.l + (x / last.year) * (W - PAD.l - PAD.r);
  const sy = (y) => H - PAD.b - (y / yMax) * (H - PAD.t - PAD.b);
  const f = (n) => n.toFixed(1);
  const line = (vals) => vals.map((v, i) => `${i ? 'L' : 'M'}${f(sx(xs[i]))},${f(sy(v))}`).join('');
  const base = `L${f(sx(last.year))},${f(sy(0))}L${f(sx(0))},${f(sy(0))}Z`;
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Growth by year chart" class="chart cc-chart">`;
  for (const y of ticks) {
    svg += `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${f(sy(y))}" y2="${f(sy(y))}" class="grid"/>`;
    svg += `<text x="${PAD.l - 8}" y="${f(sy(y) + 4)}" text-anchor="end" font-size="13">${escape(axisLabel(y))}</text>`;
  }
  const step = last.year <= 10 ? 1 : last.year <= 30 ? 5 : 10;
  for (let y = 0; y <= last.year; y += step) {
    svg += `<text x="${f(sx(y))}" y="${H - 12}" text-anchor="${y === 0 ? 'start' : 'middle'}" font-size="13">${y === 0 ? 'Today' : y}</text>`;
  }
  svg += `<text x="${W - PAD.r}" y="${H - 12}" text-anchor="end" font-size="13" class="cc-edge">${last.year % step === 0 ? '' : `Year ${yearLabel(last.year)}`}</text>`;
  svg += `<path d="${line(bal)}${base}" style="fill:var(--series-2);fill-opacity:0.45;stroke:var(--series-2)" stroke-width="2"/>`;
  svg += `<path d="${line(put)}${base}" style="fill:var(--series-1);fill-opacity:0.6;stroke:var(--series-1)" stroke-width="2"/>`;
  if (band) {
    const back = highBal.map((v, i) => `L${f(sx(xs[i]))},${f(sy(v))}`).reverse().join('');
    svg += `<path d="${line(lowBal)}${back}Z" class="cc-band" style="fill:var(--series-2);fill-opacity:0.25;stroke:var(--series-2)" stroke-width="1" stroke-dasharray="4 3"/>`;
  }
  const intY = band ? sy(lowBal[lowBal.length - 1]) + 40 : sy(bal[bal.length - 1]) + 20;
  if (band) {
    const end = f(sx(last.year) - 4);
    svg += `<text x="${end}" y="${f(sy(highBal[highBal.length - 1]) - 6)}" text-anchor="end" font-size="13" class="cc-band-label">${escape(fmt(band.high[band.high.length - 1].balance))}</text>`;
    svg += `<text x="${end}" y="${f(sy(lowBal[lowBal.length - 1]) + 18)}" text-anchor="end" font-size="13" class="cc-band-label">${escape(fmt(band.low[band.low.length - 1].balance))}</text>`;
  }
  svg += `<text x="${f(sx(last.year) - 10)}" y="${f(intY)}" text-anchor="end" font-size="14" font-weight="600" style="fill:var(--series-2)">Interest earned</text>`;
  svg += `<text x="${f(sx(last.year) - 10)}" y="${f(sy(put[put.length - 1]) - 8)}" text-anchor="end" font-size="14" font-weight="600" style="fill:var(--series-1)">What you put in</text>`;
  if (target !== null) {
    svg += `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${f(sy(target))}" y2="${f(sy(target))}" class="marker cc-target"/>`;
    svg += `<text x="${PAD.l + 8}" y="${f(sy(target) - 7)}" font-size="14" font-weight="600" class="cc-target-label">Goal ${escape(fmt(target))}</text>`;
  }
  const cross = crossoverYear(rows);
  if (cross !== null) {
    const row = rows.find((x) => x.year === cross);
    const cx = sx(cross);
    const cy = sy(row.totalContributed);
    // Anchor the label on whichever side of the line has room for all of it; if neither does, shorten it.
    const full = `Interest passes contributions in year ${yearLabel(cross)}`;
    const fits = (text) => text.length * 8 + 10;
    const leftRoom = cx - PAD.l;
    const rightRoom = W - PAD.r - cx;
    const right = leftRoom < fits(full) && rightRoom > leftRoom;
    const text = (right ? rightRoom : leftRoom) >= fits(full) ? full : `Crossover: year ${yearLabel(cross)}`;
    svg += `<line x1="${f(cx)}" x2="${f(cx)}" y1="${PAD.t}" y2="${f(sy(0))}" class="marker cc-cross"/>`;
    svg += `<circle cx="${f(cx)}" cy="${f(cy)}" r="6" class="cc-cross-dot"/>`;
    svg += `<text x="${f(cx + (right ? 10 : -10))}" y="${PAD.t + 12}" text-anchor="${right ? 'start' : 'end'}" font-size="14" font-weight="600" class="cc-cross-label">${text}</text>`;
  }
  const stop = stopYear(rows);
  if (stop !== null) {
    const sxp = sx(stop);
    const full = `Contributions stop after year ${stop}`;
    const leftRoom = sxp - PAD.l;
    const rightRoom = W - PAD.r - sxp;
    const right = leftRoom < full.length * 8 + 10 && rightRoom > leftRoom;
    const text = (right ? rightRoom : leftRoom) >= full.length * 8 + 10 ? full : `Stop: year ${stop}`;
    svg += `<line x1="${f(sxp)}" x2="${f(sxp)}" y1="${PAD.t}" y2="${f(sy(0))}" class="marker cc-stop"/>`;
    svg += `<circle cx="${f(sxp)}" cy="${f(sy(rows.find((x) => x.year === stop).totalContributed))}" r="6" class="cc-stop-dot"/>`;
    svg += `<text x="${f(sxp + (right ? 10 : -10))}" y="${PAD.t + 30}" text-anchor="${right ? 'start' : 'end'}" font-size="14" font-weight="600" class="cc-stop-label">${text}</text>`;
  }
  svg += `<line class="crosshair cc-hover-line cc-off" x1="0" x2="0" y1="${PAD.t}" y2="${f(sy(0))}"/>`;
  svg += `<circle class="cc-hover-dot cc-off" r="5" cx="0" cy="0"/>`;
  svg += '</svg>';
  const xy = rows.map((r) => ({ year: r.year, x: sx(r.year) / W, y: sy(r.balance) / H }));
  const crossText = cross === null ? 'Interest earned does not pass what you put in within this period.' : `Interest earned passes what you put in during year ${yearLabel(cross)}.`;
  const stopText = stop === null ? '' : ` Contributions stop after year ${stop}, so what you put in stays flat from there while the interest keeps growing.`;
  const bandText = band ? ` The shaded band around the balance runs from ${fmt(band.low[band.low.length - 1].balance)} at the ${band.label ? '10th percentile' : 'lower return'} to ${fmt(band.high[band.high.length - 1].balance)} at the ${band.label ? '90th percentile' : 'higher return'} in year ${yearLabel(last.year)}.` : '';
  const targetText = target === null ? '' : ` A dashed line marks your goal of ${fmt(target)}, which the balance ${last.balance >= target ? 'reaches' : 'does not reach'} by year ${yearLabel(last.year)}.`;
  const description = `Stacked area chart over ${monthsText(Math.round(last.year * 12))}. What you put in grows to ${fmt(last.totalContributed)} and the interest earned on top of it reaches ${fmt(last.totalInterest)}, for a balance of ${fmt(last.balance)} in year ${yearLabel(last.year)}. ${crossText}${stopText}${bandText}${targetText} The full values for every year are in the table below.`;
  return `<figure class="m-chart cc-figure">${chartKeyHtml(band, basis)}<div class="cc-wrap" tabindex="0" data-points="${escape(JSON.stringify(xy))}" aria-describedby="compound-chart-desc">${svg}<div class="cc-tip" hidden></div></div><p class="visually-hidden" id="compound-chart-desc">${escape(description)}</p></figure>`;
}

// Two horizontal bars for the start-early comparison: each end balance, with the part that was
// contributed drawn darker. c is the result of compareStartingLater.
export function compareChartHtml(c, fmt) {
  const max = Math.max(c.now.futureValue, c.later.futureValue, 1);
  const bar = (label, side, series) => {
    const total = (side.futureValue / max) * 100;
    const put = (side.contributed / max) * 100;
    return `<div class="m-cmp-row"><p class="m-cmp-label">${escape(label)}</p><div class="m-cmp-track" style="width:${total.toFixed(1)}%;background:var(${series});opacity:0.45"><span style="width:${((put / total) * 100 || 0).toFixed(1)}%;background:var(${series})"></span></div><p class="m-cmp-value">${escape(fmt(side.futureValue))} <small>(${escape(fmt(side.contributed))} contributed)</small></p></div>`;
  };
  return `<div class="m-cmp-bars" role="img" aria-label="${escape(`Start now ends with ${fmt(c.now.futureValue)}; starting ${c.waitYears} years later ends with ${fmt(c.later.futureValue)}.`)}">${bar('Start now', c.now, '--series-1')}${bar(`Start ${c.waitYears} years later`, c.later, '--series-2')}</div>`;
}
