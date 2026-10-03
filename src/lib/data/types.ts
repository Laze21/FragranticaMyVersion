import type { BottleSpec } from '@/seed/types';
import type { Dimension } from '@/lib/scent/vocab';

export type Vec = Partial<Record<Dimension, number>>;
export interface Character {
  overall: Vec;
  opening: Vec;
  heart: Vec;
  drydown: Vec;
}

/** Everything needed to draw a fragrance anywhere small: cards, lists, shelves, search results. */
export interface StageLayers {
  nozzle: { x: number; y: number };
  cap: { x: number; y: number; w: number; h: number } | null;
  shadow: string | null;
  body: string | null;
  capUrl: string | null;
}

export interface FragranceCard {
  id: string;
  slug: string;
  name: string;
  brandSlug: string;
  brandName: string;
  concentration: string | null;
  releaseYear: number | null;
  status: string;
  style: string | null;
  priceBand: string | null;
  accent: string;
  poster: string | null;
  posterAlt: string | null;
  /** A licensed product photograph, or our own labelled illustration. */
  posterKind: 'photo' | 'illustration';
  posterCredit: string | null;
  posterLicense: string | null;
  posterSource: string | null;
  /** Where the nozzle is and, for layered illustrations, the separate shadow / body / cap renders. */
  posterLayers: StageLayers | null;
  ratingAvg: number | null;
  ratingCount: number;
  reviewCount: number;
  character: Character;
  longevityHrs: number | null;
  projectionOpening: number | null;
  projectionLater: number | null;
  heartAtMin: number;
  drydownAtMin: number;
  ownCount: number;
  trending: number;
  includesBaseline: boolean;
}

export interface NoteRef {
  id: string;
  slug: string;
  name: string;
  kind: 'material' | 'accord' | 'descriptor';
  family: string;
  hue: string;
  smellsLike: string | null;
}

export interface SourceClaim {
  id: string;
  field: string;
  sourceName: string;
  sourceType: string;
  sourceUrl: string | null;
  verifiedAt: string | null;
  confidence: number | null;
  isDemo: boolean;
  notes: string | null;
}

export interface FragranceDetail extends FragranceCard {
  brandKind: string;
  brandCountry: string | null;
  summary: string | null;
  bestFor: string | null;
  editorial: string | null;
  officialDescription: string | null;
  marketedFor: string;
  discontinuedYear: number | null;
  priceUsd: number | null;
  sizeMl: number | null;
  bottle: BottleSpec | null;
  isDemo: boolean;
  perfumers: Array<{ slug: string; name: string }>;
  notes: { top: NoteRef[]; heart: NoteRef[]; base: NoteRef[]; unspecified: NoteRef[] } | null;
  notesClaim: SourceClaim | null;
  claims: SourceClaim[];
  model: {
    url: string;
    poster: string | null;
    version: string | null;
    animations: { idle: string | null; spray: string | null; open: string | null; notes: string | null };
  } | null;
  parent: { slug: string; name: string } | null;
  flankers: Array<{ slug: string; name: string; concentration: string | null; releaseYear: number | null }>;
  variants: Array<{ label: string; kind: string; fromYear: number | null; toYear: number | null; notes: string | null }>;
  stats: FragranceStats;
}

export interface FragranceStats {
  ratingCount: number;
  ratingAvg: number | null;
  ratingHist: number[];
  ratingSpread: number | null;
  scentAvg: number | null;
  performanceAvg: number | null;
  valueAvg: number | null;
  originalityAvg: number | null;
  reviewCount: number;
  perfVotes: number;
  longevityHist: number[];
  longevityMedian: number | null;
  projectionOpeningHist: number[];
  projectionLaterHist: number[];
  projectionAvg: number | null;
  wearVoters: number;
  wear: Record<string, number>;
  perceivedVoters: number;
  perceived: Record<string, number>;
  perceivedByPhase: Record<string, Record<string, number>>;
  character: Character;
  ownCount: number;
  hadCount: number;
  wantCount: number;
  wears30d: number;
  wearsTotal: number;
  includesBaseline: boolean;
  baselineSource: string | null;
}

export interface ReviewView {
  id: string;
  kind: 'quick' | 'full';
  title: string | null;
  body: string;
  rating: number | null;
  focus: string[];
  ownership: string | null;
  wearCount: number | null;
  experience: string | null;
  gifted: boolean;
  giftNote: string | null;
  status: string;
  helpful: number;
  commentCount: number;
  createdAt: string;
  author: { handle: string; displayName: string; avatarHue: string | null; experience: string };
  fragrance?: { slug: string; name: string; brandName: string };
  isDemo: boolean;
}
