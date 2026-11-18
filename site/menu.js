// Hamburger menu listing every calculator. Shared by all pages.
export const CALCULATORS = [
  { href: 'compound.html', label: 'Compound interest' },
  { href: 'index.html', label: 'Rent vs Buy: keep your home or sell and rent' },
  { href: 'rent-vs-own.html', label: 'Rent vs own: should you buy a home?' },
  { href: 'mortgage.html', label: 'Variable-rate mortgage' },
];

export function menuHtml(currentHref, calculators = CALCULATORS) {
  const items = calculators.map((c) => `<li><a href="${c.href}"${c.href === currentHref ? ' aria-current="page"' : ''}>${c.label}</a></li>`).join('');
  return `<button type="button" class="menu-button" aria-label="Calculators" aria-expanded="false" aria-controls="calculator-menu"><span aria-hidden="true">&#9776;</span></button><nav id="calculator-menu" class="calculator-menu" aria-label="Calculators" hidden><ul>${items}</ul></nav>`;
}

export function mountMenu(header) {
  if (!header) return;
  const current = location.pathname.split('/').pop() || 'index.html';
  const holder = document.createElement('div');
  holder.className = 'menu';
  holder.innerHTML = menuHtml(current);
  header.prepend(holder);
  const button = holder.querySelector('button');
  const nav = holder.querySelector('nav');
  const set = (open) => { nav.hidden = !open; button.setAttribute('aria-expanded', String(open)); };
  button.addEventListener('click', () => set(nav.hidden));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !nav.hidden) { set(false); button.focus(); } });
  document.addEventListener('click', (e) => { if (!holder.contains(e.target)) set(false); });
}

if (typeof document !== 'undefined') mountMenu(document.querySelector('.site-header'));
