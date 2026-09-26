import { html } from '../lib/html.mjs';
import { STATUS } from '../lib/format.mjs';
import { arrowLink } from './parts.mjs';

export function placesPage(model, { root }) {
  const { provinces, counts } = model;
  return html`
<section class="page-head wrap">
  <h1>Places</h1>
  <p class="page-head__intro">Where the collection's residences are, by province, city or town, and suburb or estate. ${counts.residences} ${counts.residences === 1 ? 'residence' : 'residences'} in ${counts.cities} ${counts.cities === 1 ? 'city or town' : 'cities and towns'}.</p>
</section>
<section class="wrap" style="padding-bottom: var(--section)" aria-label="Places">
  ${provinces.map((p) => html`<section class="province" aria-labelledby="p-${p.slug}">
    <div class="province__name">
      <h2 id="p-${p.slug}"><a href="${root}${p.url}">${p.name}</a></h2>
      <p class="meta place">${p.count} ${p.count === 1 ? 'residence' : 'residences'}</p>
    </div>
    <ul class="province__cities">
      ${p.cities.map((c) => html`<li class="city">
        <h3><a href="${root}${c.url}">${c.name}</a> <span class="places__count num">${c.count}</span></h3>
        ${c.areas.length ? html`<ul>${c.areas.map((a) => html`<li><a href="${root}${a.url}">${a.name}</a><span class="num">${a.count}</span></li>`)}</ul>` : ''}
      </li>`)}
    </ul>
  </section>`)}
</section>`;
}

export function aboutPage(model, { root }) {
  const { site, counts } = model;
  const rows = ['on-the-market', 'under-offer', 'sold', 'availability-to-confirm', 'featured'];
  const meaning = {
    'on-the-market': `Offered for sale in a post from the last ${model.windowDays} days, with the agent or agency named. The date shows when that was published.`,
    'under-offer': 'The latest post about the home reported it under offer.',
    sold: 'The latest post about the home reported it sold.',
    'availability-to-confirm': `It was offered for sale when featured, but that was more than ${model.windowDays} days ago or no agent was named, so it may no longer be available.`,
    featured: 'Shown for its architecture and setting, with no sale information in the post.',
  };
  return html`
<section class="page-head wrap">
  <h1>About</h1>
  <p class="page-head__intro">${site.bio}</p>
</section>
<section class="section" style="padding-top: 0" aria-label="About the collection">
  <div class="wrap">
    <div class="prose">
      <p>${site.name} features residences on Instagram at <a href="${site.instagram.url}" rel="noopener">@${site.instagram.handle}</a>. This website gathers those features into one collection${counts.residences ? ` of ${counts.residences} ${counts.residences === 1 ? 'residence' : 'residences'}` : ''}, arranged by place, with each home's photographs, particulars and credits as they were published.</p>
      <h2>How status works</h2>
      <p>Homes are featured for different reasons, and some are for sale. Every status carries a date, because a listing can change after it is posted.</p>
      <dl>
        ${rows.map((k) => html`<div><dt>${STATUS[k].label}</dt><dd>${meaning[k]}</dd></div>`)}
      </dl>
      <h2>Credits</h2>
      <p>Architects, interior designers, photographers and agents are credited as each post credits them. Photographs remain the property of the photographers and agencies named with each residence.</p>
      <h2>Enquiries</h2>
      <p>To ask about a residence or about featuring a home, see <a href="${root}enquire/">Enquiries</a>.</p>
    </div>
  </div>
</section>`;
}

export function notFoundPage(model, { root }) {
  return html`
<section class="page-head wrap" style="padding-bottom: var(--section)">
  <h1>This page isn't in the collection.</h1>
  <p class="page-head__intro">The residence may have been renamed, or the link may be incomplete.</p>
  <p style="margin-top: var(--s-6)">${arrowLink(`${root}residences/`, 'Browse all residences')}</p>
</section>`;
}
