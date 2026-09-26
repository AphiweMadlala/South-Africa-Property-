#!/usr/bin/env node
// Fetch the account's public profile and latest posts from Instagram's public
// web profile endpoint (no login, no Apify). Returns the most recent posts only
// (Instagram serves about 12 this way); the Apify route fetches the full archive.
//
//   node scripts/extract/instagram-public.mjs [--username southafrica.property]
//
// Writes a new stamped directory under data/raw/instagram/:
//   web_profile_info.json — the response exactly as received (the raw source)
//   profile.json, posts.json — the same data mapped to the Apify item shape so
//                              normalize.mjs reads both routes identically
//   extraction.json         — how and when it was fetched

import { mkdir, writeFile, chmod, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const args = process.argv.slice(2);
const username = (args.includes('--username') ? args[args.indexOf('--username') + 1] : 'southafrica.property').toLowerCase();

const HOSTS = ['https://i.instagram.com', 'https://www.instagram.com'];
const HEADERS = {
  'x-ig-app-id': '936619743392459',
  'user-agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36',
  accept: '*/*',
  'accept-language': 'en-ZA,en;q=0.9',
  referer: `https://www.instagram.com/${username}/`,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchProfile() {
  const errors = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const host of HOSTS) {
      const url = `${host}/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
      try {
        const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30_000) });
        const text = await res.text();
        if (res.ok) {
          const json = JSON.parse(text);
          if (json?.data?.user) return { url, json, text };
          errors.push(`${url}: no user in response`);
        } else {
          errors.push(`${url}: HTTP ${res.status} ${text.slice(0, 160).replace(/\s+/g, ' ')}`);
        }
      } catch (err) {
        errors.push(`${url}: ${err.message}`);
      }
    }
    await sleep(5000 * (attempt + 1));
  }
  throw new Error(`Instagram did not return the profile:\n  ${errors.join('\n  ')}`);
}

const hashtagsOf = (t) => [...new Set([...String(t).matchAll(/(?<![\w#&])#([\p{L}\p{N}_]+)/gu)].map((m) => m[1].toLowerCase()))];
const mentionsOf = (t) => [...new Set([...String(t).matchAll(/(?<![\w.@])@([A-Za-z0-9._]{1,30})/g)].map((m) => m[1].replace(/\.+$/, '').toLowerCase()))];

export function mapPost(node, user) {
  const caption = node.edge_media_to_caption?.edges?.[0]?.node?.text ?? '';
  const children = node.edge_sidecar_to_children?.edges?.map(({ node: c }) => ({
    id: c.id,
    type: c.is_video ? 'Video' : 'Image',
    shortCode: c.shortcode,
    displayUrl: c.display_url,
    videoUrl: c.video_url ?? null,
    dimensionsHeight: c.dimensions?.height ?? null,
    dimensionsWidth: c.dimensions?.width ?? null,
    alt: c.accessibility_caption ?? null,
    taggedUsers: (c.edge_media_to_tagged_user?.edges ?? []).map((e) => ({ username: e.node.user.username, full_name: e.node.user.full_name })),
  }));
  return {
    id: node.id,
    type: node.__typename === 'GraphSidecar' ? 'Sidecar' : node.is_video ? 'Video' : 'Image',
    shortCode: node.shortcode,
    caption,
    hashtags: hashtagsOf(caption),
    mentions: mentionsOf(caption),
    url: `https://www.instagram.com/p/${node.shortcode}/`,
    commentsCount: node.edge_media_to_comment?.count ?? null,
    likesCount: node.edge_liked_by?.count ?? node.edge_media_preview_like?.count ?? null,
    videoViewCount: node.video_view_count ?? null,
    dimensionsHeight: node.dimensions?.height ?? null,
    dimensionsWidth: node.dimensions?.width ?? null,
    displayUrl: node.display_url,
    videoUrl: node.video_url ?? null,
    alt: node.accessibility_caption ?? null,
    timestamp: node.taken_at_timestamp ? new Date(node.taken_at_timestamp * 1000).toISOString() : null,
    childPosts: children ?? [],
    locationName: node.location?.name ?? null,
    locationId: node.location?.id ?? null,
    ownerUsername: user.username,
    ownerFullName: user.full_name,
    productType: node.product_type ?? null,
    taggedUsers: (node.edge_media_to_tagged_user?.edges ?? []).map((e) => ({ username: e.node.user.username, full_name: e.node.user.full_name })),
    isPinned: (node.pinned_for_users?.length ?? 0) > 0,
    coauthorProducers: (node.coauthor_producers ?? []).map((u) => ({ username: u.username })),
  };
}

export function mapProfile(user) {
  return {
    username: user.username,
    fullName: user.full_name,
    biography: user.biography,
    externalUrl: user.external_url ?? null,
    externalUrls: (user.bio_links ?? []).map((l) => ({ title: l.title, url: l.url })),
    followersCount: user.edge_followed_by?.count ?? null,
    followsCount: user.edge_follow?.count ?? null,
    postsCount: user.edge_owner_to_timeline_media?.count ?? null,
    businessCategoryName: user.business_category_name ?? user.category_name ?? null,
    isBusinessAccount: user.is_business_account ?? null,
    verified: user.is_verified ?? null,
    publicEmail: user.business_email || null,
    publicPhoneNumber: user.business_phone_number || null,
    highlightReelCount: user.highlight_reel_count ?? null,
  };
}

async function main() {
  const { url, json, text } = await fetchProfile();
  const user = json.data.user;
  const edges = user.edge_owner_to_timeline_media?.edges ?? [];
  const stamp = new Date().toISOString().replace(/[:]/g, '').replace(/\.\d+Z$/, 'Z');
  const out = path.join(ROOT, 'data/raw/instagram', `${stamp}-public`);
  const existing = await readdir(path.dirname(out)).catch(() => []);
  if (existing.includes(path.basename(out))) throw new Error(`${out} already exists`);
  await mkdir(out, { recursive: true });
  await writeFile(path.join(out, 'web_profile_info.json'), text);
  await writeFile(path.join(out, 'profile.json'), JSON.stringify([mapProfile(user)], null, 2) + '\n');
  await writeFile(path.join(out, 'posts.json'), JSON.stringify(edges.map(({ node }) => mapPost(node, user)), null, 2) + '\n');
  await writeFile(path.join(out, 'extraction.json'), JSON.stringify({
    extractedAt: new Date().toISOString(),
    username,
    method: 'instagram-public-web-profile-info',
    endpoint: url,
    note: 'Public profile endpoint without login; returns the latest posts only. profile.json and posts.json are web_profile_info.json mapped to the Apify item shape.',
    posts: edges.length,
    profilePostCount: user.edge_owner_to_timeline_media?.count ?? null,
  }, null, 2) + '\n');
  for (const f of await readdir(out)) await chmod(path.join(out, f), 0o444);
  console.log(`Fetched @${user.username}: ${edges.length} posts (profile reports ${user.edge_owner_to_timeline_media?.count ?? '?'}) → ${path.relative(ROOT, out)}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
