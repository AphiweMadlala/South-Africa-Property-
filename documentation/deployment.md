# Deployment

**Decision (2026-09-26, project owner):** this is the **official website** of
@southafrica.property (the owner confirmed they own or are authorised to run the
account), deployed with **GitHub Pages from the `main` branch**. Pages
publishes the `docs/` folder on `main`, so whatever is in `docs/` on `main` is
the website. Merging to `main` deploys it.

Site address: <https://aphiwemadlala.github.io/South-Africa-Property-/>

## One-time setup (repository owner)

In the repository open **Settings → Pages → Build and deployment**:

1. **Source:** Deploy from a branch
2. **Branch:** `main`, folder **`/docs`**, then **Save**

The first deploy takes a minute or two. The Pages settings page then shows
"Your site is live at …", and each later merge to `main` redeploys
automatically. The **Actions** tab shows each deploy as "pages build and
deployment".

## What `docs/` contains

- **Now:** a holding page (`docs/index.html`) in the brand's own voice: name,
  bio line and Instagram link, with no listings, images or people. It carries
  `noindex` so search engines don't record a placeholder.
- **Later:** the built website. The site build writes its complete static
  output (HTML, CSS, JS, fonts, optimised images) into `docs/`, replacing the
  holding page. The output is committed and merged to `main` like any other
  change.

Project documentation lives in `documentation/`, not `docs/`, because GitHub
only allows publishing from a branch's root or its `/docs` folder.

`docs/.nojekyll` switches off GitHub's Jekyll processing. Files are served
exactly as committed, including folders that start with an underscore.

## Build rules this implies

- **Base path.** This is a project site under `/South-Africa-Property-/`, so
  every link and asset URL in `docs/` is relative.
- **No server.** Filters and index state live in the URL query and must survive
  refresh, back/forward and shared links on the client alone.
- **Media budget.** Built images are committed, so keep them lean: AVIF (plus
  WebP only where needed), at most two widths, and a curated set of frames per
  residence. Keep the repository well under GitHub's recommended 1 GB and the
  published site under Pages' 1 GB limit. Originals of the residences used
  stay in `media/source/`.

## Search and credits

- The full site is indexable: its pages drop the holding page's `noindex`
  and carry proper titles, descriptions and social preview tags. A project
  site can't serve its own `robots.txt` or sitemap at the domain root, so a
  custom domain is worth setting up later if search visibility matters.
- The site speaks as South Africa Property. It never implies that the brand
  employs, partners with or represents the agents, agencies, architects or
  photographers it credits, and it states only the roles the captions state.
- Every image keeps its photography credit and a link to its source post,
  because many photographs belong to photographers and agencies rather than the
  account.
