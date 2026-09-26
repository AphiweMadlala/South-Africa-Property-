#!/usr/bin/env node
// Phase 1 evidence from the archive itself: measure what the account publishes.
//
//   node scripts/research/archive-analysis.mjs [--posts file] [--profile file] [--out file]
//
// Writes documentation/research/02-archive-analysis.md (+ .json) from data/normalized/.
// Every number is computed from the extracted posts; nothing is estimated.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? path.resolve(args[i + 1]) : fallback;
};
const POSTS = flag('--posts', path.join(ROOT, 'data/normalized/posts.json'));
const PROFILE = flag('--profile', path.join(ROOT, 'data/normalized/profile.json'));
const OUT = flag('--out', path.join(ROOT, 'documentation/research/02-archive-analysis.md'));

const STOP = new Set(`a about above after again all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers him his how i if in into is it its itself just me more most my no nor not now of off on once only or other our ours out over own same she should so some such than that the their them then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours new home homes house property`.split(/\s+/));

const count = (items) => {
  const m = new Map();
  for (const x of items) if (x != null && x !== '') m.set(x, (m.get(x) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
};
const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : '—');
const median = (xs) => {
  const s = xs.filter((x) => x != null).sort((a, b) => a - b);
  if (!s.length) return null;
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const table = (rows, headers) => rows.length
  ? [`| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n')
  : '_None found._';

function ratioLabel(w, h) {
  if (!w || !h) return 'unknown';
  const r = w / h;
  if (Math.abs(r - 0.8) < 0.03) return '4:5 portrait';
  if (Math.abs(r - 1) < 0.03) return '1:1 square';
  if (Math.abs(r - 0.5625) < 0.03) return '9:16 vertical';
  if (Math.abs(r - 1.91) < 0.1) return '1.91:1 landscape';
  if (Math.abs(r - 1.7778) < 0.05) return '16:9 landscape';
  return r < 1 ? `other portrait (${r.toFixed(2)})` : `other landscape (${r.toFixed(2)})`;
}

function words(caption) {
  return String(caption)
    .toLowerCase()
    .replace(/[#@][\p{L}\p{N}_.]+/gu, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\s'-]/gu, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, ''))
    .filter(Boolean);
}

const EMOJI = /\p{Extended_Pictographic}/gu;

async function main() {
  const { posts, source, generatedAt } = JSON.parse(await readFile(POSTS, 'utf8'));
  let profile = null;
  try {
    ({ profile } = JSON.parse(await readFile(PROFILE, 'utf8')));
  } catch {}

  const n = posts.length;
  if (!n) throw new Error('No posts in the normalised dataset — nothing to analyse.');
  const dates = posts.map((p) => p.postedAt).filter(Boolean).sort();
  const months = count(posts.map((p) => p.postedAt?.slice(0, 7))).sort((a, b) => a[0].localeCompare(b[0]));
  const types = count(posts.map((p) => p.type));
  const carouselSizes = posts.filter((p) => p.type === 'carousel').map((p) => p.media.length);
  const ratios = count(posts.flatMap((p) => p.media.map((m) => ratioLabel(m.width, m.height))));
  const coverRatios = count(posts.map((p) => ratioLabel(p.media[0]?.width, p.media[0]?.height)));
  const captionWords = posts.map((p) => words(p.caption).length);

  const signalCount = (kind) => posts.filter((p) => p.parsed.signals.some((s) => s.kind === kind)).length;
  const ctaCount = count(posts.flatMap((p) => p.parsed.ctas.map((c) => c.kind)));
  const withPrice = posts.filter((p) => p.parsed.price?.value?.amount).length;
  const withPoa = posts.filter((p) => p.parsed.price?.value?.qualifier === 'poa').length;
  const withBeds = posts.filter((p) => p.parsed.bedrooms).length;
  const withBaths = posts.filter((p) => p.parsed.bathrooms).length;
  const withErf = posts.filter((p) => p.parsed.erfSize).length;
  const withFloor = posts.filter((p) => p.parsed.floorSize).length;
  const withPlace = posts.filter((p) => p.place).length;
  const withLinks = posts.filter((p) => p.parsed.links.length).length;
  const withContact = posts.filter((p) => p.parsed.phones.length || p.parsed.emails.length).length;
  const prices = posts.map((p) => p.parsed.price?.value).filter((v) => v?.amount && v.currency === 'ZAR').map((v) => v.amount);

  const credits = posts.flatMap((p) => p.parsed.credits.map((c) => ({ ...c, post: p.id })));
  const creditTable = (role) => count(credits.filter((c) => c.role === role).map((c) => (c.handle ? `@${c.handle}` : c.name))).slice(0, 15);

  const vocabCount = (key) => count(posts.flatMap((p) => p.parsed[key].map((f) => f.value)));
  const unigrams = count(posts.flatMap((p) => words(p.caption).filter((w) => w.length > 2 && !STOP.has(w)))).slice(0, 40);
  const bigrams = count(posts.flatMap((p) => {
    const w = words(p.caption).filter((x) => !STOP.has(x));
    return w.slice(0, -1).map((x, i) => `${x} ${w[i + 1]}`);
  })).filter(([, c]) => c > 1).slice(0, 30);
  const firstLines = count(posts.map((p) => String(p.caption).split('\n')[0].trim().slice(0, 60))).filter(([, c]) => c > 1).slice(0, 15);
  const emoji = count(posts.flatMap((p) => String(p.caption).match(EMOJI) ?? [])).slice(0, 20);

  const byType = Object.fromEntries(types.map(([t]) => [t, {
    likes: median(posts.filter((p) => p.type === t).map((p) => p.metrics.likes)),
    comments: median(posts.filter((p) => p.type === t).map((p) => p.metrics.comments)),
    views: median(posts.filter((p) => p.type === t).map((p) => p.metrics.views)),
  }]));

  const places = posts.map((p) => p.place).filter(Boolean);
  const provinces = count(places.map((p) => p.province ?? p.country));
  const cities = count(places.map((p) => [p.city, p.province].filter(Boolean).join(', ')));
  const spots = count(places.filter((p) => p.suburb || p.estate).map((p) => `${p.estate ?? p.suburb} (${p.city})`)).slice(0, 25);
  const lowPlaces = places.filter((p) => p.confidence === 'low').length;

  const summary = {
    generatedAt: new Date().toISOString(),
    postsFile: path.relative(ROOT, POSTS),
    normalizedAt: generatedAt,
    source,
    profile,
    posts: n,
    dateRange: [dates[0] ?? null, dates.at(-1) ?? null],
    types: Object.fromEntries(types),
    signals: Object.fromEntries(['for-sale', 'price-reduced', 'sold', 'under-offer', 'to-let', 'auction', 'development'].map((k) => [k, signalCount(k)])),
    coverage: { withPrice, withPoa, withBeds, withBaths, withErf, withFloor, withPlace, withLinks, withContact },
    ctas: Object.fromEntries(ctaCount),
  };

  const md = `# 02 — Archive analysis

Generated ${summary.generatedAt} by \`scripts/research/archive-analysis.mjs\` from
\`${summary.postsFile}\` (normalised ${generatedAt}). Raw source: \`${source?.rawDir}\`.
All figures are measured from the extracted posts.

## Profile snapshot

${profile ? table([
    ['Display name', profile.fullName ?? '—'],
    ['Username', `@${profile.username}`],
    ['Bio', (profile.biography ?? '—').replace(/\n/g, ' ⏎ ')],
    ['Followers', profile.followers?.toLocaleString('en-ZA') ?? '—'],
    ['Following', profile.following?.toLocaleString('en-ZA') ?? '—'],
    ['Posts (profile count)', profile.posts?.toLocaleString('en-ZA') ?? '—'],
    ['Category', profile.category ?? '—'],
    ['Business account', String(profile.isBusinessAccount ?? '—')],
    ['Verified', String(profile.isVerified ?? '—')],
    ['External link(s)', [profile.externalUrl, ...(profile.externalUrls ?? []).map((u) => u.url ?? u)].filter(Boolean).join(' · ') || '—'],
    ['Public email', profile.publicEmail ?? '—'],
    ['Public phone', profile.publicPhone ?? '—'],
  ], ['Field', 'Value']) : '_profile.json not available_'}

## Coverage

${n} posts from ${dates[0]?.slice(0, 10) ?? '—'} to ${dates.at(-1)?.slice(0, 10) ?? '—'}.

${table(months.map(([m, c]) => [m, c]), ['Month', 'Posts'])}

## Media mix

${table(types.map(([t, c]) => [t, c, pct(c, n)]), ['Type', 'Posts', 'Share'])}

Carousel length: median ${median(carouselSizes) ?? '—'}, max ${carouselSizes.length ? Math.max(...carouselSizes) : '—'}.

Cover aspect ratios:

${table(coverRatios.map(([r, c]) => [r, c]), ['Ratio', 'Covers'])}

All media aspect ratios:

${table(ratios.map(([r, c]) => [r, c]), ['Ratio', 'Frames'])}

## Sales vs editorial signals

Signals are caption evidence (a post saying "for sale" on its date), not current availability.

${table(Object.entries(summary.signals).map(([k, v]) => [k, v, pct(v, n)]), ['Signal', 'Posts', 'Share'])}

| Field present in caption | Posts | Share |
| --- | --- | --- |
| Asking price (amount) | ${withPrice} | ${pct(withPrice, n)} |
| POA | ${withPoa} | ${pct(withPoa, n)} |
| Bedrooms | ${withBeds} | ${pct(withBeds, n)} |
| Bathrooms | ${withBaths} | ${pct(withBaths, n)} |
| Erf size | ${withErf} | ${pct(withErf, n)} |
| Floor size | ${withFloor} | ${pct(withFloor, n)} |
| Resolved place | ${withPlace} | ${pct(withPlace, n)} (${lowPlaces} low confidence) |
| Link in caption | ${withLinks} | ${pct(withLinks, n)} |
| Phone or email | ${withContact} | ${pct(withContact, n)} |

ZAR prices: ${prices.length} posts; median R ${median(prices)?.toLocaleString('en-ZA') ?? '—'}; range R ${prices.length ? Math.min(...prices).toLocaleString('en-ZA') : '—'} – R ${prices.length ? Math.max(...prices).toLocaleString('en-ZA') : '—'}.

## Calls to action

${table(ctaCount.map(([k, c]) => [k, c, pct(c, n)]), ['CTA', 'Posts', 'Share'])}

## Geography

${table(provinces.map(([k, c]) => [k, c]), ['Province / country', 'Posts'])}

${table(cities.slice(0, 20).map(([k, c]) => [k, c]), ['City', 'Posts'])}

${table(spots.map(([k, c]) => [k, c]), ['Suburb / estate', 'Posts'])}

Instagram location tags (raw):

${table(count(posts.map((p) => p.locationTag?.name)).slice(0, 20).map(([k, c]) => [k, c]), ['Location tag', 'Posts'])}

## People and credits (as stated in captions)

Roles are only assigned where a caption states them. "mentioned" means an
@handle with no stated role; "tagged" means an Instagram photo tag.

${['architect', 'interior-designer', 'landscape-designer', 'designer-unspecified', 'developer', 'builder', 'photographer', 'videographer', 'listing', 'contact', 'source-credit', 'credit-unspecified', 'collaborator', 'tagged', 'mentioned']
    .map((role) => `### ${role}\n\n${table(creditTable(role).map(([h, c]) => [h, c]), ['Credit', 'Posts'])}`).join('\n\n')}

## Hashtags

${table(count(posts.flatMap((p) => p.hashtags)).slice(0, 40).map(([h, c]) => [`#${h}`, c]), ['Hashtag', 'Posts'])}

## Vocabulary

Architecture terms:

${table(vocabCount('architecture').map(([k, c]) => [k, c]), ['Term', 'Posts'])}

Amenity terms:

${table(vocabCount('amenities').map(([k, c]) => [k, c]), ['Term', 'Posts'])}

Property types:

${table(count(posts.map((p) => p.parsed.propertyType?.value)).map(([k, c]) => [k, c]), ['Type', 'Posts'])}

## Caption voice

Caption length: median ${median(captionWords)} words (min ${Math.min(...captionWords)}, max ${Math.max(...captionWords)}).

Frequent words:

${table(unigrams.map(([w, c]) => [w, c]), ['Word', 'Uses'])}

Frequent word pairs:

${table(bigrams.map(([w, c]) => [w, c]), ['Pair', 'Uses'])}

Repeated opening lines:

${table(firstLines.map(([w, c]) => [w.replace(/\|/g, '\\|'), c]), ['Opening line', 'Posts'])}

Emoji:

${table(emoji.map(([e, c]) => [e, c]), ['Emoji', 'Uses'])}

## Engagement (medians, where Instagram exposes them)

${table(Object.entries(byType).map(([t, v]) => [t, v.likes ?? 'hidden', v.comments ?? '—', v.views ?? '—']), ['Type', 'Likes', 'Comments', 'Views'])}

Pinned posts: ${posts.filter((p) => p.pinned).map((p) => p.url).join(', ') || 'none'}.
`;

  await writeFile(OUT, md);
  await writeFile(OUT.replace(/\.md$/, '.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(`wrote ${path.relative(ROOT, OUT)}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
