#!/usr/bin/env node
// Build the website from the content files.
//
//   node site/build.mjs                 → docs/ (the published site; needs real residences)
//   node site/build.mjs --sample        → .preview/ from the synthetic preview data
//   node site/build.mjs --out <dir>     → another output directory
//
// Inputs (real build): data/properties.json, data/places.json,
// data/normalized/profile.json, media/manifest.json, media/hashes.json,
// site/config.json. The sample build reads the same shapes from .preview-data/.
//
// The real build refuses to run without residences, so the live holding page
// is never replaced by an empty site.

import { readFile, writeFile, mkdir, rm, cp, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { availableParallelism } from 'node:os';
import path from 'node:path';
import { createImagePipeline } from './lib/images.mjs';
import {
  price, priceShort, count, area, date, statusLine, statusShort, STATUS, TYPE_LABEL, ROLE_LABEL, placeLine, slug,
} from './lib/format.mjs';
import { layout } from './templates/layout.mjs';
import { home } from './templates/home.mjs';
import { residence } from './templates/residence.mjs';
import { residencesPage } from './templates/residences.mjs';
import { placesPage, aboutPage, notFoundPage } from './templates/pages.mjs';
import { enquirePage } from './templates/enquire.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const flag = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const SAMPLE = args.includes('--sample');
const OUT = path.resolve(ROOT, flag('--out', SAMPLE ? '.preview' : 'docs'));
const DATA = path.resolve(ROOT, SAMPLE ? '.preview-data' : '.');
const WIDTHS = [720, 1440, 2048];

const readJson = async (file, fallback) => {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (err) {
    if (fallback !== undefined && err.code === 'ENOENT') return fallback;
    throw err;
  }
};

// ------------------------------------------------------------------ labels

const VOCAB = {
  pool: 'Pool', 'sea-views': 'Sea views', 'mountain-views': 'Mountain views', 'golf-course': 'Golf course',
  'wine-cellar': 'Wine cellar', cinema: 'Cinema', gym: 'Gym', spa: 'Spa', 'staff-accommodation': 'Staff accommodation',
  'guest-accommodation': 'Guest accommodation', 'backup-power': 'Backup power', 'water-security': 'Water storage',
  lift: 'Lift', vineyard: 'Vineyard', beachfront: 'Beachfront', 'security-estate': 'Security estate', tennis: 'Tennis court',
  padel: 'Padel court', equestrian: 'Equestrian', braai: 'Braai', fireplace: 'Fireplace', 'underfloor-heating': 'Underfloor heating',
  'smart-home': 'Home automation', scullery: 'Scullery', 'rooftop-terrace': 'Rooftop terrace', courtyard: 'Courtyard',
  garden: 'Garden', jacuzzi: 'Jacuzzi', study: 'Study',
  contemporary: 'Contemporary', modern: 'Modern', modernist: 'Modernist', minimalist: 'Minimalist', brutalist: 'Brutalist',
  'cape-dutch': 'Cape Dutch', georgian: 'Georgian', victorian: 'Victorian', edwardian: 'Edwardian', tuscan: 'Tuscan',
  balinese: 'Balinese', farmhouse: 'Farmhouse', 'herbert-baker': 'Herbert Baker', 'art-deco': 'Art Deco',
  mediterranean: 'Mediterranean', coastal: 'Coastal', 'off-shutter-concrete': 'Off-shutter concrete', cantilever: 'Cantilevered',
  'double-volume': 'Double-volume spaces', glazing: 'Floor-to-ceiling glazing', timber: 'Timber', stone: 'Stone', thatch: 'Thatch',
  'face-brick': 'Face brick', 'steel-frame': 'Steel frame', pavilion: 'Pavilions', 'open-plan': 'Open-plan living',
};

const HIDDEN_ROLES = new Set(['mentioned', 'tagged', 'contact']);
const ROLE_ORDER = ['architect', 'interior-designer', 'landscape-designer', 'designer-unspecified', 'developer', 'builder', 'photographer', 'videographer', 'listing', 'collaborator', 'source-credit', 'credit-unspecified'];
const ROLE_TEXT = { ...ROLE_LABEL, collaborator: 'In collaboration with', 'source-credit': 'Credit' };

function cleanCaption(text) {
  return String(text ?? '')
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => !/^([#@][\p{L}\p{N}_.]+\s*)+$/u.test(l.trim()))
    .join('\n')
    .replace(/(\s#[\p{L}\p{N}_]+)+\s*$/u, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// The caption as the residence page sets it: paragraphs of lines, without the
// lines the page already shows (the name, the 📍 place line, emoji-only spec
// rows) or the account's own call to action, and without emoji. The verbatim
// caption stays one click away on Instagram.
const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}\u200d\ufe0f\u20e3]/gu;
const CTA = /\b(?:dm|message|tag|follow|contact) us\b|\blink in (?:our )?bio\b|\bto be featured\b|\bget featured\b/i;
const norm = (t) => t.toLowerCase().replace(EMOJI, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

function storyParagraphs(text, { title }) {
  const paragraphs = [];
  let current = [];
  for (const raw of cleanCaption(text).split('\n')) {
    const line = raw.replace(EMOJI, '').replace(/\s{2,}/g, ' ').trim();
    const drop = !line
      || /^\s*📍/u.test(raw)
      || /^\s*location\s*[:\-–]/i.test(line)
      || !/\p{L}/u.test(line)
      || (title && norm(line) === norm(title))
      || CTA.test(line);
    if (!raw.trim()) {
      if (current.length) paragraphs.push(current);
      current = [];
    } else if (!drop) {
      current.push(line);
    }
  }
  if (current.length) paragraphs.push(current);
  return paragraphs;
}

const orient = (w, h) => (w / h >= 1.2 ? 'landscape' : w / h >= 0.9 ? 'square' : 'portrait');

// ------------------------------------------------------------------- model

async function buildModel({ properties, places, profile, config, pipeline }) {
  const contactWhatsApp = (config.contact?.whatsapp ?? profile?.publicPhone ?? null);
  const site = {
    name: config.name,
    tagline: config.bio,
    bio: config.bio,
    instagram: { handle: config.instagram, url: `https://www.instagram.com/${config.instagram}/` },
    contact: {
      email: config.contact?.email ?? profile?.publicEmail ?? null,
      whatsapp: contactWhatsApp ? String(contactWhatsApp).replace(/[^\d]/g, '').replace(/^0/, '27') : null,
      whatsappDisplay: contactWhatsApp ?? null,
    },
    url: SAMPLE ? null : config.url,
    basePath: config.basePath,
    indexable: !SAMPLE,
    preview: SAMPLE,
    version: createHash('sha1').update(JSON.stringify(properties.map((p) => p.id))).digest('hex').slice(0, 8),
  };
  const windowDays = config.statusWindowDays ?? 30;

  const residences = [];
  for (const p of properties) {
    const gallery = [];
    for (const g of p.gallery) {
      const prepared = await pipeline.prepare({ id: g.id, src: path.join(DATA, g.file), dominant: g.dominant }, WIDTHS);
      const post = p.posts.find((x) => x.id === g.postId);
      gallery.push({
        prepared,
        alt: g.alt && !/^photo (by|shared by)/i.test(g.alt) ? g.alt : `${p.title.text}${p.place ? `, ${placeLine(p.place, { withProvince: false })}` : ''}`,
        credit: g.credit?.length ? `Photograph: ${g.credit.join(', ')}` : `Published by @${config.instagram}`,
        creditName: g.credit?.length ? g.credit.join(', ') : null,
        postUrl: post?.url ?? null,
      });
    }
    if (!gallery.length) continue;
    const f = p.facts;
    const v = (x) => x?.value ?? null;
    // A low-confidence type is an inference, not something the post states.
    const type = f.propertyType?.confidence === 'low' ? null : v(f.propertyType);
    const statusMeta = STATUS[p.status.status] ?? { label: p.status.status, tone: 'featured' };
    const factItems = [
      count(v(f.bedrooms), 'bedroom'),
      count(v(f.bathrooms), 'bathroom'),
      count(v(f.garages), 'garage'),
      f.erfSize ? `${area(f.erfSize)} erf` : null,
      f.floorSize ? `${area(f.floorSize)} floor area` : null,
    ].filter(Boolean);
    const particulars = [
      ['Price', price(v(f.price))],
      ['Status', statusLine(p.status)],
      ['Location', placeLine(p.place)],
      ['Type', type ? TYPE_LABEL[type] ?? null : null],
      ['Bedrooms', v(f.bedrooms) != null ? String(v(f.bedrooms)).replace('.5', '½') : null],
      ['Bathrooms', v(f.bathrooms) != null ? String(v(f.bathrooms)).replace('.5', '½') : null],
      ['Garages', v(f.garages)],
      ['Parking', v(f.parking)],
      ['Erf size', area(f.erfSize)],
      ['Floor area', area(f.floorSize)],
    ].filter(([, value]) => value != null && value !== '');

    const credits = [];
    for (const role of ROLE_ORDER) {
      const people = p.people.filter((x) => x.roles[role] && !HIDDEN_ROLES.has(role));
      if (!people.length) continue;
      credits.push({
        label: ROLE_TEXT[role] ?? role,
        people: people.map((x) => ({ text: x.handle ? `@${x.handle}` : x.name, url: x.handle ? `https://www.instagram.com/${x.handle}/` : null })),
      });
    }

    const storyPost = [...p.posts].sort((a, b) => cleanCaption(b.caption).length - cleanCaption(a.caption).length)[0];
    const storyText = storyPost ? storyParagraphs(storyPost.caption, { title: p.title.source === 'caption' ? p.title.text : null }) : [];
    const history = [...p.posts].sort((a, b) => String(a.postedAt).localeCompare(String(b.postedAt))).map((post, i) => {
      const kinds = post.signals ?? [];
      const label = kinds.includes('sold') ? 'Reported sold'
        : kinds.includes('under-offer') ? 'Reported under offer'
        : kinds.includes('price-reduced') ? 'Price reduced'
        : kinds.includes('for-sale') ? (i === 0 ? 'Featured, for sale' : 'Featured again, for sale')
        : i === 0 ? 'Featured on Instagram' : 'Featured again';
      return { date: post.postedAt, label, url: post.url };
    });

    const byOrient = (o) => gallery.find((g) => orient(g.prepared.width, g.prepared.height) === o)?.prepared ?? null;
    const photographer = p.people.find((x) => x.roles.photographer);
    const amount = v(f.price)?.currency === 'ZAR' ? v(f.price)?.amount : null;
    residences.push({
      id: p.id,
      slug: p.slug,
      url: `residences/${p.slug}/`,
      title: p.title.text,
      titleSource: p.title.source,
      place: p.place,
      placeLine: placeLine(p.place),
      status: p.status,
      statusLine: statusLine(p.status),
      statusShort: statusShort(p.status),
      tone: statusMeta.tone,
      priceText: price(v(f.price)),
      priceShort: priceShort(v(f.price)),
      factItems,
      particulars,
      credits,
      story: storyText.length ? { paragraphs: storyText, date: storyPost.postedAt, url: storyPost.url } : null,
      photoCredit: [...new Set(gallery.map((g) => g.creditName).filter(Boolean))],
      tags: [...p.architecture, ...p.amenities].map((k) => VOCAB[k]).filter(Boolean),
      history,
      gallery,
      cover: gallery[0].prepared,
      coverAlt: gallery[0].alt,
      coverCredit: photographer ? `Photograph: ${photographer.handle ? `@${photographer.handle}` : photographer.name}` : null,
      coverPostUrl: gallery[0].postUrl,
      featureImage: { portrait: byOrient('portrait') ?? byOrient('square'), landscape: byOrient('landscape') },
      filter: {
        province: slug(p.place?.province ?? p.place?.country ?? ''),
        city: slug(p.place?.city ?? ''),
        area: slug(p.place?.estate ?? p.place?.suburb ?? ''),
        type: type ?? '',
        beds: v(f.bedrooms) ?? '',
        price: amount ?? '',
      },
      firstFeatured: p.firstFeatured,
      lastFeatured: p.lastFeatured,
      completeness: (p.title.source === 'caption' ? 2 : 0) + (amount ? 1 : 0) + (p.place?.suburb || p.place?.estate ? 1 : 0)
        + (gallery.length >= 5 ? 1 : 0) + (p.status.status === 'on-the-market' ? 2 : 0) + (factItems.length >= 2 ? 1 : 0),
    });
  }
  residences.sort((a, b) => String(b.lastFeatured).localeCompare(String(a.lastFeatured)));

  // Related: same city, then same province, then most recent.
  for (const r of residences) {
    const others = residences.filter((x) => x !== r);
    const sameCity = others.filter((x) => x.place?.city && x.place.city === r.place?.city);
    const sameProvince = others.filter((x) => !sameCity.includes(x) && x.place?.province && x.place.province === r.place?.province);
    r.related = [...sameCity, ...sameProvince].slice(0, 3);
    r.relatedTitle = sameCity.length ? `More in ${r.place.city}` : sameProvince.length ? `More in ${r.place.province}` : 'More residences';
    if (!r.related.length) r.related = others.slice(0, 3);
  }

  // The cover is wide, so the lead is the home with the best landscape frame.
  const lead = [...residences].sort((a, b) => {
    const la = a.featureImage.landscape;
    const lb = b.featureImage.landscape;
    return (lb ? lb.width : 0) - (la ? la.width : 0) || b.completeness - a.completeness;
  })[0];
  const selected = residences.filter((r) => r !== lead).sort((a, b) => b.completeness - a.completeness || String(b.lastFeatured).localeCompare(String(a.lastFeatured))).slice(0, 5);
  const forSale = residences.filter((r) => r.status.status === 'on-the-market');
  // Recently featured continues the contents: homes not already on the page.
  const recent = residences.filter((r) => r !== lead && !selected.includes(r)).slice(0, 10);

  // Places, from the residences themselves.
  const provinceMap = new Map();
  for (const r of residences) {
    if (!r.place) continue;
    const pName = r.place.province ?? r.place.country;
    if (!pName) continue;
    const pKey = slug(pName);
    if (!provinceMap.has(pKey)) provinceMap.set(pKey, { name: pName, slug: pKey, count: 0, cover: r.cover, cities: new Map() });
    const prov = provinceMap.get(pKey);
    prov.count++;
    const cName = r.place.city;
    if (!cName) continue;
    const cKey = slug(cName);
    if (!prov.cities.has(cKey)) prov.cities.set(cKey, { name: cName, slug: cKey, count: 0, areas: new Map() });
    const city = prov.cities.get(cKey);
    city.count++;
    const aName = r.place.estate ?? r.place.suburb;
    if (!aName || aName === cName) continue;
    const aKey = slug(aName);
    if (!city.areas.has(aKey)) city.areas.set(aKey, { name: aName, slug: aKey, count: 0 });
    city.areas.get(aKey).count++;
  }
  const provinces = [...provinceMap.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).map((p) => ({
    ...p,
    url: `residences/?province=${p.slug}`,
    cities: [...p.cities.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).map((c) => ({
      ...c,
      url: `residences/?province=${p.slug}&city=${c.slug}`,
      areas: [...c.areas.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).map((a) => ({
        ...a,
        url: `residences/?province=${p.slug}&city=${c.slug}&area=${a.slug}`,
      })),
    })),
  }));

  // Filters appear only where the collection has the data to support them.
  const share = (fn) => residences.filter(fn).length / Math.max(1, residences.length);
  const distinct = (fn) => [...new Set(residences.map(fn).filter((x) => x !== '' && x != null))];
  const statusOptions = ['on-the-market', 'under-offer', 'sold', 'availability-to-confirm', 'featured']
    .map((k) => ({ value: k, label: STATUS[k].label, count: residences.filter((r) => r.status.status === k).length }))
    .filter((o) => o.count > 0);
  const cities = provinces.flatMap((p) => p.cities.map((c) => ({ value: c.slug, label: c.name, count: c.count, province: p.slug })));
  const areas = provinces.flatMap((p) => p.cities.flatMap((c) => c.areas.map((a) => ({ value: a.slug, label: a.name, count: a.count, city: c.slug }))));
  const types = distinct((r) => r.filter.type);
  const prices = residences.map((r) => r.filter.price).filter(Boolean).sort((a, b) => a - b);
  const PRICE_STEPS = [5e6, 10e6, 15e6, 20e6, 30e6, 50e6, 75e6, 100e6, 150e6];
  const filters = {
    status: statusOptions.length > 1 ? statusOptions : null,
    province: provinces.length > 1 ? provinces.map((p) => ({ value: p.slug, label: p.name, count: p.count })) : null,
    city: cities.length > 1 ? cities : null,
    area: areas.length > 1 ? areas : null,
    type: share((r) => r.filter.type && r.filter.type !== 'house') >= 0.3 && types.length > 1
      ? types.map((t) => ({ value: t, label: TYPE_LABEL[t] ?? t, count: residences.filter((r) => r.filter.type === t).length }))
      : null,
    beds: share((r) => r.filter.beds !== '') >= 0.5
      ? [2, 3, 4, 5, 6].filter((n) => residences.some((r) => r.filter.beds >= n)).map((n) => ({ value: String(n), label: `${n}+ bedrooms` }))
      : null,
    price: prices.length >= 3 && share((r) => r.filter.price) >= 0.4
      ? PRICE_STEPS.filter((s) => s > prices[0] && s < prices.at(-1) * 1.5).map((s) => ({ value: String(s), label: `R ${s / 1e6} million` }))
      : null,
    sort: [{ value: '', label: 'Most recently featured' }, ...(prices.length >= 3 ? [{ value: 'price-desc', label: 'Price, highest first' }, { value: 'price-asc', label: 'Price, lowest first' }] : [])],
  };
  if (filters.price && filters.price.length < 2) filters.price = null;

  const counts = {
    residences: residences.length,
    provinces: provinces.length,
    cities: provinces.reduce((n, p) => n + p.cities.length, 0),
    since: residences.map((r) => r.firstFeatured).filter(Boolean).sort()[0] ?? null,
  };

  return { site, residences, lead, selected, forSale, recent, provinces, filters, counts, windowDays, places };
}

// ------------------------------------------------------------------ render

async function writePage(rel, depth, render, meta) {
  const root = depth === 0 ? '' : '../'.repeat(depth);
  const file = path.join(OUT, rel);
  await mkdir(path.dirname(file), { recursive: true });
  const main = render({ root });
  await writeFile(file, String(layout({ ...meta, root, main })));
}

async function main() {
  const config = await readJson(path.join(ROOT, 'site/config.json'));
  const { properties = [] } = await readJson(path.join(DATA, 'data/properties.json'), { properties: [] });
  const { places = [] } = await readJson(path.join(DATA, 'data/places.json'), { places: [] });
  const { profile = null } = await readJson(path.join(DATA, 'data/normalized/profile.json'), { profile: null });

  if (!SAMPLE && properties.length === 0) {
    console.error('No residences in data/properties.json. Run the extraction and `npm run content:build` first; the live holding page stays in place.');
    process.exit(2);
  }

  // Start from a clean output, but keep the derivative cache between builds.
  const cache = path.join(ROOT, '.cache/media');
  await mkdir(cache, { recursive: true });
  for (const entry of ['index.html', 'residences', 'places', 'about', 'enquire', '404.html', 'assets']) {
    await rm(path.join(OUT, entry), { recursive: true, force: true });
  }
  await mkdir(OUT, { recursive: true });

  const pipeline = createImagePipeline({ outDir: path.join(ROOT, '.cache'), mediaUrl: 'media' });
  // Encode every gallery image first, a few at a time; buildModel then gets
  // the finished derivatives from the pipeline's memo.
  const jobs = properties.flatMap((p) => p.gallery.map((g) => () => pipeline.prepare({ id: g.id, src: path.join(DATA, g.file), dominant: g.dominant }, WIDTHS)));
  const workers = Math.max(2, Math.min(6, Math.floor(availableParallelism() / 2)));
  await Promise.all(Array.from({ length: workers }, async () => {
    for (let job = jobs.shift(); job; job = jobs.shift()) await job();
  }));
  const model = await buildModel({ properties, places, profile, config, pipeline });
  if (!model.residences.length) throw new Error('No residence has a usable photograph.');

  // Copy the derivatives the pages reference, then the static assets.
  await rm(path.join(OUT, 'media'), { recursive: true, force: true });
  await mkdir(path.join(OUT, 'media'), { recursive: true });
  const used = new Set(model.residences.flatMap((r) => r.gallery.flatMap((g) => [...g.prepared.variants.avif, ...g.prepared.variants.webp].map((v) => v.url))));
  for (const url of used) await cp(path.join(ROOT, '.cache', url), path.join(OUT, url));
  await cp(path.join(ROOT, 'site/assets'), path.join(OUT, 'assets'), { recursive: true, filter: (src) => !src.endsWith('README.md') });
  await writeFile(path.join(OUT, '.nojekyll'), '');

  const { site } = model;
  const coverOg = model.lead.cover.variants.webp.find((v) => v.w >= 1200)?.url ?? model.lead.cover.variants.webp.at(-1).url;

  await writePage('index.html', 0, ({ root }) => home(model, { root }), {
    site, page: { path: '', nav: null }, title: null, description: site.bio, image: coverOg,
  });
  await writePage('residences/index.html', 1, ({ root }) => residencesPage(model, { root }), {
    site, page: { path: 'residences/', nav: 'residences' }, title: 'Residences', description: `${model.counts.residences} residences from the ${site.name} collection.`, image: coverOg,
  });
  for (const r of model.residences) {
    await writePage(`${r.url}index.html`, 2, ({ root }) => residence(model, r, { root }), {
      site,
      page: { path: r.url, nav: 'residences', type: 'article' },
      title: r.title,
      description: [r.placeLine, r.statusLine, r.factItems.slice(0, 3).join(', ')].filter(Boolean).join(' · '),
      image: r.cover.variants.webp.find((v) => v.w >= 1200)?.url ?? r.cover.variants.webp.at(-1).url,
    });
  }
  await writePage('places/index.html', 1, ({ root }) => placesPage(model, { root }), {
    site, page: { path: 'places/', nav: 'places' }, title: 'Places', description: `Residences by province, city and area.`, image: coverOg,
  });
  await writePage('about/index.html', 1, ({ root }) => aboutPage(model, { root }), {
    site, page: { path: 'about/', nav: 'about' }, title: 'About', description: site.bio, image: coverOg,
  });
  await writePage('enquire/index.html', 1, ({ root }) => enquirePage(model, { root }), {
    site, page: { path: 'enquire/', nav: 'enquire' }, title: 'Enquiries', description: `Enquire about a residence or about featuring a home.`, image: coverOg,
  });
  // GitHub Pages serves 404.html at any depth, so its links are absolute.
  const notFound = layout({
    site, root: SAMPLE ? '/' : site.basePath, page: { path: '404.html', nav: null }, title: 'Page not found',
    description: site.bio, main: notFoundPage(model, { root: SAMPLE ? '/' : site.basePath }),
  });
  await writeFile(path.join(OUT, '404.html'), String(notFound));

  console.log(`Built ${model.residences.length} residences, ${model.provinces.length} provinces → ${path.relative(ROOT, OUT)}/ (${used.size} image files)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
