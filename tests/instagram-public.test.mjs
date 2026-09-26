// Mapping tests for the public Instagram fetch, on a SYNTHETIC response shaped
// like web_profile_info. Nothing here comes from the real account.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapPost, mapProfile } from '../scripts/extract/instagram-public.mjs';
import { normalisePost } from '../scripts/extract/normalize.mjs';

const user = {
  username: 'example_account', full_name: 'Example Account', biography: 'Synthetic bio',
  external_url: 'https://example.com', bio_links: [{ title: 'Site', url: 'https://example.com' }],
  edge_followed_by: { count: 1000 }, edge_follow: { count: 10 }, edge_owner_to_timeline_media: { count: 99 },
  category_name: 'Real Estate', is_business_account: true, is_verified: false, business_email: '', business_phone_number: '',
};
const sidecar = {
  __typename: 'GraphSidecar', id: '1', shortcode: 'SYNTH1', display_url: 'https://example.com/a.jpg',
  dimensions: { width: 1080, height: 1350 }, is_video: false, taken_at_timestamp: 1790000000,
  location: { id: '5', name: 'Camps Bay, Cape Town' },
  edge_media_to_caption: { edges: [{ node: { text: 'Synthetic Residence\n📍 Camps Bay\n4 bedrooms #campsbay @example_realty' } }] },
  edge_media_to_comment: { count: 3 }, edge_liked_by: { count: 50 },
  edge_media_to_tagged_user: { edges: [{ node: { user: { username: 'example_realty', full_name: 'Example Realty' } } }] },
  edge_sidecar_to_children: { edges: [
    { node: { id: '11', shortcode: 'C11', display_url: 'https://example.com/a.jpg', is_video: false, dimensions: { width: 1080, height: 1350 }, accessibility_caption: 'Synthetic alt' } },
    { node: { id: '12', shortcode: 'C12', display_url: 'https://example.com/b.jpg', is_video: false, dimensions: { width: 1080, height: 1080 } } },
  ] },
  product_type: 'carousel_container', pinned_for_users: [{ id: 'x' }],
};

test('profile maps to the Apify profile shape', () => {
  const p = mapProfile(user);
  assert.equal(p.followersCount, 1000);
  assert.equal(p.postsCount, 99);
  assert.equal(p.publicEmail, null, 'empty strings become null');
  assert.equal(p.externalUrls[0].url, 'https://example.com');
});

test('a sidecar maps to an Apify post the normaliser understands', () => {
  const item = mapPost(sidecar, user);
  assert.equal(item.type, 'Sidecar');
  assert.equal(item.childPosts.length, 2);
  assert.equal(item.isPinned, true);
  assert.deepEqual(item.hashtags, ['campsbay']);
  const n = normalisePost(item, { rawFile: 'synthetic', rawIndex: 0 });
  assert.equal(n.type, 'carousel');
  assert.equal(n.media.length, 2);
  assert.equal(n.place.name, 'Camps Bay');
  assert.equal(n.parsed.bedrooms.value, 4);
  assert.ok(n.taggedUsers.includes('example_realty'));
  assert.equal(n.metrics.likes, 50);
});
