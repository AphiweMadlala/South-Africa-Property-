import { html, raw } from '../lib/html.mjs';
import { picture } from '../lib/images.mjs';
import { icon } from '../lib/icons.mjs';
import { date } from '../lib/format.mjs';
import { card, statusTag, factsList } from './parts.mjs';
import { enquireActions } from './enquire.mjs';

// Photographs after the lead, laid out at their own proportions: landscapes run
// full width, portraits and squares pair with a like frame, and a frame left
// without a partner sits alone at two-thirds width. Nothing is cropped.
function runLayout(images) {
  const kind = (img) => (img.width / img.height >= 1.2 ? 'landscape' : img.width / img.height >= 0.9 ? 'square' : 'portrait');
  const rows = [];
  for (let i = 0; i < images.length; i++) {
    const a = images[i];
    const b = images[i + 1];
    if (kind(a) !== 'landscape' && b && kind(b) === kind(a)) {
      rows.push({ type: 'pair', items: [a, b] });
      i++;
    } else {
      rows.push({ type: kind(a) === 'landscape' ? 'wide' : 'single', items: [a] });
    }
  }
  return rows;
}

function runItem(img, index, total, root, sizes) {
  return html`<button class="run__item" type="button" data-lightbox-open="${index}" aria-label="Open photograph ${index + 1} of ${total}">${picture(img.prepared, { alt: img.alt, sizes, root })}</button>`;
}

export function residence(model, r, { root }) {
  const { site } = model;
  const total = r.gallery.length;
  const rest = r.gallery.slice(1).map((img, i) => ({ ...img, index: i + 1, width: img.prepared.width, height: img.prepared.height }));
  const rows = runLayout(rest);
  const subject = `Enquiry: ${r.title}${r.placeLine ? ` (${r.placeLine})` : ''}`;
  const message = `Hello, I'd like to ask about ${r.title}${r.placeLine ? ` in ${r.placeLine}` : ''}, as featured on ${site.name}: ${site.url ?? ''}${r.url}`;

  const galleryData = r.gallery.map((img) => ({
    avif: img.prepared.variants.avif.map((v) => `${root}${v.url} ${v.w}w`).join(', '),
    webp: img.prepared.variants.webp.map((v) => `${root}${v.url} ${v.w}w`).join(', '),
    src: `${root}${img.prepared.variants.webp.at(-1).url}`,
    width: img.prepared.width,
    height: img.prepared.height,
    alt: img.alt,
    credit: img.credit,
    post: img.postUrl,
  }));

  return html`
<article class="residence">
  <header class="residence-head wrap">
    <div class="residence-head__grid">
      <div class="residence-head__title">
        <h1>${r.title}</h1>
        ${r.placeLine ? html`<p class="meta place">${r.placeLine}</p>` : ''}
      </div>
      <div class="residence-head__summary">
        ${r.priceText ? html`<p class="price">${r.priceText}</p>` : ''}
        ${statusTag(r)}
        ${factsList(r, { limit: 5 })}
      </div>
    </div>
  </header>

  ${r.gallery.length ? html`<button class="lead-image" type="button" data-lightbox-open="0" aria-label="Open photograph 1 of ${total}">${picture(r.gallery[0].prepared, { alt: r.gallery[0].alt, sizes: '100vw', root, priority: true })}</button>` : ''}

  <div class="residence-body wrap">
    <div class="residence-body__grid">
      <aside class="particulars" aria-labelledby="particulars-title">
        <table class="spec-table">
          <caption class="meta place" id="particulars-title">Particulars</caption>
          <tbody>
            ${r.particulars.map(([label, value]) => html`<tr><th scope="row">${label}</th><td>${value}</td></tr>`)}
          </tbody>
        </table>
        <p class="source-note">As published on Instagram${r.lastFeatured ? `, ${date(r.lastFeatured)}` : ''}. Details can change; confirm them when you enquire.</p>
        ${r.credits.length ? html`<dl class="credits">
          ${r.credits.map((c) => html`<div><dt class="meta">${c.label}</dt><dd>${c.people.map((p, i) => html`${i ? ', ' : ''}${p.url ? html`<a href="${p.url}" rel="noopener">${p.text}</a>` : p.text}`)}</dd></div>`)}
        </dl>` : ''}
        <div class="particulars__actions">
          ${enquireActions(site, { subject, message, root })}
        </div>
      </aside>

      <div class="run">
        ${r.story ? html`<div class="story">
          <div class="story__text">${r.story.paragraphs.map((lines) => html`<p>${lines.map((line, i) => html`${i ? html`<br>` : ''}${line}`)}</p>`)}</div>
          <p class="story__source">From the post of ${date(r.story.date)} · <a href="${r.story.url}" rel="noopener">Read the full caption on Instagram</a></p>
        </div>` : ''}

        ${rows.map((row) => row.type === 'pair'
          ? html`<div class="run__pair">${row.items.map((img) => runItem(img, img.index, total, root, '(min-width: 64em) 30vw, 50vw'))}</div>`
          : html`<div class="run__row run__row--${row.type}">${runItem(row.items[0], row.items[0].index, total, root, row.type === 'wide' ? '(min-width: 64em) 60vw, 100vw' : '(min-width: 64em) 40vw, 66vw')}</div>`)}

        ${rows.length ? html`<p class="run__credit">${r.photoCredit.length
          ? `Photographs by ${r.photoCredit.join(', ')}, as credited on Instagram.`
          : `Photographs as published by @${site.instagram.handle}.`}</p>` : ''}

        ${total > 1 ? html`<button class="btn-line run__more" type="button" data-lightbox-open="0">${icon('grid', { size: 18 })}<span>View all ${total} photographs</span></button>` : ''}

        ${r.tags.length ? html`<div class="story">
          <h2 class="meta place">Architecture and features</h2>
          <p class="tags">${r.tags.join(' · ')}</p>
        </div>` : ''}

        <div class="story">
          <h2 class="meta place">History</h2>
          <ol class="history">
            ${r.history.map((h) => html`<li><time datetime="${h.date}">${date(h.date)}</time><span>${h.label}</span><a href="${h.url}" rel="noopener">View post</a></li>`)}
          </ol>
        </div>
      </div>
    </div>
  </div>

  ${r.related.length ? html`<section class="section section--stone" aria-labelledby="related-title">
    <div class="wrap">
      <div class="section__head"><h2 class="section__title" id="related-title">${r.relatedTitle}</h2></div>
      <ul class="results__grid">
        ${r.related.map((x) => html`<li>${card(x, { root })}</li>`)}
      </ul>
    </div>
  </section>` : ''}
</article>

<dialog class="lightbox" aria-label="Photographs of ${r.title}" data-lightbox>
  <div class="lightbox__bar">
    <p class="meta lightbox__count" aria-live="polite"><span data-lightbox-index>1</span> / ${total}</p>
    <button class="lightbox__close" type="button" data-lightbox-close>${icon('close')}<span>Close</span></button>
  </div>
  <div class="lightbox__stage" data-lightbox-stage>
    <picture data-lightbox-picture></picture>
    ${total > 1 ? html`<button class="lightbox__nav lightbox__nav--prev" type="button" data-lightbox-prev aria-label="Previous photograph">${icon('chevron-left', { size: 24 })}</button>
    <button class="lightbox__nav lightbox__nav--next" type="button" data-lightbox-next aria-label="Next photograph">${icon('chevron-right', { size: 24 })}</button>` : ''}
  </div>
  <div class="lightbox__caption">
    <p data-lightbox-credit></p>
    <p><a data-lightbox-post href="${r.history[0]?.url ?? site.instagram.url}" rel="noopener">View the post on Instagram</a></p>
  </div>
</dialog>
<script type="application/json" id="gallery-data">${raw(JSON.stringify(galleryData).replace(/</g, '\\u003c'))}</script>`;
}
