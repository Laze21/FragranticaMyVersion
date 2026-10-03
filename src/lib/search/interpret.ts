/**
 * Natural-language discovery without an LLM (yet).
 *
 * Turns "vanilla fragrance without tobacco", "fresh fragrance that lasts 8+ hours",
 * "something similar to Bleu de Chanel but less common" or "woody date-night under $100" into
 * structured filters, and returns what it understood as editable chips so people can see and
 * correct the interpretation. The interface (text in -> Filters + explanation out) is the same
 * one a model-backed interpreter would implement later.
 */
import { EMPTY_FILTERS, type Filters } from './filters';
import type { Dimension } from '@/lib/scent/vocab';

export interface Vocabulary {
  notes: Array<{ slug: string; name: string; aliases: string[]; family: string }>;
  brands: Array<{ slug: string; name: string }>;
  fragrances: Array<{ slug: string; name: string; brandName: string }>;
}

export interface Interpretation {
  filters: Filters;
  understood: Array<{ kind: string; label: string }>;
  leftover: string;
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

export function interpret(input: string, vocab: Vocabulary): Interpretation {
  const f: Filters = structuredClone(EMPTY_FILTERS);
  const understood: Interpretation['understood'] = [];
  let text = ` ${norm(input)} `;
  const consume = (re: RegExp) => {
    text = text.replace(re, ' ');
  };
  const say = (kind: string, label: string) => understood.push({ kind, label });

  // "similar to X", "like X", "alternative to X", "dupe for X" ------------------------------
  const simRe = /\b(?:similar to|smells like|something like|alternatives? (?:to|for)|dupes? (?:of|for)|like)\s+(.+?)(?=\s+(?:but|that|which|with|without|under|for)\b|[,.]|$)/;
  const sim = text.match(simRe);
  if (sim) {
    const target = norm(sim[1]);
    const hit = vocab.fragrances
      .map((fr) => ({ fr, score: matchScore(target, norm(fr.name)) + (target.includes(norm(fr.brandName)) ? 0.2 : 0) }))
      .sort((a, b) => b.score - a.score)[0];
    if (hit && hit.score >= 0.6) {
      f.similarTo = hit.fr.slug;
      say('similar', `Similar to ${hit.fr.name}`);
      consume(simRe);
    }
  }

  // Popularity ------------------------------------------------------------------------------
  if (/\b(less common|under the radar|not everywhere|hidden gem|lesser[- ]known|unique|niche-y|that nobody else wears)\b/.test(text)) {
    f.sort = 'lesser-known';
    say('sort', 'Less common first');
    consume(/\b(but )?(less common|under the radar|not everywhere|hidden gem|lesser[- ]known|unique|that nobody else wears)\b/g);
  }

  // Price ---------------------------------------------------------------------------------
  const price = text.match(/\b(?:under|below|less than|<)\s*\$?\s*(\d{2,4})\s*(?:dollars|usd|\$)?/);
  if (price) {
    f.priceMax = Number(price[1]);
    say('price', `Under $${price[1]}`);
    consume(/\b(?:under|below|less than|<)\s*\$?\s*\d{2,4}\s*(?:dollars|usd|\$)?/);
  } else if (/\b(cheap|affordable|budget|inexpensive)\b/.test(text)) {
    f.priceBands = ['budget', 'accessible'];
    say('price', 'Affordable');
    consume(/\b(cheap|affordable|budget|inexpensive)\b/);
  }

  // Longevity / projection -----------------------------------------------------------------
  const lasts = text.match(/\b(?:lasts?|lasting|longevity of)?\s*(\d{1,2})\s*\+?\s*(?:hours|hrs|hr|h)\b/);
  if (lasts) {
    f.longevityMin = Number(lasts[1]);
    say('longevity', `Lasts ${lasts[1]}h+`);
    consume(/\b(?:that )?(?:lasts?|lasting|longevity of)?\s*\d{1,2}\s*\+?\s*(?:hours|hrs|hr|h)\b(?:\s*\+)?/);
  } else if (/\b(long[- ]lasting|lasts all day|lasts forever|beast mode)\b/.test(text)) {
    f.longevityMin = 8;
    say('longevity', 'Lasts 8h+');
    consume(/\b(long[- ]lasting|lasts all day|lasts forever|beast mode)\b/);
  }
  if (/\b(strong|loud|projects?|beast|compliment getter)\b/.test(text)) {
    f.projectionMin = 3.4;
    say('projection', 'Noticeable projection');
    consume(/\b(strong|loud|projects?|beast|compliment getter)\b/);
  } else if (/\b(subtle|quiet|skin scent|close to the skin|office[- ]safe|soft)\b/.test(text)) {
    f.projectionMax = 2.8;
    say('projection', 'Stays close');
    consume(/\b(subtle|quiet|skin scent|close to the skin|office[- ]safe)\b/);
  }

  // Seasons, weather, time, occasions -------------------------------------------------------------
  const ctx: Array<[RegExp, keyof Filters, string, string]> = [
    [/\bsummer(y)?\b|\bhot (weather|days?)\b|\bheat\b/, 'seasons', 'summer', 'Summer'],
    [/\bwinter\b|\bcold (weather|days?)\b/, 'seasons', 'winter', 'Winter'],
    [/\bspring\b/, 'seasons', 'spring', 'Spring'],
    [/\bautumn\b|\bfall\b/, 'seasons', 'autumn', 'Autumn'],
    [/\brain(y)?( day)?\b/, 'weather', 'rain', 'Rainy days'],
    [/\bhumid\b/, 'weather', 'humid', 'Humid'],
    [/\b(night|evening)s?\b|\bnight out\b/, 'times', 'night', 'Night'],
    [/\b(daytime|day time|during the day)\b/, 'times', 'day', 'Day'],
    [/\b(office|work|workplace)\b/, 'occasions', 'office', 'Office'],
    [/\b(date|date[- ]night|romantic)\b/, 'occasions', 'date', 'Date'],
    [/\b(school|class|campus)\b/, 'occasions', 'school', 'School'],
    [/\b(wedding|formal|black tie|gala)\b/, 'occasions', 'formal', 'Formal'],
    [/\b(club|clubbing|party|nightlife)\b/, 'occasions', 'nightlife', 'Nightlife'],
    [/\b(vacation|holiday|beach)\b/, 'occasions', 'outdoors', 'Vacation'],
    [/\b(casual|everyday|daily)\b/, 'occasions', 'casual', 'Everyday'],
  ];
  for (const [re, key, value, label] of ctx) {
    if (re.test(text)) {
      const arr = f[key] as string[];
      if (!arr.includes(value)) arr.push(value);
      say('context', label);
      consume(new RegExp(re.source, 'g'));
    }
  }

  // Exclusions: "without X", "no X", "not X(-heavy)", "but not X", "isn't X" ----------------------
  const exRe = /\b(?:without|minus|no|not|isn't|is not|but not|nothing)\s+(?:too\s+|very\s+|any\s+)?([a-z][a-z -]{1,28}?)(?:-heavy| heavy|-forward| notes?)?(?=\s+(?:and|or|but|that|for|with|under)\b|[,.]|\s*$)/g;
  for (const m of [...text.matchAll(exRe)]) {
    const phrase = m[1].trim().replace(/\s+(fragrance|perfume|scent|cologne)s?$/, '');
    const note = findNote(phrase, vocab);
    if (note) {
      if (!f.exclude.includes(note.slug)) f.exclude.push(note.slug);
      say('exclude', `No ${note.name.toLowerCase()}`);
    } else if (FAMILY_WORDS[phrase] ?? FAMILY_WORDS[phrase.replace(/y$/, '')]) {
      const fam = FAMILY_WORDS[phrase] ?? FAMILY_WORDS[phrase.replace(/y$/, '')];
      if (!f.excludeFamilies.includes(fam)) f.excludeFamilies.push(fam);
      say('exclude', `Not ${phrase}-heavy`);
    } else if (DIM_BY_WORD[phrase]) {
      f.avoidDims.push(DIM_BY_WORD[phrase]);
      say('exclude', `Not too ${phrase}`);
    } else continue;
    text = text.replace(m[0], ' ');
  }

  // Character words ---------------------------------------------------------------------------
  for (const [re, dims, label] of DIM_WORDS) {
    if (re.test(text)) {
      for (const d of dims) if (!f.dims.includes(d) && !f.avoidDims.includes(d)) f.dims.push(d);
      say('character', label);
      consume(new RegExp(re.source, 'g'));
    }
  }

  // Brands -----------------------------------------------------------------------------------------
  for (const b of vocab.brands) {
    const name = norm(b.name);
    if (name.length > 3 && text.includes(` ${name} `)) {
      f.brands.push(b.slug);
      say('brand', b.name);
      text = text.replace(name, ' ');
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
        text = text.replace(re, ' ');
        break;
      }
    }
  }

  const STOP =
    /\b(a|an|the|i|me|my|want|need|looking|for|fragrances?|perfumes?|colognes?|scents?|something|smells?|smelling|that|which|with|and|or|but|is|it|to|of|in|on|good|nice|great|best|really|very|too|heavy|isn't|isnt|be|can|wear|wearing|please|recommend|recommendations?|suggest|some|one|any)\b/g;
  const leftover = text.replace(STOP, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  f.q = leftover;
  return { filters: f, understood, leftover };
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
  return /\b(without|with|under|similar|like|lasts?|for|that|isn't|not|no|but|summer|winter|spring|autumn|fall|night|office|date|rain)\b/i.test(q) || q.trim().split(/\s+/).length >= 4;
}
