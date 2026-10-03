import 'server-only';
import { sql, sqlOne } from '@/lib/db';
import { DIMENSIONS, type Dimension } from '@/lib/scent/vocab';
import type { TrailInput } from '@/lib/scent/trail';
import { getCardsByIds } from './catalog';
import type { Character, FragranceCard, Vec } from './types';

export interface ShelfItem {
  card: FragranceCard;
  status: string;
  favorite: boolean;
  format: string | null;
  sizeMl: number | null;
  fill: number | null;
  batchCode: string | null;
  pricePaid: number | null;
  notes: string | null;
  addedAt: string;
  wears: number;
  lastWorn: string | null;
}

export async function getProfileByHandle(handle: string) {
  return sqlOne<Record<string, unknown>>(`select * from public.profiles where lower(handle) = lower($1) and deleted_at is null`, [handle]);
}

export async function getShelf(userId: string): Promise<ShelfItem[]> {
  const rows = await sql<Record<string, unknown>>(
    `select i.*, (select count(*) from public.wear_log_items wi join public.wear_logs w on w.id = wi.wear_log_id where w.user_id = c.user_id and wi.fragrance_id = i.fragrance_id) wears,
            (select max(w.worn_on)::text from public.wear_log_items wi join public.wear_logs w on w.id = wi.wear_log_id where w.user_id = c.user_id and wi.fragrance_id = i.fragrance_id) last_worn
       from public.collection_items i join public.collections c on c.id = i.collection_id
      where c.user_id = $1 and c.kind = 'main'
      order by i.created_at desc`,
    [userId],
  );
  const cards = await getCardsByIds(rows.map((r) => r.fragrance_id as string));
  const byId = new Map(cards.map((c) => [c.id, c]));
  return rows
    .filter((r) => byId.has(r.fragrance_id as string))
    .map((r) => ({
      card: byId.get(r.fragrance_id as string)!,
      status: r.status as string,
      favorite: Boolean(r.is_favorite),
      format: (r.format as string) ?? null,
      sizeMl: r.size_ml === null ? null : Number(r.size_ml),
      fill: r.fill_level === null ? null : Number(r.fill_level),
      batchCode: (r.batch_code as string) ?? null,
      pricePaid: r.price_paid === null ? null : Number(r.price_paid),
      notes: (r.notes as string) ?? null,
      addedAt: new Date(r.created_at as string).toISOString(),
      wears: Number(r.wears ?? 0),
      lastWorn: (r.last_worn as string) ?? null,
    }));
}

export interface Counted {
  slug: string;
  name: string;
  count: number;
}

export interface ShelfInsights {
  ownedCount: number;
  character: Vec;
  /** The shelf as one Trail: averaged character, median longevity, mean projection. Null below one bottle. */
  trail: TrailInput | null;
  /** Only things that repeat (count >= 2, or 10% of a shelf over 20). A count of one is not a habit. */
  topNotes: Counted[];
  houses: Counted[];
  perfumers: Counted[];
  /** How many distinct houses and perfumers the shelf spans, for the "no repeats yet" sentence. */
  distinct: { houses: number; perfumers: number };
  /** "Three houses, three perfumers, no repeats yet." when none of the three lists qualifies. */
  noRepeats: string | null;
  seasons: Record<string, number>;
  /** One-line reading of the seasons ("Leans autumn and winter"); null when they are all much the same. */
  seasonsLine: string | null;
  /** max - min of the four season shares; under 0.15 the glyph says nothing the sentence does not. */
  seasonsSpread: number;
  avgLongevity: number | null;
  mostWorn: ShelfItem[];
  neglected: ShelfItem[];
  sentences: string[];
  /** Dollars recorded, over the bottles with a price. */
  spent: number | null;
  spentCount: number;
  /** Recorded price over logged wears, for the bottles that have both. */
  costPerWear: number | null;
}

/** Threshold for a note, house or perfumer to count as a habit rather than a one-off. */
export function repeatThreshold(owned: number): number {
  return owned > 20 ? Math.max(2, Math.ceil(owned * 0.1)) : 2;
}

const SEASON_NAMES: Record<string, string> = { spring: 'spring', summer: 'summer', autumn: 'autumn', winter: 'winter' };

/**
 * "Leans autumn and winter": the seasons within 0.1 of the strongest. Null when the four shares
 * sit within 0.15 of each other, so the caller prints a sentence instead of a glyph.
 */
export function readSeasons(seasons: Record<string, number>): { line: string | null; spread: number } {
  const vals = ['spring', 'summer', 'autumn', 'winter'].map((s) => seasons[s] ?? 0);
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const spread = max - min;
  if (max === 0) return { line: null, spread: 0 };
  if (spread < 0.15) return { line: null, spread };
  const lead = ['spring', 'summer', 'autumn', 'winter'].filter((s) => (seasons[s] ?? 0) >= max - 0.1).map((s) => SEASON_NAMES[s]);
  const list = lead.length > 1 ? `${lead.slice(0, -1).join(', ')} and ${lead.at(-1)}` : lead[0];
  return { line: `Leans ${list}`, spread };
}

function meanVec(vecs: Vec[]): Vec {
  const out: Vec = {};
  if (!vecs.length) return out;
  for (const d of DIMENSIONS) {
    const v = vecs.reduce((s, vec) => s + (vec[d as Dimension] ?? 0), 0) / vecs.length;
    if (v > 0.02) out[d] = v;
  }
  return out;
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function percentile(xs: number[], p: number): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.round((s.length - 1) * p))];
}

function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

/** The shelf's own Trail: every owned bottle's character averaged, drawn on one ruler. */
export function shelfTrail(cards: FragranceCard[]): TrailInput | null {
  if (!cards.length) return null;
  const character: Character = {
    overall: meanVec(cards.map((c) => c.character.overall)),
    opening: meanVec(cards.map((c) => c.character.opening)),
    heart: meanVec(cards.map((c) => c.character.heart)),
    drydown: meanVec(cards.map((c) => c.character.drydown)),
  };
  const lon = cards.map((c) => c.longevityHrs).filter((x): x is number => x !== null);
  return {
    character,
    longevityHrs: median(lon),
    longevityLateHrs: percentile(lon, 0.72),
    projectionOpening: mean(cards.map((c) => c.projectionOpening).filter((x): x is number => x !== null)),
    projectionLater: mean(cards.map((c) => c.projectionLater).filter((x): x is number => x !== null)),
    heartAtMin: Math.round(mean(cards.map((c) => c.heartAtMin)) ?? 20),
    drydownAtMin: Math.round(mean(cards.map((c) => c.drydownAtMin)) ?? 150),
  };
}

/**
 * Collection intelligence. Written to describe, not diagnose: counts and leanings you can check
 * yourself, never guesses about who you are. Lists are thresholded like the sentences: one of
 * something is not a thing you keep coming back to.
 */
export async function shelfInsights(items: ShelfItem[]): Promise<ShelfInsights> {
  const owned = items.filter((i) => i.status === 'own');
  const ids = owned.map((i) => i.card.id);
  const [notes, perfumers, wear] = ids.length
    ? await Promise.all([
        sql<{ slug: string; name: string; n: string }>(
          `select n.slug, n.name, count(distinct x.fid) n from (
             select fn.fragrance_id fid, fn.note_id from public.fragrance_notes fn where fn.fragrance_id = any($1::uuid[])
             union
             select s.fragrance_id, n2.id from public.fragrance_stats s cross join lateral jsonb_each_text(s.perceived) p(k, v)
               join public.notes n2 on n2.slug = p.k where s.fragrance_id = any($1::uuid[]) and p.v::numeric >= 0.4
           ) x join public.notes n on n.id = x.note_id where n.kind <> 'descriptor'
           group by n.slug, n.name order by n desc, n.name limit 8`,
          [ids],
        ),
        sql<{ slug: string; name: string; n: string }>(
          `select p.slug, p.name, count(*) n from public.fragrance_perfumers fp join public.perfumers p on p.id = fp.perfumer_id
            where fp.fragrance_id = any($1::uuid[]) group by p.slug, p.name order by n desc, p.name`,
          [ids],
        ),
        sql<{ wear: Record<string, number> }>(`select wear from public.fragrance_stats where fragrance_id = any($1::uuid[])`, [ids]),
      ])
    : [[], [], []];

  const character = meanVec(owned.map((i) => i.card.character.overall));
  const seasons: Record<string, number> = {};
  for (const s of ['spring', 'summer', 'autumn', 'winter']) seasons[s] = wear.reduce((a, w) => a + (w.wear[s] ?? 0), 0) / Math.max(1, wear.length);
  const houses = new Map<string, Counted>();
  for (const i of owned) {
    const h = houses.get(i.card.brandSlug) ?? { slug: i.card.brandSlug, name: i.card.brandName, count: 0 };
    h.count++;
    houses.set(i.card.brandSlug, h);
  }
  const lon = owned.map((i) => i.card.longevityHrs).filter((x): x is number => x !== null);
  const now = Date.now();
  const neglected = owned
    .filter((i) => !i.lastWorn || now - new Date(i.lastWorn).getTime() > 90 * 86400000)
    .sort((a, b) => (a.lastWorn ? new Date(a.lastWorn).getTime() : 0) - (b.lastWorn ? new Date(b.lastWorn).getTime() : 0));

  const min = repeatThreshold(owned.length);
  const allNotes = notes.map((n) => ({ slug: n.slug, name: n.name, count: Number(n.n) }));
  const allPerfumers = perfumers.map((p) => ({ slug: p.slug, name: p.name, count: Number(p.n) }));
  const housesSorted = [...houses.values()].sort((a, b) => b.count - a.count);

  const sentences: string[] = [];
  const topNote = allNotes[0];
  if (topNote && topNote.count >= 2) sentences.push(`You own ${topNote.count} fragrances featuring ${topNote.name.toLowerCase()}.`);
  const topHouse = housesSorted[0];
  if (topHouse && topHouse.count >= 3) sentences.push(`Mostly ${topHouse.name}: ${topHouse.count} of your bottles.`);
  if (neglected.length && owned.length >= 3) sentences.push(`${neglected.length} of your bottles haven’t been worn in three months or more.`);

  const priced = owned.filter((i) => i.pricePaid !== null);
  const spent = priced.length ? priced.reduce((a, i) => a + (i.pricePaid ?? 0), 0) : null;
  const wornAndPriced = priced.filter((i) => i.wears > 0);
  const paidForWorn = wornAndPriced.reduce((a, i) => a + (i.pricePaid ?? 0), 0);
  const wearsOfPriced = wornAndPriced.reduce((a, i) => a + i.wears, 0);
  const read = readSeasons(seasons);
  const topNotes = allNotes.filter((n) => n.count >= min).slice(0, 6);
  const topHouses = housesSorted.filter((h) => h.count >= min).slice(0, 5);
  const topPerfumers = allPerfumers.filter((p) => p.count >= min).slice(0, 5);
  const distinct = { houses: houses.size, perfumers: allPerfumers.length };

  return {
    ownedCount: owned.length,
    character,
    trail: shelfTrail(owned.map((i) => i.card)),
    topNotes,
    houses: topHouses,
    perfumers: topPerfumers,
    distinct,
    noRepeats: owned.length && !topNotes.length && !topHouses.length && !topPerfumers.length ? noRepeatsLine({ distinct }) : null,
    seasons,
    seasonsLine: read.line,
    seasonsSpread: read.spread,
    avgLongevity: lon.length ? lon.reduce((a, b) => a + b, 0) / lon.length : null,
    mostWorn: [...owned].filter((i) => i.wears > 0).sort((a, b) => b.wears - a.wears).slice(0, 3),
    neglected: neglected.slice(0, 3),
    sentences,
    spent,
    spentCount: priced.length,
    costPerWear: wearsOfPriced ? paidForWorn / wearsOfPriced : null,
  };
}

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const word = (n: number) => (n < WORDS.length ? WORDS[n] : String(n));

/**
 * The person in one sentence, for the profile header and the share card:
 * "3 bottles, a soft spot for ambroxan, lately mostly Sauvage."
 */
export function identityLine(s: Pick<ShelfInsights, 'ownedCount' | 'topNotes' | 'houses'>, latest: string | null): string | null {
  if (!s.ownedCount) return null;
  const parts = [`${s.ownedCount} ${s.ownedCount === 1 ? 'bottle' : 'bottles'}`];
  if (s.topNotes[0]) parts.push(`a soft spot for ${s.topNotes[0].name.toLowerCase()}`);
  else if (s.houses[0]) parts.push(`mostly ${s.houses[0].name}`);
  if (latest) parts.push(`lately mostly ${latest}`);
  return `${parts.join(', ')}.`;
}

/** "Three houses, three perfumers, no repeats yet." for a shelf where nothing recurs. */
export function noRepeatsLine(s: Pick<ShelfInsights, 'distinct'>): string {
  const h = s.distinct.houses;
  const p = s.distinct.perfumers;
  const cap = (t: string) => t[0].toUpperCase() + t.slice(1);
  const houses = `${cap(word(h))} ${h === 1 ? 'house' : 'houses'}`;
  const perfumers = p ? `${word(p)} ${p === 1 ? 'perfumer' : 'perfumers'}` : null;
  return [houses, perfumers, 'no repeats yet'].filter(Boolean).join(', ') + '.';
}
