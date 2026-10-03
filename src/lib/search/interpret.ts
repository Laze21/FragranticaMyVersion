/**
 * Natural-language discovery without an LLM (yet).
 *
 * Turns "vanilla fragrance without tobacco", "fresh fragrance that lasts 8+ hours",
 * "something similar to Bleu de Chanel but less common" or "woody date-night under $100" into
 * structured filters, and returns what it understood as editable chips so people can see and
 * correct the interpretation. The interface (text in -> Filters + explanation out) is the same
 * one a model-backed interpreter would implement later.
 *
 * It never falls through silently. Every pass that reads a phrase replaces it with a comma, so
 * what is left at the end splits into the fragments nobody read; those come back as `unread`,
 * each tagged with the rail group that would have taken it, and the page says so.
 */
import { EMPTY_FILTERS, type FilterGroup, type Filters } from './filters';
import { CONCENTRATION_LABEL, type Dimension } from '@/lib/scent/vocab';

export interface Vocabulary {
  notes: Array<{ slug: string; name: string; aliases: string[]; family: string }>;
  brands: Array<{ slug: string; name: string }>;
  perfumers: Array<{ slug: string; name: string }>;
  fragrances: Array<{ slug: string; name: string; brandName: string }>;
}

export interface Understood {
  kind: string;
  /** The chip: "No tobacco", "Lasts 8h+". */
  label: string;
  /** The same thing as part of a sentence: "without tobacco", "lasting 8h or more". */
  phrase: string;
}

export interface Unread {
  /** The words, as typed, minus filler. */
  text: string;
  /** The rail group that would have taken them. */
  group: FilterGroup;
}

export interface Interpretation {
  filters: Filters;
  understood: Understood[];
  /** What was left after every pass, as a plain query. Empty when everything was read. */
  leftover: string;
  /** The leftover as fragments, each pointed at a filter group. */
  unread: Unread[];
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const DIM_WORDS: Array<[RegExp, Dimension[], string]> = [
  [/\bfresh(est|er)?\b/, ['fresh'], 'Fresh'],
  [/\bclean\b|\bsoapy\b|\blaundry\b/, ['clean'], 'Clean'],
  [/\bgreen\b|\bleafy\b|\bgrassy\b/, ['green'], 'Green'],
  [/\bfloral\b|\bflowery\b/, ['floral'], 'Floral'],
  [/\bfruity\b|\bjuicy\b/, ['fruity'], 'Fruity'],
  [/\bsweet\b|\bgourmand\b|\bdessert\b/, ['sweet'], 'Sweet'],
  [/\bcreamy\b|\bmilky\b/, ['creamy'], 'Creamy'],
  [/\bpowdery\b/, ['powdery'], 'Powdery'],
  [/\bspicy\b|\bpeppery\b/, ['spicy'], 'Spicy'],
  [/\bwoody\b|\bwoods\b/, ['woody'], 'Woody'],
  [/\bearthy\b|\bmossy\b/, ['earthy'], 'Earthy'],
  [/\bwarm\b|\bcozy\b|\bcosy\b|\bambery\b/, ['warm'], 'Warm'],
  [/\bsmoky\b|\bsmokey\b|\bincense\b|\bleathery\b/, ['smoky'], 'Smoky'],
  [/\bdark\b|\bbrooding\b/, ['smoky', 'warm'], 'Dark'],
  [/\baquatic\b|\bmarine\b|\boceanic\b/, ['fresh'], 'Aquatic'],
];
const FAMILY_WORDS: Record<string, string> = {
  citrus: 'citrus',
  citrusy: 'citrus',
  aquatic: 'marine',
  marine: 'marine',
  oceanic: 'marine',
  floral: 'floral',
  fruity: 'fruity',
  gourmand: 'gourmand',
  smoky: 'smoky',
  leather: 'leather',
  musky: 'musk',
};
const DIM_BY_WORD: Record<string, Dimension> = {
  sweet: 'sweet',
  sugary: 'sweet',
  fresh: 'fresh',
  woody: 'woody',
  spicy: 'spicy',
  powdery: 'powdery',
  smoky: 'smoky',
  floral: 'floral',
  fruity: 'fruity',
  green: 'green',
  creamy: 'creamy',
  clean: 'clean',
  soapy: 'clean',
  earthy: 'earthy',
  warm: 'warm',
};

/* Concentrations, longest phrase first so "eau de parfum" is read before "parfum". */
const CONCENTRATIONS: Array<[RegExp, string]> = [
  [/\beau de parfum\b|\bedp\b/, 'edp'],
  [/\beau de toilette\b|\bedt\b/, 'edt'],
  [/\beau de cologne\b|\bedc\b/, 'cologne'],
  [/\bextrait(?: de parfum)?\b|\bextraits\b/, 'extrait'],
  [/\b(?:pure )?parfum\b/, 'parfum'],
  [/\bbody mists?\b/, 'body_mist'],
  [/\b(?:perfume|fragrance) oils?\b/, 'oil'],
];

const DECADE_WORDS: Record<string, number> = {
  sixties: 1960,
  seventies: 1970,
  eighties: 1980,
  nineties: 1990,
  noughties: 2000,
  'two thousands': 2000,
  tens: 2010,
  twenties: 2020,
};

const BRAND_KINDS: Array<[RegExp, string, string, string]> = [
  [/\bdesigner\b/, 'designer', 'Designer', 'from designer houses'],
  [/\bniche\b/, 'niche', 'Niche', 'from niche houses'],
  [/\b(?:indie|independent)\b/, 'indie', 'Independent', 'from independent houses'],
  [/\b(?:high street|drugstore|mass market|mass-market)\b/, 'mass', 'High street', 'from the high street'],
  [/\b(?:middle eastern|arabian|arab)\b/, 'regional', 'Middle Eastern & regional', 'from Middle Eastern houses'],
];

const STOP =
  /\b(a|an|the|i|me|my|want|need|looking|for|fragrances?|perfumes?|colognes?|scents?|something|smells?|smelling|that|which|with|and|or|but|is|it|to|of|in|on|good|nice|great|best|really|very|too|heavy|isn't|isnt|be|can|wear|wearing|please|recommend|recommendations?|suggest|some|one|any|from|by|released|house|houses)\b/g;

export function interpret(input: string, vocab: Vocabulary): Interpretation {
  const f: Filters = structuredClone(EMPTY_FILTERS);
  const understood: Understood[] = [];
  let text = ` ${norm(input)} `;
  // A read phrase leaves a comma behind, so unread words keep their own fragment.
  const consume = (re: RegExp) => {
    text = text.replace(re, ' , ');
  };
  const say = (kind: string, label: string, phrase = label.toLowerCase()) => understood.push({ kind, label, phrase });

  // "similar to X", "like X", "alternative to X", "dupe for X" ------------------------------
  const simRe = /\b(?:similar to|smells like|something like|alternatives? (?:to|for)|dupes? (?:of|for)|like)\s+(.+?)(?=\s+(?:but|that|which|with|without|under|for|from|by)\b|[,.]|$)/;
  const sim = text.match(simRe);
  if (sim) {
    const target = norm(sim[1]);
    const hit = vocab.fragrances
      .map((fr) => ({ fr, score: matchScore(target, norm(fr.name)) + (target.includes(norm(fr.brandName)) ? 0.2 : 0) }))
      .sort((a, b) => b.score - a.score)[0];
    if (hit && hit.score >= 0.6) {
      f.similarTo = hit.fr.slug;
      say('similar', `Like ${hit.fr.name}`);
      consume(simRe);
    }
  }

  // Popularity ------------------------------------------------------------------------------
  if (/\b(less common|under the radar|not everywhere|hidden gem|lesser[- ]known|unique|niche-y|nichey|that nobody else wears)\b/.test(text)) {
    f.sort = 'lesser-known';
    say('sort', 'Less common first', 'less common');
    consume(/\b(but )?(less common|under the radar|not everywhere|hidden gem|lesser[- ]known|unique|niche-y|nichey|that nobody else wears)\b/g);
  }

  // In production ---------------------------------------------------------------------------------
  const prodRe = /\b(?:(?:still |currently )(?:in production|available|on sale|sold|made|for sale)|in production|available now|not discontinued|can (?:still )?buy)\b/;
  if (prodRe.test(text)) {
    f.available = true;
    say('available', 'In production only', 'still in production');
    consume(new RegExp(prodRe.source, 'g'));
  }

  // Price ---------------------------------------------------------------------------------
  const price = text.match(/\b(?:under|below|less than|<|max(?:imum)?|up to)\s*\$?\s*(\d{2,4})\s*(?:dollars|usd|bucks|\$)?/);
  if (price) {
    f.priceMax = Number(price[1]);
    say('price', `Under $${price[1]}`);
    consume(/\b(?:under|below|less than|<|max(?:imum)?|up to)\s*\$?\s*\d{2,4}\s*(?:dollars|usd|bucks|\$)?/);
  } else if (/\b(cheap|affordable|budget|inexpensive)\b/.test(text)) {
    f.priceBands = ['budget', 'accessible'];
    say('price', 'Affordable');
    consume(/\b(cheap|affordable|budget|inexpensive)\b/);
  }

  // Longevity / projection -----------------------------------------------------------------
  const lasts = text.match(/\b(?:lasts?|lasting|longevity of)?\s*(\d{1,2})\s*\+?\s*(?:hours|hrs|hr|h)\b/);
  if (lasts) {
    f.longevityMin = Number(lasts[1]);
    say('longevity', `Lasts ${lasts[1]}h+`, `lasting ${lasts[1]}h or more`);
    consume(/\b(?:that )?(?:lasts?|lasting|longevity of)?\s*\d{1,2}\s*\+?\s*(?:hours|hrs|hr|h)\b(?:\s*\+)?/);
  } else if (/\b(long[- ]lasting|lasts all day|lasts forever|beast mode)\b/.test(text)) {
    f.longevityMin = 8;
    say('longevity', 'Lasts 8h+', 'lasting 8h or more');
    consume(/\b(long[- ]lasting|lasts all day|lasts forever|beast mode)\b/);
  }
  if (/\b(strong|loud|projects?|beast|compliment getter)\b/.test(text)) {
    f.projectionMin = 3.4;
    say('projection', 'Noticeable', 'noticeable');
    consume(/\b(strong|loud|projects?|beast|compliment getter)\b/);
  } else if (/\b(subtle|quiet|skin scent|close to the skin|office[- ]safe|soft)\b/.test(text)) {
    f.projectionMax = 2.8;
    say('projection', 'Stays close', 'staying close');
    consume(/\b(subtle|quiet|skin scent|close to the skin|office[- ]safe)\b/);
  }

  // Years and decades ------------------------------------------------------------------------------
  const decade = text.match(/\b(?:the )?(?:(19|20)?(\d0)'?s)\b/) ?? null;
  const decadeWord = Object.keys(DECADE_WORDS).find((w) => new RegExp(`\\b(?:the )?${w}\\b`).test(text));
  if (decade) {
    const century = decade[1] ?? (Number(decade[2]) >= 30 ? '19' : '20');
    const d = Number(`${century}${decade[2]}`);
    f.decades.push(d);
    say('released', `${d}s`, `from the ${d}s`);
    consume(/\b(?:the )?(?:(?:19|20)?\d0'?s)\b/);
  } else if (decadeWord) {
    const d = DECADE_WORDS[decadeWord];
    f.decades.push(d);
    say('released', `${d}s`, `from the ${d}s`);
    consume(new RegExp(`\\b(?:the )?${decadeWord}\\b`));
  }
  const yearRe = /\b(from|since|after|before|pre|until|up to|released in|released|in|made in)?[- ]?((?:17|18|19|20)\d\d)\b/;
  const year = text.match(yearRe);
  if (year && !decade) {
    const y = Number(year[2]);
    const cue = year[1] ?? '';
    if (/^(from|since)$/.test(cue)) {
      f.yearMin = y;
      say('released', `${y} or later`, `from ${y}`);
    } else if (cue === 'after') {
      f.yearMin = y + 1;
      say('released', `After ${y}`, `after ${y}`);
    } else if (/^(before|pre|until|up to)$/.test(cue)) {
      f.yearMax = y - 1;
      say('released', `Before ${y}`, `before ${y}`);
    } else {
      f.yearMin = y;
      f.yearMax = y;
      say('released', `Released ${y}`, `released in ${y}`);
    }
    consume(new RegExp(yearRe.source));
  }

  // Concentration ----------------------------------------------------------------------------------
  for (const [re, key] of CONCENTRATIONS) {
    if (re.test(text) && !f.concentrations.includes(key)) {
      f.concentrations.push(key);
      const short = CONCENTRATION_LABEL[key]?.short ?? key;
      say('concentration', short, `as ${short}`);
      consume(new RegExp(re.source, 'g'));
    }
  }

  // Designer, niche, independent, high street ---------------------------------------------------
  for (const [re, kind, label, phrase] of BRAND_KINDS) {
    if (re.test(text)) {
      if (!f.brandKinds.includes(kind)) f.brandKinds.push(kind);
      say('kind', label, phrase);
      consume(new RegExp(re.source, 'g'));
    }
  }

  // Seasons, weather, time, occasions -------------------------------------------------------------
  const ctx: Array<[RegExp, keyof Filters, string, string, string]> = [
    [/\bsummer(y)?\b|\bhot (weather|days?)\b|\bheat\b/, 'seasons', 'summer', 'Summer', 'for summer'],
    [/\bwinter\b|\bcold (weather|days?)\b/, 'seasons', 'winter', 'Winter', 'for winter'],
    [/\bspring\b/, 'seasons', 'spring', 'Spring', 'for spring'],
    [/\bautumn\b|\bfall\b/, 'seasons', 'autumn', 'Autumn', 'for autumn'],
    [/\brain(y)?( days?)?\b/, 'weather', 'rain', 'Rain', 'for rainy days'],
    [/\bhumid\b/, 'weather', 'humid', 'Humid', 'for humid days'],
    [/\b(night|evening)s?\b|\bnight out\b/, 'times', 'night', 'Night', 'for nights'],
    [/\b(daytime|day time|during the day)\b/, 'times', 'day', 'Day', 'for daytime'],
    [/\b(office|work|workplace)\b/, 'occasions', 'office', 'Office', 'for the office'],
    [/\b(date|date[- ]night|romantic)\b/, 'occasions', 'date', 'Date', 'for a date'],
    [/\b(school|class|campus)\b/, 'occasions', 'school', 'School', 'for school'],
    [/\b(wedding|formal|black tie|gala)\b/, 'occasions', 'formal', 'Formal', 'for formal occasions'],
    [/\b(club|clubbing|party|nightlife)\b/, 'occasions', 'nightlife', 'Nightlife', 'for nights out'],
    [/\b(vacation|holiday|beach)\b/, 'occasions', 'outdoors', 'Outdoors', 'for a vacation'],
    [/\b(casual|everyday|daily)\b/, 'occasions', 'casual', 'Casual', 'for every day'],
  ];
  for (const [re, key, value, label, phrase] of ctx) {
    if (re.test(text)) {
      const arr = f[key] as string[];
      if (!arr.includes(value)) arr.push(value);
      say('context', label, phrase);
      consume(new RegExp(re.source, 'g'));
    }
  }

  // Exclusions: "without X", "no X", "not X(-heavy)", "but not X", "isn't X" ----------------------
  const exRe = /\b(?:without|minus|no|not|isn't|is not|but not|nothing)\s+(?:too\s+|very\s+|any\s+)?([a-z][a-z -]{1,28}?)(?:-heavy| heavy|-forward| notes?)?(?=\s+(?:and|or|but|that|for|with|under|from|by)\b|[,.]|\s*$)/g;
  for (const m of [...text.matchAll(exRe)]) {
    const phrase = m[1].trim().replace(/\s+(fragrance|perfume|scent|cologne)s?$/, '');
    const note = findNote(phrase, vocab);
    if (note) {
      if (!f.exclude.includes(note.slug)) f.exclude.push(note.slug);
      say('exclude', `No ${note.name.toLowerCase()}`, `without ${note.name.toLowerCase()}`);
    } else if (FAMILY_WORDS[phrase] ?? FAMILY_WORDS[phrase.replace(/y$/, '')]) {
      const fam = FAMILY_WORDS[phrase] ?? FAMILY_WORDS[phrase.replace(/y$/, '')];
      if (!f.excludeFamilies.includes(fam)) f.excludeFamilies.push(fam);
      say('exclude', `Not ${phrase}-heavy`);
    } else if (DIM_BY_WORD[phrase]) {
      f.avoidDims.push(DIM_BY_WORD[phrase]);
      say('exclude', `Not too ${phrase}`);
    } else continue;
    text = text.replace(m[0], ' , ');
  }

  // Character words ---------------------------------------------------------------------------
  for (const [re, dims, label] of DIM_WORDS) {
    if (re.test(text)) {
      for (const d of dims) if (!f.dims.includes(d) && !f.avoidDims.includes(d)) f.dims.push(d);
      say('character', label);
      consume(new RegExp(re.source, 'g'));
    }
  }

  // Houses: "by Dior", "from Chanel", or just the name when it is long enough to be unambiguous ---
  for (const b of vocab.brands) {
    const name = norm(b.name);
    if (name.length < 3) continue;
    const re = new RegExp(`\\b(by |from )?${escapeRe(name)}(?:'s)?\\b`);
    const m = text.match(re);
    if (m && (m[1] || name.length > 3)) {
      if (!f.brands.includes(b.slug)) f.brands.push(b.slug);
      say('brand', b.name, `by ${b.name}`);
      consume(re);
    }
  }

  // Perfumers: a full name anywhere, or a surname after "by" / "from" ("by Demachy") -------------------
  for (const p of vocab.perfumers) {
    const full = norm(p.name);
    const surname = full.split(' ').pop() ?? full;
    if (surname.length < 4) continue;
    const re = new RegExp(`\\b(by |from |nose |perfumer )?(?:${escapeRe(full)}|${escapeRe(surname)})(?:'s)?\\b`);
    const m = text.match(re);
    if (m && (m[1] || m[0].trim().length > surname.length + 1 || surname.length >= 6)) {
      if (!f.perfumers.includes(p.slug)) f.perfumers.push(p.slug);
      say('perfumer', p.name, `by ${p.name}`);
      consume(re);
    }
  }

  // Remaining note words become includes ----------------------------------------------------------------
  const notesByLength = [...vocab.notes].sort((a, b) => b.name.length - a.name.length);
  for (const n of notesByLength) {
    for (const term of [n.name, ...n.aliases].map(norm)) {
      if (term.length < 3) continue;
      const re = new RegExp(`\\b${escapeRe(term)}s?\\b`);
      if (re.test(text) && !f.exclude.includes(n.slug)) {
        if (!f.include.includes(n.slug)) f.include.push(n.slug);
        say('include', n.name);
        text = text.replace(re, ' , ');
        break;
      }
    }
  }

  // What nobody read, fragment by fragment, each pointed at the control that would take it.
  const unread: Unread[] = text
    .split(/[,.;]/)
    .map((frag) => frag.replace(STOP, ' ').replace(/[^a-z0-9$+ ]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((frag) => ({ text: frag, group: guessGroup(frag) }));
  const leftover = unread.map((u) => u.text).join(' ');
  // Once something was understood, stray words are reported rather than searched: FTS on
  // "100 bucks" would empty a result set the chips already describe.
  f.q = understood.length ? '' : leftover;
  return { filters: f, understood, leftover, unread };
}

function guessGroup(frag: string): FilterGroup {
  if (/\$|\b(price|cost|dollars?|bucks|quid|euros?|expensive|pricey|cheaper)\b|\b\d{2,4}\b(?![0-9])/.test(frag) && !/\b(17|18|19|20)\d\d\b/.test(frag)) return 'price';
  if (/\b(hours?|hrs?|lasts?|lasting|longevity|all day)\b/.test(frag)) return 'longevity';
  if (/\b(loud|louder|projects?|projection|sillage|strong|stronger|subtle|subtler|quiet|quieter)\b/.test(frag)) return 'projection';
  if (/\b(17|18|19|20)\d\d\b|\b(years?|decades?|old|older|vintage|classic|release)\b/.test(frag)) return 'released';
  if (/\b(brand|maker|label)\b/.test(frag)) return 'house';
  if (/\b(season|weather|occasion|morning|afternoon|weekend|gym|travel|interview)\b/.test(frag)) return 'wear';
  return 'notes';
}

function findNote(phrase: string, vocab: Vocabulary) {
  const p = norm(phrase);
  return (
    vocab.notes.find((n) => norm(n.name) === p || n.aliases.some((a) => norm(a) === p)) ??
    vocab.notes.find((n) => p.split(' ').some((w) => w.length > 3 && (norm(n.name) === w || norm(n.name) === w.replace(/s$/, ''))))
  );
}

function matchScore(a: string, b: string): number {
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;
  const ta = new Set(a.split(' '));
  const tb = b.split(' ');
  const inter = tb.filter((t) => ta.has(t)).length;
  return inter / Math.max(tb.length, 1);
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Heuristic: does the text read like a sentence rather than a name? */
export function looksNatural(q: string): boolean {
  return (
    /\b(without|with|under|similar|like|lasts?|for|that|isn't|not|no|but|summer|winter|spring|autumn|fall|night|office|date|rain|by|from|before|after|since|edp|edt|extrait|parfum|niche|designer)\b/i.test(q) ||
    /\b(19|20)\d\d\b|\b\d0s\b/.test(q) ||
    q.trim().split(/\s+/).length >= 4
  );
}

/** "Vanilla, without tobacco": the first phrase capitalised, the rest as typed. */
export function sentence(phrases: string[]): string {
  const parts = phrases.filter(Boolean);
  if (!parts.length) return '';
  const [first, ...rest] = parts;
  return [first[0].toUpperCase() + first.slice(1), ...rest].join(', ');
}
