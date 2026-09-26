#!/usr/bin/env node
// Phase 3 — build the site's content files from the normalised archive.
//
//   node scripts/content/build-content.mjs [--as-of YYYY-MM-DD] [--window-days 30]
//
// Reads  data/normalized/{posts,residences,profile}.json, media/{manifest,hashes}.json
// Writes data/properties.json, data/features.json, data/people.json, data/places.json
//
// Rules (documentation/content-model.md):
//   - facts merge across a residence's posts by confidence, then recency; every
//     merged value keeps its sources, and disagreements are recorded
//   - status follows the status model; "on-the-market" needs recent sale evidence
//     with a named listing credit (or a live-verified listing, not available here)
//   - titles come from captions only when they read as a name; otherwise a
//     descriptive label is generated and marked as such
//   - posts that are not about a residence become editorial features

import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { titleOf } from '../extract/dedupe.mjs';
import { sameImage } from '../lib/image-hash.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const CONF = { high: 3, medium: 2, low: 1 };
const SALE_KINDS = new Set(['for-sale', 'price-reduced', 'auction']);
const CLOSED_KINDS = new Set(['sold', 'under-offer']);
const LISTING_ROLES = new Set(['listing']);

export const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/&/g, ' and ').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

const shortHash = (s) => createHash('sha1').update(String(s)).digest('hex').slice(0, 6);
const day = (iso) => (iso ? iso.slice(0, 10) : null);

// Pick the best value for a fact across posts: highest confidence, then newest.
export function mergeFact(posts, getter) {
  const candidates = posts
    .map((p) => ({ post: p, f: getter(p) }))
    .filter(({ f }) => f && f.value != null);
  if (!candidates.length) return null;
  candidates.sort((a, b) => (CONF[b.f.confidence] - CONF[a.f.confidence]) || String(b.post.postedAt).localeCompare(String(a.post.postedAt)));
  const best = candidates[0];
  const key = (v) => JSON.stringify(v);
  const distinct = [...new Set(candidates.map((c) => key(c.f.value)))];
  return {
    value: best.f.value,
    confidence: best.f.confidence,
    sources: candidates.map((c) => ({ postId: c.post.id, postedAt: day(c.post.postedAt), evidence: c.f.evidence, confidence: c.f.confidence, value: c.f.value })),
    ...(distinct.length > 1 ? { conflicting: true } : {}),
  };
}

// Status model — see documentation/content-model.md §2.
export function deriveStatus(posts, { asOf, windowDays }) {
  const dated = [...posts].sort((a, b) => String(a.postedAt).localeCompare(String(b.postedAt)));
  const events = [];
  for (const p of dated) {
    for (const s of p.parsed.signals) {
      if (SALE_KINDS.has(s.kind) || CLOSED_KINDS.has(s.kind)) events.push({ kind: s.kind, postId: p.id, date: day(p.postedAt), evidence: s.evidence });
    }
    const q = p.parsed.price?.value;
    if (q && (q.amount || q.qualifier === 'poa') && !p.parsed.signals.some((s) => CLOSED_KINDS.has(s.kind))) {
      events.push({ kind: 'price-stated', postId: p.id, date: day(p.postedAt), evidence: p.parsed.price.evidence });
    }
  }
  if (!events.length) {
    return { status: 'featured', asOf: day(dated.at(-1)?.postedAt), evidence: [] };
  }
  const last = events.at(-1);
  if (CLOSED_KINDS.has(last.kind)) {
    return { status: last.kind === 'sold' ? 'sold' : 'under-offer', asOf: last.date, evidence: [last] };
  }
  const saleEvents = events.filter((e) => !CLOSED_KINDS.has(e.kind));
  const latestSale = saleEvents.at(-1);
  const ageDays = (Date.parse(asOf) - Date.parse(latestSale.date)) / 86_400_000;
  const salePost = posts.find((p) => p.id === latestSale.postId);
  const namedListing = salePost.parsed.credits.some((c) => LISTING_ROLES.has(c.role));
  if (ageDays <= windowDays && namedListing) {
    return { status: 'on-the-market', asOf: latestSale.date, verification: `sale evidence ${Math.round(ageDays)} days before ${asOf} with a named listing credit`, evidence: saleEvents.slice(-3) };
  }
  return {
    status: 'availability-to-confirm',
    asOf: latestSale.date,
    reason: ageDays > windowDays ? `latest sale evidence is ${Math.round(ageDays)} days old` : 'no listing agent or agency named',
    evidence: saleEvents.slice(-3),
  };
}

// A post is about a residence when it carries residential facts or a place
// below city level; otherwise it is editorial.
export function isResidencePost(p) {
  const f = p.parsed;
  return Boolean(
    f.price || f.bedrooms || f.bathrooms || f.erfSize || f.floorSize ||
    (f.propertyType && f.propertyType.value !== 'house') ||
    (p.place && ['suburb', 'estate', 'town'].includes(p.place.kind)) ||
    f.credits.some((c) => ['architect', 'listing', 'developer', 'interior-designer'].includes(c.role)),
  );
}

function galleryFor(posts, manifestByPost, hashes) {
  const out = [];
  for (const p of [...posts].sort((a, b) => String(a.postedAt).localeCompare(String(b.postedAt)))) {
    for (const f of manifestByPost.get(p.id) ?? []) {
      const h = hashes[f.id];
      // The same photograph reposted in a later post appears once.
      const dup = out.some((g) => g.sha256 === f.sha256 || (h && g.hash && sameImage(g.hash, h, 4)));
      if (!dup) out.push({ id: f.id, postId: p.id, file: f.file, width: f.width, height: f.height, alt: f.alt, dominant: h?.dominant ?? null, hash: h ?? null, sha256: f.sha256, credit: f.rights.creditedPhotographers });
    }
  }
  return out.map(({ hash: _h, sha256: _s, ...g }) => g);
}

function peopleOf(posts) {
  const byKey = new Map();
  for (const p of posts) {
    for (const c of p.parsed.credits) {
      const key = c.handle ? `@${c.handle}` : c.name;
      if (!key) continue;
      if (!byKey.has(key)) byKey.set(key, { handle: c.handle ?? null, name: c.name ?? null, roles: new Map() });
      const roles = byKey.get(key).roles;
      if (!roles.has(c.role)) roles.set(c.role, []);
      roles.get(c.role).push({ postId: p.id, evidence: c.evidence, source: c.source, confidence: c.confidence });
    }
  }
  return [...byKey.values()].map((x) => ({ ...x, roles: Object.fromEntries(x.roles) }));
}

export function buildContent({ posts, residences, manifest, hashes = {}, profile = null, asOf, windowDays = 30 }) {
  const postById = new Map(posts.map((p) => [p.id, p]));
  const manifestByPost = new Map();
  for (const f of manifest.files) {
    if (!manifestByPost.has(f.postId)) manifestByPost.set(f.postId, []);
    manifestByPost.get(f.postId).push(f);
  }
  for (const list of manifestByPost.values()) list.sort((a, b) => a.index - b.index);

  const properties = [];
  const features = [];
  for (const cluster of residences) {
    const members = cluster.postIds.map((id) => postById.get(id)).filter(Boolean);
    if (!members.length) continue;
    const first = members[0];
    if (!members.some(isResidencePost)) {
      for (const p of members) {
        features.push({
          id: `f-${shortHash(p.id)}`,
          postId: p.id,
          url: p.url,
          postedAt: day(p.postedAt),
          type: p.type,
          title: titleOf(p.caption),
          caption: p.caption,
          ctas: p.parsed.ctas.map((c) => c.kind),
          media: (manifestByPost.get(p.id) ?? []).map((f) => f.id),
        });
      }
      continue;
    }

    const place = members.map((p) => p.place).filter(Boolean).sort((a, b) => CONF[b.confidence] - CONF[a.confidence])[0] ?? null;
    const captionTitle = members.map((p) => titleOf(p.caption)).find(Boolean) ?? null;
    const placeLabel = place ? (place.estate ?? place.suburb ?? place.city ?? place.name) : null;
    const title = captionTitle
      ? { text: captionTitle.replace(/\b\p{L}/gu, (c) => c.toUpperCase()), source: 'caption', postId: members.find((p) => titleOf(p.caption))?.id }
      : { text: placeLabel ? `Residence in ${placeLabel}` : 'Residence', source: placeLabel ? 'generated-from-place' : 'generated' };

    const facts = {
      price: mergeFact(members, (p) => p.parsed.price),
      bedrooms: mergeFact(members, (p) => p.parsed.bedrooms),
      bathrooms: mergeFact(members, (p) => p.parsed.bathrooms),
      garages: mergeFact(members, (p) => p.parsed.garages),
      parking: mergeFact(members, (p) => p.parsed.parking),
      erfSize: mergeFact(members, (p) => p.parsed.erfSize),
      floorSize: mergeFact(members, (p) => p.parsed.floorSize),
      propertyType: mergeFact(members, (p) => p.parsed.propertyType),
    };
    const vocab = (key) => [...new Set(members.flatMap((p) => p.parsed[key].map((f) => f.value)))];

    properties.push({
      id: `p-${shortHash(first.id)}`,
      slug: `${slugify(title.text)}-${shortHash(first.id)}`,
      title,
      place,
      status: deriveStatus(members, { asOf, windowDays }),
      facts,
      architecture: vocab('architecture'),
      amenities: vocab('amenities'),
      people: peopleOf(members),
      links: [...new Set(members.flatMap((p) => p.parsed.links))],
      contacts: { phones: [...new Set(members.flatMap((p) => p.parsed.phones))], emails: [...new Set(members.flatMap((p) => p.parsed.emails))] },
      gallery: galleryFor(members, manifestByPost, hashes),
      posts: members.map((p) => ({ id: p.id, url: p.url, postedAt: day(p.postedAt), type: p.type, caption: p.caption, signals: p.parsed.signals.map((s) => s.kind) })),
      firstFeatured: day(first.postedAt),
      lastFeatured: day(members.at(-1).postedAt),
      needsReview: Boolean(cluster.needsReview),
    });
  }

  // People across the archive — roles only as stated, with residence links.
  const peopleIndex = new Map();
  for (const prop of properties) {
    for (const person of prop.people) {
      const key = person.handle ? `@${person.handle}` : person.name;
      if (!peopleIndex.has(key)) peopleIndex.set(key, { key, handle: person.handle, name: person.name, roles: {}, residences: [] });
      const entry = peopleIndex.get(key);
      for (const [role, ev] of Object.entries(person.roles)) entry.roles[role] = (entry.roles[role] ?? 0) + ev.length;
      entry.residences.push(prop.id);
    }
  }
  const people = [...peopleIndex.values()]
    .map((p) => ({ ...p, residences: [...new Set(p.residences)] }))
    .sort((a, b) => b.residences.length - a.residences.length || a.key.localeCompare(b.key));

  // Places — only where residences resolve.
  const tree = new Map();
  for (const prop of properties) {
    if (!prop.place) continue;
    const { country, province, city } = prop.place;
    const spot = prop.place.estate ?? prop.place.suburb ?? null;
    const k = [country, province ?? '—', city ?? '—', spot ?? '—'].join('|');
    if (!tree.has(k)) tree.set(k, { country, province, city, area: spot, residences: [] });
    tree.get(k).residences.push(prop.id);
  }
  const places = [...tree.values()].sort((a, b) =>
    String(a.country).localeCompare(String(b.country)) || String(a.province).localeCompare(String(b.province)) ||
    String(a.city).localeCompare(String(b.city)) || String(a.area).localeCompare(String(b.area)));

  return {
    properties: properties.sort((a, b) => String(b.lastFeatured).localeCompare(String(a.lastFeatured))),
    features: features.sort((a, b) => String(b.postedAt).localeCompare(String(a.postedAt))),
    people,
    places,
    profile,
  };
}

async function readJson(rel, fallback) {
  try {
    return JSON.parse(await readFile(path.join(ROOT, rel), 'utf8'));
  } catch (err) {
    if (fallback !== undefined && err.code === 'ENOENT') return fallback;
    throw err;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
  const { posts, generatedAt, source } = await readJson('data/normalized/posts.json');
  const { residences } = await readJson('data/normalized/residences.json');
  const manifest = await readJson('media/manifest.json', { files: [] });
  const { hashes } = await readJson('media/hashes.json', { hashes: {} });
  const { profile } = await readJson('data/normalized/profile.json', { profile: null });
  // Status recency is measured from the extraction date, not today.
  const extractedAt = source?.rawDir?.match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? day(generatedAt);
  const asOf = flag('--as-of', extractedAt);
  const windowDays = Number(flag('--window-days', 30));

  const out = buildContent({ posts, residences, manifest, hashes, profile, asOf, windowDays });
  const meta = { generatedAt: new Date().toISOString(), asOf, windowDays, source: 'data/normalized' };
  await writeFile(path.join(ROOT, 'data/properties.json'), JSON.stringify({ ...meta, count: out.properties.length, properties: out.properties }, null, 2) + '\n');
  await writeFile(path.join(ROOT, 'data/features.json'), JSON.stringify({ ...meta, count: out.features.length, features: out.features }, null, 2) + '\n');
  await writeFile(path.join(ROOT, 'data/people.json'), JSON.stringify({ ...meta, count: out.people.length, people: out.people }, null, 2) + '\n');
  await writeFile(path.join(ROOT, 'data/places.json'), JSON.stringify({ ...meta, count: out.places.length, places: out.places }, null, 2) + '\n');
  const statuses = out.properties.reduce((acc, p) => ({ ...acc, [p.status.status]: (acc[p.status.status] ?? 0) + 1 }), {});
  console.log(`${out.properties.length} residences (${Object.entries(statuses).map(([k, v]) => `${v} ${k}`).join(', ')}), ${out.features.length} features, ${out.people.length} people, ${out.places.length} places`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
