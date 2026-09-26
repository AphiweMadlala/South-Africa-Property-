# 00 — Reconnaissance access log

Session date: **2026-09-26**. Subject: <https://www.instagram.com/southafrica.property/>.

This log records every channel attempted during Phase 1 (Agent Reach reconnaissance) and
Phase 2 (Apify extraction), what each returned, and what can be treated as evidence.

## Result: blocked by environment network policy

The cloud environment this session ran in allows only a short list of hosts (package
registries, GitHub, Google Fonts). Instagram, its media CDNs, Apify and every
third-party reader were denied, so **no profile data, captions or images could be
retrieved**. Nothing below has been filled in from memory or assumption.

| Channel | Target | Outcome |
| --- | --- | --- |
| Agent Reach CLI (`agent-reach doctor --json`) | — | CLI not installed in the container |
| Agent Reach · Instagram backend (OpenCLI) | instagram.com | Needs a logged-in desktop Chrome session; none exists in a cloud container |
| Agent Reach · Jina Reader | `r.jina.ai` | Egress denied (network policy) |
| Direct HTTPS | `www.instagram.com`, `i.instagram.com` | Egress denied |
| Instagram media CDN | `scontent.cdninstagram.com`, `*.fbcdn.net` | Egress denied |
| Harness WebFetch | `www.instagram.com`, `best-hashtags.com` | `EGRESS_BLOCKED` |
| Apify | `api.apify.com`, `apify.com`, `console.apify.com` | Egress denied; `APIFY_TOKEN` not set; no Apify connector in the registry |
| Third-party Instagram viewers | `picuki.com`, `imginn.com` | Egress denied |
| Listing portals (availability checks) | `property24.com`, `privateproperty.co.za` | Egress denied |
| Apify CLI | npm `apify-cli@1.10.0` | Installs; accepts the skill's `--user-agent` flag; `apify actors call` fails with "You are not logged in" (no token) |
| Harness web search | search index | Works — returns page titles and URLs only (below) |
| Reachable hosts | `registry.npmjs.org`, `pypi.org`, `fonts.googleapis.com`, `fonts.gstatic.com`, `api.github.com`, `raw.githubusercontent.com` | OK |

## GitHub Actions route (after the policy block)

Extraction was moved to GitHub's machines, which can reach Apify and Instagram.

| Date | Run | Outcome |
| --- | --- | --- |
| 2026-09-26 | Extract Instagram archive, runs 36241907491 (two attempts) and 36243066794 | Stopped at the token check: `APIFY_TOKEN` is not an Actions secret. The owner had added it as a Codespaces secret, which Actions cannot read |
| 2026-09-26 | Fetch Instagram (public), run 36243066976 | Instagram answered HTTP 429 (rate limited) to GitHub's runners |
| 2026-09-26 15:29 UTC | Extract Instagram archive, run 36252120465 (free dry run) | Same token check: the secret is still not visible to Actions |

## Evidence register

### Verified

| Fact | Value | Source | Confidence |
| --- | --- | --- | --- |
| Account exists | `instagram.com/southafrica.property/` | Web search index, 6 independent queries | High |
| Display name | **South Africa Property** | Indexed page title `South Africa Property (@southafrica.property)` | Medium — index titles can lag the live profile |

### Stated by the account owner

| Fact | Value | Source |
| --- | --- | --- |
| Ownership | The project owner owns or is authorised to run @southafrica.property; the site is its official website | Owner's confirmation in the project session, 2026-09-26 |
| Bio | "Showcasing the best high-end residential properties in and around South Africa." | Owner's brief (not yet checked against the live profile) |
| Business model | A mix: editorial features, paid listing features, and listings the account represents | Owner's answer in the project session, 2026-09-26 |
| Enquiries | By email or WhatsApp. The address and number have not been supplied, so the site offers an Instagram message until they are | Owner's answer, 2026-09-26 |
| Visual register | Classic editorial, with Sotheby's International Realty as the quality benchmark (craft level, not palette or typefaces) | Owner's answers, 2026-09-26 |

### Unknown until extraction runs

Follower / following / post counts · account category · profile links · public contact
details · CTAs · whether features are invited · enquiry routing · sales facilitation ·
business model · geographic focus · recurring agencies, agents, architects, designers,
developers, photographers · sales vs editorial mix · reels vs carousel vs static mix ·
caption voice · hashtags · terminology · visual motifs · cover conventions.

## Adjacent accounts surfaced by search

Search results repeatedly returned other South African property accounts. They are
recorded **only** so the design can be differentiated from them later. No relationship
with @southafrica.property is implied or should be inferred.

`@posh_properties_sa` · `@sa_homes4u` ("Finest homes in South Africa") ·
`@housesofsouthafrica` ("Real Estate South Africa") · `@luxuryhomes_southafrica`
("Luxury Real Estate & Design") · `@property24_sa` · `@apartments.southafrica` ·
`@property.coza_south_africa` · `@africaestate`.

The brief also names brands the design must not resemble: Exclusive Cape Town,
Durban Luxe, Beautiful South African Homes, Luxury Homes South Africa, Luxury Homes of SA.

## What unblocks Phase 1–2

See [`../extraction-runbook.md`](../extraction-runbook.md). In short: network access to
Apify, Instagram and its CDNs, plus an `APIFY_TOKEN` environment variable, in a new session.
