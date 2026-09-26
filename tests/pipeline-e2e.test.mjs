// End to end: a synthetic Apify export goes through every pipeline stage and
// the real (non-sample) site build, in a throwaway copy of the project. The
// photographs are generated and served from a local HTTP server, so nothing
// here touches the network or the repository's data/, media/ or docs/.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, symlink, readFile, writeFile, rm, access } from 'node:fs/promises';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const exists = (f) => access(f).then(() => true, () => false);

// Distinct compositions so the perceptual hashes differ between photographs.
async function photo(i, width, height) {
  const x = ((i * 37) % 60) + 5;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="hsl(${(i * 67) % 360} 30% ${40 + (i % 3) * 15}%)"/>
    <rect x="${x}%" y="${20 + (i % 4) * 12}%" width="${30 + (i % 5) * 8}%" height="${25 + (i % 3) * 10}%" fill="#f4f2ee"/>
    <rect x="${(x + 40) % 80}%" y="${60 - (i % 4) * 9}%" width="18%" height="30%" fill="#1d282c"/>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer();
}

test('a synthetic export builds into a complete site', { timeout: 180_000 }, async (t) => {
  const ws = await mkdtemp(path.join(tmpdir(), 'sap-e2e-'));
  t.after(() => rm(ws, { recursive: true, force: true }));
  for (const dir of ['scripts', 'site']) {
    await cp(path.join(ROOT, dir), path.join(ws, dir), { recursive: true, filter: (src) => !src.includes(`${path.sep}sample${path.sep}`) });
  }
  await cp(path.join(ROOT, 'package.json'), path.join(ws, 'package.json'));
  await symlink(path.join(ROOT, 'node_modules'), path.join(ws, 'node_modules'), 'dir');

  // Serve generated photographs in place of Instagram's CDN.
  const items = JSON.parse(await readFile(path.join(ROOT, 'tests/fixtures/apify-posts.synthetic.json'), 'utf8'));
  const files = new Map();
  const server = createServer((req, res) => {
    const body = files.get(path.basename(req.url));
    if (!body) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': 'image/jpeg', 'content-length': body.length }).end(body);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/`;
  let n = 0;
  const local = async (url, width = 1080, height = 1350) => {
    if (!url) return url;
    const name = path.basename(new URL(url).pathname);
    if (!files.has(name)) files.set(name, await photo(n++, width, height));
    return base + name;
  };
  for (const it of items) {
    it.displayUrl = await local(it.displayUrl, it.dimensionsWidth, it.dimensionsHeight);
    it.images = await Promise.all((it.images ?? []).map((u) => local(u, it.dimensionsWidth, it.dimensionsHeight)));
    for (const c of it.childPosts ?? []) c.displayUrl = await local(c.displayUrl, c.dimensionsWidth, c.dimensionsHeight);
  }
  const rawDir = path.join(ws, 'data/raw/instagram/2026-09-26T0600Z');
  await mkdir(rawDir, { recursive: true });
  await writeFile(path.join(rawDir, 'posts.json'), JSON.stringify(items, null, 2));

  const env = { ...process.env, NO_PROXY: '127.0.0.1,localhost', no_proxy: '127.0.0.1,localhost' };
  const node = (...args) => run(process.execPath, args, { cwd: ws, env, maxBuffer: 1 << 24 });
  await node('scripts/extract/normalize.mjs');
  const fetched = await node('scripts/media/fetch-media.mjs');
  assert.match(fetched.stdout, /failed 0/);
  await node('scripts/media/hash-media.mjs');
  await node('scripts/extract/dedupe.mjs');
  await node('scripts/content/build-content.mjs', '--as-of', '2026-09-26');

  const { properties } = JSON.parse(await readFile(path.join(ws, 'data/properties.json'), 'utf8'));
  assert.equal(properties.length, 1);
  const [home] = properties;
  assert.equal(home.title.text, 'Test Residence One');
  assert.equal(home.status.status, 'on-the-market');
  assert.equal(home.facts.propertyType, null, 'no type is claimed without a word that names one');

  await node('site/build.mjs');
  const docs = path.join(ws, 'docs');
  for (const page of ['index.html', 'residences/index.html', 'places/index.html', 'about/index.html', 'enquire/index.html', '404.html', '.nojekyll']) {
    assert.ok(await exists(path.join(docs, page)), `${page} is built`);
  }
  const index = await readFile(path.join(docs, 'index.html'), 'utf8');
  assert.match(index, /Test Residence One/);
  assert.doesNotMatch(index, /preview-banner|noindex/, 'the real build is not marked as a preview');
  const residencePage = await readFile(path.join(docs, `residences/${slugOf(index)}/index.html`), 'utf8');
  assert.match(residencePage, /R&nbsp;38&nbsp;500&nbsp;000|R 38 500 000|R 38 500 000/);
  assert.match(residencePage, /For sale · as of 1 September 2026/);
  assert.match(residencePage, /Represented by/);
  assert.match(residencePage, /https:\/\/www\.instagram\.com\/p\/TESTAAA0001\//);
  assert.doesNotMatch(residencePage, /<th[^>]*>Type<\/th>/, 'no Type row without evidence');
  assert.match(residencePage, /ig\.me\/m\/southafrica\.property/, 'enquiries fall back to an Instagram message');
  assert.doesNotMatch(residencePage, /mailto:|wa\.me/, 'no contact details are invented');
});

function slugOf(indexHtml) {
  const m = indexHtml.match(/href="residences\/([^/"]+)\/"/);
  assert.ok(m, 'home links to a residence');
  return m[1];
}
