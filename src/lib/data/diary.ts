import 'server-only';
import { sql } from '@/lib/db';

export interface DiaryItem {
  slug: string;
  name: string;
  brand: string;
  accent: string;
  poster: string | null;
  blur: string | null;
  sprays: number | null;
}

export interface DiaryEntry {
  id: string;
  date: string; // YYYY-MM-DD
  weather: string | null;
  occasion: string | null;
  note: string | null;
  items: DiaryItem[];
}

/** One running header's worth of entries: Monday to Sunday, newest week first. */
export interface DiaryWeek {
  /** The Monday, YYYY-MM-DD. */
  start: string;
  wears: number;
  bottles: number;
  entries: DiaryEntry[];
}

/** A bottle on the shelf, as the log sheet and the "due a wear" observation see it. */
export interface ShelfOption {
  slug: string;
  name: string;
  brand: string;
  accent: string;
  poster: string | null;
  blur: string | null;
  status: string;
  lastWorn: string | null;
  wears: number;
}

/**
 * One of up to three sentences in the "This month" aside. Each has a threshold so the diary
 * never states a pattern it has not seen enough of; the name is kept apart so it can be set in
 * italic where the sentence is read.
 */
export interface DiaryObservation {
  kind: 'most-worn' | 'weather' | 'occasion' | 'due';
  before: string;
  name: string;
  slug: string;
  after: string;
}

export const DIARY_WINDOW_DAYS = 140;

export async function getDiary(userId: string, days = DIARY_WINDOW_DAYS): Promise<DiaryEntry[]> {
  const rows = await sql<Record<string, unknown>>(
    `select w.id, w.worn_on::text as d, w.weather, w.occasion, w.note,
            json_agg(json_build_object('slug', f.slug, 'name', f.name, 'brand', b.name, 'accent', f.accent_hex, 'poster', a.url,
                                       'blur', to_jsonb(a) ->> 'blur_data', 'sprays', i.sprays) order by i.position) items
       from public.wear_logs w
       join public.wear_log_items i on i.wear_log_id = w.id
       join public.fragrances f on f.id = i.fragrance_id
       join public.brands b on b.id = f.brand_id
       left join public.fragrance_primary_image a on a.fragrance_id = f.id
      where w.user_id = $1 and w.worn_on > current_date - $2::int
      group by w.id order by w.worn_on desc, w.created_at desc`,
    [userId, days],
  );
  return rows.map((r) => {
    const items = (typeof r.items === 'string' ? JSON.parse(r.items) : r.items) as Array<Record<string, unknown>>;
    return {
      id: r.id as string,
      date: r.d as string,
      weather: (r.weather as string) ?? null,
      occasion: (r.occasion as string) ?? null,
      note: (r.note as string) ?? null,
      items: items.map((i) => ({
        slug: i.slug as string,
        name: i.name as string,
        brand: i.brand as string,
        accent: i.accent as string,
        poster: (i.poster as string) ?? null,
        blur: typeof i.blur === 'string' && i.blur.startsWith('data:image/') ? i.blur : null,
        sprays: (i.sprays as number) ?? null,
      })),
    };
  });
}

/* Owned, testing and sampled bottles, favourites first, with when each was last worn. */
export async function shelfOptions(userId: string): Promise<ShelfOption[]> {
  const rows = await sql<Record<string, unknown>>(
    `select f.slug, f.name, b.name brand, f.accent_hex accent, a.url poster, to_jsonb(a) ->> 'blur_data' blur, i.status,
            (select max(w.worn_on)::text from public.wear_logs w join public.wear_log_items wi on wi.wear_log_id = w.id
              where w.user_id = c.user_id and wi.fragrance_id = f.id) last_worn,
            (select count(*) from public.wear_logs w join public.wear_log_items wi on wi.wear_log_id = w.id
              where w.user_id = c.user_id and wi.fragrance_id = f.id) wears
       from public.collection_items i join public.collections c on c.id = i.collection_id and c.kind = 'main'
       join public.fragrances f on f.id = i.fragrance_id join public.brands b on b.id = f.brand_id
       left join public.fragrance_primary_image a on a.fragrance_id = f.id
      where c.user_id = $1 and i.status in ('own', 'testing', 'sampled')
      order by i.is_favorite desc, f.name`,
    [userId],
  );
  return rows.map((r) => ({
    slug: r.slug as string,
    name: r.name as string,
    brand: r.brand as string,
    accent: r.accent as string,
    poster: (r.poster as string) ?? null,
    blur: typeof r.blur === 'string' && r.blur.startsWith('data:image/') ? r.blur : null,
    status: r.status as string,
    lastWorn: (r.last_worn as string) ?? null,
    wears: Number(r.wears ?? 0),
  }));
}

const DAY = 86400000;
const toDate = (d: string) => new Date(`${d}T12:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY);

/** The Monday on or before a date. */
export function weekStart(date: string): string {
  const d = toDate(date);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return iso(d);
}

/** Entries arrive newest first; the weeks keep that order and each counts its wears and distinct bottles. */
export function groupByWeek(entries: DiaryEntry[]): DiaryWeek[] {
  const weeks: DiaryWeek[] = [];
  for (const e of entries) {
    const start = weekStart(e.date);
    let w = weeks[weeks.length - 1];
    if (!w || w.start !== start) {
      w = { start, wears: 0, bottles: 0, entries: [] };
      weeks.push(w);
    }
    w.entries.push(e);
  }
  for (const w of weeks) {
    w.wears = w.entries.length;
    w.bottles = new Set(w.entries.flatMap((e) => e.items.map((i) => i.slug))).size;
  }
  return weeks;
}

const WEATHER_PHRASE: Record<string, string> = {
  hot: 'hot-weather pick',
  warm: 'warm-weather pick',
  mild: 'mild-weather pick',
  cool: 'cool-weather pick',
  cold: 'cold-weather pick',
  rain: 'rainy-day pick',
  humid: 'humid-day pick',
};
const OCCASION_PHRASE: Record<string, string> = {
  office: 'office pick',
  school: 'school pick',
  casual: 'everyday pick',
  date: 'date-night pick',
  nightlife: 'night-out pick',
  formal: 'formal pick',
  special: 'pick for occasions',
  outdoors: 'outdoors pick',
  home: 'at-home pick',
};
/* "5 of 6 cold wears", "4 of 5 office wears": the condition as an adjective before "wears". */
const CONDITION_ADJ: Record<string, string> = {
  rain: 'rainy',
  casual: 'casual',
  date: 'date-night',
  nightlife: 'night-out',
  special: 'special-occasion',
  outdoors: 'outdoor',
  home: 'at-home',
};

/**
 * Up to three observations, each gated: the most-worn line needs five days of one fragrance in
 * the last 45; a weather or occasion pick needs four logged wears in that condition and one
 * fragrance on at least half of them; "due a wear" needs an owned bottle untouched for two weeks
 * and at least five wears in the diary overall, so a newcomer is not nagged on day one.
 */
export function diaryObservations(entries: DiaryEntry[], shelf: ShelfOption[], today: string): DiaryObservation[] {
  const out: DiaryObservation[] = [];

  const recent = entries.filter((e) => daysBetween(e.date, today) < 45);
  const daysBy = new Map<string, { name: string; days: Set<string> }>();
  for (const e of recent)
    for (const i of e.items) {
      const cur = daysBy.get(i.slug) ?? { name: i.name, days: new Set<string>() };
      cur.days.add(e.date);
      daysBy.set(i.slug, cur);
    }
  const most = [...daysBy.entries()].sort((a, b) => b[1].days.size - a[1].days.size)[0];
  if (most && most[1].days.size >= 5) {
    const span = Math.min(45, recent.length ? daysBetween(recent[recent.length - 1].date, today) + 1 : 45);
    out.push({ kind: 'most-worn', before: '', name: most[1].name, slug: most[0], after: ` on ${most[1].days.size} of the last ${span} days.` });
  }

  // The strongest conditional habit across weather and occasion, one sentence only.
  type Pick = { kind: 'weather' | 'occasion'; key: string; phrase: string; slug: string; name: string; n: number; of: number; share: number };
  let best: Pick | null = null;
  const consider = (kind: 'weather' | 'occasion', phrases: Record<string, string>, key: (e: DiaryEntry) => string | null) => {
    const groups = new Map<string, DiaryEntry[]>();
    for (const e of entries) {
      const k = key(e);
      if (k) groups.set(k, [...(groups.get(k) ?? []), e]);
    }
    for (const [k, es] of groups) {
      if (es.length < 4) continue;
      const counts = new Map<string, { name: string; n: number }>();
      for (const e of es) for (const i of e.items) counts.set(i.slug, { name: i.name, n: (counts.get(i.slug)?.n ?? 0) + 1 });
      const [slug, top] = [...counts.entries()].sort((a, b) => b[1].n - a[1].n)[0];
      const share = top.n / es.length;
      if (share < 0.5 || (slug === most?.[0] && out.length)) continue;
      if (!best || share > best.share || (share === best.share && top.n > best.n)) {
        best = { kind, key: k, phrase: phrases[k] ?? `${k} pick`, slug, name: top.name, n: top.n, of: es.length, share };
      }
    }
  };
  consider('weather', WEATHER_PHRASE, (e) => e.weather);
  consider('occasion', OCCASION_PHRASE, (e) => e.occasion);
  if (best) {
    const b: Pick = best;
    out.push({ kind: b.kind, before: '', name: b.name, slug: b.slug, after: ` is your ${b.phrase}, ${b.n} of ${b.of} ${CONDITION_ADJ[b.key] ?? b.key} wears.` });
  }

  if (entries.length >= 5) {
    const owned = shelf.filter((o) => o.status === 'own');
    const due = owned
      .map((o) => ({ o, gap: o.lastWorn ? daysBetween(o.lastWorn, today) : Infinity }))
      .filter((x) => x.gap >= 14)
      .sort((a, b) => b.gap - a.gap)[0];
    if (due) {
      out.push({
        kind: 'due',
        before: 'Due a wear: ',
        name: due.o.name,
        slug: due.o.slug,
        after: due.gap === Infinity ? ', never logged.' : `, ${due.gap} days.`,
      });
    }
  }
  return out.slice(0, 3);
}
