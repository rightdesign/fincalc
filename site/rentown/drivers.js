import { rentOwnThresholds } from '../rentown.js';

export function driversCard({ v }) {
  const drivers = rentOwnThresholds(v).map((t) => `<li>${t.text}</li>`).join('');
  return `<section class="card ro-drivers"><h2>What drives the verdict</h2><p>For each assumption, the value at which the winner flips at your ${v.years}-year stay, holding everything else as entered.</p><ul>${drivers}</ul></section>`;
}
