import 'server-only';
import { sql, sqlOne } from '@/lib/db';
import { DIMENSIONS, type Dimension } from '@/lib/scent/vocab';
import { getCardsByIds } from './catalog';
import type { FragranceCard, Vec } from './types';

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

export interface ShelfInsights {
  ownedCount: number;
  character: Vec;
  topNotes: Array<{ slug: string; name: string; count: number }>;
  houses: Array<{ slug: string; name: string; count: number }>;
  perfumers: Array<{ slug: string; name: string; count: number }>;
  seasons: Record<string, number>;
  avgLongevity: number | null;
  mostWorn: ShelfItem[];
  neglected: ShelfItem[];
  sentences: string[];
  spent: number | null;
}

/**
 * Collection intelligence. Written to describe, not diagnose: counts and leanings you can check
 * yourself, never guesses about who you are.
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
            where fp.fragrance_id = any($1::uuid[]) group by p.slug, p.name order by n desc, p.name limit 5`,
          [ids],
        ),
        sql<{ wear: Record<string, number> }>(`select wear from public.fragrance_stats where fragrance_id = any($1::uuid[])`, [ids]),
      ])
    : [[], [], []];

  const character: Vec = {};
  for (const d of DIMENSIONS) {
    const v = owned.reduce((s, i) => s + (i.card.character.overall[d as Dimension] ?? 0), 0) / Math.max(1, owned.length);
    if (v > 0.02) character[d] = v;
  }
  const seasons: Record<string, number> = {};
  for (const s of ['spring', 'summer', 'autumn', 'winter']) seasons[s] = wear.reduce((a, w) => a + (w.wear[s] ?? 0), 0) / Math.max(1, wear.length);
  const houses = new Map<string, { slug: string; name: string; count: number }>();
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

  const sentences: string[] = [];
  const topNote = notes[0];
  if (topNote && Number(topNote.n) >= 2) sentences.push(`You own ${topNote.n} fragrances featuring ${topNote.name.toLowerCase()}.`);
  const warm = seasons.winter + seasons.autumn;
  const bright = seasons.summer + seasons.spring;
  if (owned.length >= 4 && Math.abs(warm - bright) > 0.25)
    sentences.push(warm > bright ? 'Your shelf leans toward cold weather.' : 'Your shelf leans toward warm weather.');
  const topHouse = [...houses.values()].sort((a, b) => b.count - a.count)[0];
  if (topHouse && topHouse.count >= 3) sentences.push(`${topHouse.name} is the house you own most from (${topHouse.count}).`);
  if (neglected.length && owned.length >= 3) sentences.push(`${neglected.length} of your bottles haven’t been worn in three months or more.`);
  const paid = owned.map((i) => i.pricePaid).filter((x): x is number => x !== null);

  return {
    ownedCount: owned.length,
    character,
    topNotes: notes.map((n) => ({ slug: n.slug, name: n.name, count: Number(n.n) })),
    houses: [...houses.values()].sort((a, b) => b.count - a.count).slice(0, 5),
    perfumers: perfumers.map((p) => ({ slug: p.slug, name: p.name, count: Number(p.n) })),
    seasons,
    avgLongevity: lon.length ? lon.reduce((a, b) => a + b, 0) / lon.length : null,
    mostWorn: [...owned].filter((i) => i.wears > 0).sort((a, b) => b.wears - a.wears).slice(0, 3),
    neglected: neglected.slice(0, 3),
    sentences,
    spent: paid.length ? paid.reduce((a, b) => a + b, 0) : null,
  };
}
