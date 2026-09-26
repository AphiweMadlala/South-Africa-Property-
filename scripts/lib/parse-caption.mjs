// Caption parser for South African residential property posts.
//
// Every extracted value is a Fact: { value, evidence, source, confidence }.
//   evidence   — the caption text the value was read from
//   source     — always "caption" here; other sources (location tag, tagged
//                users) are attached by normalize.mjs
//   confidence — "high" (explicit label + value), "medium" (weaker cue, or
//                conflicting values in one caption), "low" (read from an emoji
//                or a single ambiguous word)
//
// Missing information stays null. Nothing is derived from anything else:
// bathrooms are never copied from bedrooms, floor size is never guessed from
// erf size, and a price is never inferred from a price band.

const fact = (value, evidence, confidence, extra = {}) => ({
  value,
  evidence: String(evidence).trim(),
  source: 'caption',
  confidence,
  ...extra,
});

// Instagram captions mix regular, non-breaking, thin and narrow no-break spaces.
export function cleanCaption(caption) {
  return String(caption ?? '')
    .replace(/[    ]/g, ' ')
    .replace(/\r\n?/g, '\n');
}

function lineAt(text, index) {
  const start = text.lastIndexOf('\n', index - 1) + 1;
  const end = text.indexOf('\n', index);
  return text.slice(start, end === -1 ? undefined : end).trim();
}

// ---------------------------------------------------------------------------
// Amounts

// "28 500 000" · "28,500,000" · "28.500.000" · "28.5" · "28,5" (SA decimal comma)
export function parseAmount(numStr, multiplier) {
  const s = numStr.trim();
  const grouped = /^\d{1,3}(?:[ ,.]\d{3})+$/.test(s);
  let n;
  if (grouped && !multiplier) {
    n = Number(s.replace(/[ ,.]/g, ''));
  } else if (grouped && multiplier) {
    // "4.950 million" — the last separator is a decimal point.
    n = Number(s.replace(/[ ,.](?=\d{3}$)/, '.').replace(/[ ,]/g, ''));
  } else {
    n = Number(s.replace(',', '.'));
  }
  if (!Number.isFinite(n)) return null;
  const m = (multiplier || '').toLowerCase();
  if (m === 'k') n *= 1e3;
  else if (m.startsWith('m')) n *= 1e6;
  else if (m.startsWith('b')) n *= 1e9;
  return Math.round(n);
}

// ---------------------------------------------------------------------------
// Price

const CURRENCY = {
  r: 'ZAR', zar: 'ZAR', usd: 'USD', 'us$': 'USD', $: 'USD',
  eur: 'EUR', '€': 'EUR', gbp: 'GBP', '£': 'GBP', mur: 'MUR',
};

const PRICE_RE = new RegExp(
  String.raw`(?<![\p{L}\d])(?<cur>ZAR|USD|US\$|EUR|GBP|MUR|R|\$|€|£)\s?` +
    String.raw`(?<num>\d{1,3}(?:[ ,.]\d{3})+|\d+(?:[.,]\d+)?)` +
    String.raw`(?:\s?(?<mult>million|mill|mil|bn|billion|m|k)(?![\p{L}²]))?`,
  'giu',
);

const POA_RE = /(?<![\p{L}])(?:P\.?\s?O\.?\s?A\.?|price on (?:application|request)|P\.?O\.?R\.?)(?![\p{L}])/iu;
const RENTAL_AFTER_RE = /^\s*(?:p\s?\/\s?[mnw](?![\p{L}])|p\.?[mn]\.?(?![\p{L}])|per\s+(?:month|night|week|annum|day)|\/\s?(?:month|mth|night|week|day|m)(?![\p{L}])|a (?:month|night)|monthly|nightly)/iu;
const NON_PRICE_BEFORE_RE = /(levies|levy|rates|taxes|hoa|deposit|transfer|bond|repayments?|instalments?|commission|budget|saved?|spent|turnover)\W{0,20}$/i;
const RENTAL_BEFORE_RE = /(rental|rent|to let|lease)\W{0,20}$/i;

function priceQualifier(before) {
  const b = before.toLowerCase();
  if (/offers?\s+(?:from|over|above|in excess of)\W*$/.test(b)) return 'offers-from';
  if (/(?:from|starting at|priced from|units from)\W*$/.test(b)) return 'from';
  if (/(?:reduced to|now|new price|price drop)\W*$/.test(b)) return 'reduced';
  if (/asking(?:\s+price)?\W*$/.test(b)) return 'asking';
  return null;
}

export function parsePrice(text) {
  const candidates = [];
  for (const m of text.matchAll(PRICE_RE)) {
    const { cur, num, mult } = m.groups;
    const start = m.index;
    const end = start + m[0].length;
    const before = text.slice(Math.max(0, start - 40), start);
    const after = text.slice(end, end + 24);
    const previous = /\bwas\W{0,20}$/i.test(before);
    if (NON_PRICE_BEFORE_RE.test(before) && !previous) continue;
    // "R 5 950 000 350 m²" — the trailing group is an area, not part of the price.
    let numStr = num;
    if (/^\s?(?:m²|m2|sqm|sq\s?m)/i.test(after) && /[ ,.]\d{3}$/.test(numStr)) {
      numStr = numStr.replace(/[ ,.]\d{3}$/, '');
    }
    const amount = parseAmount(numStr, mult);
    if (amount == null) continue;
    const currency = CURRENCY[cur.toLowerCase()] ?? null;
    // "R45" and "R1" are road numbers; tiny amounts are never sale prices.
    const plausibleSale = currency === 'ZAR' ? amount >= 250_000 : amount >= 50_000;
    candidates.push({
      amount,
      currency,
      qualifier: previous ? 'previous' : priceQualifier(before),
      rental: RENTAL_AFTER_RE.test(after) || RENTAL_BEFORE_RE.test(before),
      plausibleSale,
      raw: m[0].trim(),
      line: lineAt(text, start),
    });
  }

  const sale = candidates.filter((c) => !c.rental && c.plausibleSale && c.qualifier !== 'previous');
  const rentals = candidates.filter((c) => c.rental);
  const poa = text.match(POA_RE);

  let price = null;
  if (sale.length) {
    const primary =
      sale.find((c) => c.qualifier === 'reduced') ??
      sale.find((c) => c.qualifier === 'asking') ??
      sale[0];
    const distinct = new Set(sale.map((c) => c.amount));
    price = fact(
      { amount: primary.amount, currency: primary.currency, qualifier: primary.qualifier },
      primary.line,
      distinct.size > 1 ? 'medium' : 'high',
      distinct.size > 1 ? { alternatives: [...distinct].filter((a) => a !== primary.amount) } : {},
    );
  } else if (poa) {
    price = fact({ amount: null, currency: null, qualifier: 'poa' }, lineAt(text, poa.index), 'high');
  }

  return {
    price,
    priceCandidates: candidates.map(({ amount, currency, qualifier, rental, plausibleSale, raw }) => ({
      amount, currency, qualifier, rental, plausibleSale, evidence: raw,
    })),
    rentalPrices: rentals.map(({ amount, currency, raw }) => ({ amount, currency, evidence: raw })),
  };
}

// ---------------------------------------------------------------------------
// Counts: bedrooms, bathrooms, garages, parking

const WORD_NUMBERS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12,
};
// Only garages use "single/double/triple": a "double bedroom" is not two bedrooms.
const GARAGE_WORDS = { single: 1, double: 2, triple: 3, quadruple: 4 };

const NUM = String.raw`(\d{1,2}\s?½|\d{1,2}(?:[.,]5)?|½|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)`;
const GARAGE_NUM = String.raw`(\d{1,2}|one|two|three|four|five|six|single|double|triple|quadruple)`;
const END = String.raw`(?![\d\p{L}])`;

function toCount(token) {
  const t = token.toLowerCase().replace(/\s/g, '');
  if (t in WORD_NUMBERS) return WORD_NUMBERS[t];
  if (t in GARAGE_WORDS) return GARAGE_WORDS[t];
  if (t.endsWith('½')) return Number(t.slice(0, -1) || 0) + 0.5;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// Patterns marked `fallback` (number before emoji, "4 🛁") only run when the
// caption does not use the emoji-before-number convention ("🛁 4"): in
// "🛏 4 🛁 3" the 4 belongs to the bed, not the bath.
function collectCounts(text, patterns) {
  const hits = [];
  const emojiFirst = patterns.some((p) => p.emoji && !p.fallback && new RegExp(p.re.source, p.re.flags.replace('g', '')).test(text));
  for (const { re, confidence, fallback } of patterns) {
    if (fallback && emojiFirst) continue;
    for (const m of text.matchAll(re)) {
      const v = toCount(m[1]);
      if (v == null || v <= 0 || v > 40) continue;
      hits.push({ value: v, evidence: m[0], confidence, index: m.index });
    }
  }
  // The same span can match two patterns; keep one hit per position.
  const seen = new Set();
  return hits
    .sort((a, b) => a.index - b.index)
    .filter((h) => (seen.has(h.index) ? false : seen.add(h.index)));
}

function countFact(hits) {
  if (!hits.length) return null;
  const distinct = [...new Set(hits.map((h) => h.value))];
  const first = hits[0];
  return fact(
    first.value,
    first.evidence,
    distinct.length > 1 ? 'medium' : first.confidence,
    distinct.length > 1 ? { alternatives: distinct.filter((v) => v !== first.value) } : {},
  );
}

export function parseCounts(text) {
  const bedrooms = collectCounts(text, [
    { re: new RegExp(String.raw`(?<![\d.,])${NUM}\s?-?\s?(?:en[- ]?suite\s)?(?:bed(?:room)?s?|bdrms?|br)${END}`, 'giu'), confidence: 'high' },
    { re: new RegExp(String.raw`\bbed(?:room)?s?\s*[:\-–|]\s*${NUM}(?!\d)`, 'giu'), confidence: 'high' },
    { re: new RegExp(String.raw`🛏️?\s*[:x×]?\s*${NUM}(?!\d)`, 'gu'), confidence: 'low', emoji: true },
    { re: new RegExp(String.raw`(?<![\d.,])${NUM}\s?[x×]?\s?🛏`, 'gu'), confidence: 'low', emoji: true, fallback: true },
  ]);
  const bathrooms = collectCounts(text, [
    { re: new RegExp(String.raw`(?<![\d.,])${NUM}\s?-?\s?bath(?:room)?s?${END}`, 'giu'), confidence: 'high' },
    { re: new RegExp(String.raw`\bbath(?:room)?s?\s*[:\-–|]\s*${NUM}(?!\d)`, 'giu'), confidence: 'high' },
    { re: new RegExp(String.raw`[🛁🚿]️?\s*[:x×]?\s*${NUM}(?!\d)`, 'gu'), confidence: 'low', emoji: true },
    { re: new RegExp(String.raw`(?<![\d.,])${NUM}\s?[x×]?\s?[🛁🚿]`, 'gu'), confidence: 'low', emoji: true, fallback: true },
  ]);
  const garages = collectCounts(text, [
    { re: new RegExp(String.raw`(?<![\d.,])${GARAGE_NUM}\s?-?\s?(?:car\s)?garag(?:e|es)${END}`, 'giu'), confidence: 'high' },
    { re: new RegExp(String.raw`\bgarag(?:e|es|ing)\s*[:\-–|]\s*${GARAGE_NUM}(?!\d)`, 'giu'), confidence: 'high' },
  ]);
  const parking = collectCounts(text, [
    { re: new RegExp(String.raw`(?<![\d.,])${NUM}\s?(?:covered\s|secure\s|open\s|visitors'?\s)?parking(?:\sbays?|\sspaces?)?${END}`, 'giu'), confidence: 'high' },
    { re: new RegExp(String.raw`\bparking\s(?:for\s)?${NUM}(?:\scars?)?${END}`, 'giu'), confidence: 'medium' },
    // A car emoji could mean garages or parking; recorded as parking, low.
    { re: new RegExp(String.raw`🚗️?\s*[:x×]?\s*${NUM}(?!\d)`, 'gu'), confidence: 'low', emoji: true },
  ]);
  return {
    bedrooms: countFact(bedrooms),
    bathrooms: countFact(bathrooms),
    garages: countFact(garages),
    parking: countFact(parking),
  };
}

// ---------------------------------------------------------------------------
// Areas: erf (land) and floor (built)

const AREA_NUM = String.raw`(\d{1,3}(?:[ ,.]\d{3})+|\d+(?:[.,]\d+)?)`;
const AREA_UNIT = String.raw`(m²|m2|sqm|sq\.?\s?m|square\s?met(?:re|er)s?|ha|hectares?|acres?)(?![a-z])`;
const APPROX = String.raw`(?:±|\+\/-|approx\.?|approximately|about|circa|c\.)?\s*`;

function toArea(numStr, unitStr) {
  const u = unitStr.toLowerCase();
  const unit = u.startsWith('ha') || u.startsWith('hect') ? 'ha' : u.startsWith('acre') ? 'acre' : 'm2';
  const s = numStr.trim();
  const grouped = /^\d{1,3}(?:[ ,.]\d{3})+$/.test(s);
  // Hectares and acres are small numbers; "1,250 ha" reads as 1.25 ha in SA usage.
  const value = unit !== 'm2'
    ? Number(s.replace(/\s/g, '').replace(',', '.'))
    : grouped
      ? Number(s.replace(/[ ,.]/g, ''))
      : Number(s.replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) return null;
  return { value, unit };
}

function firstArea(text, patterns) {
  for (const { re, confidence } of patterns) {
    const m = text.match(re);
    if (m) {
      const area = toArea(m[1], m[2]);
      if (area) return fact(area, m[0], confidence);
    }
  }
  return null;
}

export function parseAreas(text) {
  const erfSize = firstArea(text, [
    { re: new RegExp(String.raw`\b(?:erf|stand|plot|land|site)(?:\s(?:size|area|extent))?\s*[:\-–|]?\s*(?:of\s)?${APPROX}${AREA_NUM}\s?${AREA_UNIT}`, 'i'), confidence: 'high' },
    { re: new RegExp(String.raw`${AREA_NUM}\s?${AREA_UNIT}\s(?:erf|stand|plot|site|of land|property)\b`, 'i'), confidence: 'high' },
    { re: new RegExp(String.raw`${AREA_NUM}\s?(ha|hectares?|acres?)(?![a-z])`, 'i'), confidence: 'medium' },
  ]);
  const floorSize = firstArea(text, [
    { re: new RegExp(String.raw`\b(?:floor(?:\s(?:size|area|space))?|house size|home size|building size|built(?:\sarea)?|under roof|GLA|living (?:space|area))\s*[:\-–|]?\s*(?:of\s)?${APPROX}${AREA_NUM}\s?${AREA_UNIT}`, 'i'), confidence: 'high' },
    { re: new RegExp(String.raw`${AREA_NUM}\s?${AREA_UNIT}\s(?:of\s)?(?:living|floor|under roof|interior|internal|built|home|house|residence)\b`, 'i'), confidence: 'high' },
  ]);
  const unassignedAreas = [];
  for (const m of text.matchAll(new RegExp(String.raw`${AREA_NUM}\s?${AREA_UNIT}`, 'gi'))) {
    const used = [erfSize, floorSize].some((f) => f && f.evidence.includes(m[0].trim()));
    const area = toArea(m[1], m[2]);
    if (!used && area) unassignedAreas.push({ ...area, evidence: m[0].trim() });
  }
  return { erfSize, floorSize, unassignedAreas };
}

// ---------------------------------------------------------------------------
// Handles, hashtags, links, contact details

export function extractHandles(text) {
  return [...new Set(
    [...text.matchAll(/(?<![\w.@])@([A-Za-z0-9._]{1,30})/g)].map((m) => m[1].replace(/\.+$/, '').toLowerCase()),
  )];
}

export function extractHashtags(text) {
  return [...new Set([...text.matchAll(/(?<![\w#&])#([\p{L}\p{N}_]+)/gu)].map((m) => m[1].toLowerCase()))];
}

export function extractLinks(text) {
  return [...new Set([...text.matchAll(/\b(?:https?:\/\/|www\.)[^\s)>\]]+/gi)].map((m) => m[0].replace(/[.,;!?]+$/, '')))];
}

export function extractEmails(text) {
  return [...new Set([...text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,}/gi)].map((m) => m[0].toLowerCase()))];
}

// South African numbers: 0XX XXX XXXX · +27 XX XXX XXXX, spaced or dashed.
export function extractPhones(text) {
  return [...new Set(
    [...text.matchAll(/(?<![\d+])(?:\+27|0027|0)[\s-]?\(?\d{2}\)?[\s-]?\d{3}[\s-]?\d{4}(?!\d)/g)].map((m) => m[0].trim()),
  )];
}

// ---------------------------------------------------------------------------
// Credits — only where the caption states the role. A bare @mention is kept as
// "mentioned" with no role; "by @x" without a role is "credit-unspecified".
// Order matters: the first cue in a clause wins.

const ROLE_CUES = [
  { role: 'landscape-designer', re: /\blandscap(?:e|ing)(?:\s+(?:design(?:er|ers)?|architect(?:ure|s)?))?\b(?:\s+by)?/i },
  { role: 'interior-designer', re: /\b(?:interior(?:s| design(?:er|ers)?| architecture| architects?)?|d[eé]cor|styl(?:ing|ed))\b(?:\s+by)?/i },
  { role: 'architect', re: /\b(?:architect(?:ure|s|ural design)?|architectural practice)\b(?:\s+by)?/i },
  { role: 'designer-unspecified', re: /\b(?:designed|design)\s+by\b/i },
  { role: 'developer', re: /\b(?:develop(?:er|ers|ed by|ment by)|a development by)\b/i },
  { role: 'builder', re: /\b(?:built by|builder|construction(?:\s+by)?|contractor)\b/i },
  { role: 'photographer', re: /(?:📸|📷|\bphoto(?:graph(?:y|s|er))?(?:\s+(?:by|credit))?\b|\bimages?\s+by\b|\bshot by\b|\bcaptured by\b|\bpics?\s+by\b)/iu },
  { role: 'videographer', re: /(?:🎥|🎬|\bvideo(?:graphy|grapher)?(?:\s+by)?\b|\bfilm(?:ed)? by\b)/iu },
  { role: 'listing', re: /\b(?:listed by|listing agent|listing by|marketed by|represented by|sold by|sole mandate(?: with| by)?|exclusive mandate(?: with| by)?|agents?|agency|brokered by|for sale (?:with|through|via))\b/i },
  { role: 'contact', re: /\b(?:contact|enquir(?:e|ies|y)|inquir(?:e|ies|y)|call|whats?app|for more info(?:rmation)?|for viewings?)\b/i },
  { role: 'source-credit', re: /(?:\bcredits?\b|\bvia\b|\bcourtesy(?: of)?\b|\bsource\b|\brepost(?:ed)?(?: from)?\b|\bbrought to you by\b|©)/i },
  { role: 'credit-unspecified', re: /\bby\b/i },
];

function clauses(text) {
  return text
    .split(/\n|\s[|•·—]\s|(?<=[.!?])\s+(?=[\p{Lu}@#📸📷🎥📍])/u)
    .map((c) => c.trim())
    .filter(Boolean);
}

export function parseCredits(text) {
  const credits = [];
  for (const clause of clauses(text)) {
    const credited = new Set();
    for (const { role, re } of ROLE_CUES) {
      const cue = clause.match(re);
      if (!cue) continue;
      const afterCue = clause.slice(cue.index + cue[0].length);
      const handles = extractHandles(afterCue);
      if (handles.length) {
        for (const handle of handles) {
          credits.push({ role, handle, name: null, evidence: clause, source: 'caption', confidence: role === 'credit-unspecified' ? 'medium' : 'high' });
          credited.add(handle);
        }
        break;
      }
      // A named credit without a handle: "Architecture: SAOTA".
      const named = afterCue.match(/^\s*[:\-–]\s*([\p{Lu}][\p{L}\d&'’. -]{1,60}?)(?=\s*(?:[,;(]|$|\s(?:and|&|with)\s))/u);
      if (named && role !== 'contact' && role !== 'credit-unspecified') {
        credits.push({ role, handle: null, name: named[1].trim(), evidence: clause, source: 'caption', confidence: 'medium' });
        break;
      }
    }
    for (const handle of extractHandles(clause)) {
      if (!credited.has(handle)) {
        credits.push({ role: 'mentioned', handle, name: null, evidence: clause, source: 'caption', confidence: 'high' });
      }
    }
  }
  return credits;
}

// ---------------------------------------------------------------------------
// Status, CTA and editorial signals. Signals are evidence, not conclusions:
// classification (and its recency rules) happens in the content-model step.

const SIGNALS = {
  'for-sale': [/\b(?:for sale|on the market|just listed|newly listed|new listing|now listed|asking price|sole mandate|exclusive mandate|on show|show ?day|viewings? by appointment)\b/i],
  'price-reduced': [/\b(?:price reduced|reduced to|price drop|new price|reduced price)\b/i],
  sold: [/(?<![\p{L}])SOLD(?![\p{L}])/u, /\b(?:just sold|recently sold|sold by|sold for|sold in \d+|has (?:been )?sold|is sold|now sold)\b/i],
  'under-offer': [/\b(?:under offer|offer accepted|under contract|sale pending)\b/i],
  'to-let': [/\b(?:to let|to rent|for rent|for lease|rental|holiday (?:rental|let|home)|per night|book (?:your|a) stay|airbnb|short[- ]term let)\b/i],
  auction: [/\bauction(?:ed|s)?\b/i],
  development: [/\b(?:off[- ]plan|new development|phase \d|units? from|launch(?:ing|ed)? (?:soon|now)|show ?house)\b/i],
};

const CTA_CUES = {
  dm: [/\b(?:DM(?:\s+(?:us|me|for))?|direct message|message us|inbox us|send (?:us )?a (?:message|dm))\b/i],
  'link-in-bio': [/\blink in (?:our |the )?(?:bio|profile)\b/i],
  'contact-agent': [/\b(?:contact (?:the )?agent|contact @|call (?:the )?agent|whats?app|enquir(?:e|ies) (?:with|via|to))/i],
  follow: [/\bfollow (?:us|@[\w.]+|for more|along)/i],
  tag: [/\btag (?:a|someone|your|a friend|who)\b/i],
  save: [/\bsave (?:this|for later)\b/i],
  share: [/\bshare (?:this|with)\b/i],
  question: [/\b(?:would you live here|what do you think|thoughts\?|rate (?:this|it)|out of 10|\d{1,2}\/10|which (?:room|view|one)|yes or no)/i],
  'submit-feature': [/\b(?:(?:want|like) (?:your (?:home|property|house) )?(?:to be )?featured|get featured|to be featured|feature your|submit your|send us your|tag us to be featured|for a feature|features? (?:enquiries|inquiries))\b/i],
};

function signalList(text, table) {
  const out = [];
  for (const [kind, patterns] of Object.entries(table)) {
    for (const re of patterns) {
      const m = text.match(re);
      if (m) {
        out.push({ kind, evidence: lineAt(text, m.index) || m[0], source: 'caption' });
        break;
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Vocabulary: amenities, architecture, property type

const AMENITIES = {
  pool: /\b(?:(?:rim[- ]flow|infinity|heated|plunge|lap|salt[- ]water|swimming|rock) )?pool\b/i,
  'sea-views': /\b(?:sea|ocean|atlantic|indian ocean|bay|coastal)\s+views?\b|\bviews? (?:of|over|across) the (?:sea|ocean|bay|atlantic)\b/i,
  'mountain-views': /\b(?:mountain|table mountain|lion'?s head|twelve apostles|berg)\s+views?\b|\bviews? of (?:table mountain|the mountains?|lion'?s head)\b/i,
  'golf-course': /\bgolf (?:course|estate|club)\b|\bfairways?\b/i,
  'wine-cellar': /\b(?:wine (?:cellar|room|wall|vault)|cellar)\b/i,
  cinema: /\b(?:cinema|home theat(?:re|er)|media room|screening room)\b/i,
  gym: /\b(?:gym|gymnasium|fitness (?:room|studio))\b/i,
  spa: /\b(?:spa|sauna|steam room|hammam|wellness)\b/i,
  'staff-accommodation': /\bstaff (?:quarters|accommodation|suite|cottage)\b/i,
  'guest-accommodation': /\b(?:guest (?:cottage|suite|house|wing|flat)|flatlet|granny flat|separate cottage)\b/i,
  'backup-power': /\b(?:solar|inverter|backup power|back-up power|generator|off[- ]grid|lithium batter(?:y|ies)|load[- ]shedding)\b/i,
  'water-security': /\b(?:borehole|well ?point|jojo tanks?|water tanks?|rain ?water harvesting)\b/i,
  lift: /\b(?:lift|elevator)\b/i,
  vineyard: /\b(?:vineyards?|cultivars?)\b/i,
  beachfront: /\b(?:beachfront|beach front|direct beach access|on the beach|steps (?:from|to) the beach|waterfront)\b/i,
  'security-estate': /\b(?:security estate|gated (?:estate|community)|24[- ]?(?:hour|hr) security|access control(?:led)?)\b/i,
  tennis: /\btennis court\b/i,
  padel: /\bpadel(?: court)?\b/i,
  equestrian: /\b(?:equestrian|stables|paddocks?)\b/i,
  braai: /\b(?:braai|boma|fire ?pit)\b/i,
  fireplace: /\b(?:fireplace|wood[- ]burning|log fire|gas fire)\b/i,
  'underfloor-heating': /\bunder[- ]?floor heating\b/i,
  'smart-home': /\b(?:smart home|home automation|control4|crestron)\b/i,
  scullery: /\bscullery\b/i,
  'rooftop-terrace': /\b(?:roof ?top|roof) (?:terrace|deck|garden|pool)\b/i,
  courtyard: /\bcourtyards?\b/i,
  garden: /\b(?:garden|landscaped|fynbos|indigenous planting)\b/i,
  jacuzzi: /\b(?:jacuzzi|hot tub)\b/i,
  study: /\b(?:study|home office|library)\b/i,
};

const ARCHITECTURE = {
  contemporary: /\bcontemporary\b/i,
  modern: /\bmodern\b/i,
  modernist: /\b(?:modernist|modernism|mid[- ]century)\b/i,
  minimalist: /\bminimal(?:ist|ism)?\b/i,
  brutalist: /\bbrutalis[tm]\b/i,
  'cape-dutch': /\bcape dutch\b/i,
  georgian: /\bgeorgian\b/i,
  victorian: /\bvictorian\b/i,
  edwardian: /\bedwardian\b/i,
  tuscan: /\btuscan\b/i,
  balinese: /\bbalinese\b/i,
  farmhouse: /\b(?:farmhouse|farm ?house|cape farmhouse)\b/i,
  'herbert-baker': /\bherbert baker\b/i,
  'art-deco': /\bart deco\b/i,
  mediterranean: /\bmediterranean\b/i,
  coastal: /\bcoastal\b/i,
  'off-shutter-concrete': /\b(?:off[- ]shutter|board[- ]marked|board[- ]formed|exposed|raw) concrete\b/i,
  cantilever: /\bcantilever(?:ed|s)?\b/i,
  'double-volume': /\bdouble[- ]volume\b/i,
  'glazing': /\b(?:floor[- ]to[- ]ceiling (?:glass|windows|glazing)|frameless glass|stacking (?:doors|glass)|sliding glass)\b/i,
  timber: /\b(?:timber|oak|cedar|teak|balau)\b/i,
  stone: /\b(?:natural stone|stone|travertine|marble|granite|slate)\b/i,
  thatch: /\bthatch(?:ed)?\b/i,
  'face-brick': /\bface ?brick\b/i,
  'steel-frame': /\bsteel[- ]framed?\b/i,
  pavilion: /\bpavilions?\b/i,
  'open-plan': /\bopen[- ]plan\b/i,
};

const PROPERTY_TYPES = [
  ['wine-farm', /\bwine (?:farm|estate)\b/i],
  ['farm', /\b(?:farm|smallholding|game farm|lifestyle farm)\b/i],
  ['penthouse', /\bpenthouse\b/i],
  ['apartment', /\b(?:apartment|condo)\b/i],
  ['townhouse', /\b(?:townhouse|cluster home|duplex|simplex)\b/i],
  ['villa', /\bvilla\b/i],
  ['beach-house', /\bbeach ?house\b/i],
  ['lodge', /\b(?:safari (?:home|lodge)|bush (?:home|house|villa)|private lodge)\b/i],
  ['vacant-land', /\b(?:vacant (?:land|plot|stand)|building (?:plot|stand)|plot for sale)\b/i],
  ['house', /\b(?:house|home|residence|mansion)\b/i],
];

function vocab(text, table) {
  const out = [];
  for (const [key, re] of Object.entries(table)) {
    const m = text.match(re);
    if (m) out.push({ value: key, evidence: m[0], source: 'caption', confidence: 'medium' });
  }
  return out;
}

export function parseVocabulary(text) {
  let propertyType = null;
  for (const [key, re] of PROPERTY_TYPES) {
    const m = text.match(re);
    if (m) {
      propertyType = { value: key, evidence: m[0], source: 'caption', confidence: key === 'house' ? 'low' : 'medium' };
      break;
    }
  }
  return {
    amenities: vocab(text, AMENITIES),
    architecture: vocab(text, ARCHITECTURE),
    propertyType,
  };
}

// ---------------------------------------------------------------------------
// Location lines: "📍 Clifton, Cape Town" · "Location: Constantia"

export function parseLocationLines(text) {
  const out = [];
  for (const m of text.matchAll(/(📍|\blocation\s*[:\-–]|\blocated in\b|\bsituated in\b)\s*([^\n|•#@]{2,80})/giu)) {
    const value = m[2].replace(/[.!,]+\s*$/, '').trim();
    if (value) out.push({ value, evidence: m[0].trim(), source: 'caption', confidence: m[1] === '📍' || /location/i.test(m[1]) ? 'high' : 'low' });
  }
  return out;
}

// ---------------------------------------------------------------------------

export function parseCaption(caption) {
  const text = cleanCaption(caption);
  const { price, priceCandidates, rentalPrices } = parsePrice(text);
  return {
    price,
    priceCandidates,
    rentalPrices,
    ...parseCounts(text),
    ...parseAreas(text),
    locationLines: parseLocationLines(text),
    credits: parseCredits(text),
    signals: signalList(text, SIGNALS),
    ctas: signalList(text, CTA_CUES),
    ...parseVocabulary(text),
    handles: extractHandles(text),
    hashtags: extractHashtags(text),
    links: extractLinks(text),
    emails: extractEmails(text),
    phones: extractPhones(text),
  };
}
