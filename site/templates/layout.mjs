import { html, raw, attrs } from '../lib/html.mjs';
import { icon } from '../lib/icons.mjs';

const NAV = [
  ['residences/', 'Residences', 'residences'],
  ['places/', 'Places', 'places'],
  ['about/', 'About', 'about'],
  ['enquire/', 'Enquire', 'enquire'],
];

export function layout({ site, root, page, title, description, image, main, bodyClass, scripts = true }) {
  const fullTitle = title ? `${title} · ${site.name}` : `${site.name} · ${site.tagline}`;
  const canonical = site.url ? `${site.url}${page.path}` : null;
  const ogImage = image && site.url ? `${site.url}${image}` : null;
  const year = new Date().getFullYear();

  return html`<!DOCTYPE html>
<html lang="en-ZA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${fullTitle}</title>
<meta name="description" content="${description ?? site.bio}">
${site.indexable ? '' : raw('<meta name="robots" content="noindex, nofollow">\n')}${canonical ? html`<link rel="canonical" href="${canonical}">\n` : ''}<meta property="og:site_name" content="${site.name}">
<meta property="og:type" content="${page.type ?? 'website'}">
<meta property="og:title" content="${title ?? site.name}">
<meta property="og:description" content="${description ?? site.bio}">
${canonical ? html`<meta property="og:url" content="${canonical}">\n` : ''}${ogImage ? html`<meta property="og:image" content="${ogImage}">\n<meta name="twitter:card" content="summary_large_image">\n` : ''}<meta name="theme-color" content="#ffffff">
<link rel="icon" href="${root}assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="${root}assets/fonts/archivo-variable.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${root}assets/fonts/libre-caslon-display-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${root}assets/css/site.css?v=${site.version}">
</head>
<body${attrs({ class: bodyClass })}>
<a class="skip-link" href="#main">Skip to content</a>
${site.preview ? html`<div class="preview-banner" role="note">Design preview with sample content. These are not real residences, prices or photographs.</div>` : ''}
<header class="site-header" data-header>
  <div class="wrap site-header__bar">
    <a class="wordmark" href="${root || './'}">${site.name}</a>
    <nav class="site-nav" aria-label="Main">
      ${NAV.map(([href, label, key]) => html`<a href="${root}${href}"${attrs({ 'aria-current': page.nav === key ? 'page' : null })}>${label}</a>`)}
    </nav>
    <button class="menu-button" type="button" aria-haspopup="dialog" aria-controls="menu-sheet" data-menu-open>${icon('menu')}<span>Menu</span></button>
  </div>
</header>
<dialog class="menu-sheet" id="menu-sheet" aria-label="Menu" data-menu>
  <div class="wrap">
    <div class="menu-sheet__bar">
      <a class="wordmark" href="${root || './'}">${site.name}</a>
      <button class="menu-sheet__close" type="button" data-menu-close>${icon('close')}<span>Close</span></button>
    </div>
    <ul class="menu-sheet__links">
      ${NAV.map(([href, label, key]) => html`<li><a href="${root}${href}"${attrs({ 'aria-current': page.nav === key ? 'page' : null })}>${label}</a></li>`)}
    </ul>
    <p class="menu-sheet__foot"><a class="link-arrow" href="${site.instagram.url}" rel="noopener">${icon('instagram')}<span>@${site.instagram.handle}</span></a></p>
  </div>
</dialog>
<main id="main" tabindex="-1">
${main}
</main>
<footer class="site-footer">
  <div class="wrap site-footer__grid">
    <div class="site-footer__brand">
      <a class="wordmark" href="${root || './'}">${site.name}</a>
      <p>${site.bio}</p>
    </div>
    <nav class="site-footer__nav" aria-label="Footer">
      <p class="meta place">Explore</p>
      <ul>
        ${NAV.map(([href, label]) => html`<li><a href="${root}${href}">${label}</a></li>`)}
      </ul>
    </nav>
    <div class="site-footer__social">
      <p class="meta place">Follow</p>
      <ul>
        <li><a href="${site.instagram.url}" rel="noopener">${icon('instagram', { size: 18 })}<span>@${site.instagram.handle} on Instagram</span></a></li>
      </ul>
    </div>
    <div class="site-footer__legal">
      <p>Photography remains the property of the photographers and agencies credited with each residence.</p>
      <p>© ${year} ${site.name}</p>
    </div>
  </div>
</footer>
${scripts ? html`<script src="${root}assets/js/site.js?v=${site.version}" defer></script>` : ''}
</body>
</html>
`;
}
