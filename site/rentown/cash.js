import { money, word } from './format.js';

export function cashCard({ v, r }) {
  const cash = r.cash;
  const short = cash.shortfall > 0;
  return `<div class="m-card ro-cash"><h3>Cash needed to buy</h3>
      <table class="m-table"><tbody>
        <tr><th scope="row">Down payment</th><td>${money(cash.down)}</td></tr>
        <tr><th scope="row">Closing costs</th><td>${money(cash.closing)}</td></tr>
        <tr><th scope="row">Moving</th><td>${money(cash.moving)}</td></tr>
        <tr><th scope="row">Reserve (${word(v.reserve, 'month')} of owning costs)</th><td>${money(cash.reserve)}</td></tr>
        <tr><th scope="row">Total cash needed</th><td><strong>${money(cash.total)}</strong></td></tr>
        ${cash.saved == null ? '' : `<tr><th scope="row">Cash you have saved</th><td>${money(cash.saved)}</td></tr><tr><th scope="row">${short ? 'Shortfall' : 'Left over after buying'}</th><td>${money(short ? cash.shortfall : cash.saved - cash.total)}</td></tr>`}
      </tbody></table></div>`;
}
