#!/usr/bin/env node
// Compute perceptual hashes and dominant colours for every file in
// media/manifest.json → media/hashes.json. Used by dedupe.mjs (same photograph
// in two posts) and by the site build (placeholder colour while images load).

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { hashImage } from '../lib/image-hash.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const MANIFEST = path.join(ROOT, 'media/manifest.json');
const OUT = path.join(ROOT, 'media/hashes.json');

const { files } = JSON.parse(await readFile(MANIFEST, 'utf8'));
const hashes = {};
for (const f of files) {
  hashes[f.id] = { postId: f.postId, ...(await hashImage(path.join(ROOT, f.file))) };
}
await writeFile(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), hashes }, null, 2) + '\n');
console.log(`hashed ${files.length} images`);
