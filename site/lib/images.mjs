// Responsive image derivatives and <picture> markup.
//
// Every image ships as AVIF at each width, with one small WebP as the fallback
// for browsers without AVIF, explicit dimensions and its dominant colour as the
// placeholder, so nothing shifts while it loads. Derivatives are cached by
// source file and width. Link previews get a JPEG, which every app displays.

import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { html, raw, attrs } from './html.mjs';

const exists = (f) => stat(f).then(() => true, () => false);

export function createImagePipeline({ outDir, mediaUrl = 'media' }) {
  const done = new Map();

  // widths: requested output widths; never upscaled past the source.
  async function prepare(image, widths = [720, 1440]) {
    const key = `${image.id}|${widths.join(',')}`;
    if (done.has(key)) return done.get(key);
    const job = (async () => {
      const meta = await sharp(image.src).metadata();
      const srcW = meta.width;
      const srcH = meta.height;
      const targets = [...new Set(widths.map((w) => Math.min(w, srcW)))].sort((a, b) => a - b);
      await mkdir(path.join(outDir, mediaUrl), { recursive: true });
      const variants = { avif: [], webp: [] };
      for (const w of targets) {
        for (const fmt of w === targets[0] ? ['avif', 'webp'] : ['avif']) {
          const name = `${image.id}-${w}.${fmt}`;
          const file = path.join(outDir, mediaUrl, name);
          if (!(await exists(file))) {
            const pipeline = sharp(image.src).rotate().resize({ width: w, withoutEnlargement: true });
            if (fmt === 'avif') await pipeline.avif({ quality: 52, effort: 4 }).toFile(file);
            else await pipeline.webp({ quality: 74, effort: 5 }).toFile(file);
          }
          variants[fmt].push({ url: `${mediaUrl}/${name}`, w });
        }
      }
      return {
        id: image.id,
        width: srcW,
        height: srcH,
        variants,
        dominant: image.dominant ?? null,
      };
    })();
    done.set(key, job);
    return job;
  }

  // A 1.91:1 JPEG for og:image, cropped around the most detailed region.
  async function preview(image) {
    const meta = await sharp(image.src).metadata();
    const width = Math.min(1200, meta.width);
    const height = Math.round(width / 1.91);
    const name = `${image.id}-og.jpg`;
    const file = path.join(outDir, mediaUrl, name);
    if (!(await exists(file))) {
      await mkdir(path.dirname(file), { recursive: true });
      await sharp(image.src).rotate()
        .resize({ width, height, fit: 'cover', position: sharp.strategy.attention })
        .jpeg({ quality: 78, mozjpeg: true })
        .toFile(file);
    }
    return { url: `${mediaUrl}/${name}`, width, height };
  }

  return { prepare, preview };
}

// <picture> for a prepared image. `root` makes URLs relative to the page.
export function picture(prepared, {
  alt,
  sizes = '100vw',
  root = '',
  loading = 'lazy',
  priority = false,
  className,
  crop = null,
}) {
  const srcset = (fmt) => prepared.variants[fmt].map((v) => `${root}${v.url} ${v.w}w`).join(', ');
  const fallback = prepared.variants.webp.at(-1);
  const style = [
    prepared.dominant ? `background-color:${prepared.dominant}` : null,
    crop ? `object-position:${crop}` : null,
  ].filter(Boolean).join(';');
  return html`<picture${attrs({ class: className })}>
<source type="image/avif" srcset="${srcset('avif')}" sizes="${sizes}">
<source type="image/webp" srcset="${srcset('webp')}" sizes="${sizes}">
<img src="${root}${fallback.url}" width="${prepared.width}" height="${prepared.height}" alt="${alt ?? ''}"${attrs({
    loading: priority ? 'eager' : loading,
    fetchpriority: priority ? 'high' : null,
    decoding: priority ? 'sync' : 'async',
    style: style || null,
  })}>
</picture>`;
}

export { raw };
