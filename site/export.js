// CSV export of the year-by-year tables. Pure (strings only, no DOM) so it
// runs under node; app.js owns the download.

// Table cells are display text ("$1,234", "-$56"); a spreadsheet wants plain
// numbers, so money is unwrapped and anything else is kept as written.
const MONEY = /^(-?)\$([\d,]+(?:\.\d+)?)$/;
function csvCell(text) {
  const m = MONEY.exec(text);
  const value = m ? `${m[1]}${m[2].replaceAll(',', '')}` : String(text);
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function tableCsv(section) {
  return [section.columns, ...section.rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export const csvFilename = (section) => `fincalc-${section.id}.csv`;
