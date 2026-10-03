'use server';

import { revalidatePath } from 'next/cache';
import { AuthError, getViewer, mainCollectionId, requireViewer } from '@/lib/auth/session';
import { getDb, sql, sqlOne } from '@/lib/db';
import { refreshFragranceStats } from '@/lib/data/stats';
import { DIMENSIONS, WEAR_CONTEXTS, COLLECTION_STATUSES, LONGEVITY_BUCKETS } from '@/lib/scent/vocab';

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string; needsAuth?: boolean };

async function guard<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message, needsAuth: !(await getViewer()) };
    if (e instanceof UserError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: 'Something went wrong saving that. Try again.' };
  }
}
class UserError extends Error {}

async function fragranceId(slug: string): Promise<string> {
  const row = await sqlOne<{ id: string }>(`select id from public.fragrances where slug = $1 and visibility = 'public'`, [slug]);
  if (!row) throw new UserError('That fragrance no longer exists.');
  return row.id;
}

async function afterVote(fid: string, slug: string) {
  const db = await getDb();
  await refreshFragranceStats(db, fid);
  revalidatePath(`/fragrance/${slug}`);
}

// ---------------------------------------------------------------------------
// Shelf
// ---------------------------------------------------------------------------
export async function setShelfStatus(slug: string, status: string | null, opts: { favorite?: boolean; format?: string } = {}) {
  return guard(async () => {
    const v = await requireViewer();
    const fid = await fragranceId(slug);
    const cid = await mainCollectionId(v.id);
    if (status === null) {
      await sql('delete from public.collection_items where collection_id = $1 and fragrance_id = $2', [cid, fid]);
    } else {
      if (!COLLECTION_STATUSES.some((s) => s.key === status)) throw new UserError('Unknown shelf status.');
      const format = opts.format ?? (status === 'own' ? 'bottle' : status === 'testing' || status === 'sampled' ? 'sample' : null);
      await sql(
        `insert into public.collection_items (collection_id, fragrance_id, status, is_favorite, format)
         values ($1, $2, $3, coalesce($4, false), $5)
         on conflict (collection_id, fragrance_id) do update set status = excluded.status,
           is_favorite = coalesce($4, public.collection_items.is_favorite),
           format = coalesce(public.collection_items.format, excluded.format)`,
        [cid, fid, status, opts.favorite ?? null, format],
      );
    }
    await afterVote(fid, slug);
    revalidatePath('/shelf');
    return { status };
  });
}

export async function setFavorite(slug: string, favorite: boolean) {
  return guard(async () => {
    const v = await requireViewer();
    const fid = await fragranceId(slug);
    const cid = await mainCollectionId(v.id);
    const rows = await sql(
      `update public.collection_items set is_favorite = $3 where collection_id = $1 and fragrance_id = $2 returning id`,
      [cid, fid, favorite],
    );
    if (!rows.length) {
      await sql(`insert into public.collection_items (collection_id, fragrance_id, status, is_favorite, format) values ($1, $2, 'own', $3, 'bottle')`, [cid, fid, favorite]);
    }
    revalidatePath('/shelf');
    return { favorite };
  });
}

export async function updateShelfItem(slug: string, patch: { format?: string | null; sizeMl?: number | null; fill?: number | null; batchCode?: string | null; pricePaid?: number | null; notes?: string | null }) {
  return guard(async () => {
    const v = await requireViewer();
    const fid = await fragranceId(slug);
    const cid = await mainCollectionId(v.id);
    if (patch.format && !['bottle', 'decant', 'sample', 'mini', 'travel'].includes(patch.format)) throw new UserError('Unknown format.');
    await sql(
      `update public.collection_items set format = $3, size_ml = $4, fill_level = $5, batch_code = $6, price_paid = $7, notes = $8,
              currency = case when $7::numeric is not null then 'USD' else currency end
        where collection_id = $1 and fragrance_id = $2`,
      [cid, fid, patch.format ?? null, patch.sizeMl ?? null, patch.fill ?? null, patch.batchCode?.slice(0, 40) ?? null, patch.pricePaid ?? null, patch.notes?.slice(0, 1000) ?? null],
    );
    revalidatePath('/shelf');
  });
}

// ---------------------------------------------------------------------------
// Wear diary
// ---------------------------------------------------------------------------
export async function logWear(input: { slugs: string[]; date?: string; sprays?: Record<string, number>; weather?: string | null; occasion?: string | null; note?: string | null }) {
  return guard(async () => {
    const v = await requireViewer();
    if (!input.slugs.length || input.slugs.length > 4) throw new UserError('Pick between one and four fragrances.');
    const date = input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : new Date().toISOString().slice(0, 10);
    if (new Date(date).getTime() > Date.now() + 86400000) throw new UserError('That date is in the future.');
    const weathers = ['hot', 'warm', 'mild', 'cool', 'cold', 'rain', 'humid'];
    const occasions = ['office', 'school', 'date', 'formal', 'casual', 'nightlife', 'special', 'outdoors', 'home'];
    const db = await getDb();
    const ids = await Promise.all(input.slugs.map(fragranceId));
    const logId = await db.tx(async (q) => {
      const [log] = await q.query<{ id: string }>(
        `insert into public.wear_logs (user_id, worn_on, weather, occasion, note) values ($1, $2, $3, $4, $5) returning id`,
        [v.id, date, weathers.includes(input.weather ?? '') ? input.weather : null, occasions.includes(input.occasion ?? '') ? input.occasion : null, input.note?.trim().slice(0, 1000) || null],
      );
      for (const [i, fid] of ids.entries()) {
        const sprays = input.sprays?.[input.slugs[i]];
        await q.query(`insert into public.wear_log_items (wear_log_id, fragrance_id, sprays, position) values ($1, $2, $3, $4)`, [
          log.id,
          fid,
          sprays && sprays > 0 && sprays <= 30 ? Math.round(sprays) : null,
          i,
        ]);
      }
      return log.id;
    });
    for (const [i, fid] of ids.entries()) await afterVote(fid, input.slugs[i]);
    revalidatePath('/diary');
    return { id: logId };
  });
}

export async function deleteWear(id: string) {
  return guard(async () => {
    const v = await requireViewer();
    const items = await sql<{ slug: string; id: string }>(
      `select f.slug, f.id from public.wear_log_items i join public.fragrances f on f.id = i.fragrance_id join public.wear_logs w on w.id = i.wear_log_id where w.id = $1 and w.user_id = $2`,
      [id, v.id],
    );
    await sql('delete from public.wear_logs where id = $1 and user_id = $2', [id, v.id]);
    for (const it of items) await afterVote(it.id, it.slug);
    revalidatePath('/diary');
  });
}

// ---------------------------------------------------------------------------
// Ratings and votes
// ---------------------------------------------------------------------------
const score = (n: unknown) => {
  const v = Number(n);
  return Number.isInteger(v) && v >= 1 && v <= 10 ? v : null;
};

export async function rate(slug: string, r: { overall: number; scent?: number | null; performance?: number | null; value?: number | null; originality?: number | null }) {
  return guard(async () => {
    const v = await requireViewer();
    const fid = await fragranceId(slug);
    const overall = score(r.overall);
    if (!overall) throw new UserError('Pick an overall score from 1 to 10.');
    await sql(
      `insert into public.ratings (user_id, fragrance_id, overall, scent, performance, value, originality) values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (user_id, fragrance_id) do update set overall = $3, scent = $4, performance = $5, value = $6, originality = $7`,
      [v.id, fid, overall, score(r.scent), score(r.performance), score(r.value), score(r.originality)],
    );
    await afterVote(fid, slug);
  });
}

export async function clearRating(slug: string) {
  return guard(async () => {
    const v = await requireViewer();
    const fid = await fragranceId(slug);
    await sql('delete from public.ratings where user_id = $1 and fragrance_id = $2', [v.id, fid]);
    await afterVote(fid, slug);
  });
}

export async function votePerceived(slug: string, noteSlugs: string[], phase: 'overall' | 'opening' | 'heart' | 'drydown' = 'overall') {
  return guard(async () => {
    const v = await requireViewer();
    const fid = await fragranceId(slug);
    if (noteSlugs.length > 15) throw new UserError('Pick up to 15 notes. The ones you notice most.');
    const db = await getDb();
    await db.tx(async (q) => {
      await q.query('delete from public.perceived_note_votes where user_id = $1 and fragrance_id = $2 and phase = $3', [v.id, fid, phase]);
      if (noteSlugs.length) {
        await q.query(
          `insert into public.perceived_note_votes (user_id, fragrance_id, note_id, phase)
           select $1, $2, n.id, $3 from public.notes n where n.slug = any($4::text[])`,
          [v.id, fid, phase, noteSlugs],
        );
      }
    });
    await afterVote(fid, slug);
  });
}

export async function votePerformance(slug: string, p: { longevity?: string | null; projectionOpening?: number | null; projectionLater?: number | null; sprays?: number | null; bottleYear?: number | null }) {
  return guard(async () => {
    const v = await requireViewer();
    const fid = await fragranceId(slug);
    const lon = p.longevity && LONGEVITY_BUCKETS.some((b) => b.key === p.longevity) ? p.longevity : null;
    const proj = (x: unknown) => (Number.isInteger(x) && Number(x) >= 1 && Number(x) <= 5 ? Number(x) : null);
    const year = p.bottleYear && p.bottleYear > 1900 && p.bottleYear <= new Date().getFullYear() ? p.bottleYear : null;
    await sql(
      `insert into public.performance_votes (user_id, fragrance_id, longevity, projection_opening, projection_later, sprays, bottle_year)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (user_id, fragrance_id) do update set longevity = $3, projection_opening = $4, projection_later = $5, sprays = $6, bottle_year = $7`,
      [v.id, fid, lon, proj(p.projectionOpening), proj(p.projectionLater), p.sprays && p.sprays > 0 && p.sprays <= 20 ? p.sprays : null, year],
    );
    await afterVote(fid, slug);
  });
}

export async function voteWear(slug: string, fits: Record<string, boolean | null>) {
  return guard(async () => {
    const v = await requireViewer();
    const fid = await fragranceId(slug);
    const db = await getDb();
    await db.tx(async (q) => {
      for (const [key, val] of Object.entries(fits)) {
        if (!WEAR_CONTEXTS.some((c) => c.key === key)) continue;
        if (val === null) await q.query('delete from public.wearability_votes where user_id = $1 and fragrance_id = $2 and context_key = $3', [v.id, fid, key]);
        else
          await q.query(
            `insert into public.wearability_votes (user_id, fragrance_id, context_key, fits) values ($1,$2,$3,$4)
             on conflict (user_id, fragrance_id, context_key) do update set fits = $4`,
            [v.id, fid, key, val],
          );
      }
    });
    await afterVote(fid, slug);
  });
}

export async function voteCharacter(slug: string, strengths: Record<string, number>) {
  return guard(async () => {
    const v = await requireViewer();
    const fid = await fragranceId(slug);
    const db = await getDb();
    await db.tx(async (q) => {
      for (const [dim, s] of Object.entries(strengths)) {
        if (!(DIMENSIONS as readonly string[]).includes(dim) || !Number.isInteger(s) || s < 0 || s > 3) continue;
        await q.query(
          `insert into public.accord_votes (user_id, fragrance_id, accord_slug, strength) values ($1,$2,$3,$4)
           on conflict (user_id, fragrance_id, accord_slug) do update set strength = $4`,
          [v.id, fid, dim, s],
        );
      }
    });
    await afterVote(fid, slug);
  });
}

export async function voteSimilar(slug: string, otherSlug: string, verdict: 'similar' | 'not_similar', modifiers: string[] = []) {
  return guard(async () => {
    const v = await requireViewer();
    if (slug === otherSlug) throw new UserError('Pick a different fragrance.');
    const [a, b] = await Promise.all([fragranceId(slug), fragranceId(otherSlug)]);
    const allowed = ['cheaper', 'pricier', 'fresher', 'sweeter', 'darker', 'stronger', 'subtler', 'more_refined'];
    await sql(
      `insert into public.similarity_votes (user_id, fragrance_id, similar_id, verdict, modifiers) values ($1,$2,$3,$4,$5::text[])
       on conflict (user_id, fragrance_id, similar_id) do update set verdict = $4, modifiers = $5::text[]`,
      [v.id, a, b, verdict, modifiers.filter((m) => allowed.includes(m))],
    );
    revalidatePath(`/fragrance/${slug}`);
  });
}

// ---------------------------------------------------------------------------
// Viewer state for one fragrance page (client island loads this)
// ---------------------------------------------------------------------------
export async function getMyFragranceState(slug: string) {
  const v = await getViewer();
  if (!v) return null;
  const fid = await fragranceId(slug);
  const [item, rating, perceived, perf, wear, character, wears, review] = await Promise.all([
    sqlOne<Record<string, unknown>>(
      `select i.status, i.is_favorite, i.format, i.size_ml, i.fill_level from public.collection_items i join public.collections c on c.id = i.collection_id
        where c.user_id = $1 and c.kind = 'main' and i.fragrance_id = $2`,
      [v.id, fid],
    ),
    sqlOne<Record<string, number | null>>('select overall, scent, performance, value, originality from public.ratings where user_id = $1 and fragrance_id = $2', [v.id, fid]),
    sql<{ slug: string; phase: string }>(
      `select n.slug, p.phase from public.perceived_note_votes p join public.notes n on n.id = p.note_id where p.user_id = $1 and p.fragrance_id = $2`,
      [v.id, fid],
    ),
    sqlOne<Record<string, unknown>>(
      'select longevity, projection_opening, projection_later, sprays, bottle_year from public.performance_votes where user_id = $1 and fragrance_id = $2',
      [v.id, fid],
    ),
    sql<{ context_key: string; fits: boolean }>('select context_key, fits from public.wearability_votes where user_id = $1 and fragrance_id = $2', [v.id, fid]),
    sql<{ accord_slug: string; strength: number }>('select accord_slug, strength from public.accord_votes where user_id = $1 and fragrance_id = $2', [v.id, fid]),
    sqlOne<{ n: string; last: string | null }>(
      `select count(*) n, max(w.worn_on)::text last from public.wear_log_items i join public.wear_logs w on w.id = i.wear_log_id where w.user_id = $1 and i.fragrance_id = $2`,
      [v.id, fid],
    ),
    sqlOne<{ id: string }>(`select id from public.reviews where user_id = $1 and fragrance_id = $2 and status <> 'deleted'`, [v.id, fid]),
  ]);
  return {
    shelf: item ? { status: item.status as string, favorite: Boolean(item.is_favorite), format: (item.format as string) ?? null } : null,
    rating,
    perceived: perceived.filter((p) => p.phase === 'overall').map((p) => p.slug),
    performance: perf
      ? {
          longevity: (perf.longevity as string) ?? null,
          projectionOpening: (perf.projection_opening as number) ?? null,
          projectionLater: (perf.projection_later as number) ?? null,
        }
      : null,
    wear: Object.fromEntries(wear.map((w) => [w.context_key, w.fits])),
    character: Object.fromEntries(character.map((c) => [c.accord_slug, c.strength])),
    wears: { count: Number(wears?.n ?? 0), last: wears?.last ?? null },
    reviewId: review?.id ?? null,
  };
}
export type MyFragranceState = NonNullable<Awaited<ReturnType<typeof getMyFragranceState>>>;

// ---------------------------------------------------------------------------
// Lists: make one, put a fragrance on one, keep someone else's
// ---------------------------------------------------------------------------
/** Postgres says 42P01 for a table that is not there yet: list_saves arrives with the next migration run. */
const missingTable = (e: unknown) => (e as { code?: string })?.code === '42P01' || /relation .* does not exist/i.test(String((e as Error)?.message ?? ''));

function slugify(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'list';
}

export interface MyList {
  id: string;
  slug: string;
  title: string;
  count: number;
  /** true when the fragrance the menu was opened for is already on it */
  has?: boolean;
}

/** The viewer's own lists, newest first; with `slug`, whether each already holds that fragrance. */
export async function myLists(slug?: string): Promise<MyList[]> {
  const v = await getViewer();
  if (!v) return [];
  const rows = await sql<{ id: string; slug: string; title: string; n: string; has: boolean }>(
    `select l.id, l.slug, l.title, count(li.fragrance_id) n,
            bool_or(f.slug = $2) has
       from public.lists l
       left join public.list_items li on li.list_id = l.id
       left join public.fragrances f on f.id = li.fragrance_id
      where l.user_id = $1 group by l.id order by l.created_at desc`,
    [v.id, slug ?? null],
  );
  return rows.map((r) => ({ id: r.id, slug: r.slug, title: r.title, count: Number(r.n), has: Boolean(r.has) }));
}

export async function createList(input: { title: string; description?: string | null; slugs?: string[]; isPublic?: boolean }) {
  return guard(async () => {
    const v = await requireViewer();
    const title = (input.title ?? '').trim();
    if (title.length < 2 || title.length > 140) throw new UserError('Give the list a title, 2 to 140 characters.');
    const description = (input.description ?? '').trim().slice(0, 600) || null;
    const base = slugify(title);
    const taken = await sql<{ slug: string }>(`select slug from public.lists where user_id = $1 and slug like $2`, [v.id, `${base}%`]);
    const used = new Set(taken.map((t) => t.slug));
    let slug = base;
    for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
    const db = await getDb();
    const id = await db.tx(async (q) => {
      const [row] = await q.query<{ id: string }>(
        `insert into public.lists (user_id, slug, title, description, is_public) values ($1, $2, $3, $4, $5) returning id`,
        [v.id, slug, title, description, input.isPublic ?? true],
      );
      const slugs = Array.from(new Set((input.slugs ?? []).filter(Boolean))).slice(0, 50);
      if (slugs.length) {
        await q.query(
          `insert into public.list_items (list_id, fragrance_id, position)
           select $1, f.id, s.ord - 1 from unnest($2::text[]) with ordinality s(slug, ord) join public.fragrances f on f.slug = s.slug`,
          [row.id, slugs],
        );
      }
      return row.id;
    });
    revalidatePath('/lists');
    return { id, slug, handle: v.handle, href: `/lists/${v.handle}/${slug}` };
  });
}

/** Puts a fragrance at the end of one of the viewer's lists; already there is not an error. */
export async function addToList(slug: string, listId: string, note?: string | null) {
  return guard(async () => {
    const v = await requireViewer();
    const fid = await fragranceId(slug);
    const list = await sqlOne<{ id: string; slug: string; title: string }>('select id, slug, title from public.lists where id = $1 and user_id = $2', [listId, v.id]);
    if (!list) throw new UserError('That list isn’t yours.');
    await sql(
      `insert into public.list_items (list_id, fragrance_id, position, note)
       values ($1, $2, coalesce((select max(position) + 1 from public.list_items where list_id = $1), 0), $3)
       on conflict (list_id, fragrance_id) do update set note = coalesce(excluded.note, public.list_items.note)`,
      [list.id, fid, note?.trim().slice(0, 500) || null],
    );
    revalidatePath('/lists');
    revalidatePath(`/lists/${v.handle}/${list.slug}`);
    return { title: list.title, href: `/lists/${v.handle}/${list.slug}` };
  });
}

export async function removeFromList(slug: string, listId: string) {
  return guard(async () => {
    const v = await requireViewer();
    const fid = await fragranceId(slug);
    const list = await sqlOne<{ slug: string }>('select slug from public.lists where id = $1 and user_id = $2', [listId, v.id]);
    if (!list) throw new UserError('That list isn’t yours.');
    await sql('delete from public.list_items where list_id = $1 and fragrance_id = $2', [listId, fid]);
    revalidatePath('/lists');
    revalidatePath(`/lists/${v.handle}/${list.slug}`);
  });
}

/** Save (or unsave) someone else's list. Your own lists are already yours. */
export async function toggleSaveList(listId: string) {
  return guard(async () => {
    const v = await requireViewer();
    const list = await sqlOne<{ user_id: string; slug: string; handle: string }>(
      'select l.user_id, l.slug, p.handle from public.lists l join public.profiles p on p.id = l.user_id where l.id = $1 and l.is_public',
      [listId],
    );
    if (!list) throw new UserError('That list is gone.');
    if (list.user_id === v.id) throw new UserError('It’s your list already.');
    try {
      const existing = await sqlOne('select 1 from public.list_saves where user_id = $1 and list_id = $2', [v.id, listId]);
      if (existing) await sql('delete from public.list_saves where user_id = $1 and list_id = $2', [v.id, listId]);
      else await sql('insert into public.list_saves (user_id, list_id) values ($1, $2)', [v.id, listId]);
      revalidatePath('/lists');
      revalidatePath(`/lists/${list.handle}/${list.slug}`);
      return { saved: !existing };
    } catch (e) {
      if (missingTable(e)) throw new UserError('Saving lists switches on with the next database update.');
      throw e;
    }
  });
}

/** Ids of the lists the viewer has saved; empty until the list_saves table exists. */
export async function savedListIds(): Promise<string[]> {
  const v = await getViewer();
  if (!v) return [];
  try {
    const rows = await sql<{ list_id: string }>('select list_id from public.list_saves where user_id = $1', [v.id]);
    return rows.map((r) => r.list_id);
  } catch (e) {
    if (missingTable(e)) return [];
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Follows
// ---------------------------------------------------------------------------
export async function toggleFollow(handle: string) {
  return guard(async () => {
    const v = await requireViewer();
    const p = await sqlOne<{ id: string }>('select id from public.profiles where lower(handle) = lower($1)', [handle]);
    if (!p) throw new UserError('That person doesn’t exist.');
    if (p.id === v.id) throw new UserError('You can’t follow yourself.');
    const existing = await sqlOne('select 1 from public.follows where follower_id = $1 and followee_id = $2', [v.id, p.id]);
    if (existing) await sql('delete from public.follows where follower_id = $1 and followee_id = $2', [v.id, p.id]);
    else await sql('insert into public.follows (follower_id, followee_id) values ($1, $2)', [v.id, p.id]);
    revalidatePath(`/u/${handle}`);
    return { following: !existing };
  });
}
