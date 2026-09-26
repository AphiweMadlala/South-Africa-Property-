// Formatting for South African property facts. Every formatter returns null for
// a missing value, so templates can omit a line instead of printing a guess.

const nbsp = ' ';
const group = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, nbsp);

const SYMBOL = { ZAR: 'R', USD: 'US$', EUR: '€', GBP: '£', MUR: 'Rs' };

// "R 28 500 000", "Price on application", "From R 3 200 000"
export function price(value) {
  if (!value) return null;
  if (value.qualifier === 'poa' || value.amount == null) return 'Price on application';
  const amount = `${SYMBOL[value.currency] ?? value.currency ?? ''}${nbsp}${group(value.amount)}`;
  const prefix = { from: 'From ', 'offers-from': 'Offers from ', asking: '', reduced: '' }[value.qualifier] ?? '';
  return `${prefix}${amount}`;
}

// Compact form for cards: "R 28.5m", "R 950k"
export function priceShort(value) {
  if (!value) return null;
  if (value.qualifier === 'poa' || value.amount == null) return 'POA';
  const s = SYMBOL[value.currency] ?? '';
  const a = value.amount;
  const body = a >= 1e6 ? `${(a / 1e6).toFixed(a % 1e6 === 0 ? 0 : a >= 1e7 ? 1 : 2).replace(/\.?0+$/, '')}m` : `${Math.round(a / 1e3)}k`;
  return `${value.qualifier === 'from' ? 'From ' : ''}${s}${nbsp}${body}`;
}

export function count(n, singular, plural = `${singular}s`) {
  if (n == null) return null;
  const whole = Number.isInteger(n) ? n : n.toString().replace('.5', '½');
  return `${whole} ${n === 1 ? singular : plural}`;
}

export function area(value) {
  if (!value) return null;
  const v = value.value ?? value;
  if (v.unit === 'ha') return `${v.value.toString().replace('.', ',')}${nbsp}ha`;
  if (v.unit === 'acre') return `${v.value}${nbsp}acres`;
  return `${group(v.value)}${nbsp}m²`;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function date(iso, { month = 'long' } = {}) {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const name = month === 'short' ? MONTHS[m - 1].slice(0, 3) : MONTHS[m - 1];
  return `${d} ${name} ${y}`;
}

export function monthYear(iso) {
  if (!iso) return null;
  const [y, m] = iso.slice(0, 10).split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export const STATUS = {
  'on-the-market': { label: 'For sale', tone: 'sale' },
  'under-offer': { label: 'Under offer', tone: 'offer' },
  sold: { label: 'Sold', tone: 'sold' },
  'availability-to-confirm': { label: 'Availability to confirm', tone: 'confirm' },
  featured: { label: 'Featured', tone: 'featured' },
};

// Compact form for cards and lists, still dated.
export function statusShort(status) {
  if (!status) return null;
  switch (status.status) {
    case 'on-the-market':
      return `For sale · ${date(status.asOf, { month: 'short' })}`;
    case 'under-offer':
      return `Under offer · ${date(status.asOf, { month: 'short' })}`;
    case 'sold':
      return `Sold · ${monthYear(status.asOf).replace(/^(\w{3})\w*/, '$1')}`;
    case 'availability-to-confirm':
      return 'Availability to confirm';
    default:
      return `Featured ${monthYear(status.asOf).replace(/^(\w{3})\w*/, '$1')}`;
  }
}

// Keep hyphenated words whole in display type ("high-end" never splits).
export function keepHyphens(text) {
  return String(text ?? '').split(/(\S+-\S+)/g);
}

// One line that always carries the status's date, so no status reads as current
// without saying when it was true.
export function statusLine(status) {
  if (!status) return null;
  const s = STATUS[status.status] ?? { label: status.status };
  switch (status.status) {
    case 'on-the-market':
      return `For sale · as of ${date(status.asOf)}`;
    case 'under-offer':
      return `Under offer · reported ${date(status.asOf)}`;
    case 'sold':
      return `Sold · reported ${date(status.asOf)}`;
    case 'availability-to-confirm':
      return `Offered for sale when featured, ${monthYear(status.asOf)} · availability to confirm`;
    default:
      return `Featured ${monthYear(status.asOf)}`;
  }
}

export const TYPE_LABEL = {
  house: 'House', villa: 'Villa', penthouse: 'Penthouse', apartment: 'Apartment', townhouse: 'Townhouse',
  'beach-house': 'Beach house', 'wine-farm': 'Wine farm', farm: 'Farm', lodge: 'Lodge', 'vacant-land': 'Land',
};

export const ROLE_LABEL = {
  architect: 'Architecture',
  'interior-designer': 'Interiors',
  'landscape-designer': 'Landscape',
  'designer-unspecified': 'Design',
  developer: 'Development',
  builder: 'Construction',
  photographer: 'Photography',
  videographer: 'Film',
  listing: 'Represented by',
  'credit-unspecified': 'Credited',
};

export function placeLine(place, { withProvince = true } = {}) {
  if (!place) return null;
  const parts = [place.estate ?? place.suburb, place.city, withProvince ? (place.province ?? (place.country !== 'South Africa' ? place.country : null)) : null];
  return [...new Set(parts.filter(Boolean))].join(', ');
}

export function slug(s) {
  return String(s ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
