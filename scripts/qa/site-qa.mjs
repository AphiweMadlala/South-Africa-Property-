#!/usr/bin/env node
// Functional and quality QA for the built site.
//
//   node scripts/qa/site-qa.mjs --base http://127.0.0.1:8770/ --dir .preview [--sample]
//
// Serve the build first (e.g. `npx http-server .preview -p 8770`). Checks: every
// linked page loads without console errors, failed requests or broken images;
// no horizontal overflow at 375–1920px; unique IDs; HTML validity; axe WCAG
// 2.1 AA; skip link; mobile menu; filters with URL state, back/forward, shared
// links and the mobile sheet; lightbox keyboard, focus and wrap-around; reduced
// motion; layout shift; external link hygiene; status honesty. Writes
// documentation/qa/qa-report.md and qa-report.json.

import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const args = process.argv.slice(2);
const flag = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const BASE = flag('--base', 'http://127.0.0.1:8770/');
const DIR = path.resolve(ROOT, flag('--dir', '.preview'));
const SAMPLE = args.includes('--sample');
const WIDTHS = [375, 390, 430, 768, 1024, 1280, 1440, 1920];

const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? '/opt/node22/lib/node_modules/playwright');
const axeSource = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8');
const { HtmlValidate } = await import('html-validate');

const results = [];
const record = (area, name, ok, detail = '') => {
  results.push({ area, name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${area} · ${name}${detail ? ` — ${detail}` : ''}`);
};

async function htmlFiles(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && !['media', 'assets'].includes(e.name)) out.push(...(await htmlFiles(p)));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

function instrument(page) {
  const log = { errors: [], failed: [] };
  page.on('console', (m) => m.type() === 'error' && log.errors.push(m.text()));
  page.on('pageerror', (e) => log.errors.push(e.message));
  page.on('requestfailed', (r) => log.failed.push(`${r.failure()?.errorText} ${r.url()}`));
  page.on('response', (r) => r.status() >= 400 && log.failed.push(`${r.status()} ${r.url()}`));
  return log;
}

async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    for (const img of document.images) img.loading = 'eager';
    const H = document.body.scrollHeight;
    for (let y = 0; y < H; y += 700) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 30));
    }
    window.scrollTo(0, 0);
    await Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))));
  });
}

async function main() {
  const browser = await chromium.launch();

  // ------------------------------------------------------------ crawl
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const seen = new Set();
  const queue = ['', 'this-page-does-not-exist/'];
  const pages = [];
  while (queue.length) {
    const rel = queue.shift();
    if (seen.has(rel)) continue;
    seen.add(rel);
    const page = await desktop.newPage();
    const log = instrument(page);
    const res = await page.goto(BASE + rel, { waitUntil: 'networkidle' });
    await settle(page);
    const info = await page.evaluate(() => {
      const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
      return {
        title: document.title,
        dupIds: ids.filter((id, i) => ids.indexOf(id) !== i),
        broken: [...document.images].filter((i) => !i.naturalWidth).map((i) => i.currentSrc || i.src),
        links: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
        external: [...document.querySelectorAll('a[href^="http"]')].map((a) => ({ href: a.href, rel: a.rel })),
        robots: document.querySelector('meta[name=robots]')?.content ?? null,
        h1: document.querySelectorAll('h1').length,
        lang: document.documentElement.lang,
        photos: new Set([...document.querySelectorAll('[data-lightbox-open]')].map((e) => e.dataset.lightboxOpen)).size,
      };
    });
    const expect404 = rel === 'this-page-does-not-exist/';
    pages.push({ rel, status: res.status(), ...info, log });
    // The missing page is meant to answer 404; the browser logs that response as a console error.
    const errs = [
      ...log.errors.filter((e) => !(expect404 && /status of 404/.test(e))),
      ...log.failed.filter((f) => !(expect404 && f.includes('this-page-does-not-exist'))),
    ];
    record('Pages', `/${rel} loads`, expect404 ? res.status() === 404 : res.status() === 200, expect404 ? `status ${res.status()} (404 page served)` : `status ${res.status()}`);
    record('Pages', `/${rel} console and network clean`, errs.length === 0, errs.slice(0, 3).join(' | '));
    record('Pages', `/${rel} images load`, info.broken.length === 0, info.broken.slice(0, 3).join(', '));
    record('Pages', `/${rel} unique IDs`, info.dupIds.length === 0, info.dupIds.join(', '));
    record('Pages', `/${rel} one h1, lang set`, info.h1 === 1 && info.lang === 'en-ZA', `h1=${info.h1} lang=${info.lang}`);
    record('Pages', `/${rel} robots meta`, SAMPLE ? /noindex/.test(info.robots ?? '') : !info.robots, `robots=${info.robots}`);
    const badRel = info.external.filter((l) => !/instagram\.com|ig\.me|wa\.me/.test(l.href) ? false : !/noopener/.test(l.rel));
    record('Links', `/${rel} external links carry rel=noopener`, badRel.length === 0, badRel.map((l) => l.href).slice(0, 3).join(', '));
    const pageUrl = new URL(BASE + rel);
    for (const href of info.links) {
      if (/^(https?:|mailto:|tel:|#)/.test(href)) continue;
      const target = new URL(href, pageUrl);
      if (target.origin !== new URL(BASE).origin) continue;
      const relTarget = target.pathname.replace(new URL(BASE).pathname, '');
      if (!seen.has(relTarget) && !queue.includes(relTarget)) queue.push(relTarget);
    }
    await page.close();
  }
  const ig = pages.flatMap((p) => p.external.map((l) => l.href)).filter((h) => /instagram\.com|ig\.me/.test(h));
  const igBad = [...new Set(ig)].filter((h) => !/^https:\/\/(www\.instagram\.com\/((p|reel|tv)\/[\w-]+|[\w.]+)\/|ig\.me\/m\/[\w.]+)$/.test(h));
  record('Links', 'Instagram links well formed', igBad.length === 0, igBad.length ? igBad.slice(0, 4).join(', ') : `${new Set(ig).size} distinct links`);

  // ------------------------------------------------------- HTML validity
  const validator = new HtmlValidate({ extends: ['html-validate:recommended'], rules: { 'no-inline-style': 'off', 'long-title': 'off', 'no-trailing-whitespace': 'off', 'attribute-empty-style': 'off' } });
  for (const file of await htmlFiles(DIR)) {
    const report = await validator.validateFile(file);
    const messages = report.results.flatMap((r) => r.messages).filter((m) => m.severity === 2);
    record('HTML', `${path.relative(DIR, file)} valid`, messages.length === 0, messages.slice(0, 3).map((m) => `${m.ruleId}: ${m.message} (line ${m.line})`).join(' | '));
  }

  // ------------------------------------------------------ representative pages
  // The residence with the most photographs exercises the lightbox fully.
  const residenceRel = pages
    .filter((p) => /^residences\/[^/]+\/$/.test(p.rel))
    .sort((a, b) => b.photos - a.photos)[0]?.rel;
  const types = ['', 'residences/', residenceRel, 'places/', 'about/', 'enquire/'].filter((x) => x != null);

  // Overflow at every width.
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    const page = await ctx.newPage();
    const over = [];
    for (const rel of types) {
      await page.goto(BASE + rel, { waitUntil: 'networkidle' });
      const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (o > 0) over.push(`/${rel} +${o}px`);
    }
    record('Responsive', `no horizontal overflow at ${w}px`, over.length === 0, over.join(', '));
    await ctx.close();
  }

  // Accessibility with axe, desktop and mobile.
  for (const [w, label] of [[1440, 'desktop'], [390, 'mobile']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    const page = await ctx.newPage();
    for (const rel of types) {
      await page.goto(BASE + rel, { waitUntil: 'networkidle' });
      await page.addScriptTag({ content: axeSource });
      const res = await page.evaluate(async () => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
      const v = res.violations.map((x) => `${x.id} (${x.nodes.length}): ${x.nodes[0]?.target?.join(' ')}`);
      record('Accessibility', `axe ${label} /${rel}`, v.length === 0, v.slice(0, 4).join(' | '));
    }
    await ctx.close();
  }

  // ------------------------------------------------------------ keyboard
  {
    const page = await desktop.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => document.activeElement?.className);
    await page.keyboard.press('Enter');
    const afterSkip = await page.evaluate(() => document.activeElement?.id);
    record('Keyboard', 'first Tab reaches skip link, Enter moves to main', first === 'skip-link' && afterSkip === 'main', `first=${first} after=${afterSkip}`);
    const focusStyle = await page.evaluate(() => {
      const a = document.querySelector('.site-nav a');
      a.focus();
      const s = getComputedStyle(a);
      return s.outlineStyle !== 'none' && s.outlineWidth !== '0px';
    });
    record('Keyboard', 'focus is visible on navigation links', focusStyle);
    await page.close();
  }

  // ---------------------------------------------------------- mobile menu
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.click('[data-menu-open]');
    const open = await page.evaluate(() => document.querySelector('[data-menu]').open);
    await page.keyboard.press('Escape');
    const closed = await page.evaluate(() => !document.querySelector('[data-menu]').open);
    const focus = await page.evaluate(() => document.activeElement?.matches('[data-menu-open]'));
    record('Navigation', 'mobile menu opens, Escape closes, focus returns', open && closed && focus, `open=${open} closed=${closed} focusReturned=${focus}`);
    await page.click('[data-menu-open]');
    await Promise.all([page.waitForNavigation(), page.click('.menu-sheet__links a[href$="residences/"]')]);
    record('Navigation', 'mobile menu link navigates', page.url().endsWith('/residences/'), page.url());
    await ctx.close();
  }
  {
    const page = await desktop.newPage();
    for (const [label, href] of [['Residences', 'residences/'], ['Places', 'places/'], ['About', 'about/'], ['Enquire', 'enquire/']]) {
      await page.goto(BASE + (residenceRel ?? ''), { waitUntil: 'networkidle' });
      await Promise.all([page.waitForNavigation(), page.click(`.site-nav a:has-text("${label}")`)]);
      const current = await page.evaluate(() => document.querySelector('.site-nav a[aria-current="page"]')?.textContent);
      record('Navigation', `header link ${label} from a residence page`, page.url().endsWith(`/${href}`) && current === label, page.url());
    }
    await page.close();
  }

  // ------------------------------------------------------------- filters
  {
    const page = await desktop.newPage();
    const log = instrument(page);
    await page.goto(`${BASE}residences/`, { waitUntil: 'networkidle' });
    const total = await page.$$eval('[data-card]', (x) => x.length);
    const count = () => page.$$eval('[data-card]:not([hidden])', (x) => x.length);
    const label = () => page.$eval('[data-result-count]', (e) => e.textContent);
    const statuses = await page.$$eval('input[name=status]', (x) => x.map((i) => i.value).filter(Boolean));
    if (statuses.length) {
      const st = statuses[0];
      await page.check(`input[name=status][value="${st}"]`);
      const n = await count();
      const expected = await page.$$eval(`[data-card] > a[data-status="${st}"]`, (x) => x.length);
      record('Filters', `status "${st}" filters cards and writes the URL`, n === expected && page.url().includes(`status=${st}`), `${n}/${total}, url=${page.url()}`);
      record('Filters', 'result count reads correctly', (await label()).startsWith(`${n} `), await label());
    }
    const provinces = await page.$$eval('select[name=province] option', (x) => x.map((o) => o.value).filter(Boolean));
    if (provinces.length) {
      await page.check('input[name=status][value=""]').catch(() => {});
      await page.selectOption('select[name=province]', provinces[0]);
      const visibleCities = await page.$$eval('select[name=city] option', (x) => x.filter((o) => o.value && !o.hidden).map((o) => o.dataset.province));
      record('Filters', 'city options follow the province', visibleCities.length > 0 && visibleCities.every((p) => p === provinces[0]), `${visibleCities.length} cities`);
      const nProv = await count();
      await page.goBack();
      await page.waitForTimeout(150);
      const backState = await page.evaluate(() => ({ p: document.querySelector('select[name=province]').value, url: location.search }));
      await page.goForward();
      await page.waitForTimeout(150);
      const fwd = await page.evaluate(() => document.querySelector('select[name=province]').value);
      record('Filters', 'Back and Forward restore filter state', backState.p === '' && fwd === provinces[0] && (await count()) === nProv, `back=${JSON.stringify(backState)} forward=${fwd}`);
      const shared = page.url();
      const p2 = await desktop.newPage();
      await p2.goto(shared, { waitUntil: 'networkidle' });
      const restored = await p2.evaluate(() => ({ p: document.querySelector('select[name=province]').value, n: document.querySelectorAll('[data-card]:not([hidden])').length }));
      record('Filters', 'a shared filtered link restores state', restored.p === provinces[0] && restored.n === nProv, JSON.stringify(restored));
      await p2.reload();
      record('Filters', 'refresh keeps state', (await p2.$eval('select[name=province]', (s) => s.value)) === provinces[0]);
      await p2.close();
    }
    const sorts = await page.$$eval('select[name=sort] option', (x) => x.map((o) => o.value).filter(Boolean));
    if (sorts.includes('price-desc')) {
      await page.goto(`${BASE}residences/?sort=price-desc`, { waitUntil: 'networkidle' });
      const prices = await page.$$eval('[data-card]:not([hidden]) > a', (x) => x.map((a) => a.dataset.price).filter(Boolean).map(Number));
      record('Filters', 'sort by price, highest first', prices.every((p, i) => i === 0 || prices[i - 1] >= p), prices.slice(0, 5).join(' ≥ '));
    }
    // Empty state: an impossible combination.
    const combo = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('[data-card] > a')].map((a) => a.dataset);
      const st = [...new Set(cards.map((c) => c.status))];
      const pr = [...new Set(cards.map((c) => c.province))];
      for (const s of st) for (const p of pr) if (!cards.some((c) => c.status === s && c.province === p)) return { s, p };
      return null;
    });
    if (combo) {
      await page.goto(`${BASE}residences/?status=${combo.s}&province=${combo.p}`, { waitUntil: 'networkidle' });
      const empty = await page.$eval('[data-empty]', (e) => !e.hidden);
      await page.click('[data-empty] [data-filter-clear]');
      const cleared = (await count()) === total && !page.url().includes('?');
      record('Filters', 'empty state shows and Clear filters restores all', empty && cleared, `empty=${empty} cleared=${cleared}`);
    }
    record('Filters', 'no console errors while filtering', log.errors.length === 0, log.errors.slice(0, 2).join(' | '));
    await page.close();
  }
  {
    // On phones the status choice stays on the bar, outside the sheet.
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}residences/`, { waitUntil: 'networkidle' });
    const onBar = await page.$$eval('[data-filter-bar] > .segmented input[name=status]', (x) => x.map((i) => i.value).filter(Boolean));
    if (onBar.length) {
      const st = onBar[0];
      await page.click(`[data-filter-bar] > .segmented input[name=status][value="${st}"]`, { force: true });
      const shown = await page.$$eval('[data-card]:not([hidden]) > a', (x) => x.map((a) => a.dataset.status));
      const visible = await page.$eval('[data-filter-bar] > .segmented', (e) => e.getBoundingClientRect().height > 0);
      record('Filters', 'phone: status row stays on the bar and filters', visible && shown.length > 0 && shown.every((x) => x === st) && page.url().includes(`status=${st}`), `visible=${visible} shown=${shown.length} url=${page.url()}`);
    }
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}residences/`, { waitUntil: 'networkidle' });
    await page.click('[data-filter-open]');
    const open = await page.evaluate(() => document.querySelector('[data-filter-sheet]').open);
    const statuses = await page.$$eval('[data-filter-sheet] input[name=status]', (x) => x.map((i) => i.value).filter(Boolean));
    const selects = await page.$$eval('[data-filter-sheet] select:not([name=sort])', (x) => x.map((s) => ({ name: s.name, value: [...s.options].find((o) => o.value && !o.disabled)?.value })).filter((s) => s.value));
    let applied = null;
    if (statuses.length) {
      await page.click(`[data-filter-sheet] input[name=status][value="${statuses[0]}"]`, { force: true });
      applied = `status=${statuses[0]}`;
    } else if (selects.length) {
      await page.selectOption(`[data-filter-sheet] select[name=${selects[0].name}]`, selects[0].value);
      applied = `${selects[0].name}=${selects[0].value}`;
    }
    const btn = await page.$eval('[data-result-count-short]', (e) => e.textContent);
    await page.click('.filter-sheet__foot [data-filter-sheet-close]');
    const closed = await page.evaluate(() => !document.querySelector('[data-filter-sheet]').open);
    const back = await page.evaluate(() => document.querySelector('[data-filter-controls]').closest('[data-filter-bar]') != null);
    const focus = await page.evaluate(() => document.activeElement?.matches('[data-filter-open]'));
    const active = await page.$eval('[data-filter-active]', (e) => e.textContent);
    const badgeOk = applied ? /\(1\)/.test(active) : active === '';
    record('Filters', 'mobile filter sheet: filters apply, controls return, focus restores', open && closed && back && focus && badgeOk, `open=${open} applied=${applied ?? 'none offered'} button="${btn}" closed=${closed} controlsBack=${back} focus=${focus} badge=${active}`);
    await ctx.close();
  }

  // ------------------------------------------------------------ lightbox
  if (residenceRel) {
    const page = await desktop.newPage();
    const log = instrument(page);
    await page.goto(BASE + residenceRel, { waitUntil: 'networkidle' });
    const total = await page.$$eval('[data-lightbox-open]', (x) => new Set(x.map((e) => e.dataset.lightboxOpen)).size);
    await page.click('.lead-image');
    const idx = () => page.$eval('[data-lightbox-index]', (e) => Number(e.textContent));
    const open = await page.evaluate(() => document.querySelector('[data-lightbox]').open);
    const loaded = await page.waitForFunction(() => { const i = document.querySelector('[data-lightbox-picture] img'); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 5000 }).then(() => true, () => false);
    // Paging needs at least two photographs; a single-photo gallery has no controls.
    let paging = null;
    if (total > 1) {
      await page.keyboard.press('ArrowRight');
      const second = await idx();
      await page.keyboard.press('End');
      const last = await idx();
      await page.keyboard.press('ArrowRight');
      const wrapped = await idx();
      await page.keyboard.press('ArrowLeft');
      const wrappedBack = await idx();
      await page.click('[data-lightbox-next]');
      const nextBtn = await idx();
      paging = { second, last, wrapped, wrappedBack, nextBtn };
    }
    const credit = await page.$eval('[data-lightbox-credit]', (e) => e.textContent.trim());
    await page.keyboard.press('Escape');
    const closed = await page.evaluate(() => !document.querySelector('[data-lightbox]').open);
    const focus = await page.evaluate(() => document.activeElement?.classList.contains('lead-image'));
    // A native Escape close fires the dialog's close event a task later.
    const scroll = await page.waitForFunction(() => document.documentElement.style.overflow === '', null, { timeout: 2000 }).then(() => true, () => false);
    record('Lightbox', 'opens with the photograph loaded', open && loaded, `open=${open} loaded=${loaded}`);
    if (paging) {
      const { second, last, wrapped, wrappedBack, nextBtn } = paging;
      record('Lightbox', 'arrow keys, End and wrap-around', second === 2 && last === total && wrapped === 1 && wrappedBack === total, `2nd=${second} last=${last}/${total} wrap=${wrapped} back=${wrappedBack}`);
      record('Lightbox', 'next button pages', nextBtn === 1, `after next from last: ${nextBtn}`);
    } else {
      const controls = await page.$$eval('[data-lightbox-prev], [data-lightbox-next]', (x) => x.length);
      record('Lightbox', 'single photograph: no paging controls', controls === 0, `controls=${controls}`);
    }
    record('Lightbox', 'credit caption shown', credit.length > 0, credit);
    record('Lightbox', 'Escape closes, focus returns, scroll unlocked', closed && focus && scroll, `closed=${closed} focus=${focus} scroll=${scroll}`);
    record('Lightbox', 'no console errors', log.errors.length === 0, log.errors.slice(0, 2).join(' | '));
    await page.close();
  }

  // ------------------------------------------------ motion and layout shift
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const anim = await page.$eval('.cover__media img', (e) => getComputedStyle(e).animationName);
    const smooth = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
    record('Motion', 'reduced motion disables the cover animation and smooth scrolling', anim === 'none' && smooth === 'auto', `animation=${anim} scroll=${smooth}`);
    await ctx.close();
  }
  for (const [w, label] of [[1440, 'desktop'], [390, 'mobile']]) {
    for (const rel of ['', residenceRel, 'residences/'].filter((x) => x != null)) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
      const page = await ctx.newPage();
      await page.addInitScript(() => {
        window.__cls = 0;
        new PerformanceObserver((list) => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      });
      await page.goto(BASE + rel, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      const cls = await page.evaluate(() => window.__cls);
      record('Performance', `layout shift ${label} /${rel}`, cls < 0.1, `CLS ${cls.toFixed(4)}`);
      await ctx.close();
    }
  }

  // ------------------------------------------------------- status honesty
  {
    const page = await desktop.newPage();
    await page.goto(`${BASE}residences/`, { waitUntil: 'networkidle' });
    const cards = await page.$$eval('[data-card] > a', (x) => x.map((a) => ({ status: a.dataset.status, text: a.querySelector('.status')?.textContent ?? '' })));
    const bad = cards.filter((c) => (/^For sale/.test(c.text) && c.status !== 'on-the-market') || (c.status !== 'availability-to-confirm' && !/\d{4}/.test(c.text)));
    record('Content', '"For sale" only for verified listings, and every status is dated', bad.length === 0, bad.slice(0, 3).map((b) => `${b.status}: ${b.text}`).join(' | '));
    await page.close();
  }

  await browser.close();

  // ----------------------------------------------------------- report
  const failed = results.filter((r) => !r.ok);
  const byArea = [...new Set(results.map((r) => r.area))];
  const md = `# QA report

Generated ${new Date().toISOString()} by \`scripts/qa/site-qa.mjs\` against \`${BASE}\` (build: \`${path.relative(ROOT, DIR)}\`${SAMPLE ? ', synthetic preview data' : ''}).

**${results.length - failed.length} of ${results.length} checks passed.**

${byArea.map((a) => `## ${a}

| Check | Result | Detail |
| --- | --- | --- |
${results.filter((r) => r.area === a).map((r) => `| ${r.name.replace(/\|/g, '\\|')} | ${r.ok ? 'Pass' : '**Fail**'} | ${String(r.detail).replace(/\|/g, '\\|').slice(0, 220)} |`).join('\n')}`).join('\n\n')}
`;
  await writeFile(path.join(ROOT, 'documentation/qa/qa-report.md'), md);
  await writeFile(path.join(ROOT, 'documentation/qa/qa-report.json'), JSON.stringify({ base: BASE, sample: SAMPLE, results }, null, 2));
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
