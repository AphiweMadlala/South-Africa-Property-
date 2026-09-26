// Perceptual hashes for spotting the same photograph across posts.
//
// dHash compares neighbouring pixels of a 9×8 greyscale thumbnail, so it
// survives resizing and recompression. A second hash of the central 60% of the
// frame survives the 4:5 ↔ 1:1 recrops Instagram reposts often get.
//
// Neighbouring pixels within TOLERANCE grey levels count as equal (bit 0).
// Architectural photographs have large flat planes — sky, rendered walls,
// water — where plain dHash bits flip on JPEG noise alone.

import sharp from 'sharp';

const TOLERANCE = 3;

async function dhashOf(pipeline) {
  const data = await pipeline.greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer();
  let bits = 0n;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      bits = (bits << 1n) | (data[y * 9 + x] - data[y * 9 + x + 1] > TOLERANCE ? 1n : 0n);
    }
  }
  return bits.toString(16).padStart(16, '0');
}

export async function hashImage(input) {
  const image = sharp(input);
  const { width, height } = await image.metadata();
  const cw = Math.max(1, Math.round(width * 0.6));
  const ch = Math.max(1, Math.round(height * 0.6));
  const [full, center, stats] = await Promise.all([
    dhashOf(sharp(input)),
    dhashOf(sharp(input).extract({ left: Math.round((width - cw) / 2), top: Math.round((height - ch) / 2), width: cw, height: ch })),
    sharp(input).stats(),
  ]);
  const { r, g, b } = stats.dominant;
  return { dhash: full, dhashCenter: center, dominant: `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}` };
}

export function hamming(a, b) {
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let n = 0;
  while (x) {
    n += Number(x & 1n);
    x >>= 1n;
  }
  return n;
}

// Same photograph if either the full frame or the centre crop is within `max` bits.
export function sameImage(h1, h2, max = 6) {
  return hamming(h1.dhash, h2.dhash) <= max || hamming(h1.dhashCenter, h2.dhashCenter) <= max;
}
