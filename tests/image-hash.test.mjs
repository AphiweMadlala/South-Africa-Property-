// Perceptual hash tests on SYNTHETIC generated images (SVG rendered by sharp).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { hashImage, hamming, sameImage } from '../scripts/lib/image-hash.mjs';

const svg = (w, h, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`);
// A "facade": sky, a long horizontal slab, glazing bays and a pool.
const facade = (w, h) => svg(w, h, `
  <rect width="100%" height="100%" fill="#9fb7c9"/>
  <rect x="${w * 0.1}" y="${h * 0.35}" width="${w * 0.8}" height="${h * 0.08}" fill="#e8e4dc"/>
  <rect x="${w * 0.15}" y="${h * 0.43}" width="${w * 0.2}" height="${h * 0.22}" fill="#2b3338"/>
  <rect x="${w * 0.4}" y="${h * 0.43}" width="${w * 0.2}" height="${h * 0.22}" fill="#2b3338"/>
  <rect x="${w * 0.65}" y="${h * 0.43}" width="${w * 0.2}" height="${h * 0.22}" fill="#2b3338"/>
  <rect x="0" y="${h * 0.7}" width="100%" height="${h * 0.3}" fill="#3f7f96"/>`);
const other = (w, h) => svg(w, h, `
  <rect width="100%" height="100%" fill="#d8cbb4"/>
  <circle cx="${w * 0.7}" cy="${h * 0.3}" r="${w * 0.2}" fill="#5a4636"/>
  <rect x="0" y="${h * 0.55}" width="${w * 0.5}" height="${h * 0.45}" fill="#7a8a5c"/>`);

const png = (buf) => sharp(buf).png().toBuffer();

test('a resized, recompressed copy is the same image', async () => {
  const a = await hashImage(await png(facade(1080, 1350)));
  const b = await hashImage(await sharp(await png(facade(1080, 1350))).resize(540).jpeg({ quality: 60 }).toBuffer());
  assert.ok(sameImage(a, b), `distance ${hamming(a.dhash, b.dhash)}`);
});

test('a 4:5 → 1:1 recrop is caught by the centre hash', async () => {
  const src = await png(facade(1080, 1350));
  const square = await sharp(src).extract({ left: 0, top: 135, width: 1080, height: 1080 }).toBuffer();
  const a = await hashImage(src);
  const b = await hashImage(square);
  assert.ok(sameImage(a, b, 12), `full ${hamming(a.dhash, b.dhash)}, centre ${hamming(a.dhashCenter, b.dhashCenter)}`);
});

test('a different photograph is not the same image', async () => {
  const a = await hashImage(await png(facade(1080, 1350)));
  const b = await hashImage(await png(other(1080, 1350)));
  assert.ok(!sameImage(a, b));
});

test('dominant colour is a hex string', async () => {
  const { dominant } = await hashImage(await png(facade(400, 500)));
  assert.match(dominant, /^#[0-9a-f]{6}$/);
});
