#!/usr/bin/env node
// Cluster normalised posts into residences: the same home often appears in
// several posts (a carousel, then a reel, then a "just sold" repost).
//
//   node scripts/extract/dedupe.mjs          → data/normalized/residences.json
//
// Evidence between two posts is scored; pairs scoring ≥ 1 are merged with
// union-find. Every merge keeps the evidence that justified it, and conflicts
// are kept rather than resolved silently.
//
//   evidence            weight   notes
//   listing-url          1.0     same non-generic listing link in both captions
//   same-photo           1.0     a perceptually identical, informative image
//   same-price-specs     1.0     same price (≥ R1m) + same bedrooms + same city
//   caption-copy     1.0 / 0.6   3-word shingle Jaccard ≥ 0.6 / ≥ 0.35
//   same-title           0.8     same caption title, used by ≤ 3 posts
//   place-specs-agent    0.6     same suburb/estate + beds + baths + listing credit
//   place-specs          0.4     same suburb/estate + beds + baths
//
// Hard conflicts (different bedroom counts, different cities, prices more than
// 25% apart) veto a merge unless same-photo or listing-url proves identity; in
// that case the cluster is flagged needsReview.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { sameImage } from '../lib/image-hash.mjs';
import { PLACES } from '../lib/gazetteer.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

const GENERIC_LINK = /(instagram\.com|linktr\.ee|linkin\.bio|lnk\.bio|beacons\.ai|bit\.ly|wa\.me|facebook\.com|tiktok\.com|youtube\.com|youtu\.be)/i;
const STOP = new Set('a an and are as at be by for from has have in is it its of on or our the this to with you your we'.split(' '));

const popcount = (hex) => [...BigInt(`0x${hex}`).toString(2)].filter((c) => c === '1').length;
const informative = (h) => popcount(h.dhash) >= 8 && popcount(h.dhashCenter) >= 8;

export function shingles(caption) {
  const words = String(caption)
    .toLowerCase()
    .replace(/[#@][\p{L}\p{N}_.]+/gu, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w));
  const set = new Set();
  for (let i = 0; i + 2 < words.length; i++) set.add(words.slice(i, i + 3).join(' '));
  return { set, words: words.length };
}

export function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

const PLACE_LABELS = PLACES.flatMap((p) => [p.name, ...p.aliases])
  .sort((a, b) => b.length - a.length)
  .map((l) => new RegExp(`(?<![\\p{L}])${l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'giu'));

// A caption's first line, when it reads as a name for the home. Location lines
// and lines made only of place names are not titles.
export function titleOf(caption) {
  const first = String(caption).split('\n').map((l) => l.trim()).find(Boolean) ?? '';
  if (/^(?:📍|location\s*[:\-–])/iu.test(first)) return null;
  const t = first
    .replace(/[#@][\p{L}\p{N}_.]+/gu, '')
    .replace(/[\p{Extended_Pictographic}️‍]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length < 3 || t.length > 80 || t.endsWith('?') || /\bR\s?\d|\d\s?bed/i.test(t)) return null;
  const withoutPlaces = PLACE_LABELS.reduce((acc, re) => acc.replace(re, ''), t);
  if ((withoutPlaces.match(/\p{L}/gu) ?? []).length < 3) return null;
  return t.toLowerCase();
}

const numeric = (f) => (f && f.confidence !== 'low' ? f.value : null);

function conflictsBetween(a, b) {
  const out = [];
  const ba = numeric(a.parsed.bedrooms);
  const bb = numeric(b.parsed.bedrooms);
  if (ba != null && bb != null && ba !== bb) out.push(`bedrooms ${ba} vs ${bb}`);
  const ca = a.place?.confidence !== 'low' ? a.place?.city : null;
  const cb = b.place?.confidence !== 'low' ? b.place?.city : null;
  if (ca && cb && ca !== cb) out.push(`city ${ca} vs ${cb}`);
  const pa = a.parsed.price?.value?.amount;
  const pb = b.parsed.price?.value?.amount;
  if (pa && pb && Math.abs(pa - pb) / Math.max(pa, pb) > 0.25) out.push(`price ${pa} vs ${pb}`);
  return out;
}

export function scorePair(a, b, ctx) {
  const evidence = [];
  const add = (kind, weight, detail) => evidence.push({ kind, weight, detail });

  const la = a.parsed.links.filter((l) => !GENERIC_LINK.test(l) && /\/[^/\s]{4,}/.test(l.replace(/^https?:\/\//, '')));
  const shared = la.filter((l) => b.parsed.links.includes(l));
  if (shared.length) add('listing-url', 1, shared[0]);

  const ha = ctx.hashesByPost.get(a.id) ?? [];
  const hb = ctx.hashesByPost.get(b.id) ?? [];
  const photo = ha.find((x) => !ctx.generic.has(x.id) && hb.some((y) => !ctx.generic.has(y.id) && sameImage(x, y)));
  if (photo) add('same-photo', 1, photo.id);

  const pa = a.parsed.price?.value;
  const pb = b.parsed.price?.value;
  const bedsA = numeric(a.parsed.bedrooms);
  const bedsB = numeric(b.parsed.bedrooms);
  if (pa?.amount >= 1_000_000 && pa.amount === pb?.amount && pa.currency === pb.currency &&
      bedsA != null && bedsA === bedsB && a.place?.city && a.place.city === b.place?.city) {
    add('same-price-specs', 1, `${pa.currency} ${pa.amount}, ${bedsA} bed, ${a.place.city}`);
  }

  const sa = ctx.shingles.get(a.id);
  const sb = ctx.shingles.get(b.id);
  if (sa.words >= 25 && sb.words >= 25) {
    const j = jaccard(sa.set, sb.set);
    if (j >= 0.6) add('caption-copy', 1, `jaccard ${j.toFixed(2)}`);
    else if (j >= 0.35) add('caption-copy', 0.6, `jaccard ${j.toFixed(2)}`);
  }

  const ta = ctx.titles.get(a.id);
  if (ta && ta === ctx.titles.get(b.id) && (ctx.titleCounts.get(ta) ?? 0) <= 3) add('same-title', 0.8, ta);

  const spot = (p) => p.place && (p.place.estate || p.place.suburb) && p.place.confidence !== 'low' ? (p.place.estate || p.place.suburb) : null;
  const bathsA = numeric(a.parsed.bathrooms);
  const bathsB = numeric(b.parsed.bathrooms);
  if (spot(a) && spot(a) === spot(b) && bedsA != null && bedsA === bedsB && bathsA != null && bathsA === bathsB) {
    const agentsA = new Set(a.parsed.credits.filter((c) => c.role === 'listing' && c.handle).map((c) => c.handle));
    const sharedAgent = b.parsed.credits.find((c) => c.role === 'listing' && c.handle && agentsA.has(c.handle));
    if (sharedAgent) add('place-specs-agent', 0.6, `${spot(a)}, ${bedsA}/${bathsA}, @${sharedAgent.handle}`);
    else add('place-specs', 0.4, `${spot(a)}, ${bedsA}/${bathsA}`);
  }

  const score = evidence.reduce((s, e) => s + e.weight, 0);
  const conflicts = conflictsBetween(a, b);
  const proven = evidence.some((e) => e.kind === 'same-photo' || e.kind === 'listing-url');
  return { score, evidence, conflicts, merge: score >= 1 && (!conflicts.length || proven) };
}

export function buildContext(posts, hashes = {}) {
  const hashesByPost = new Map();
  for (const [id, h] of Object.entries(hashes)) {
    if (!informative(h)) continue;
    if (!hashesByPost.has(h.postId)) hashesByPost.set(h.postId, []);
    hashesByPost.get(h.postId).push({ id, ...h });
  }
  // Images matching photos in more than three other posts are templates, logos
  // or title cards — useless as identity evidence.
  const flat = [...hashesByPost.values()].flat();
  const generic = new Set();
  for (const x of flat) {
    const posts = new Set(flat.filter((y) => y.postId !== x.postId && sameImage(x, y)).map((y) => y.postId));
    if (posts.size > 3) generic.add(x.id);
  }
  const titles = new Map(posts.map((p) => [p.id, titleOf(p.caption)]));
  const titleCounts = new Map();
  for (const t of titles.values()) if (t) titleCounts.set(t, (titleCounts.get(t) ?? 0) + 1);
  return {
    hashesByPost,
    generic,
    titles,
    titleCounts,
    shingles: new Map(posts.map((p) => [p.id, shingles(p.caption)])),
  };
}

export function clusterPosts(posts, hashes = {}) {
  const ctx = buildContext(posts, hashes);
  const parent = new Map(posts.map((p) => [p.id, p.id]));
  const find = (x) => (parent.get(x) === x ? x : (parent.set(x, find(parent.get(x))), parent.get(x)));
  const edges = [];
  const rejected = [];
  for (let i = 0; i < posts.length; i++) {
    for (let j = i + 1; j < posts.length; j++) {
      const r = scorePair(posts[i], posts[j], ctx);
      if (r.merge) {
        edges.push({ a: posts[i].id, b: posts[j].id, ...r });
        parent.set(find(posts[i].id), find(posts[j].id));
      } else if (r.score >= 1 && r.conflicts.length) {
        rejected.push({ a: posts[i].id, b: posts[j].id, ...r });
      }
    }
  }
  const groups = new Map();
  for (const p of posts) {
    const root = find(p.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(p);
  }
  const byId = new Map(posts.map((p) => [p.id, p]));
  return {
    residences: [...groups.values()].map((members) => {
      members.sort((x, y) => String(x.postedAt).localeCompare(String(y.postedAt)));
      const ids = new Set(members.map((m) => m.id));
      const ownEdges = edges.filter((e) => ids.has(e.a));
      // Chains can join posts that conflict directly (A~B, B~C, A≠C).
      const pairConflicts = [];
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const c = conflictsBetween(byId.get(members[i].id), byId.get(members[j].id));
          if (c.length) pairConflicts.push({ a: members[i].id, b: members[j].id, conflicts: c });
        }
      }
      return {
        id: `r-${members[0].id}`,
        postIds: members.map((m) => m.id),
        firstPostedAt: members[0].postedAt,
        lastPostedAt: members.at(-1).postedAt,
        edges: ownEdges.map(({ a, b, score, evidence, conflicts }) => ({ a, b, score, evidence, conflicts })),
        conflicts: pairConflicts,
        needsReview: pairConflicts.length > 0,
      };
    }),
    rejected,
    genericImages: [...ctx.generic],
  };
}

async function main() {
  const { posts } = JSON.parse(await readFile(path.join(ROOT, 'data/normalized/posts.json'), 'utf8'));
  let hashes = {};
  try {
    ({ hashes } = JSON.parse(await readFile(path.join(ROOT, 'media/hashes.json'), 'utf8')));
  } catch {
    console.warn('media/hashes.json not found — clustering without image evidence');
  }
  const result = clusterPosts(posts, hashes);
  await writeFile(
    path.join(ROOT, 'data/normalized/residences.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), posts: posts.length, ...result }, null, 2) + '\n',
  );
  const multi = result.residences.filter((r) => r.postIds.length > 1).length;
  console.log(`${posts.length} posts → ${result.residences.length} clusters (${multi} multi-post, ${result.residences.filter((r) => r.needsReview).length} need review, ${result.rejected.length} vetoed pairs)`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
