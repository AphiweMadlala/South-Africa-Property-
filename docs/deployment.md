# Deployment

**Decision (2026-09-26, project owner):** deploy to **GitHub Pages** from this
repository. The site will be served at
<https://aphiwemadlala.github.io/South-Africa-Property-/>.

Nothing is deployed before the site has been built from the real archive and
has passed QA. Until then there is nothing for Pages to serve.

## One-time setup (repository owner)

Pages is not enabled yet. In the repository go to **Settings → Pages → Build and
deployment → Source** and choose **GitHub Actions**. The workflow can't
switch this on itself with the default token. The repository is public, so this
works on the free plan.

## How it will deploy

- A workflow in `.github/workflows/` builds the static site and publishes it
  with `actions/upload-pages-artifact` and `actions/deploy-pages` on pushes to
  `main`. It is added together with the site, not before.
- **Base path.** This is a project site under `/South-Africa-Property-/`, so
  every link and asset URL is relative or carries that prefix. The build takes
  the base path from configuration, not hard-coded strings.
- **No server.** Filters and index state live in the URL query and must survive
  refresh, back/forward and shared links on the client alone. A `404.html`
  handles unknown paths.
- **Media.** Commit the originals of residences the site uses to
  `media/source/`. Generate the web derivatives (AVIF, plus WebP where needed,
  at responsive widths) in the workflow rather than committing them, which
  keeps the repository well under GitHub's recommended 1 GB and the published
  site under Pages' 1 GB limit.

## Public by default: proposal-mode safeguards

GitHub Pages sites are public, so this proposal will be reachable by anyone
with the link. It reproduces photographs owned by photographers and agencies.
To limit exposure:

- Every page ships `<meta name="robots" content="noindex, nofollow">`. A
  project site can't serve its own `robots.txt`, because crawlers only read it
  from `aphiwemadlala.github.io/robots.txt`, and Pages can't send an
  `X-Robots-Tag` header.
- Every page states that it is an independent proposal, not the official
  website of @southafrica.property.
- Every image keeps its credit and a link to its source post.
- If a private preview is needed later, a private claude.ai artifact remains
  an option. It has tighter limits: 511 files and 256 MB per version.
