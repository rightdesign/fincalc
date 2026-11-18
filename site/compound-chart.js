// Stacked area chart for the compound interest calculator: what you put in on the bottom, the
// interest it has earned stacked on top. Pure (data in, strings out). rows: [{ year, contributions,
// totalContributed, totalInterest, balance }]. compound-app.js wires the hover and tap tooltip.
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
  if (stop !== null && row.year > stop) lines.push(['Put in this year', fmt(row.contributions)], ['Interest this year', fmt(row.interest)]);
  return { title: `Year ${row.year}`, lines };
}

// Chart x position (0..1 across the plot) of each year, for snapping a pointer to the nearest year.
export function compoundPlot(rows) {
  const last = rows[rows.length - 1].year;
  return { left: PAD.l / W, right: (W - PAD.r) / W, last };
}

export function compoundChartHtml(rows, fmt) {
  const last = rows[rows.length - 1];
  const xs = [0, ...rows.map((r) => r.year)];
  const put = [rows[0].totalContributed - rows[0].contributions, ...rows.map((r) => r.totalContributed)];
  const bal = [put[0], ...rows.map((r, i) => Math.max(r.balance, put[i + 1]))];
  const yMax = Math.max(...bal, 1);
  const sx = (x) => PAD.l + (x / last.year) * (W - PAD.l - PAD.r);
  const sy = (y) => H - PAD.b - (y / yMax) * (H - PAD.t - PAD.b);
  const f = (n) => n.toFixed(1);
  const line = (vals) => vals.map((v, i) => `${i ? 'L' : 'M'}${f(sx(xs[i]))},${f(sy(v))}`).join('');
  const base = `L${f(sx(last.year))},${f(sy(0))}L${f(sx(0))},${f(sy(0))}Z`;
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Growth by year chart" class="chart cc-chart">`;
  for (let i = 0; i <= 4; i++) {
    const y = (yMax * i) / 4;
    svg += `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${f(sy(y))}" y2="${f(sy(y))}" class="grid"/>`;
    svg += `<text x="${PAD.l - 8}" y="${f(sy(y) + 4)}" text-anchor="end" font-size="13">${escape(fmt(y))}</text>`;
  }
  const step = last.year <= 10 ? 1 : last.year <= 30 ? 5 : 10;
  for (let y = 0; y <= last.year; y += step) {
    svg += `<text x="${f(sx(y))}" y="${H - 12}" text-anchor="${y === 0 ? 'start' : 'middle'}" font-size="13">${y === 0 ? 'Today' : y}</text>`;
  }
  svg += `<text x="${W - PAD.r}" y="${H - 12}" text-anchor="end" font-size="13" class="cc-edge">${last.year % step === 0 ? '' : `Year ${last.year}`}</text>`;
  svg += `<path d="${line(bal)}${base}" style="fill:var(--series-2);fill-opacity:0.45;stroke:var(--series-2)" stroke-width="2"/>`;
  svg += `<path d="${line(put)}${base}" style="fill:var(--series-1);fill-opacity:0.6;stroke:var(--series-1)" stroke-width="2"/>`;
  svg += `<text x="${f(sx(last.year) - 10)}" y="${f(sy(bal[bal.length - 1]) + 20)}" text-anchor="end" font-size="14" font-weight="600" style="fill:var(--series-2)">Interest earned</text>`;
  svg += `<text x="${f(sx(last.year) - 10)}" y="${f(sy(put[put.length - 1]) - 8)}" text-anchor="end" font-size="14" font-weight="600" style="fill:var(--series-1)">What you put in</text>`;
  const cross = crossoverYear(rows);
  if (cross !== null) {
    const row = rows[cross - 1];
    const cx = sx(cross);
    const cy = sy(row.totalContributed);
    // Anchor the label on whichever side of the line has room for all of it; if neither does, shorten it.
    const full = `Interest passes contributions in year ${cross}`;
    const fits = (text) => text.length * 8 + 10;
    const leftRoom = cx - PAD.l;
    const rightRoom = W - PAD.r - cx;
    const right = leftRoom < fits(full) && rightRoom > leftRoom;
    const text = (right ? rightRoom : leftRoom) >= fits(full) ? full : `Crossover: year ${cross}`;
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
    svg += `<circle cx="${f(sxp)}" cy="${f(sy(rows[stop - 1].totalContributed))}" r="6" class="cc-stop-dot"/>`;
    svg += `<text x="${f(sxp + (right ? 10 : -10))}" y="${PAD.t + 30}" text-anchor="${right ? 'start' : 'end'}" font-size="14" font-weight="600" class="cc-stop-label">${text}</text>`;
  }
  svg += `<line class="crosshair cc-hover-line cc-off" x1="0" x2="0" y1="${PAD.t}" y2="${f(sy(0))}"/>`;
  svg += `<circle class="cc-hover-dot cc-off" r="5" cx="0" cy="0"/>`;
  svg += '</svg>';
  const xy = rows.map((r) => ({ year: r.year, x: sx(r.year) / W, y: sy(r.balance) / H }));
  const crossText = cross === null ? 'Interest earned does not pass what you put in within this period.' : `Interest earned passes what you put in during year ${cross}.`;
  const stopText = stop === null ? '' : ` Contributions stop after year ${stop}, so what you put in stays flat from there while the interest keeps growing.`;
  const description = `Stacked area chart over ${last.year} years. What you put in grows to ${fmt(last.totalContributed)} and the interest earned on top of it reaches ${fmt(last.totalInterest)}, for a balance of ${fmt(last.balance)} in year ${last.year}. ${crossText}${stopText} The full values for every year are in the table below.`;
  return `<figure class="m-chart cc-figure"><div class="cc-wrap" tabindex="0" data-points="${escape(JSON.stringify(xy))}" aria-describedby="compound-chart-desc">${svg}<div class="cc-tip" hidden></div></div><p class="visually-hidden" id="compound-chart-desc">${escape(description)}</p></figure>`;
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
