'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { AuthError, getViewer, requireViewer } from '@/lib/auth/session';
import { sql, sqlOne } from '@/lib/db';
import { refreshFragranceStats } from '@/lib/data/stats';
import { getDb } from '@/lib/db';

type Result = { ok: true; data?: unknown } | { ok: false; error: string; needsAuth?: boolean };

async function guard(fn: () => Promise<unknown>): Promise<Result> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message, needsAuth: true };
    if (e instanceof Error && e.name === 'UserError') return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: 'Something went wrong. Try again.' };
  }
}
const userError = (msg: string) => Object.assign(new Error(msg), { name: 'UserError' });

export async function toggleHelpful(reviewId: string) {
  return guard(async () => {
    const v = await requireViewer();
    const own = await sqlOne<{ user_id: string; slug: string }>(
      `select r.user_id, f.slug from public.reviews r join public.fragrances f on f.id = r.fragrance_id where r.id = $1`,
      [reviewId],
    );
    if (!own) throw userError('That review is gone.');
    if (own.user_id === v.id) throw userError('You can’t mark your own review helpful.');
    const existing = await sqlOne('select 1 from public.review_votes where review_id = $1 and user_id = $2', [reviewId, v.id]);
    if (existing) await sql('delete from public.review_votes where review_id = $1 and user_id = $2', [reviewId, v.id]);
    else await sql('insert into public.review_votes (review_id, user_id) values ($1, $2)', [reviewId, v.id]);
    const row = await sqlOne<{ helpful_count: number }>('select helpful_count from public.reviews where id = $1', [reviewId]);
    return { helpful: !existing, count: Number(row?.helpful_count ?? 0) };
  });
}

export async function myHelpfulVotes(reviewIds: string[]): Promise<string[]> {
  const v = await getViewer();
  if (!v || !reviewIds.length) return [];
  const rows = await sql<{ review_id: string }>('select review_id from public.review_votes where user_id = $1 and review_id = any($2::uuid[])', [v.id, reviewIds]);
  return rows.map((r) => r.review_id);
}

export interface ReviewFormState {
  error?: string;
}

const FOCUS = ['scent', 'performance', 'value', 'beginner', 'long_term', 'first_impression', 'comparison'];
const OWNERSHIP = ['own', 'owned', 'sample', 'decant', 'tested', 'none'];

export async function submitReview(_prev: ReviewFormState, form: FormData): Promise<ReviewFormState> {
  const viewer = await getViewer();
  const slug = String(form.get('slug') ?? '');
  if (!viewer) redirect(`/sign-in?next=/fragrance/${slug}/review`);
  const f = await sqlOne<{ id: string }>(`select id from public.fragrances where slug = $1 and visibility = 'public'`, [slug]);
  if (!f) return { error: 'That fragrance no longer exists.' };

  const kind = form.get('kind') === 'full' ? 'full' : 'quick';
  const title = String(form.get('title') ?? '').trim();
  const body = String(form.get('body') ?? '').trim();
  const rating = Number(form.get('rating'));
  const focus = form.getAll('focus').map(String).filter((x) => FOCUS.includes(x));
  const ownership = OWNERSHIP.includes(String(form.get('ownership'))) ? String(form.get('ownership')) : null;
  const gifted = form.get('gifted') === 'on';
  const giftNote = String(form.get('giftNote') ?? '').trim();

  if (kind === 'quick' && (body.length < 20 || body.length > 600)) return { error: 'A quick take is 20 to 600 characters. Two to four sentences is perfect.' };
  if (kind === 'full' && body.length < 200) return { error: 'A full review needs at least 200 characters. Switch to a quick take for something shorter.' };
  if (kind === 'full' && (title.length < 3 || title.length > 120)) return { error: 'Give your full review a title (3 to 120 characters).' };
  if (!Number.isInteger(rating) || rating < 1 || rating > 10) return { error: 'Pick a score from 1 to 10.' };
  if (gifted && giftNote.length < 3) return { error: 'Say briefly how you got it (for example “sample from the house”).' };

  const wear = await sqlOne<{ n: string }>(
    `select count(*) n from public.wear_log_items i join public.wear_logs w on w.id = i.wear_log_id where w.user_id = $1 and i.fragrance_id = $2`,
    [viewer.id, f.id],
  );
  const db = await getDb();
  await db.tx(async (q) => {
    const existing = await q.query<{ id: string }>(`select id from public.reviews where user_id = $1 and fragrance_id = $2 and status <> 'deleted'`, [viewer.id, f.id]);
    if (existing.length) {
      await q.query(
        `update public.reviews set kind = $2, title = $3, body = $4, rating_overall = $5, focus = $6::text[], ownership = $7, gifted = $8, gift_note = $9 where id = $1`,
        [existing[0].id, kind, kind === 'full' ? title : null, body, rating, focus, ownership, gifted, gifted ? giftNote : null],
      );
    } else {
      await q.query(
        `insert into public.reviews (fragrance_id, user_id, kind, title, body, rating_overall, focus, ownership, wear_count, experience_level, gifted, gift_note)
         values ($1,$2,$3,$4,$5,$6,$7::text[],$8,$9,$10,$11,$12)`,
        [f.id, viewer.id, kind, kind === 'full' ? title : null, body, rating, focus, ownership, Number(wear?.n ?? 0), viewer.experience, gifted, gifted ? giftNote : null],
      );
    }
    await q.query(
      `insert into public.ratings (user_id, fragrance_id, overall) values ($1, $2, $3) on conflict (user_id, fragrance_id) do update set overall = $3`,
      [viewer.id, f.id, rating],
    );
  });
  await refreshFragranceStats(db, f.id);
  revalidatePath(`/fragrance/${slug}`);
  redirect(`/fragrance/${slug}?reviewed=1#reviews`);
}

export async function deleteMyReview(reviewId: string) {
  return guard(async () => {
    const v = await requireViewer();
    const row = await sqlOne<{ slug: string; fid: string }>(
      `update public.reviews r set status = 'deleted', deleted_at = now() from public.fragrances f
        where r.id = $1 and r.user_id = $2 and f.id = r.fragrance_id returning f.slug, f.id as fid`,
      [reviewId, v.id],
    );
    if (!row) throw userError('That review isn’t yours to delete.');
    const db = await getDb();
    await refreshFragranceStats(db, row.fid);
    revalidatePath(`/fragrance/${row.slug}`);
  });
}

export async function reportContent(targetType: string, targetId: string, reason: string, details?: string) {
  return guard(async () => {
    const v = await requireViewer();
    const reasons = ['spam', 'abuse', 'off_topic', 'undisclosed_promotion', 'copied_content', 'wrong_data', 'other'];
    const types = ['review', 'comment', 'profile', 'list', 'asset', 'fragrance'];
    if (!reasons.includes(reason) || !types.includes(targetType)) throw userError('Pick a reason.');
    await sql(`insert into public.reports (reporter_id, target_type, target_id, reason, details) values ($1, $2, $3, $4, $5)`, [
      v.id,
      targetType,
      targetId,
      reason,
      details?.slice(0, 1000) ?? null,
    ]);
  });
}

export async function listComments(reviewId: string) {
  const rows = await sql<{ id: string; body: string; created_at: string; handle: string; display_name: string; avatar_hue: string | null }>(
    `select c.id, c.body, c.created_at, p.handle, p.display_name, p.avatar_hue from public.review_comments c join public.profiles p on p.id = c.user_id
      where c.review_id = $1 and c.status = 'published' order by c.created_at`,
    [reviewId],
  );
  return rows.map((r) => ({ ...r, created_at: new Date(r.created_at).toISOString() }));
}

export async function addComment(reviewId: string, body: string) {
  return guard(async () => {
    const v = await requireViewer();
    const text = body.trim();
    if (text.length < 2 || text.length > 2000) throw userError('Comments are 2 to 2,000 characters.');
    const r = await sqlOne<{ status: string }>('select status from public.reviews where id = $1', [reviewId]);
    if (!r || r.status !== 'published') throw userError('Comments are closed on this review.');
    await sql('insert into public.review_comments (review_id, user_id, body) values ($1, $2, $3)', [reviewId, v.id, text]);
  });
}
