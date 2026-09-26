import { html, attrs } from '../lib/html.mjs';
import { picture } from '../lib/images.mjs';
import { icon } from '../lib/icons.mjs';
import { keepHyphens } from '../lib/format.mjs';

export function statusTag(r, { className = 'meta status', compact = false } = {}) {
  const text = compact ? r.statusShort : r.statusLine;
  if (!text) return '';
  return html`<p class="${className}${compact ? ' status--compact' : ''}" data-tone="${r.tone}"${compact ? attrs({ title: r.statusLine }) : ''}>${text}</p>`;
}

// Display text with hyphenated words held together.
export function display(text) {
  return keepHyphens(text).map((part, i) => (i % 2 ? html`<span class="nowrap">${part}</span>` : part));
}

export function factsList(r, { limit = 5 } = {}) {
  const items = r.factItems.slice(0, limit);
  if (!items.length) return '';
  return html`<ul class="facts">${items.map((f) => html`<li>${f}</li>`)}</ul>`;
}

// Residence card for the index and horizontal strips. The data-* attributes
// feed the client-side filters; they carry the same values the page shows.
export function card(r, { root, sizes = '(min-width: 64em) 30vw, (min-width: 48em) 45vw, 100vw', headingLevel = 'h3', filterData = false }) {
  const H = headingLevel;
  return html`<a class="card" href="${root}${r.url}"${filterData ? attrs({
    'data-status': r.status.status,
    'data-province': r.filter.province,
    'data-city': r.filter.city,
    'data-area': r.filter.area,
    'data-type': r.filter.type,
    'data-beds': r.filter.beds,
    'data-price': r.filter.price,
    'data-date': r.lastFeatured,
  }) : ''}>
  <div class="card__media">${r.cover ? picture(r.cover, { alt: r.coverAlt, sizes, root }) : ''}</div>
  <${H} class="card__title">${r.title}</${H}>
  ${r.placeLine ? html`<p class="meta place">${r.placeLine}</p>` : ''}
  ${factsList(r, { limit: 3 })}
  <div class="card__foot">
    ${statusTag(r, { compact: true })}
    ${r.priceShort ? html`<span class="card__price">${r.priceShort}</span>` : ''}
  </div>
</a>`;
}

export function arrowLink(href, label) {
  return html`<a class="link-arrow" href="${href}"><span>${label}</span>${icon('arrow')}</a>`;
}
