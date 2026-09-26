// Content builder tests on SYNTHETIC posts run through the real normaliser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalisePost } from '../scripts/extract/normalize.mjs';
import { clusterPosts } from '../scripts/extract/dedupe.mjs';
import { buildContent, deriveStatus, mergeFact, isResidencePost, slugify } from '../scripts/content/build-content.mjs';

let n = 0;
const mk = (caption, postedAt, extra = {}) => {
  n++;
  return normalisePost({
    shortCode: `B${String(n).padStart(4, '0')}`,
    caption,
    ownerUsername: 'southafrica.property',
    timestamp: `${postedAt}T08:00:00.000Z`,
    displayUrl: `https://example.com/${n}.jpg`,
    ...extra,
  }, { rawFile: 'synthetic', rawIndex: n });
};
const AS_OF = '2026-09-26';
const status = (posts) => deriveStatus(posts, { asOf: AS_OF, windowDays: 30 }).status;

test('recent sale evidence with a named listing credit is on the market', () => {
  assert.equal(status([mk('For sale. R 12 500 000. Listed by @example_realty', '2026-09-10')]), 'on-the-market');
});

test('recent sale evidence without a listing credit is availability-to-confirm', () => {
  assert.equal(status([mk('For sale. R 12 500 000.', '2026-09-10')]), 'availability-to-confirm');
});

test('old sale evidence is availability-to-confirm, never for sale', () => {
  const s = deriveStatus([mk('For sale. R 12 500 000. Listed by @example_realty', '2026-03-01')], { asOf: AS_OF, windowDays: 30 });
  assert.equal(s.status, 'availability-to-confirm');
  assert.match(s.reason, /days old/);
});

test('a later SOLD post closes the listing', () => {
  const posts = [mk('For sale. R 9 000 000. Listed by @example_realty', '2026-09-01'), mk('SOLD in 10 days', '2026-09-20')];
  assert.equal(status(posts), 'sold');
});

test('no sale evidence is featured', () => {
  assert.equal(status([mk('A pavilion house by @example_studio above the bay', '2026-09-10')]), 'featured');
});

test('mergeFact prefers confidence, then recency, and flags conflicts', () => {
  const a = mk('🛏 4', '2026-09-01');
  const b = mk('Bedrooms: 5', '2026-08-01');
  const m = mergeFact([a, b], (p) => p.parsed.bedrooms);
  assert.equal(m.value, 5);
  assert.equal(m.conflicting, true);
  assert.equal(m.sources.length, 2);
});

test('editorial posts are not residences', () => {
  assert.equal(isResidencePost(mk('Want your home featured? DM us.', '2026-09-01')), false);
  assert.equal(isResidencePost(mk('📍 Clifton\n4 bedrooms', '2026-09-01')), true);
});

test('buildContent: titles, generated labels, gallery dedupe, places and features', () => {
  const named = mk('The Example House\n📍 Clifton, Cape Town\nR 45 000 000\n4 bedrooms', '2026-09-05');
  const repost = mk('📍 Clifton, Cape Town\nR 45 000 000\n4 bedrooms · back on show', '2026-09-15');
  const unnamed = mk('📍 Umhlanga\n5 bedrooms 5 bathrooms', '2026-08-20');
  const promo = mk('Want your home featured? DM us.', '2026-09-01');
  const posts = [named, repost, unnamed, promo];
  const { residences } = clusterPosts(posts);
  const file = (post, i, sha) => ({ id: `${post.id}-0${i}`, postId: post.id, index: i, file: `media/source/${post.id}/0${i}.jpg`, width: 1080, height: 1350, alt: null, sha256: sha, rights: { creditedPhotographers: [] } });
  const manifest = { files: [file(named, 0, 'aaa'), file(named, 1, 'bbb'), file(repost, 0, 'aaa'), file(unnamed, 0, 'ccc')] };

  const out = buildContent({ posts, residences, manifest, asOf: AS_OF });
  assert.equal(out.properties.length, 2);
  assert.equal(out.features.length, 1);

  const clifton = out.properties.find((p) => p.place?.suburb === 'Clifton');
  assert.equal(clifton.title.text, 'The Example House');
  assert.equal(clifton.title.source, 'caption');
  assert.equal(clifton.posts.length, 2);
  assert.equal(clifton.gallery.length, 2, 'the reposted photo appears once');
  assert.equal(clifton.facts.price.value.amount, 45_000_000);
  assert.equal(clifton.facts.bathrooms, null, 'missing stays null');

  const umhlanga = out.properties.find((p) => p.place?.suburb === 'Umhlanga');
  assert.equal(umhlanga.title.text, 'Residence in Umhlanga');
  assert.equal(umhlanga.title.source, 'generated-from-place');
  assert.equal(umhlanga.status.status, 'featured');

  assert.deepEqual(out.places.map((p) => p.area).sort(), ['Clifton', 'Umhlanga']);
});

test('slugify', () => {
  assert.equal(slugify("Simon's Town — Villa & Pool"), 'simons-town-villa-and-pool');
});
