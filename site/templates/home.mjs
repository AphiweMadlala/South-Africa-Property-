import { html, attrs } from '../lib/html.mjs';
import { picture } from '../lib/images.mjs';
import { icon } from '../lib/icons.mjs';
import { monthYear } from '../lib/format.mjs';
import { card, statusTag, factsList, arrowLink, display } from './parts.mjs';
import { enquireActions } from './enquire.mjs';

function feature(r, variant, root) {
  const sizes = variant === 'c' ? '100vw' : '(min-width: 64em) 58vw, 100vw';
  const media = r.featureImage[variant === 'c' || variant === 'b' ? 'landscape' : 'portrait'] ?? r.cover;
  return html`<article class="feature feature--${variant}">
  <a class="feature__media" href="${root}${r.url}" tabindex="-1" aria-hidden="true">${picture(media, { alt: '', sizes, root })}</a>
  <div class="feature__body">
    <h3 class="feature__title"><a href="${root}${r.url}">${r.title}</a></h3>
    ${r.placeLine ? html`<p class="meta place">${r.placeLine}</p>` : ''}
    ${factsList(r, { limit: 4 })}
    ${statusTag(r)}
    ${r.priceText ? html`<p class="price">${r.priceText}</p>` : ''}
    ${arrowLink(`${root}${r.url}`, 'View the residence')}
  </div>
</article>`;
}

// Alternate compositions down the page, matched to what each photograph can
// carry: portrait frames take the tall layouts, landscape frames the wide ones.
function variants(selected) {
  let portraitTurn = 0;
  let landscapeTurn = 0;
  return selected.map((r) => {
    if (r.featureImage.landscape) return ['b', 'c'][landscapeTurn++ % 2];
    return ['a', 'd'][portraitTurn++ % 2];
  });
}

export function home(model, { root }) {
  const { site, lead, selected, forSale, recent, provinces, counts } = model;
  const reach = [
    counts.residences ? `${counts.residences} ${counts.residences === 1 ? 'residence' : 'residences'}` : null,
    counts.provinces > 1 ? `across ${counts.provinces} provinces` : counts.provinces === 1 ? `in ${provinces[0].name}` : null,
  ].filter(Boolean).join(' ');
  const since = counts.since ? `, featured on Instagram since ${monthYear(counts.since)}` : '';
  const kinds = variants(selected);

  return html`
<section class="cover" aria-labelledby="cover-title">
  <div class="cover__media">${picture(lead.cover, { alt: lead.coverAlt, sizes: '100vw', root, priority: true })}</div>
  ${lead.coverCredit ? html`<a class="cover__credit" href="${lead.coverPostUrl}" rel="noopener">${lead.coverCredit}</a>` : ''}
  <div class="cover__caption">
    <div class="wrap">
      <h1 class="cover__title" id="cover-title"><a href="${root}${lead.url}">${display(lead.title)}</a></h1>
      ${lead.placeLine ? html`<p class="meta cover__place">${lead.placeLine}</p>` : ''}
      ${statusTag(lead, { className: 'meta status cover__status' })}
      ${arrowLink(`${root}${lead.url}`, 'View the residence')}
    </div>
  </div>
</section>

<section class="statement" aria-label="About ${site.name}">
  <div class="wrap statement__grid">
    <p class="statement__text">${display(site.bio)}</p>
    <div class="statement__aside">
      <p>${reach}${since}.</p>
      ${arrowLink(`${root}residences/`, 'Browse all residences')}
    </div>
  </div>
</section>

${selected.length ? html`<section class="section section--stone" aria-labelledby="selected-title">
  <div class="wrap">
    <div class="section__head">
      <h2 class="section__title" id="selected-title">Selected residences</h2>
      <p class="section__intro">Homes from the collection, with their photography, places and particulars as published.</p>
    </div>
    <div class="features">
      ${selected.map((r, i) => feature(r, kinds[i], root))}
    </div>
  </div>
</section>` : ''}

${forSale.length ? html`<section class="section" aria-labelledby="sale-title">
  <div class="wrap">
    <div class="section__head">
      <h2 class="section__title" id="sale-title">For sale now</h2>
      <p class="section__intro">Offered for sale in the last ${model.windowDays} days by a named agent or agency. Dates show when each listing was last confirmed.</p>
    </div>
    <ul class="register">
      ${forSale.map((r) => html`<li class="register__row">
        <a class="register__link" href="${root}${r.url}">
          <div class="register__thumb">${r.cover ? picture(r.cover, { alt: '', sizes: '8rem', root }) : ''}</div>
          <h3 class="register__title">${r.title}</h3>
          <p class="meta place">${r.placeLine ?? ''}</p>
          <div class="register__price"><p class="price">${r.priceText ?? ''}</p>${statusTag(r, { compact: true })}</div>
        </a>
      </li>`)}
    </ul>
  </div>
</section>` : ''}

${provinces.length ? html`<section class="section ${forSale.length ? 'section--stone' : ''}" aria-labelledby="places-title">
  <div class="wrap">
    <div class="section__head">
      <h2 class="section__title" id="places-title">Places</h2>
      ${arrowLink(`${root}places/`, 'All places')}
    </div>
    <ul class="places">
      ${provinces.map((p) => html`<li class="places__item">
        <a class="places__thumb" href="${root}${p.url}" tabindex="-1" aria-hidden="true">${p.cover ? picture(p.cover, { alt: '', sizes: '7rem', root }) : ''}</a>
        <div>
          <h3 class="places__name"><a href="${root}${p.url}">${p.name}</a><span class="places__count num">${p.count}</span></h3>
          <ul class="places__cities">
            ${p.cities.map((c) => html`<li><a href="${root}${c.url}">${c.name}</a><span class="num">${c.count}</span></li>`)}
          </ul>
        </div>
      </li>`)}
    </ul>
  </div>
</section>` : ''}

${recent.length > 2 ? html`<section class="section" aria-labelledby="recent-title">
  <div class="wrap section__head">
    <h2 class="section__title" id="recent-title">Recently featured</h2>
    <div class="strip__controls" data-strip-controls hidden>
      <button class="icon-button" type="button" data-strip-prev aria-label="Previous residences">${icon('chevron-left')}</button>
      <button class="icon-button" type="button" data-strip-next aria-label="Next residences">${icon('chevron-right')}</button>
    </div>
  </div>
  <div class="strip">
    <ul class="strip__track" data-strip tabindex="0" aria-label="Recently featured residences">
      ${recent.map((r) => html`<li>${card(r, { root, sizes: '22rem' })}</li>`)}
    </ul>
  </div>
</section>` : ''}

<section class="section section--night" aria-labelledby="enquire-title">
  <div class="wrap enquire">
    <h2 class="enquire__title" id="enquire-title">Enquiries</h2>
    <div class="enquire__body">
      <p>Ask about a residence you have seen on ${site.name}, or about featuring a home of your own.</p>
      <div class="enquire__actions">${enquireActions(site, { root })}</div>
    </div>
  </div>
</section>`;
}
