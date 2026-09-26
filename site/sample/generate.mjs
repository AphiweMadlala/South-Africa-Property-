#!/usr/bin/env node
// Synthetic preview data for developing the site before the real archive is
// extracted. Writes .preview-data/ (git-ignored): content files in the same shape
// the pipeline produces, and illustrated images stamped SAMPLE. Nothing here is
// a real residence, price, person or photograph, and none of it is ever
// published: `node site/build.mjs --sample` builds it into .preview/ only.

import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUT = path.join(ROOT, '.preview-data');

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SKIES = [['#a9c3d6', '#e9eff2'], ['#e7b995', '#f7e6d6'], ['#8fb0c6', '#dbe7ee'], ['#33465e', '#b8805f'], ['#c9d6dc', '#f3f4f1']];
const LAND = ['#66735c', '#7d8563', '#56655a', '#8a8467'];
const SEA = ['#2f6f86', '#3d7c90', '#24566b'];
const WALL = ['#f1efea', '#e6e1d8', '#d6d2ca', '#bfb8ad'];
const GLASS = ['#1d282c', '#27363c', '#31424a'];

// An illustrated modernist house in its setting. Proportions only; clearly not
// a photograph.
function scene(seed, w, h) {
  const r = rng(seed);
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const [skyTop, skyLow] = pick(SKIES);
  const horizon = h * (0.42 + r() * 0.12);
  const coastal = r() > 0.4;
  const land = pick(LAND);
  const peaks = Array.from({ length: 6 }, (_, i) => `${(i / 5) * w},${horizon - (0.05 + r() * 0.16) * h}`).join(' ');
  const bx = w * (0.12 + r() * 0.2);
  const bw = w * (0.55 + r() * 0.2);
  const baseY = h * (0.62 + r() * 0.08);
  const floors = 1 + Math.floor(r() * 2);
  const floorH = h * 0.1;
  const wall = pick(WALL);
  const glass = pick(GLASS);
  let volumes = '';
  for (let f = 0; f < floors; f++) {
    const y = baseY - (f + 1) * floorH;
    const inset = f * w * (0.04 + r() * 0.06);
    const vw = bw - inset * (1 + r());
    const vx = bx + inset + (f % 2 ? w * 0.06 : 0);
    volumes += `<rect x="${vx}" y="${y}" width="${vw}" height="${floorH}" fill="${wall}"/>`;
    volumes += `<rect x="${vx + vw * 0.08}" y="${y + floorH * 0.18}" width="${vw * 0.84}" height="${floorH * 0.64}" fill="${glass}"/>`;
    for (let m = 1; m < 5; m++) volumes += `<rect x="${vx + vw * 0.08 + (vw * 0.84 * m) / 5}" y="${y + floorH * 0.18}" width="${w * 0.003}" height="${floorH * 0.64}" fill="${wall}"/>`;
    volumes += `<rect x="${vx - w * 0.03}" y="${y - h * 0.012}" width="${vw + w * 0.06}" height="${h * 0.014}" fill="${wall}"/>`;
  }
  const poolY = baseY + h * 0.02;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${skyTop}"/><stop offset="1" stop-color="${skyLow}"/></linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#s)"/>
<polygon points="0,${horizon} ${peaks} ${w},${horizon}" fill="${land}" opacity="0.55"/>
${coastal ? `<rect x="0" y="${horizon}" width="${w}" height="${h * 0.08}" fill="${pick(SEA)}"/>` : ''}
<rect x="0" y="${horizon + (coastal ? h * 0.08 : 0)}" width="${w}" height="${h}" fill="${land}"/>
${volumes}
<rect x="${bx - w * 0.05}" y="${baseY}" width="${bw + w * 0.1}" height="${h * 0.02}" fill="${pick(WALL)}"/>
<rect x="${bx}" y="${poolY}" width="${bw * 0.7}" height="${h * 0.07}" fill="#4f9bb0"/>
<rect x="${bx}" y="${poolY + h * 0.012}" width="${bw * 0.7}" height="${h * 0.01}" fill="#9fd0dc" opacity="0.7"/>
<rect x="0" y="${poolY + h * 0.07}" width="${w}" height="${h}" fill="#b8b1a3"/>
<text x="${w * 0.025}" y="${h - w * 0.025}" font-family="Arial, sans-serif" font-size="${Math.round(w * 0.022)}" letter-spacing="4" fill="#ffffff" opacity="0.85">SAMPLE</text>
</svg>`;
}

const fact = (value) => (value == null ? null : { value, confidence: 'high', sources: [] });
const place = (name, kind, city, province, region, country = 'South Africa') => ({
  placeId: name.toLowerCase().replace(/\W+/g, '-'), name, kind, country, province, city, region,
  suburb: kind === 'suburb' ? name : null, estate: kind === 'estate' ? name : null,
  source: 'caption-location-line', confidence: 'high', evidence: [name], notes: [],
});

// Sample residences: varied completeness on purpose (no price, POA, missing
// bathrooms, long titles), so every template state gets exercised.
const SAMPLES = [
  { title: 'A pavilion house above the Atlantic', place: place('Bantry Bay', 'suburb', 'Cape Town', 'Western Cape', 'Atlantic Seaboard'), status: 'on-the-market', asOf: '2026-09-18', price: { amount: 42_500_000, currency: 'ZAR', qualifier: 'asking' }, beds: 5, baths: 5.5, garages: 3, erf: 1012, floor: 865, orient: 'landscape', images: 8, arch: ['contemporary', 'glazing', 'off-shutter-concrete'], amen: ['pool', 'sea-views', 'wine-cellar', 'lift'], credits: { architect: 'example_architects', photographer: 'example_photography', listing: 'example_realty' } },
  { title: 'Courtyard house in the oaks', place: place('Bishopscourt', 'suburb', 'Cape Town', 'Western Cape', 'Southern Suburbs'), status: 'featured', asOf: '2026-08-02', beds: 6, baths: 6, erf: 4200, orient: 'portrait', images: 7, arch: ['courtyard', 'timber'], amen: ['pool', 'tennis', 'staff-accommodation'], credits: { architect: 'example_studio', photographer: 'example_lens' } },
  { title: 'Villa Mare', place: place('Camps Bay', 'suburb', 'Cape Town', 'Western Cape', 'Atlantic Seaboard'), status: 'availability-to-confirm', asOf: '2026-05-11', price: { amount: null, currency: null, qualifier: 'poa' }, beds: 4, orient: 'landscape', images: 6, arch: ['cantilever'], amen: ['sea-views', 'pool'], credits: { listing: 'example_agency' } },
  { title: 'A farmhouse among the vines, restored with a new glass wing', place: place('Franschhoek', 'town', 'Franschhoek', 'Western Cape', 'Cape Winelands'), status: 'on-the-market', asOf: '2026-09-12', price: { amount: 36_000_000, currency: 'ZAR', qualifier: 'asking' }, beds: 5, baths: 5, erf: null, orient: 'portrait', images: 9, arch: ['farmhouse', 'glazing'], amen: ['vineyard', 'pool', 'guest-accommodation'], credits: { interiors: 'example_interiors', listing: 'example_realty' } },
  { title: 'The Lookout', place: place('Plettenberg Bay', 'town', 'Plettenberg Bay', 'Western Cape', 'Garden Route'), status: 'sold', asOf: '2026-07-20', beds: 4, baths: 4, garages: 2, orient: 'square', images: 5, arch: ['timber'], amen: ['sea-views', 'braai'], credits: { photographer: 'example_photography' } },
  { title: 'House on Sandhurst Avenue', place: place('Sandhurst', 'suburb', 'Johannesburg', 'Gauteng', 'Sandton'), status: 'under-offer', asOf: '2026-09-05', price: { amount: 58_000_000, currency: 'ZAR', qualifier: 'asking' }, beds: 6, baths: 7, garages: 6, erf: 4046, floor: 1450, orient: 'landscape', images: 7, arch: ['contemporary'], amen: ['cinema', 'gym', 'staff-accommodation', 'backup-power'], credits: { architect: 'example_architects', listing: 'example_agency' } },
  { title: 'Ridge house', place: place('Waterkloof', 'suburb', 'Pretoria', 'Gauteng', 'Pretoria East'), status: 'featured', asOf: '2026-06-15', beds: 5, orient: 'portrait', images: 6, arch: ['face-brick', 'modernist'], amen: ['pool', 'garden'], credits: { architect: 'example_studio' } },
  { title: 'Beach house at Zimbali', place: place('Zimbali', 'estate', 'Ballito', 'KwaZulu-Natal', 'North Coast'), status: 'availability-to-confirm', asOf: '2026-03-22', price: { amount: 24_950_000, currency: 'ZAR', qualifier: 'asking' }, beds: 4, baths: 4.5, garages: 2, orient: 'landscape', images: 8, arch: ['coastal', 'timber'], amen: ['security-estate', 'golf-course', 'pool'], credits: { listing: 'example_realty', photographer: 'example_lens' } },
  { title: 'Umhlanga penthouse', place: place('Umhlanga', 'suburb', 'Durban', 'KwaZulu-Natal', 'Umhlanga'), status: 'on-the-market', asOf: '2026-09-21', price: { amount: 18_500_000, currency: 'ZAR', qualifier: 'asking' }, beds: 3, baths: 3, parking: 2, floor: 420, type: 'penthouse', orient: 'portrait', images: 6, arch: ['contemporary'], amen: ['sea-views', 'lift'], credits: { listing: 'example_agency' } },
  { title: 'Stone house in the Winelands', place: place('Stellenbosch', 'town', 'Stellenbosch', 'Western Cape', 'Cape Winelands'), status: 'featured', asOf: '2026-04-30', beds: null, orient: 'landscape', images: 5, arch: ['stone'], amen: ['vineyard', 'fireplace'], credits: { architect: 'example_architects', photographer: 'example_photography' } },
  { title: 'Constantia modern', place: place('Constantia', 'suburb', 'Cape Town', 'Western Cape', 'Southern Suburbs'), status: 'featured', asOf: '2026-02-14', beds: 5, baths: 5, orient: 'square', images: 4, arch: ['minimalist'], amen: ['pool', 'garden'], credits: {} },
  { title: 'Lagoon house', place: place('Knysna', 'town', 'Knysna', 'Western Cape', 'Garden Route'), status: 'availability-to-confirm', asOf: '2026-01-09', price: { amount: 12_750_000, currency: 'ZAR', qualifier: 'asking' }, beds: 4, baths: 3, orient: 'portrait', images: 6, arch: ['timber', 'glazing'], amen: ['beachfront', 'jacuzzi'], credits: { listing: 'example_agency' } },
];

const SIZES = { landscape: [1600, 1067], portrait: [1080, 1350], square: [1080, 1080] };

async function main() {
  await rm(OUT, { recursive: true, force: true });
  const properties = [];
  let seed = 11;
  for (const [i, s] of SAMPLES.entries()) {
    const id = `sample${String(i + 1).padStart(2, '0')}`;
    const slug = `${s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${id}`;
    const postDates = [s.asOf, ...(i % 3 === 0 ? ['2025-11-20'] : [])].sort();
    const posts = postDates.map((d, j) => ({
      id: `${id}p${j}`,
      url: 'https://www.instagram.com/southafrica.property/',
      postedAt: d,
      type: 'carousel',
      signals: j === postDates.length - 1 ? ({ 'on-the-market': ['for-sale'], sold: ['sold'], 'under-offer': ['under-offer'], 'availability-to-confirm': ['for-sale'] }[s.status] ?? []) : [],
      caption: `SAMPLE CAPTION — not a real listing.\n${s.title}\n📍 ${s.place.name}, ${s.place.city}\nA long, low house set into the slope, with living spaces that open onto a terrace and pool. Bedrooms sit on the upper level, each opening to the view, and the garden is planted with indigenous fynbos. This text only exists to test the layout at a realistic length.`,
    }));
    const gallery = [];
    for (let k = 0; k < s.images; k++) {
      const orient = k % 4 === 3 && s.orient === 'portrait' ? 'square' : s.orient;
      const [w, h] = SIZES[orient];
      const file = `media/source/${id}/${String(k).padStart(2, '0')}.jpg`;
      await mkdir(path.join(OUT, path.dirname(file)), { recursive: true });
      await sharp(Buffer.from(scene(seed++, w, h))).jpeg({ quality: 82 }).toFile(path.join(OUT, file));
      gallery.push({ id: `${id}-${String(k).padStart(2, '0')}`, postId: posts[0].id, file, width: w, height: h, alt: `Sample illustration ${k + 1} of ${s.title}`, dominant: '#d8d6cf', credit: s.credits.photographer ? [`@${s.credits.photographer}`] : [] });
    }
    const roleMap = { architect: 'architect', photographer: 'photographer', listing: 'listing', interiors: 'interior-designer' };
    const people = Object.entries(s.credits).map(([k, handle]) => ({ handle, name: null, roles: { [roleMap[k]]: [{ postId: posts[0].id, evidence: 'sample', source: 'caption', confidence: 'high' }] } }));
    properties.push({
      id: `p-${id}`,
      slug,
      title: { text: s.title, source: 'caption' },
      place: s.place,
      status: { status: s.status, asOf: s.asOf },
      facts: {
        price: fact(s.price),
        bedrooms: fact(s.beds),
        bathrooms: fact(s.baths),
        garages: fact(s.garages),
        parking: fact(s.parking),
        erfSize: s.erf ? fact({ value: s.erf, unit: 'm2' }) : null,
        floorSize: s.floor ? fact({ value: s.floor, unit: 'm2' }) : null,
        propertyType: s.type ? fact(s.type) : fact('house'),
      },
      architecture: s.arch,
      amenities: s.amen,
      people,
      links: [],
      contacts: { phones: [], emails: [] },
      gallery,
      posts,
      firstFeatured: postDates[0],
      lastFeatured: postDates.at(-1),
      needsReview: false,
    });
  }
  await mkdir(path.join(OUT, 'data'), { recursive: true });
  await writeFile(path.join(OUT, 'data/properties.json'), JSON.stringify({ sample: true, properties }, null, 2));
  console.log(`Wrote ${properties.length} sample residences to ${path.relative(ROOT, OUT)}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
