---
name: South Africa Property
description: The official website of @southafrica.property, showcasing high-end residential properties in and around South Africa.
colors:
  paper: "#ffffff"
  fynbos-stone: "#f2f3f0"
  stone-deep: "#e6e8e3"
  ink: "#191c1a"
  ink-soft: "#393e3a"
  muted: "#5b615c"
  rule: "#d6d9d3"
  fynbos-green: "#2f4b3c"
  fynbos-green-soft: "#dfe7e1"
  ochre: "#7a5200"
  oxide: "#7b3226"
  night: "#121513"
  night-ink: "#eef0ec"
  night-muted: "#a9b0aa"
  sale-on-night: "#a9d3b8"
  offer-on-night: "#e9c77e"
  sold-on-night: "#e6a497"
typography:
  display:
    fontFamily: "Libre Caslon Display, Libre Caslon Text, Georgia, Times New Roman, serif"
    fontSize: "clamp(2.75rem, 1.5rem + 5vw, 5.75rem)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.005em"
  headline:
    fontFamily: "Libre Caslon Display, Libre Caslon Text, Georgia, Times New Roman, serif"
    fontSize: "clamp(2.5rem, 1.7rem + 3.4vw, 4.75rem)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.005em"
  section:
    fontFamily: "Libre Caslon Display, Libre Caslon Text, Georgia, Times New Roman, serif"
    fontSize: "clamp(2.125rem, 1.6rem + 2.2vw, 3.375rem)"
    fontWeight: 400
    lineHeight: 1.06
    letterSpacing: "-0.005em"
  title:
    fontFamily: "Libre Caslon Display, Libre Caslon Text, Georgia, Times New Roman, serif"
    fontSize: "clamp(1.625rem, 1.4rem + 1vw, 2.125rem)"
    fontWeight: 400
    lineHeight: 1.08
  title-sm:
    fontFamily: "Libre Caslon Display, Libre Caslon Text, Georgia, Times New Roman, serif"
    fontSize: "clamp(1.375rem, 1.25rem + 0.5vw, 1.625rem)"
    fontWeight: 400
    lineHeight: 1.12
  statement:
    fontFamily: "Libre Caslon Display, Libre Caslon Text, Georgia, Times New Roman, serif"
    fontSize: "clamp(1.75rem, 1.2rem + 2.2vw, 3rem)"
    fontWeight: 400
    lineHeight: 1.16
    letterSpacing: "-0.005em"
  lead:
    fontFamily: "Archivo, Helvetica Neue, Helvetica, sans-serif"
    fontSize: "clamp(1.1875rem, 1.1rem + 0.4vw, 1.375rem)"
    fontWeight: 400
    lineHeight: 1.65
  body:
    fontFamily: "Archivo, Helvetica Neue, Helvetica, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.65
  small:
    fontFamily: "Archivo, Helvetica Neue, Helvetica, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.65
  caption:
    fontFamily: "Archivo, Helvetica Neue, Helvetica, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "Archivo, Helvetica Neue, Helvetica, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "0.12em"
    fontVariation: "'wdth' 112"
  label-action:
    fontFamily: "Archivo, Helvetica Neue, Helvetica, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.1em"
    fontVariation: "'wdth' 112"
  price:
    fontFamily: "Archivo, Helvetica Neue, Helvetica, sans-serif"
    fontSize: "clamp(1.625rem, 1.35rem + 1.1vw, 2.25rem)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.01em"
    fontFeature: "'lnum' 1, 'tnum' 1"
  price-sm:
    fontFamily: "Archivo, Helvetica Neue, Helvetica, sans-serif"
    fontSize: "clamp(1.1875rem, 1.1rem + 0.35vw, 1.375rem)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.01em"
    fontFeature: "'lnum' 1, 'tnum' 1"
rounded:
  none: "0px"
spacing:
  s-1: "0.25rem"
  s-2: "0.5rem"
  s-3: "0.75rem"
  s-4: "1rem"
  s-5: "1.5rem"
  s-6: "2rem"
  s-7: "3rem"
  s-8: "4rem"
  s-9: "6rem"
  s-10: "8rem"
  section: "clamp(4rem, 2.5rem + 6vw, 9rem)"
  gutter: "clamp(1rem, 0.4rem + 3vw, 3.5rem)"
  column-gap: "clamp(1rem, 0.6rem + 1.6vw, 2rem)"
  max-width: "90rem"
  measure: "68ch"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label-action}"
    rounded: "{rounded.none}"
    padding: "0.85rem 1.4rem"
    height: "3rem"
  button-primary-hover:
    backgroundColor: "{colors.fynbos-green}"
    textColor: "{colors.paper}"
  button-line:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label-action}"
    rounded: "{rounded.none}"
    padding: "0.85rem 1.4rem"
    height: "3rem"
  button-line-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  button-on-night:
    backgroundColor: "{colors.night-ink}"
    textColor: "{colors.night}"
    typography: "{typography.label-action}"
    rounded: "{rounded.none}"
    padding: "0.85rem 1.4rem"
    height: "3rem"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    size: "3rem"
  link-arrow:
    textColor: "{colors.ink}"
    typography: "{typography.label-action}"
    padding: "0.5rem 0"
  select:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.none}"
    padding: "0 2.25rem 0 0.75rem"
    height: "2.75rem"
  residence-card-title:
    textColor: "{colors.ink}"
    typography: "{typography.title-sm}"
  residence-card-title-hover:
    textColor: "{colors.fynbos-green}"
  status-sale:
    textColor: "{colors.fynbos-green}"
    typography: "{typography.label}"
  status-offer:
    textColor: "{colors.ochre}"
    typography: "{typography.label}"
  status-sold:
    textColor: "{colors.oxide}"
    typography: "{typography.label}"
  status-quiet:
    textColor: "{colors.muted}"
    typography: "{typography.label}"
  enquiry-band:
    backgroundColor: "{colors.night}"
    textColor: "{colors.night-ink}"
    padding: "clamp(4rem, 2.5rem + 6vw, 9rem) clamp(1rem, 0.4rem + 3vw, 3.5rem)"
  site-footer:
    backgroundColor: "{colors.fynbos-stone}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.small}"
    padding: "4rem clamp(1rem, 0.4rem + 3vw, 3.5rem) 2rem"
---

# Design System: South Africa Property

## Overview

**Creative North Star: "The Modern South African Residence Index"**

The site is a classic editorial showcase: each home is presented like a feature in a residential architecture magazine and filed in an index organised by South African place. The owner chose this register and named Sotheby's International Realty as the benchmark for craft, not for palette or typefaces. The photographs are the content. They run edge to edge on the cover and on each residence's lead image, and everything else steps back so the architecture and the setting carry the page.

The furniture is quiet and exact. White and pale fynbos-stone grounds, near-black ink and one deep fynbos green. Libre Caslon Display sets the names of homes, headlines and the wordmark. Archivo, using its width axis, sets places, prices, specifications, navigation and labels. Corners are square, there are no shadows, and hairlines appear only where data needs them. Density changes by purpose. The home and residence pages breathe like a magazine spread; the Residence Index and the particulars table are tight, ruled and tabular, like a printed catalogue.

The system is built for honesty as much as looks. Every status carries a date, every credit repeats only what the source post says, and a missing fact is simply absent. The site never shows a placeholder value. The visual rejections are the owner's: no centred hero with two buttons, no search box over the hero, no rounded card grids or pills, no glassmorphism, gradient mesh, navy-and-gold, black-and-gold or beige template.

**Key Characteristics:**
- Photography first, full bleed, never retouched, cropped only inside set frames.
- Caslon names over tracked Archivo metadata; prices in tabular figures.
- White and fynbos stone grounds, one green accent, night grounds only for the cover caption on phones, the enquiry band and the lightbox.
- Square corners, flat surfaces, hairlines for data only.
- Dated status in two assigned forms, with tone squares that never carry meaning alone.
- One authored motion moment (the cover settling), all motion removed under reduced motion.

## Colors

A cool, mineral palette: paper white and a faint green-grey stone, near-black ink, and a single fynbos green that marks what is for sale.

In `site/assets/css/site.css` these are custom properties on `:root`:

| Token | Custom property |
| --- | --- |
| paper | `--paper` |
| fynbos-stone | `--stone` |
| stone-deep | `--stone-2` |
| ink | `--ink` |
| ink-soft | `--ink-2` |
| muted | `--muted` |
| rule | `--rule` |
| fynbos-green | `--accent` |
| fynbos-green-soft | `--accent-soft` |
| ochre | `--offer` |
| oxide | `--sold` |
| night | `--night` |
| night-ink | `--night-ink` |
| night-muted | `--night-muted` |

Status colours are applied through `--tone-sale`, `--tone-offer`, `--tone-sold` and `--tone-quiet`. The cover, the enquiry band and the lightbox override these with the on-night values.

### Primary
- **Fynbos Green** (`fynbos-green`): the for-sale status tone, link and title hover, the primary button's hover, the focus ring and the text caret. It is the colour of availability.
- **Fynbos Green, soft** (`fynbos-green-soft`): text-selection background only.

### Secondary
- **Ochre** (`ochre`): the under-offer status tone.
- **Oxide** (`oxide`): the sold status tone.
- **Status tones on night** (`sale-on-night`, `offer-on-night`, `sold-on-night`): the same three statuses lightened for the cover caption, the enquiry band and the lightbox, switched automatically by those surfaces.

### Neutral
- **Paper** (`paper`): the page ground, and text on ink buttons.
- **Fynbos Stone** (`fynbos-stone`): alternating section grounds on the home page, related residences and the footer. It must read as a faint green-grey, never cream.
- **Stone, deep** (`stone-deep`): the ground inside every image frame while it loads, together with each photograph's own dominant colour.
- **Ink** (`ink`): headings, body text, primary buttons, button and icon-button borders.
- **Ink, soft** (`ink-soft`): secondary text such as intros, facts lists and footer text.
- **Muted** (`muted`): place lines, labels, table headers, dates, counts, source notes and the featured or availability-to-confirm status.
- **Rule** (`rule`): hairlines in data lists and tables, and select borders.
- **Night** (`night`): the enquiry band, the lightbox, and the cover caption on phones, where it sits below the photograph.
- **Night ink** and **night muted** (`night-ink`, `night-muted`): primary and secondary text on night.

### Named Rules
**The One Green Rule.** Fynbos green marks availability and interaction, nothing else: the for-sale tone, hover, focus, caret and selection. It never fills a section, a card or a decorative shape.

**The Dated Tone Rule.** A status colour always sits beside a dated text label. Colour alone never tells a visitor whether a home is for sale.

**The Night Band Rule.** Night grounds are reserved for the enquiry band, the lightbox and the cover caption on phones. The site is never a dark template.

## Typography

**Display Font:** Libre Caslon Display 400 (with Libre Caslon Text, Georgia, Times New Roman)
**Body Font:** Archivo variable, width axis 62–125% and weight 100–900 (with Helvetica Neue, Helvetica)
**Label Font:** Archivo at 112% width

**Character:** a high-contrast Caslon for the names of homes and the headlines, the voice of a printed feature, against a crisp, slightly expanded grotesque that handles every fact. Both are self-hosted Latin subsets under the Open Font License.

### Hierarchy
- **Display** (400, `display` size, line-height 1.02): the cover title only. It holds at most 16 characters per line and never breaks a hyphenated word.
- **Headline** (400, `headline` size, 1.02): page titles, including the residence name.
- **Section** (400, `section` size, 1.06): section titles on the home page, related residences and the enquiry band.
- **Title** (400, `title` size, 1.08): editorial feature names, folio headings on About and Enquire, province names and the empty-results heading.
- **Title, small** (400, `title-sm` size, 1.12): residence cards, register rows, the places module and city names.
- **Statement** (400, `statement` size, 1.16): the home page's bio statement.
- **Lead** (400, `lead` size, 1.65): page intros.
- **Body** (400, `body` size, 1.65): running text, including the residence story, capped at a 68ch measure.
- **Small and caption** (`small` and `caption` sizes): facts lists, particulars, credits, source notes, the run credit and the footer.
- **Label** (500, `label` size, 0.12em tracking, uppercase, 112% width): place lines, compact statuses and the particulars caption.
- **Action label** (600, `label-action` size, 0.1em tracking, uppercase, 112% width): navigation, buttons and arrow links.
- **Price** (500, `price` size, lining tabular figures): the residence head and particulars. **Price, small** (`price-sm`) sets prices in editorial features and register rows.

### Named Rules
**The Name Leads Rule.** A home's Caslon name always outranks its price. Prices are full size only in the residence head; in features and lists they drop to `price-sm`, and on cards to small semibold.

**The Short Caps Rule.** Tracked capitals are for short labels only: places, navigation, buttons and compact statuses, under about 40 characters. Full status lines and all running text stay in sentence case.

**The Tabular Figures Rule.** Prices, counts, dates, areas and the lightbox counter use lining tabular figures, with South African thin grouping (R 42 500 000).

## Layout

- **Grid.** A 12-column grid inside a 90rem container with a fluid gutter (`gutter`) and column gap (`column-gap`). Sections are separated by `section` padding, from 4rem on phones to 9rem on wide screens. Running text stops at 68ch.
- **Home rhythm.** The home page runs in this order: cover (full bleed, 82svh, 26–60rem); statement (8 columns of Caslon, with a 4-column aside giving reach and a link); Places; Selected residences; For sale now; Recently featured; enquiry band; footer.
  - Section grounds alternate paper and stone, starting with stone after the statement, whichever sections a collection has.
  - Recently featured lists only homes not already shown above it.
- **Editorial features.** Four compositions alternate down the Selected residences section, chosen by what each photograph can carry:
  - **a:** a 4:5 portrait in 7 columns, text in columns 9–12;
  - **d:** the mirror of a;
  - **b:** a 3:2 landscape in columns 5–12, text in 1–3;
  - **c:** a 21:9 landscape across the full width, text below in 7 columns.
- **Image ratios.** Each frame crops with object-fit inside a fixed ratio, except where noted:
  - cover: 82svh on desktop, 62svh on phones;
  - residence lead image: 16:9, at most 88svh;
  - residence cards: 4:5;
  - register thumbnails: 3:2;
  - places module thumbnails: 1:1;
  - Places page province photographs: 3:2;
  - residence photo run: no crop. Frames keep their own proportions, like shapes pair side by side, landscapes run full width and a leftover frame sits alone at two-thirds width;
  - lightbox: contain.
- **Residence page.** A head with the name in 8 columns and price, status and facts right-aligned in 4, then the lead image across the full width. Below it, the particulars aside takes columns 1–4 and is sticky on desktop. The run (story, photographs, credit, features, history) takes columns 6–12.
- **Folio pages.** On About and Enquire, h2 headings sit in a rail in columns 1–4 with the text in columns 5–11.
- **Breakpoints.**
  - Under 64em: features, statement, particulars, the folio and Places stack to one column, the particulars stop sticking and results drop to two columns.
  - Under 48em: the header nav becomes a Menu button and full-screen sheet; the cover caption moves below the photograph onto night; results drop to one column; the register becomes a thumbnail and text stack.
  - Under 48em on the index: the status choice stays on the filter bar as a horizontally scrolling row, and the other filters move into a full-screen sheet.
  - Under 25em, the wordmark's tracking tightens to 0.14em. Under 21.5em, the Menu label is visually hidden.
- **Verified widths.** 375, 390, 430, 768, 1024, 1280, 1440 and 1920, with no horizontal overflow.

## Elevation & Depth

The system is flat. No surface casts a shadow. Depth comes from the photographs, from changes of ground (paper, fynbos stone, night) and from the lightbox's near-opaque scrim. The one `box-shadow` in the build is a 1px inset outline that draws the hollow status square, which is a line, not an elevation.

### Named Rules
**The Flat Page Rule.** Nothing floats. Sticky elements (the header, the filter bar and the particulars) separate from the page with a hairline or with space, never with a shadow.

## Shapes

- **Corners.** Square everywhere (`rounded.none`): buttons, selects, image frames, dialogs and icon buttons.
- **Borders.** A 1px ink border draws every button and icon button. A 1px `rule` hairline is used only for data and for edges that content scrolls under:
  - register rows, the places module lists and Places page city lists;
  - the particulars table, the history ledger and the contact list;
  - the edges of the sticky filter bar and the header's edge once scrolled;
  - select borders.
- **Status square.** A 0.55em square before each status label. It is filled for for sale, under offer and sold, and hollow for featured and availability to confirm.
- **Frames.** Every photograph sits in a frame grounded in `stone-deep` and its own dominant colour, with explicit width and height, so nothing shifts while it loads.

## Components

### Buttons and links
- **Shape:** rectangular, 3rem tall, square corners, 1px border.
- **Primary:** ink ground, paper text, action label type, padding 0.85rem × 1.4rem. On hover the ground turns fynbos green (180ms ease-out).
- **Line:** transparent with an ink border; on hover it fills with ink and the text turns paper.
- **On night:** night-ink ground with night text; on hover the ground turns paper.
- **Arrow link:** the site's main call to action, for example "View the residence" or "Browse all residences". Action-label caps followed by an arrow that moves 0.25em on hover (220ms).
- **Icon button:** a 3rem square with an ink outline for the strip controls; the lightbox arrows are 3.5rem on a translucent night ground.
- **Text button:** an underlined small label, used for "Clear filters".
- **Focus:** a 2px fynbos-green outline, offset 3px, on every interactive element.

### Navigation
- **Header:** sticky and white. The Caslon wordmark sits left in tracked capitals, and four action-label links (Residences, Places, About, Enquire) sit right. The current page and hovered links get a 1px underline drawn 0.55rem below the text. A hairline appears under the header once the page scrolls.
- **Phones:** a Menu button opens a full-screen white sheet with the links in 2.25–3rem Caslon and the Instagram link at the foot. Escape and Close both return focus to the Menu button.
- **Skip link:** the first focusable element, ink on paper.

### Cover
One home, full bleed. The caption sits bottom-left on desktop over a scrim that reaches 58% black where the title begins and deepens to 80%, so the title holds at least 3:1 over a white facade. The caption carries four things, in order: the Caslon name, the tracked place line, the dated status and one arrow link. The photographer's credit sits bottom-right, in the darkest part of the scrim, and links to the post. On phones the caption moves below the photograph onto night, and the credit becomes a right-aligned caption line directly under the image, so it never sits on the bare photograph. With motion allowed, the photograph settles from 104.5% to 100% over 1.8s; this is the site's only authored motion moment.

### Editorial features (home)
Compositions a, b, c and d from Layout. Each has a title-sized Caslon name, a place label, up to four facts, the full status line, `price-sm` and an arrow link, bottom-aligned against the photograph. On hover the photograph scales to 102.5% over 900ms.

### Residence card (listing card)
A 4:5 photograph, a small-title Caslon name, a place label, up to three facts, then a foot with the compact status on the left and the short price (for example "R 18.5m") on the right. The foot sits at the bottom of the card, so statuses and prices line up across a row. On hover the photograph scales to 103% and the name turns fynbos green. There is no card chrome: no border, ground, radius or shadow.

### For sale now (register)
A ruled list. Each row holds a 3:2 thumbnail, the Caslon name, the place label, and `price-sm` over a compact status, right-aligned. The intro states the 30-day rule. Only homes offered for sale in the last 30 days by a named agent or agency appear here.

### Places module and Places page
- **Home module:** two columns of ruled rows. Each row has a square thumbnail, the province in Caslon, its count, and its cities with counts.
- **Places page:** each province gets a 3:2 photograph with its name and count beside the city lists. City lists flow in up to three columns, each city followed by its suburbs and estates in ruled rows.
- **Links:** every place links into the Residence Index with the matching filters.

### Residence Index filters
- **Status:** a segmented row of radio labels with counts. The selected option is ink and underlined, the others muted. The row sits on the sticky filter bar at every width.
- **Selects:** square, 2.75rem tall, bordered with a `rule` hairline that turns ink on hover, with a small label above. Province, City or town, Area, Type, Bedrooms, Price up to and Sort each appear only where the collection's data supports them.
- **State:** every filter is written to the URL, so refresh, Back, Forward and shared links restore the view. A live count announces results. The empty state offers Clear filters.
- **Phones:** "Filter and sort" opens a full-screen sheet holding the selects, with a badge counting the active filters inside. Its foot has Clear all and a "Show N residences" button.

### Residence particulars
- **Head:** the Caslon headline name and place label on the left; on the right, price, the full status line and facts, right-aligned.
- **Particulars table:** muted row labels, values right-aligned in tabular figures, hairline rows, captioned "Particulars".
- **Source note:** "As published on Instagram, *date*. Details can change; confirm them when you enquire."
- **Credits:** the roles each post states, as definition pairs, for example Architecture, Photography and Represented by.
- **Actions:** full-width enquiry buttons: Email and WhatsApp when the owner has supplied them, otherwise Message on Instagram.
- **Story:** the longest caption, set as body paragraphs. Emoji, the repeated name and 📍 place line, emoji-only spec rows and the account's call to action are left out; "Read the full caption on Instagram" links to the verbatim post.
- **History:** a ledger of every post about the home, each with its date, what it reported and a link.

### Photo run and lightbox
- **Photo run:** the photographs after the lead, at their natural proportions, followed by a caption-sized credit line ("Photographs by …, as credited on Instagram") and "View all N photographs".
- **Lightbox:** a full-screen night dialog.
  - Controls: a live "n / total" counter, a Close button, previous and next buttons (only when there are two or more photographs), and Arrow, Home and End keys with wrap-around. Swiping works on touch.
  - Caption: each photograph's credit and a link to its post.
  - Behaviour: it fades in over 220ms, locks page scroll, and returns focus to the frame that opened it.

### Status label
Two assigned forms:
- **Full line:** a caption-sized, sentence-case, dated statement, for example "For sale · as of 18 September 2026" or "Offered for sale when featured, March 2026 · availability to confirm". It appears in the cover caption, features, the residence head and the particulars.
- **Compact label:** a tracked-caps short form, for example "FOR SALE · 21 SEP 2026" or "FEATURED AUG 2026", which carries the full line as its title. It appears on cards, in the register and in history-style lists.

### Enquiry band and footer
- **Enquiry band:** night ground, a section-sized Caslon title on the left, and a short invitation with the enquiry actions on the right.
- **Footer:** stone ground with the wordmark and bio, Explore and Follow lists under muted labels, and a legal line: "Photography remains the property of the photographers and agencies credited with each residence."

### Folio (About and Enquire)
Title-sized Caslon headings in a left rail with text to their right. About's "How status works" defines each status in plain language. Enquire's contact list is a ruled data list: Email, WhatsApp and Instagram, where Email and WhatsApp appear only once supplied.

### Motion
- **Easing:** everything uses `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Durations:** 160–220ms for colour, underline and arrow changes; 900ms for image hover scales; 220ms for the lightbox fade; 1.8s for the cover settle.
- **Reduced motion:** under `prefers-reduced-motion: reduce`, the cover settle, the lightbox fade and smooth scrolling are all off.

## Do's and Don'ts

### Do:
- **Do** set every home's name in Libre Caslon Display, and every fact (place, price, specification, date) in Archivo.
- **Do** date every status and keep the two assigned status forms: the full sentence-case line in running particulars, and the compact tracked label in cards and lists.
- **Do** credit people exactly as the source post does, for example "Architecture", "Photography" or "Represented by", and link each to their Instagram profile.
- **Do** use the account's own photography, as published, full bleed where the layout calls for it, with its credit and a link to its post.
- **Do** keep hairlines to data: tables, ledgers and ruled lists, plus the edge of the sticky filter bar.
- **Do** leave a missing fact out. No dash, no "N/A" and no placeholder appear in published pages.
- **Do** keep prices in lining tabular figures with South African grouping, and one step below the name except in the residence head.
- **Do** keep square corners and flat surfaces on every component.

### Don't:
- **Don't** use Inter, Roboto, Arial, Open Sans, Poppins, Montserrat, DM Sans, Space Grotesk or a generic system sans.
- **Don't** build a centred hero with a subtitle and two buttons, a left-text, right-image hero, or a search box over the hero.
- **Don't** use rounded card grids, pills, glassmorphism, gradient mesh, decorative gold lines, navy-and-gold, black-and-gold or a beige template.
- **Don't** put a kicker or eyebrow above a heading, number sections decoratively, or add shadows.
- **Don't** mix stock or generated imagery with real residences, retouch or de-watermark a photograph, or claim ownership of one.
- **Don't** show "For sale" without a sale post from the last 30 days that names the agent or agency.
- **Don't** show an email address or WhatsApp number until the owner supplies it.
- **Don't** write "Luxury redefined", "Elevated living", "Find your dream home", "Where luxury meets lifestyle", "unparalleled luxury", "timeless elegance", "prestigious living", "elevated lifestyle" or "where sophistication meets comfort".
