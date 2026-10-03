import 'server-only';
import { sql } from '@/lib/db';

export interface DiaryEntry {
  id: string;
  date: string; // YYYY-MM-DD
  weather: string | null;
  occasion: string | null;
  note: string | null;
  items: Array<{ slug: string; name: string; brand: string; accent: string; poster: string | null; sprays: number | null }>;
}

export async function getDiary(userId: string, days = 140): Promise<DiaryEntry[]> {
  const rows = await sql<Record<string, unknown>>(
    `select w.id, w.worn_on::text as d, w.weather, w.occasion, w.note,
            json_agg(json_build_object('slug', f.slug, 'name', f.name, 'brand', b.name, 'accent', f.accent_hex, 'poster', a.url, 'sprays', i.sprays) order by i.position) items
       from public.wear_logs w
       join public.wear_log_items i on i.wear_log_id = w.id
       join public.fragrances f on f.id = i.fragrance_id
       join public.brands b on b.id = f.brand_id
       left join public.fragrance_assets a on a.fragrance_id = f.id and a.kind = 'poster' and a.is_primary
      where w.user_id = $1 and w.worn_on > current_date - $2::int
      group by w.id order by w.worn_on desc, w.created_at desc`,
    [userId, days],
  );
  return rows.map((r) => ({
    id: r.id as string,
    date: r.d as string,
    weather: (r.weather as string) ?? null,
    occasion: (r.occasion as string) ?? null,
    note: (r.note as string) ?? null,
    items: (typeof r.items === 'string' ? JSON.parse(r.items) : r.items) as DiaryEntry['items'],
  }));
}

export async function shelfOptions(userId: string) {
  return sql<{ slug: string; name: string; brand: string; poster: string | null; status: string }>(
    `select f.slug, f.name, b.name brand, a.url poster, i.status
       from public.collection_items i join public.collections c on c.id = i.collection_id and c.kind = 'main'
       join public.fragrances f on f.id = i.fragrance_id join public.brands b on b.id = f.brand_id
       left join public.fragrance_assets a on a.fragrance_id = f.id and a.kind = 'poster' and a.is_primary
      where c.user_id = $1 and i.status in ('own', 'testing', 'sampled')
      order by i.is_favorite desc, f.name`,
    [userId],
  );
}
