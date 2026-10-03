/**
 * Seed content contract.
 *
 * Catalogue content (houses, perfumers, fragrances, official notes) describes REAL products and
 * is researched from primary sources (house websites, press releases) with a source on every
 * claim. Never from Fragrantica, Parfumo, Basenotes or datasets derived from them.
 *
 * Community figures are generated DEMO distributions (flagged in the UI). There are no invented
 * reviews of real products. Demo people (users.ts) are fictional accounts used only for shelves,
 * lists and wear diaries so the social features can be explored.
 *
 * Bottle images are original illustrations rendered from BottleSpec, labelled as illustrations.
 *
 * scripts/generate-seed.ts turns these modules into supabase/seed.sql. Community aggregates
 * are expanded deterministically from the compact `community` block on each fragrance and
 * are stored as `community_baselines` rows flagged as demo, never mixed silently with live votes.
 */

/** The 13 character dimensions behind the Scent Fingerprint ("accords" table). */
export const DIMENSIONS = [
  'fresh',
  'clean',
  'green',
  'floral',
  'fruity',
  'sweet',
  'creamy',
  'powdery',
  'spicy',
  'woody',
  'earthy',
  'warm',
  'smoky',
] as const;
export type Dimension = (typeof DIMENSIONS)[number];

/** 0..1 per dimension. Omitted dimensions are 0. */
export type DimVector = Partial<Record<Dimension, number>>;

export type NoteKind = 'material' | 'accord' | 'descriptor';
export type NoteFamily =
  | 'citrus'
  | 'aromatic'
  | 'green'
  | 'marine'
  | 'floral'
  | 'fruity'
  | 'spice'
  | 'gourmand'
  | 'woody'
  | 'resinous'
  | 'musk'
  | 'leather'
  | 'smoky'
  | 'earthy'
  | 'tea'
  | 'mineral';

export interface SeedNote {
  slug: string;
  name: string;
  kind: NoteKind;
  family: NoteFamily;
  aliases?: string[];
  /** Plain language, 1-2 sentences, no jargon. "What does it smell like?" */
  smellsLike: string;
  /** Where it comes from: plant part, process, natural vs synthetic. 1-3 sentences. */
  origin: string;
  /** What it does in a composition. 1-2 sentences. */
  contributes: string;
  /** true = synthetic molecule, false = natural material, 'both' = commonly both */
  synthetic: boolean | 'both';
  /** Typical position in a fragrance's evolution. */
  volatility: 'top' | 'heart' | 'base';
  /** Dimension weights this note pushes, 0..1. */
  character: DimVector;
  /** A muted swatch for the note (hex). Keep it believable, not neon. */
  hue: string;
}

export interface SeedGlossaryTerm {
  slug: string;
  term: string;
  /** One sentence, < 140 chars. Shown in the tooltip. */
  short: string;
  /** 2-5 sentences. Shown on /learn/[slug]. Plain language, a little personality. */
  long: string;
  related?: string[]; // glossary slugs
  seeAlsoNotes?: string[]; // note slugs
}

export type BrandKind = 'designer' | 'niche' | 'indie' | 'heritage' | 'mass' | 'regional';

export interface SeedBrand {
  slug: string;
  name: string;
  /** Official website (homepage) */
  website?: string;
  parentCompany?: string;
  wikidataQid?: string;
  /** Where the founding facts came from (Wikidata page, house 'about' page). */
  sourceUrl?: string;
  kind: BrandKind;
  country: string; // ISO-3166 alpha-2
  city?: string;
  founded: number;
  /** 2-4 sentences, editorial voice. */
  description: string;
  /** Optional style shorthand shown on brand page. */
  knownFor?: string;
}

export interface SeedPerfumer {
  slug: string;
  name: string;
  wikidataQid?: string;
  sourceUrl?: string;
  country: string; // ISO alpha-2
  bornYear?: number;
  /** 2-3 sentences. */
  bio: string;
  /** Short signature description, e.g. "Transparent woods, salt, light". */
  signature?: string;
}

export type Concentration =
  | 'cologne'
  | 'edc'
  | 'edt'
  | 'edp'
  | 'parfum'
  | 'extrait'
  | 'oil'
  | 'body_mist';

export type FragranceStatus = 'current' | 'discontinued' | 'limited' | 'reformulated' | 'upcoming';
export type MarketedFor = 'feminine' | 'masculine' | 'shared' | 'unspecified';
export type PriceBand = 'budget' | 'accessible' | 'premium' | 'luxury' | 'ultra';

import type { BottleSpec } from '@/lib/bottle/spec';
import type { BottleSpecV1 } from '@/lib/bottle/legacy';
export type { BottleSpec, BottleSpecV1 };

/** Compact community block. Expanded into demo distributions by the seed generator. */
export interface SeedCommunity {
  /** Rough size of the community around it. new = recently released, few votes. */
  tier: 'huge' | 'large' | 'medium' | 'small' | 'new';
  /** Mean overall rating out of 10 (e.g. 7.8). */
  rating: number;
  /** How split opinion is: 0 = consensus, 1 = extremely divisive. */
  divisiveness: number;
  /** Sub-ratings out of 10. */
  scent: number;
  performance: number;
  value: number;
  originality: number;
  /** Median longevity in hours on skin. */
  longevityHrs: number;
  /** Projection in the first hour on a 1..5 scale (1 skin, 2 close, 3 conversational, 4 arm's length, 5 room-filling). */
  projection: number;
  /** Projection around hour 3, same scale. */
  projectionLater: number;
  /** Fit 0..1 for each context (share of voters who say it fits). */
  seasons: { spring: number; summer: number; autumn: number; winter: number };
  time: { day: number; night: number };
  weather: { hot: number; mild: number; cold: number; rain: number; humid: number };
  occasions: {
    office: number;
    school: number;
    date: number;
    formal: number;
    casual: number;
    nightlife: number;
    special: number;
    outdoors: number;
  };
  /**
   * What people actually smell: note or descriptor slug -> share of voters who perceive it (0..1).
   * Include some notes that are NOT officially listed and leave out some that are listed
   * but rarely noticed. 6-12 entries.
   */
  perceived: Record<string, number>;
  /** Per phase, which perceived notes dominate. Slugs, 2-4 each. */
  strongestByPhase?: { opening?: string[]; heart?: string[]; drydown?: string[] };
}

export interface SeedFragrance {
  slug: string;
  name: string;
  brand: string; // brand slug
  concentration: Concentration;
  releaseYear: number;
  discontinuedYear?: number;
  status: FragranceStatus;
  marketedFor: MarketedFor;
  perfumers: string[]; // perfumer slugs, may be empty (undisclosed)
  /** Parent fragrance slug if this is a flanker or concentration variant. */
  flankerOf?: string;
  /** Style label in plain-ish words, e.g. "Fresh spicy woods", "Vanilla tobacco", "Green chypre". */
  style: string;
  /**
   * The 10-second read. Plain language, <= 170 chars. What it smells like from spray to drydown.
   * e.g. "Bright bergamot and pepper at first, then clean woods and ambroxan."
   */
  summary: string;
  /** Plain-language best use, <= 60 chars. e.g. "Cool evenings, nights out" */
  bestFor: string;
  /** House marketing copy. Leave undefined for real products: we don't republish brand copy. */
  officialDescription?: string;
  /**
   * Provenance for factual claims. Prefer official_brand (house product page / press release).
   * retailer_feed = an authorised retailer's product page. editorial = our own research when no
   * primary source was reachable (lower confidence).
   */
  sources?: Array<{
    field: 'identity' | 'notes' | 'perfumers' | 'price' | 'status';
    type: 'official_brand' | 'retailer_feed' | 'editorial' | 'public_dataset';
    publisher: string;
    url: string | null;
    confidence: number; // 0..1
    note?: string;
  }>;
  /** One sentence describing the real bottle, used for alt text and the illustration caption. */
  bottleDescription?: string;
  /** Our editorial take, 2-4 sentences, knowledgeable and honest. */
  editorial: string;
  /**
   * Official / published notes. null = house never published notes.
   * Use `flat` when the house lists notes without a pyramid.
   */
  notes: { top?: string[]; heart?: string[]; base?: string[]; flat?: string[] } | null;
  priceBand: PriceBand;
  /** Typical retail price for the listed size, USD. */
  priceUsd: number;
  sizeMl: number;
  /** Editorial character per phase (0..1). Drives the Trail before community votes exist. */
  character: { opening: DimVector; heart: DimVector; drydown: DimVector };
  /** When each phase typically starts, minutes after spraying. */
  phases?: { heartAtMin: number; drydownAtMin: number };
  community: SeedCommunity;
  /** v2 spec, or the first-generation preset description (converted to v2 when the catalogue is assembled). */
  bottle: BottleSpec | BottleSpecV1;
  /** Scent accent colour for this fragrance page (hex). Muted, must not fight the UI. */
  accent: string;
  /** Only the flagship demo gets a 3D model. */
  has3d?: boolean;
  /** Edge-case flags for QA. */
  noImage?: boolean;
}

export interface SeedUser {
  handle: string;
  displayName: string;
  experience: 'new' | 'learning' | 'enthusiast' | 'collector' | 'professional';
  bio: string;
  location?: string;
  isPrivate?: boolean;
  /** Fragrance slugs they own / have / want. */
  owns?: string[];
  had?: string[];
  wants?: string[];
  favorites?: string[];
}

export interface SeedReview {
  fragrance: string; // slug
  author: string; // user handle
  kind: 'quick' | 'full';
  title?: string; // full reviews only
  body: string;
  rating: number; // 1..10 overall
  focus: Array<'scent' | 'performance' | 'value' | 'beginner' | 'long_term' | 'first_impression' | 'comparison'>;
  ownership: 'own' | 'owned' | 'sample' | 'decant' | 'tested' | 'none';
  wearCount?: number;
  gifted?: boolean;
  /** Days before 2026-10-03 the review was posted. */
  daysAgo: number;
  helpful: number;
  status?: 'published' | 'deleted';
}

export interface SeedList {
  slug: string;
  author: string;
  title: string;
  description: string;
  items: Array<{ fragrance: string; note?: string }>;
}
