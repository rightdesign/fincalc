// Shared formatting helpers for the rent vs own results cards.
export const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
export const money = (n) => usd.format(Math.round(n) === 0 ? 0 : n);
export const signed = (n) => `${n < 0 ? '−' : '+'}${usd.format(Math.abs(Math.round(n)))}`;
export const word = (n, one) => `${n} ${one}${n === 1 ? '' : 's'}`;
// A month count (1 = the first month) as the year and month it falls in, e.g. 76 -> "year 7, month 4".
export const monthPoint = (m) => `year ${Math.ceil(m / 12)}, month ${((m - 1) % 12) + 1}`;
export const pct = (n) => `${Math.round(n * 100) / 100}%`;
export const verdict = (diff) => (Math.round(diff) === 0 ? 'Owning and renting come out about even' : `${diff > 0 ? 'Owning' : 'Renting'} leaves you about ${money(Math.abs(diff))} ahead`);
export const winner = (d) => (Math.round(d) === 0 ? 'tie' : d > 0 ? 'own' : 'rent');
