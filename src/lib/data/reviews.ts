import 'server-only';
import { sql, sqlOne } from '@/lib/db';
import type { ReviewView } from './types';

export type ReviewSort = 'helpful' | 'recent' | 'highest' | 'lowest';
export interface ReviewQuery {
  sort?: ReviewSort;
  kind?: 'quick' | 'full' | null;
  focus?: string | null;
  owners?: boolean;
  page?: number;
  pageSize?: number;
}

const ORDER: Record<ReviewSort, string> = {
  helpful: 'r.helpful_count desc, r.created_at desc',
  recent: 'r.created_at desc',
  highest: 'r.rating_overall desc nulls last, r.helpful_count desc',
  lowest: 'r.rating_overall asc nulls last, r.helpful_count desc',
};

export function mapReview(r: Record<string, unknown>): ReviewView {
  const deleted = r.status === 'deleted';
  return {
    id: r.id as string,
    kind: r.kind as 'quick' | 'full',
    title: deleted ? null : ((r.title as string) ?? null),
    body: deleted ? '' : (r.body as string),
    rating: deleted ? null : r.rating_overall === null ? null : Number(r.rating_overall),
    focus: deleted ? [] : ((r.focus as string[]) ?? []),
    ownership: (r.ownership as string) ?? null,
    wearCount: r.wear_count === null || r.wear_count === undefined ? null : Number(r.wear_count),
    experience: (r.experience_level as string) ?? null,
    gifted: Boolean(r.gifted),
    giftNote: (r.gift_note as string) ?? null,
    status: r.status as string,
    helpful: Number(r.helpful_count ?? 0),
    commentCount: Number(r.comment_count ?? 0),
    createdAt: new Date(r.created_at as string).toISOString(),
    author: {
      handle: r.handle as string,
      displayName: r.display_name as string,
      avatarHue: (r.avatar_hue as string) ?? null,
      experience: r.author_experience as string,
    },
    fragrance: r.fragrance_slug ? { slug: r.fragrance_slug as string, name: r.fragrance_name as string, brandName: r.brand_name as string } : undefined,
    isDemo: Boolean(r.is_demo),
  };
}

const SELECT = `
  select r.*, p.handle, p.display_name, p.avatar_hue, p.experience_level as author_experience,
         f.slug as fragrance_slug, f.name as fragrance_name, b.name as brand_name
    from public.reviews r
    join public.profiles p on p.id = r.user_id
    join public.fragrances f on f.id = r.fragrance_id
    join public.brands b on b.id = f.brand_id`;

export async function listReviews(fragranceId: string, q: ReviewQuery = {}) {
  const where = ['r.fragrance_id = $1', `(r.status = 'published' or (r.status = 'deleted' and r.comment_count > 0))`];
  const params: unknown[] = [fragranceId];
  if (q.kind) {
    params.push(q.kind);
    where.push(`r.kind = $${params.length}`);
  }
  if (q.focus) {
    params.push(q.focus);
    where.push(`$${params.length} = any(r.focus)`);
  }
  if (q.owners) where.push(`r.ownership in ('own', 'owned')`);
  if (q.sort === 'highest' || q.sort === 'lowest') where.push(`r.status = 'published'`);
  const size = Math.min(30, q.pageSize ?? 8);
  const page = Math.max(0, q.page ?? 0);
  const [rows, counts] = await Promise.all([
    sql<Record<string, unknown>>(`${SELECT} where ${where.join(' and ')} order by ${ORDER[q.sort ?? 'helpful']} limit ${size + 1} offset ${page * size}`, params),
    sqlOne<{ total: string; quick: string; full: string; deleted: string }>(
      `select count(*) filter (where status = 'published') total,
              count(*) filter (where status = 'published' and kind = 'quick') quick,
              count(*) filter (where status = 'published' and kind = 'full') full,
              count(*) filter (where status = 'deleted') deleted
         from public.reviews where fragrance_id = $1`,
      [fragranceId],
    ),
  ]);
  // Deleted reviews never show up with empty threads; a deleted one with replies keeps its place.
  const filtered = rows.filter((r) => r.status !== 'deleted' || Number(r.comment_count) > 0);
  return {
    reviews: filtered.slice(0, size).map(mapReview),
    hasMore: rows.length > size,
    counts: { total: Number(counts?.total ?? 0), quick: Number(counts?.quick ?? 0), full: Number(counts?.full ?? 0) },
  };
}

export async function recentReviews(limit = 6, opts: { minLength?: number } = {}) {
  const rows = await sql<Record<string, unknown>>(
    `${SELECT} where r.status = 'published' and char_length(r.body) >= $1 order by r.created_at desc limit $2`,
    [opts.minLength ?? 0, limit],
  );
  return rows.map(mapReview);
}

export async function reviewsByUser(userId: string, limit = 20) {
  const rows = await sql<Record<string, unknown>>(`${SELECT} where r.user_id = $1 and r.status = 'published' order by r.created_at desc limit $2`, [userId, limit]);
  return rows.map(mapReview);
}

export async function getReview(id: string) {
  const row = await sqlOne<Record<string, unknown>>(`${SELECT} where r.id = $1`, [id]);
  return row ? mapReview(row) : null;
}
