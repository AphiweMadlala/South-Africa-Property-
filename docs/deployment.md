# Deployment

**Decision (2026-09-26, project owner):** publish the site as a **private
claude.ai artifact**, a private link shared selectively. This suits a
proposal that should not be indexed. Deployment happens after extraction,
design, build and QA; nothing is deployed before the site is built from the
real archive.

## Constraints this places on the build

- **Static output.** One entry page plus supporting files (further pages, CSS,
  JS, fonts, images), referenced by relative paths with no leading slash. Every
  additional HTML page must be a complete document with its own doctype,
  charset and viewport meta, and base styles. A single page with client-side
  routing is the alternative if the page count gets awkward.
- **Limits:** 16 MB per page or text file, 15 MB per binary file. Each publish
  holds ≤ 255 files and ≤ 64 MB; each version holds ≤ 511 files and ≤ 256 MB.
  Larger sets go up across several publishes to the same URL.
- **External resources:** scripts only from `cdnjs.cloudflare.com` or
  `cdn.jsdelivr.net/npm`, stylesheets only from Google Fonts. Everything else
  ships as files, and self-hosted font files are fine.
- **Page contract:** load the `artifact-design` skill before writing the page.
  It sets the title, colour tokens (including dark mode) and layout rules.
- **No server.** Filters and index state live in the URL (query or hash) and
  must survive refresh, back/forward and shared links on the client alone.
- **Proposal mode:** still ship `<meta name="robots" content="noindex, nofollow">`
  and never present the page as the account's official website.

## Image budget

The 511-file cap per version is the binding constraint, not bytes. Budget:

- one modern format (AVIF; add WebP only if a target browser needs it);
- at most two widths per image;
- a curated selection of frames per residence, not every carousel slide.

(images × formats × widths) + pages + CSS/JS/fonts must stay under ~500. If the
archive needs more, check the artifact asset store (the `assets` capability;
limits are in the `artifact-capabilities` skill) at build time.
