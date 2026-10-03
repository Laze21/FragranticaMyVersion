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

/** A review cut down to a pull quote: what the home page reads from "What people are saying". */
export interface ReviewExcerpt {
  id: string;
  kind: 'quick' | 'full';
  /** The first `chars` of the body, cut at a word and ended with an ellipsis when it was cut. */
  excerpt: string;
  rating: number | null;
  createdAt: string;
  author: { handle: string; displayName: string; avatarHue: string | null };
  fragrance: { slug: string; name: string; brandName: string; accent: string; poster: string | null; posterAlt: string | null };
  isDemo: boolean;
}

/** Cut at the last word boundary before `max`, so a quote never ends mid-word. */
export function excerptOf(body: string, max = 180): string {
  const text = body.replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const at = cut.lastIndexOf(' ');
  return `${cut.slice(0, at > max * 0.6 ? at : max).replace(/[,;:.!?]$/, '')}…`;
}

/**
 * The newest substantial reviews as excerpts. Only reviews long enough to have said something
 * (`minLength`, 300 characters by default) qualify, one per fragrance, so three quotes are three
 * fragrances. The caller decides what to do with fewer than it asked for; the home page renders
 * nothing below three.
 */
export async function recentReviewExcerpts(limit = 3, opts: { minLength?: number; chars?: number } = {}): Promise<ReviewExcerpt[]> {
  const rows = await sql<Record<string, unknown>>(
    `select distinct on (r.fragrance_id) r.id, r.kind, r.body, r.rating_overall, r.created_at, r.is_demo,
            p.handle, p.display_name, p.avatar_hue,
            f.slug as fragrance_slug, f.name as fragrance_name, f.accent_hex, b.name as brand_name, a.url as poster, a.alt as poster_alt
       from public.reviews r
       join public.profiles p on p.id = r.user_id
       join public.fragrances f on f.id = r.fragrance_id
       join public.brands b on b.id = f.brand_id
       left join public.fragrance_primary_image a on a.fragrance_id = f.id
      where r.status = 'published' and f.visibility = 'public' and char_length(r.body) >= $1
      order by r.fragrance_id, r.created_at desc`,
    [opts.minLength ?? 300],
  );
  return rows
    .sort((x, y) => new Date(y.created_at as string).getTime() - new Date(x.created_at as string).getTime())
    .slice(0, limit)
    .map((r) => ({
      id: r.id as string,
      kind: r.kind as 'quick' | 'full',
      excerpt: excerptOf(r.body as string, opts.chars ?? 180),
      rating: r.rating_overall === null || r.rating_overall === undefined ? null : Number(r.rating_overall),
      createdAt: new Date(r.created_at as string).toISOString(),
      author: { handle: r.handle as string, displayName: r.display_name as string, avatarHue: (r.avatar_hue as string) ?? null },
      fragrance: {
        slug: r.fragrance_slug as string,
        name: r.fragrance_name as string,
        brandName: r.brand_name as string,
        accent: (r.accent_hex as string) ?? '#9a8f80',
        poster: (r.poster as string) ?? null,
        posterAlt: (r.poster_alt as string) ?? null,
      },
      isDemo: Boolean(r.is_demo),
    }));
}

export async function reviewsByUser(userId: string, limit = 20) {
  const rows = await sql<Record<string, unknown>>(`${SELECT} where r.user_id = $1 and r.status = 'published' order by r.created_at desc limit $2`, [userId, limit]);
  return rows.map(mapReview);
}

export async function getReview(id: string) {
  const row = await sqlOne<Record<string, unknown>>(`${SELECT} where r.id = $1`, [id]);
  return row ? mapReview(row) : null;
}
