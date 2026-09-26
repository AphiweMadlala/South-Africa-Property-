#!/usr/bin/env node
// Phase 2 — normalise a raw Apify Instagram export into data/normalized/posts.json.
//
//   node scripts/extract/normalize.mjs [data/raw/instagram/<stamp>] [--username southafrica.property] [--out dir]
//
// Reads (never writes) the raw export directory produced by apify-extract.sh:
//   profile.json  — apify/instagram-profile-scraper items
//   posts.json    — apify/instagram-post-scraper items
//   reels.json    — apify/instagram-reel-scraper items (optional)
// Posts and reels are merged by shortcode. Every normalised post keeps a pointer
// back to the raw file and array index it came from.

import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseCaption, extractHashtags } from '../lib/parse-caption.mjs';
import { resolvePlace } from '../lib/gazetteer.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const RAW_BASE = path.join(ROOT, 'data/raw/instagram');

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const username = flag('--username', 'southafrica.property').toLowerCase();
const OUT_DIR = path.resolve(flag('--out', path.join(ROOT, 'data/normalized')));

async function latestRawDir() {
  const entries = (await readdir(RAW_BASE, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  if (!entries.length) throw new Error(`No raw exports in ${path.relative(ROOT, RAW_BASE)}. Run the extraction runbook first.`);
  return path.join(RAW_BASE, entries.at(-1));
}

async function readJsonIfExists(file) {
  try {
    const buf = await readFile(file);
    return { data: JSON.parse(buf.toString('utf8')), sha256: createHash('sha256').update(buf).digest('hex') };
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

const pick = (o, ...keys) => {
  for (const k of keys) if (o?.[k] !== undefined && o?.[k] !== null && o?.[k] !== '') return o[k];
  return null;
};

// Instagram reports hidden like counts as -1 or omits them.
const metric = (v) => (typeof v === 'number' && v >= 0 ? v : null);

export function mediaType(item) {
  const t = String(pick(item, 'type') ?? '').toLowerCase();
  const product = String(pick(item, 'productType') ?? '').toLowerCase();
  if (t === 'sidecar' || product === 'carousel_container' || (Array.isArray(item.childPosts) && item.childPosts.length > 1)) return 'carousel';
  if (t === 'video' || product === 'clips' || product === 'igtv') return product === 'clips' ? 'reel' : 'video';
  return 'image';
}

function normaliseMedia(item) {
  const children = Array.isArray(item.childPosts) && item.childPosts.length ? item.childPosts : null;
  if (children) {
    return children.map((c, index) => ({
      index,
      kind: String(c.type ?? '').toLowerCase() === 'video' ? 'video' : 'image',
      imageUrl: pick(c, 'displayUrl'),
      videoUrl: pick(c, 'videoUrl'),
      width: pick(c, 'dimensionsWidth'),
      height: pick(c, 'dimensionsHeight'),
      alt: pick(c, 'alt', 'accessibilityCaption'),
      taggedUsers: (c.taggedUsers ?? []).map((u) => pick(u, 'username')).filter(Boolean),
    }));
  }
  if (Array.isArray(item.images) && item.images.length > 1) {
    return item.images.map((imageUrl, index) => ({ index, kind: 'image', imageUrl, videoUrl: null, width: null, height: null, alt: null, taggedUsers: [] }));
  }
  const isVideo = ['video', 'reel'].includes(mediaType(item));
  return [{
    index: 0,
    kind: isVideo ? 'video' : 'image',
    imageUrl: pick(item, 'displayUrl'),
    videoUrl: pick(item, 'videoUrl'),
    width: pick(item, 'dimensionsWidth'),
    height: pick(item, 'dimensionsHeight'),
    alt: pick(item, 'alt', 'accessibilityCaption'),
    taggedUsers: [],
  }];
}

export function normalisePost(item, provenance, reel) {
  const shortcode = pick(item, 'shortCode', 'shortcode', 'code');
  const caption = pick(item, 'caption') ?? '';
  const parsed = parseCaption(caption);
  const hashtags = [...new Set([...(item.hashtags ?? []).map((h) => String(h).toLowerCase()), ...parsed.hashtags])];
  const mentions = [...new Set([...(item.mentions ?? []).map((m) => String(m).toLowerCase()), ...parsed.handles])];
  const locationTag = pick(item, 'locationName');

  const taggedUsers = [...new Set([
    ...(item.taggedUsers ?? []).map((u) => pick(u, 'username')),
    ...normaliseMedia(item).flatMap((m) => m.taggedUsers),
  ].filter(Boolean).map((u) => u.toLowerCase()))];
  const coauthors = (item.coauthorProducers ?? []).map((u) => pick(u, 'username')).filter(Boolean).map((u) => u.toLowerCase());

  // Credits: caption roles first; photo tags and collab authors are recorded
  // with their own source and no role beyond what Instagram itself states.
  const credits = [
    ...parsed.credits,
    ...taggedUsers.map((handle) => ({ role: 'tagged', handle, name: null, evidence: 'Instagram photo tag', source: 'photo-tag', confidence: 'high' })),
    ...coauthors.map((handle) => ({ role: 'collaborator', handle, name: null, evidence: 'Instagram collab post', source: 'collab', confidence: 'high' })),
  ];

  const place = resolvePlace({
    locationTag,
    locationLines: parsed.locationLines.map((l) => l.value),
    caption,
    hashtags,
  });

  return {
    id: shortcode,
    url: pick(item, 'url') ?? (shortcode ? `https://www.instagram.com/p/${shortcode}/` : null),
    instagramId: pick(item, 'id'),
    type: mediaType(item),
    productType: pick(item, 'productType'),
    postedAt: pick(item, 'timestamp'),
    pinned: Boolean(item.isPinned),
    owner: { username: (pick(item, 'ownerUsername') ?? '').toLowerCase() || null, fullName: pick(item, 'ownerFullName') },
    caption,
    media: normaliseMedia(item).map(({ taggedUsers: _t, ...m }) => m),
    video: ['video', 'reel'].includes(mediaType(item))
      ? { durationSeconds: pick(reel ?? {}, 'videoDuration') ?? pick(item, 'videoDuration'), url: pick(item, 'videoUrl') }
      : null,
    locationTag: locationTag ? { name: locationTag, id: pick(item, 'locationId') } : null,
    hashtags,
    mentions,
    taggedUsers,
    coauthors,
    metrics: {
      likes: metric(pick(item, 'likesCount')),
      comments: metric(pick(item, 'commentsCount')),
      views: metric(pick(reel ?? {}, 'videoPlayCount', 'videoViewCount') ?? pick(item, 'videoPlayCount', 'videoViewCount')),
    },
    parsed: { ...parsed, credits },
    place,
    provenance,
  };
}

async function main() {
  const rawDir = args[0] && !args[0].startsWith('--') ? path.resolve(args[0]) : await latestRawDir();
  if (!(await stat(rawDir)).isDirectory()) throw new Error(`${rawDir} is not a directory`);
  const rel = (f) => path.relative(ROOT, path.join(rawDir, f));

  const posts = await readJsonIfExists(path.join(rawDir, 'posts.json'));
  if (!posts) throw new Error(`${rel('posts.json')} not found`);
  const reels = await readJsonIfExists(path.join(rawDir, 'reels.json'));
  const profile = await readJsonIfExists(path.join(rawDir, 'profile.json'));

  const reelByCode = new Map();
  (reels?.data ?? []).forEach((r, index) => {
    const code = pick(r, 'shortCode', 'shortcode', 'code');
    if (code) reelByCode.set(code, { item: r, index });
  });

  const byCode = new Map();
  posts.data.forEach((item, index) => {
    const code = pick(item, 'shortCode', 'shortcode', 'code');
    if (!code || item.error) return;
    const reel = reelByCode.get(code);
    byCode.set(code, normalisePost(item, {
      rawFile: rel('posts.json'), rawIndex: index,
      ...(reel ? { reelRawFile: rel('reels.json'), reelRawIndex: reel.index } : {}),
    }, reel?.item));
  });
  // Reels the post scraper missed.
  for (const [code, { item, index }] of reelByCode) {
    if (!byCode.has(code) && !item.error) {
      byCode.set(code, normalisePost(item, { rawFile: rel('reels.json'), rawIndex: index }, item));
    }
  }

  const all = [...byCode.values()].sort((a, b) => String(b.postedAt).localeCompare(String(a.postedAt)));
  const own = all.filter((p) => p.owner.username === username || p.coauthors.includes(username));
  const excluded = all.filter((p) => !own.includes(p)).map((p) => ({ id: p.id, owner: p.owner.username }));

  const p0 = profile?.data?.[0] ?? null;
  const normalizedProfile = p0 && {
    username: pick(p0, 'username'),
    fullName: pick(p0, 'fullName'),
    biography: pick(p0, 'biography'),
    externalUrl: pick(p0, 'externalUrl'),
    externalUrls: p0.externalUrls ?? [],
    followers: metric(pick(p0, 'followersCount')),
    following: metric(pick(p0, 'followsCount')),
    posts: metric(pick(p0, 'postsCount')),
    category: pick(p0, 'businessCategoryName', 'categoryName'),
    isBusinessAccount: p0.isBusinessAccount ?? null,
    isVerified: p0.verified ?? p0.isVerified ?? null,
    publicEmail: pick(p0, 'publicEmail', 'businessEmail'),
    publicPhone: pick(p0, 'publicPhoneNumber', 'businessPhoneNumber'),
    bioHashtags: extractHashtags(pick(p0, 'biography') ?? ''),
    highlightReelCount: pick(p0, 'highlightReelCount'),
    provenance: { rawFile: rel('profile.json'), rawIndex: 0 },
  };

  await mkdir(OUT_DIR, { recursive: true });
  const meta = {
    generatedAt: new Date().toISOString(),
    username,
    source: {
      rawDir: path.relative(ROOT, rawDir),
      files: Object.fromEntries(
        [['posts.json', posts], ['reels.json', reels], ['profile.json', profile]]
          .filter(([, v]) => v)
          .map(([k, v]) => [rel(k), { sha256: v.sha256, items: Array.isArray(v.data) ? v.data.length : null }]),
      ),
    },
  };
  await writeFile(path.join(OUT_DIR, 'posts.json'), JSON.stringify({ ...meta, count: own.length, excluded, posts: own }, null, 2) + '\n');
  if (normalizedProfile) await writeFile(path.join(OUT_DIR, 'profile.json'), JSON.stringify({ ...meta, profile: normalizedProfile }, null, 2) + '\n');

  const types = own.reduce((acc, p) => ({ ...acc, [p.type]: (acc[p.type] ?? 0) + 1 }), {});
  console.log(`normalised ${own.length} posts (${Object.entries(types).map(([k, v]) => `${v} ${k}`).join(', ')}); excluded ${excluded.length} not owned by @${username}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
