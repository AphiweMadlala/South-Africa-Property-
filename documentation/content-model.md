# Content model, provenance and status

The rules the site's data must obey. Parts marked **provisional** can only be
settled once the real archive has been extracted and measured.

## 1. Provenance: every fact carries its evidence

Parsed values are stored as facts, never as bare values:

```json
{
  "value": 5,
  "evidence": "5 bedrooms | 5.5 bathrooms | double garage",
  "source": "caption",
  "confidence": "high"
}
```

| `source` | Meaning |
| --- | --- |
| `caption` | Read from the post caption; `evidence` is the caption text |
| `location-tag` | Instagram's location tag on the post |
| `caption-location-line` | A 📍 or "Location:" line in the caption |
| `caption-text` | A place named elsewhere in the caption |
| `hashtag` | A place hashtag (weakest location evidence) |
| `photo-tag` | An Instagram photo tag on one of the images |
| `collab` | An Instagram collaboration co-author |

| `confidence` | Meaning |
| --- | --- |
| `high` | Explicit label and value ("Bedrooms: 5", "Asking price R 12 500 000") |
| `medium` | Weaker cue, or the caption contains conflicting values (`alternatives` lists them) |
| `low` | Read from an emoji or an ambiguous word; shown only with qualification |

Every post keeps `provenance: { rawFile, rawIndex }` pointing at the raw export,
and every residence lists the post IDs it was built from.

### Rules

- Missing stays `null`. Bathrooms are never copied from bedrooms; floor size is
  never inferred from erf size; a price is never inferred from a price band.
- A bare `@mention` has role `mentioned`. A role (architect, photographer,
  listing agent, …) is assigned only where the caption states it.
- `tagged` (photo tag) and `collaborator` (collab post) are recorded as what
  Instagram states, with no further role implied.
- A residential address is not recorded unless the caption publishes it, and it
  is never inferred from imagery.

## 2. Status model

Status is derived per residence from the dated signals across all of its posts.
Signals are evidence of what a post said *on its date*, not of the present.

| Status | Rule | Label on the site |
| --- | --- | --- |
| `sold` | The latest sale-related signal is an explicit sold statement | "Sold — reported {date}" |
| `under-offer` | The latest sale-related signal is under offer / offer accepted | "Under offer — reported {date}" |
| `on-the-market` | Sale evidence, no later sold/under-offer signal, **and** either a listing page verified live at build time, or sale evidence posted within 30 days of extraction with a named listing agent or agency | "For sale · as of {date}" + representation |
| `availability-to-confirm` | Sale evidence exists but neither condition above holds | "Offered for sale when featured, {date} · availability to confirm" |
| `featured` | No sale evidence | "Featured {month year}" |

Sale evidence means a `for-sale`, `price-reduced` or `auction` signal, or an
asking price or POA stated in a caption.

- "For Sale" is never shown for `availability-to-confirm` or `featured`.
- `on-the-market` always shows its as-of date and who represents the home, so
  a reader knows where to confirm.
- The 30-day window is a parameter, **provisional** until the posting cadence
  is measured (a weekly-posting account makes 30 days meaningful; a sporadic
  one does not).
- Rentals (`to-let`) are recorded but are out of scope unless the archive shows
  they are a real part of the account's output.

## 3. Content classes — provisional

Two classes are planned, **if** the measured archive supports them:

- **Featured homes** — editorial residences and architectural showcases
  (statuses `featured`, `availability-to-confirm`, `sold`, `under-offer`).
- **On the market** — only `on-the-market` residences.

If the archive turns out to be almost entirely editorial, the "On the market"
layer shrinks to a small, clearly dated section — or is omitted entirely if
nothing qualifies. Instagram content is not forced into fake listings.

## 4. Deduplication

`scripts/extract/dedupe.mjs` clusters posts that show the same residence. Its
header documents the evidence weights. In short: a shared listing URL or the
same photograph (perceptual hash) proves identity; the same price and bedrooms
in the same city, copied captions, and a shared title are strong evidence;
place and specs alone are not enough. Conflicting bedroom counts, cities, or
prices more than 25% apart veto a merge unless identity is proven, and such
clusters are flagged `needsReview`. Template images reused across many posts
and low-information (flat) hashes are ignored.

## 5. Planned data files

Built in Phase 3 from `data/normalized/`, **only where the archive justifies
each file**:

| File | Contents |
| --- | --- |
| `data/properties.json` | One record per residence: title (with source), place, status, facts (price, beds, baths, garages, parking, erf, floor, type, architecture, amenities), people (by role), media IDs, post IDs, first/last featured dates |
| `data/features.json` | Editorial posts that are not about a single residence (if any): theme, text, media, post |
| `data/people.json` | Credited people and firms: handle, name, roles (only as stated), residences, post evidence |
| `data/places.json` | The place hierarchy built only from places that residences resolve to |
| `media/manifest.json` | Every image: file, dimensions, sha256, source post, CDN source URL, retrieval time, credited photographers, rights note |

### Attribution language

Used only when the evidence supports it:

- "Represented by …" — `listing` credit
- "Architecture by …" — `architect` credit
- "Interiors by …" — `interior-designer` credit
- "Photography by …" — `photographer` credit
- "Originally featured on @southafrica.property, {date}" — every residence
- "Credited: …" — `credit-unspecified` (the caption says "by @x" without a role)

The site never implies that South Africa Property employs, partners with or
represents anyone it credits.

## 6. Titles

A caption's first line becomes the title candidate only if it reads as a name
(not a location line, a question, a price or a spec line, and not only place
names). Where no name exists, the site uses a descriptive label built from
verified facts (for example "Residence in Camps Bay") and records
`titleSource: "generated-from-place"`, so a generated label is never passed
off as the home's name.
