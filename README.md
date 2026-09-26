# South Africa Property — proposal website

A proposal website for [@southafrica.property](https://www.instagram.com/southafrica.property/),
to be built entirely from the account's own Instagram archive: its residences,
places, captions, credits and photography. It is not the account's official
website and will ship with `noindex, nofollow`.

## Status

| Phase | State |
| --- | --- |
| 1 · Research | **Blocked** — the environment's network policy denies Instagram, its CDNs, Apify and web readers ([access log](documentation/research/00-access-log.md)) |
| 2 · Extraction | Pipeline built and tested offline; not yet run |
| 3 · Content model | Rules written ([content-model.md](documentation/content-model.md)); data files wait for the archive |
| 4–7 · Direction, type, DESIGN.md | Not started — they derive from the archive's imagery and captions |
| 8–16 · Build, critique, QA | Not started |
| Deployment | GitHub Pages from `main` → `/docs`; a holding page stands in until the real site is built ([deployment.md](documentation/deployment.md)) |

No listing, price, image, person or place has been entered by hand, and none
will be. The site is generated from extracted data.

## Unblocking

In the cloud environment settings: allow `api.apify.com`, `www.instagram.com`,
`i.instagram.com`, `*.cdninstagram.com` and `*.fbcdn.net` (or use full network
access), and add an `APIFY_TOKEN` environment variable. Then start a new session
and follow the [extraction runbook](documentation/extraction-runbook.md).

Alternatively, add `APIFY_TOKEN` as a GitHub repository secret. The
`Extract Instagram archive` workflow then pulls the archive on GitHub's machines
and commits it to the branch; see the runbook's step 0b.

## Pipeline

```bash
npm ci
scripts/extract/apify-extract.sh                 # dry run: auth, schemas, pricing
CONFIRM_COST=1 scripts/extract/apify-extract.sh  # → data/raw/instagram/<stamp>/ (read-only)
npm run extract:normalize                        # → data/normalized/posts.json
npm run media:fetch                              # → media/source/ + media/manifest.json
npm run media:hash                               # → media/hashes.json
npm run extract:dedupe                           # → data/normalized/residences.json
node scripts/research/archive-analysis.mjs       # → documentation/research/02-archive-analysis.md
npm run content:build                            # → data/properties.json, features, people, places
npm test                                         # parser, gazetteer, normaliser, hashing, dedupe, content
```

## Layout

```
data/raw/instagram/<stamp>/   immutable Apify exports
data/normalized/              posts, profile, residence clusters (generated)
media/                        source images, provenance manifest, hashes (generated)
scripts/lib/                  caption parser, gazetteer, perceptual hash
scripts/extract/              Apify runner, normaliser, dedupe
scripts/media/                media fetch and hashing
scripts/research/             archive analysis
scripts/content/              content model builder (residences, people, places, features)
tests/                        unit tests on synthetic fixtures only
docs/                         the published website — GitHub Pages serves this folder from main
documentation/                research log, runbook, content model, deployment
```

## Principles

- Research, then extraction, then design, then build.
- Every fact keeps its evidence, source and confidence; missing stays `null`.
- "For sale" appears only where current availability is reasonably verified.
- Credits say only what the source says; no relationship is implied.
- Source imagery is used as published, with attribution; nothing is generated,
  retouched, de-watermarked or substituted.
