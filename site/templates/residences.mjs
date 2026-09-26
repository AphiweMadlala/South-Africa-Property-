import { html, attrs } from '../lib/html.mjs';
import { icon } from '../lib/icons.mjs';
import { card } from './parts.mjs';

function select(name, label, options, { anyLabel, dataAttr = null } = {}) {
  return html`<label class="select"><span class="meta">${label}</span>
  <select name="${name}" data-filter="${name}">
    <option value="">${anyLabel}</option>
    ${options.map((o) => html`<option value="${o.value}"${attrs({ [dataAttr ? `data-${dataAttr}` : 'data-x']: dataAttr ? o[dataAttr] : null })}>${o.label}${o.count != null ? ` (${o.count})` : ''}</option>`)}
  </select></label>`;
}

export function residencesPage(model, { root }) {
  const { residences, filters, counts } = model;
  const f = filters;
  return html`
<section class="page-head wrap">
  <h1>Residences</h1>
  <p class="page-head__intro">${counts.residences} ${counts.residences === 1 ? 'residence' : 'residences'} from the ${model.site.name} collection${counts.provinces > 1 ? `, across ${counts.provinces} provinces` : ''}. Status and prices are shown as published, with their dates.</p>
</section>

<div class="filters" data-filters hidden>
  <search class="wrap filters__bar" data-filter-bar aria-label="Filter residences">
    ${f.status ? html`<fieldset class="segmented">
      <legend class="visually-hidden">Status</legend>
      <label><input type="radio" name="status" value="" checked data-filter="status"><span>All</span></label>
      ${f.status.map((o) => html`<label><input type="radio" name="status" value="${o.value}" data-filter="status"><span>${o.label} <span class="num">(${o.count})</span></span></label>`)}
    </fieldset>` : ''}
    <div class="filters__controls" data-filter-controls>
      <div class="filters__row">
        ${f.province ? select('province', 'Province', f.province, { anyLabel: 'All provinces' }) : ''}
        ${f.city ? select('city', 'City or town', f.city, { anyLabel: 'All cities and towns', dataAttr: 'province' }) : ''}
        ${f.area ? select('area', 'Area', f.area, { anyLabel: 'All areas', dataAttr: 'city' }) : ''}
        ${f.type ? select('type', 'Type', f.type, { anyLabel: 'All types' }) : ''}
        ${f.beds ? select('beds', 'Bedrooms', f.beds, { anyLabel: 'Any' }) : ''}
        ${f.price ? select('max', 'Price up to', f.price, { anyLabel: 'Any price' }) : ''}
        ${f.sort.length > 1 ? html`<label class="select"><span class="meta">Sort</span>
          <select name="sort" data-filter="sort">${f.sort.map((o, i) => html`<option value="${i === 0 ? '' : o.value}">${o.label}</option>`)}</select></label>` : ''}
      </div>
    </div>
    <button class="btn-line filters__open" type="button" data-filter-open aria-haspopup="dialog">${icon('filter', { size: 18 })}<span>Filter and sort</span><span class="num" data-filter-active></span></button>
    <p class="filters__summary">
      <span data-result-count aria-live="polite">${residences.length} ${residences.length === 1 ? 'residence' : 'residences'}</span>
      <button class="text-button" type="button" data-filter-clear hidden>Clear filters</button>
    </p>
  </search>
</div>

<section class="results wrap" aria-label="Results">
  <ul class="results__grid" data-results>
    ${residences.map((r) => html`<li data-card>${card(r, { root, filterData: true, headingLevel: 'h2' })}</li>`)}
  </ul>
  <div class="results__empty" data-empty hidden>
    <h2>No residences match these filters.</h2>
    <p>Try another place or status, or clear the filters to see the whole collection.</p>
    <button class="btn-line" type="button" data-filter-clear>Clear filters</button>
  </div>
</section>

<dialog class="filter-sheet" data-filter-sheet aria-label="Filter and sort residences">
  <div class="filter-sheet__bar">
    <p class="meta">Filter and sort</p>
    <button class="menu-sheet__close" type="button" data-filter-sheet-close>${icon('close')}<span>Close</span></button>
  </div>
  <div class="filter-sheet__body" data-filter-sheet-body></div>
  <div class="filter-sheet__foot">
    <button class="text-button" type="button" data-filter-clear>Clear all</button>
    <button class="btn" type="button" data-filter-sheet-close>Show <span data-result-count-short>${residences.length}</span></button>
  </div>
</dialog>`;
}
