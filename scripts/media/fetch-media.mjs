#!/usr/bin/env node
// Download the images referenced by data/normalized/posts.json into media/source/
// and record provenance for every file in media/manifest.json.
//
//   node scripts/media/fetch-media.mjs [--only ID,ID] [--concurrency 4]
//
// Instagram CDN URLs are signed and expire within days: run this straight after
// normalize.mjs. Existing files are kept, so re-runs only fetch what is missing.
// Videos are not downloaded; reels contribute their cover frame only.

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const POSTS = path.join(ROOT, 'data/normalized/posts.json');
const OUT = path.join(ROOT, 'media/source');
const MANIFEST = path.join(ROOT, 'media/manifest.json');

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const only = flag('--only', null)?.split(',');
const concurrency = Number(flag('--concurrency', 4));

const exists = (f) => access(f).then(() => true, () => false);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function download(url, attempts = 4) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (res.status === 403 || res.status === 410) throw Object.assign(new Error(`HTTP ${res.status} (signed URL probably expired)`), { fatal: true });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = res.headers.get('content-type') ?? '';
      if (!type.startsWith('image/')) throw Object.assign(new Error(`unexpected content-type ${type}`), { fatal: true });
      return { buffer: Buffer.from(await res.arrayBuffer()), contentType: type };
    } catch (err) {
      lastError = err;
      if (err.fatal) break;
      await sleep(2000 * 2 ** i);
    }
  }
  throw lastError;
}

async function main() {
  const { posts, username } = JSON.parse(await readFile(POSTS, 'utf8'));
  const manifest = (await exists(MANIFEST)) ? JSON.parse(await readFile(MANIFEST, 'utf8')) : { files: [] };
  const known = new Map(manifest.files.map((f) => [f.id, f]));

  const jobs = posts
    .filter((p) => !only || only.includes(p.id))
    .flatMap((post) => post.media.map((m) => ({ post, m })))
    .filter(({ m }) => m.imageUrl);

  let done = 0;
  const failures = [];
  const queue = [...jobs];
  async function worker() {
    for (let job = queue.shift(); job; job = queue.shift()) {
      const { post, m } = job;
      const id = `${post.id}-${String(m.index).padStart(2, '0')}`;
      if (known.has(id) && (await exists(path.join(ROOT, known.get(id).file)))) continue;
      try {
        const { buffer, contentType } = await download(m.imageUrl);
        const meta = await sharp(buffer).metadata();
        const ext = { jpeg: 'jpg', heif: 'heic' }[meta.format] ?? meta.format;
        const file = path.join(OUT, post.id, `${String(m.index).padStart(2, '0')}.${ext}`);
        await mkdir(path.dirname(file), { recursive: true });
        // Stored as received; format conversion happens in the site build.
        await writeFile(file, buffer);
        const photographers = post.parsed.credits
          .filter((c) => c.role === 'photographer')
          .map((c) => (c.handle ? `@${c.handle}` : c.name));
        known.set(id, {
          id,
          postId: post.id,
          index: m.index,
          kind: m.kind === 'video' ? 'video-cover' : 'image',
          file: path.relative(ROOT, file),
          width: meta.width,
          height: meta.height,
          format: meta.format,
          contentType,
          bytes: buffer.length,
          sha256: createHash('sha256').update(buffer).digest('hex'),
          alt: m.alt ?? null,
          postUrl: post.url,
          sourceUrl: m.imageUrl,
          retrievedAt: new Date().toISOString(),
          rights: {
            publishedBy: `@${username}`,
            creditedPhotographers: photographers,
            note: 'Published on Instagram by the account. Photography credit as stated in the source post; copyright remains with the photographer or owner.',
          },
        });
        done++;
      } catch (err) {
        failures.push({ id, postUrl: post.url, error: err.message });
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));

  manifest.generatedAt = new Date().toISOString();
  manifest.files = [...known.values()].sort((a, b) => a.id.localeCompare(b.id));
  manifest.failures = failures;
  await mkdir(path.dirname(MANIFEST), { recursive: true });
  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`fetched ${done}, total ${manifest.files.length}, failed ${failures.length}`);
  if (failures.length) console.log(failures.slice(0, 10).map((f) => `  ${f.id}: ${f.error}`).join('\n'));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
