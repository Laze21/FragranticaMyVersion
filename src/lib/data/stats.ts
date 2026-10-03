import { sql, type Queryable } from '@/lib/db';
import { DIMENSIONS, LONGEVITY_BUCKETS, type Dimension } from '@/lib/scent/vocab';
import { formatCount } from '@/lib/scent/read';
import type { BaselinePayload } from './baseline';

/**
 * Rebuilds the fragrance_stats read model for one fragrance: baseline aggregates (imported or
 * demo) + live votes. Called after every community write and at bootstrap.
 *
 * Character blending: the editorial estimate is a prior worth PRIOR_VOTES votes; community accord
 * votes pull the profile toward what people report as they accumulate.
 */
const PRIOR_VOTES = 20;
const PHASE_WEIGHT = { opening: 0.2, heart: 0.35, drydown: 0.45 } as const;

type Vec = Partial<Record<Dimension, number>>;

export async function refreshAllStats(q: Queryable) {
  const rows = await q.query<{ id: string }>('select id from public.fragrances');
  for (const r of rows) await refreshFragranceStats(q, r.id);
}

export async function refreshFragranceStats(q: Queryable, fragranceId: string) {
  const [baselineRow] = await q.query<{ payload: BaselinePayload; source: string }>(
    `select b.payload, s.name as source from public.community_baselines b join public.data_sources s on s.id = b.data_source_id where b.fragrance_id = $1`,
    [fragranceId],
  );
  const base = baselineRow?.payload;

  const [ratingHist, ratingSubs, reviews, longevity, projO, projL, wear, wearVoters, perceived, perceivedVoters, accordVotes, editorial, collection, wears, recent] =
    await Promise.all([
      q.query<{ overall: number; n: string }>('select overall, count(*) n from public.ratings where fragrance_id = $1 group by overall', [fragranceId]),
      q.query<{ s_sum: string; s_n: string; p_sum: string; p_n: string; v_sum: string; v_n: string; o_sum: string; o_n: string }>(
        `select coalesce(sum(scent),0) s_sum, count(scent) s_n, coalesce(sum(performance),0) p_sum, count(performance) p_n,
                coalesce(sum(value),0) v_sum, count(value) v_n, coalesce(sum(originality),0) o_sum, count(originality) o_n
           from public.ratings where fragrance_id = $1`,
        [fragranceId],
      ),
      q.query<{ n: string }>(`select count(*) n from public.reviews where fragrance_id = $1 and status = 'published'`, [fragranceId]),
      q.query<{ k: string; n: string }>('select longevity k, count(*) n from public.performance_votes where fragrance_id = $1 and longevity is not null group by longevity', [fragranceId]),
      q.query<{ k: number; n: string }>('select projection_opening k, count(*) n from public.performance_votes where fragrance_id = $1 and projection_opening is not null group by 1', [fragranceId]),
      q.query<{ k: number; n: string }>('select projection_later k, count(*) n from public.performance_votes where fragrance_id = $1 and projection_later is not null group by 1', [fragranceId]),
      q.query<{ k: string; n: string }>('select context_key k, count(*) filter (where fits) n from public.wearability_votes where fragrance_id = $1 group by 1', [fragranceId]),
      q.query<{ n: string }>('select count(distinct user_id) n from public.wearability_votes where fragrance_id = $1', [fragranceId]),
      q.query<{ slug: string; phase: string; n: string }>(
        `select n.slug, v.phase, count(*) n from public.perceived_note_votes v join public.notes n on n.id = v.note_id
          where v.fragrance_id = $1 group by n.slug, v.phase`,
        [fragranceId],
      ),
      q.query<{ n: string }>(`select count(distinct user_id) n from public.perceived_note_votes where fragrance_id = $1 and phase = 'overall'`, [fragranceId]),
      q.query<{ accord_slug: Dimension; avg: string; n: string }>(
        'select accord_slug, avg(strength) avg, count(*) n from public.accord_votes where fragrance_id = $1 group by accord_slug',
        [fragranceId],
      ),
      q.query<{ accord_slug: Dimension; phase: keyof typeof PHASE_WEIGHT; strength: string }>(
        `select accord_slug, phase, strength from public.fragrance_accords where fragrance_id = $1 and source = 'editorial'`,
        [fragranceId],
      ),
      q.query<{ status: string; n: string }>('select status, count(*) n from public.collection_items where fragrance_id = $1 group by status', [fragranceId]),
      q.query<{ total: string; last30: string }>(
        `select count(*) total, count(*) filter (where w.worn_on >= current_date - 30) last30
           from public.wear_log_items i join public.wear_logs w on w.id = i.wear_log_id where i.fragrance_id = $1`,
        [fragranceId],
      ),
      q.query<{ reviews30: string; ratings30: string }>(
        `select (select count(*) from public.reviews where fragrance_id = $1 and status = 'published' and created_at > now() - interval '30 days') reviews30,
                (select count(*) from public.ratings where fragrance_id = $1 and created_at > now() - interval '30 days') ratings30`,
        [fragranceId],
      ),
    ]);

  const num = (v: unknown) => Number(v ?? 0);

  // Ratings ---------------------------------------------------------------
  const hist = base ? [...base.ratings.hist] : new Array(10).fill(0);
  for (const r of ratingHist) hist[r.overall - 1] += num(r.n);
  const ratingCount = hist.reduce((a, b) => a + b, 0);
  const mean = ratingCount ? hist.reduce((s, n, i) => s + n * (i + 1), 0) / ratingCount : null;
  const spread = ratingCount && mean !== null ? Math.sqrt(hist.reduce((s, n, i) => s + n * (i + 1 - mean) ** 2, 0) / ratingCount) : null;
  const subs = ratingSubs[0];
  const subAvg = (b: [number, number] | undefined, sum: unknown, n: unknown) => {
    const total = (b?.[1] ?? 0) + num(n);
    return total ? ((b?.[0] ?? 0) + num(sum)) / total : null;
  };

  // Performance -------------------------------------------------------------
  const longHist = base ? [...base.performance.longevity] : new Array(6).fill(0);
  for (const r of longevity) {
    const i = LONGEVITY_BUCKETS.findIndex((b) => b.key === r.k);
    if (i >= 0) longHist[i] += num(r.n);
  }
  const perfVotes = longHist.reduce((a, b) => a + b, 0);
  const pOpen = base ? [...base.performance.projectionOpening] : new Array(5).fill(0);
  const pLater = base ? [...base.performance.projectionLater] : new Array(5).fill(0);
  for (const r of projO) pOpen[r.k - 1] += num(r.n);
  for (const r of projL) pLater[r.k - 1] += num(r.n);
  const pTotal = pOpen.reduce((a, b) => a + b, 0);
  const projectionAvg = pTotal ? pOpen.reduce((s, n, i) => s + n * (i + 1), 0) / pTotal : null;

  // Wearability -------------------------------------------------------------
  const wv = (base?.wear.voters ?? 0) + num(wearVoters[0]?.n);
  const wearShares: Record<string, number> = {};
  const fits: Record<string, number> = { ...(base?.wear.fits ?? {}) };
  for (const r of wear) fits[r.k] = (fits[r.k] ?? 0) + num(r.n);
  if (wv) for (const [k, n] of Object.entries(fits)) wearShares[k] = round(n / wv, 3);

  // Perceived ----------------------------------------------------------------
  const pv = (base?.perceived.voters ?? 0) + num(perceivedVoters[0]?.n);
  const pCounts: Record<string, number> = { ...(base?.perceived.counts ?? {}) };
  const phaseCounts: Record<string, Record<string, number>> = {};
  for (const [phase, counts] of Object.entries(base?.perceived.byPhase ?? {})) phaseCounts[phase] = { ...counts };
  for (const r of perceived) {
    if (r.phase === 'overall') pCounts[r.slug] = (pCounts[r.slug] ?? 0) + num(r.n);
    else {
      phaseCounts[r.phase] ??= {};
      phaseCounts[r.phase][r.slug] = (phaseCounts[r.phase][r.slug] ?? 0) + num(r.n);
    }
  }
  const perceivedShares = pv ? Object.fromEntries(Object.entries(pCounts).map(([k, n]) => [k, round(Math.min(1, n / pv), 3)])) : {};

  // Character ------------------------------------------------------------------
  const ed: Record<string, Vec> = { opening: {}, heart: {}, drydown: {} };
  for (const r of editorial) ed[r.phase][r.accord_slug] = num(r.strength);
  const edOverall: Vec = {};
  for (const d of DIMENSIONS) {
    const v = (Object.keys(PHASE_WEIGHT) as Array<keyof typeof PHASE_WEIGHT>).reduce((s, p) => s + (ed[p][d] ?? 0) * PHASE_WEIGHT[p], 0);
    if (v > 0) edOverall[d] = v;
  }
  const voteN = accordVotes.reduce((m, r) => Math.max(m, num(r.n)), 0);
  const w = voteN / (voteN + PRIOR_VOTES);
  const community: Vec = Object.fromEntries(accordVotes.map((r) => [r.accord_slug, num(r.avg) / 3]));
  const overall: Vec = {};
  for (const d of DIMENSIONS) {
    const v = (1 - w) * (edOverall[d] ?? 0) + w * (community[d] ?? 0);
    if (v > 0.01) overall[d] = round(v, 3);
  }
  const character: Record<string, Vec> = { overall };
  for (const p of ['opening', 'heart', 'drydown'] as const) {
    character[p] = {};
    for (const d of DIMENSIONS) {
      const e = ed[p][d] ?? 0;
      const ratio = edOverall[d] ? (overall[d] ?? 0) / edOverall[d]! : community[d] ? 1 : 0;
      const v = edOverall[d] ? e * ratio : w * (community[d] ?? 0);
      if (v > 0.01) character[p][d] = round(Math.min(1, v), 3);
    }
  }

  // Collection & wears -----------------------------------------------------------
  const coll = Object.fromEntries(collection.map((r) => [r.status, num(r.n)]));
  const own = (base?.collection.own ?? 0) + (coll.own ?? 0);
  const had = (base?.collection.had ?? 0) + (coll.had ?? 0);
  const want = (base?.collection.want ?? 0) + (coll.want ?? 0) + (coll.want_sample ?? 0);
  const wearsTotal = (base?.wears.total ?? 0) + num(wears[0]?.total);
  const wears30 = (base?.wears.last30 ?? 0) + num(wears[0]?.last30);

  const popularity = Math.log1p(ratingCount) * 2 + Math.log1p(own) * 1.5 + Math.log1p(wearsTotal);
  const trending = wears30 / (1 + Math.log1p(own)) + 25 * num(recent[0]?.reviews30) + 6 * num(recent[0]?.ratings30);

  await q.query(
    `insert into public.fragrance_stats (
       fragrance_id, rating_count, rating_avg, rating_hist, rating_spread, scent_avg, performance_avg, value_avg, originality_avg,
       review_count, perf_votes, longevity_hist, longevity_median_hrs, projection_opening_hist, projection_later_hist, projection_avg,
       wear_voters, wear, perceived_voters, perceived, perceived_by_phase, character, own_count, had_count, want_count,
       wears_30d, wears_total, popularity, trending, includes_baseline, baseline_source, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31, now())
     on conflict (fragrance_id) do update set
       rating_count = excluded.rating_count, rating_avg = excluded.rating_avg, rating_hist = excluded.rating_hist,
       rating_spread = excluded.rating_spread, scent_avg = excluded.scent_avg, performance_avg = excluded.performance_avg,
       value_avg = excluded.value_avg, originality_avg = excluded.originality_avg, review_count = excluded.review_count,
       perf_votes = excluded.perf_votes, longevity_hist = excluded.longevity_hist, longevity_median_hrs = excluded.longevity_median_hrs,
       projection_opening_hist = excluded.projection_opening_hist, projection_later_hist = excluded.projection_later_hist,
       projection_avg = excluded.projection_avg, wear_voters = excluded.wear_voters, wear = excluded.wear,
       perceived_voters = excluded.perceived_voters, perceived = excluded.perceived, perceived_by_phase = excluded.perceived_by_phase,
       character = excluded.character, own_count = excluded.own_count, had_count = excluded.had_count, want_count = excluded.want_count,
       wears_30d = excluded.wears_30d, wears_total = excluded.wears_total, popularity = excluded.popularity, trending = excluded.trending,
       includes_baseline = excluded.includes_baseline, baseline_source = excluded.baseline_source, updated_at = now()`,
    [
      fragranceId,
      ratingCount,
      mean === null ? null : round(mean, 2),
      hist,
      spread === null ? null : round(spread, 2),
      nullableRound(subAvg(base?.ratings.scent, subs?.s_sum, subs?.s_n)),
      nullableRound(subAvg(base?.ratings.performance, subs?.p_sum, subs?.p_n)),
      nullableRound(subAvg(base?.ratings.value, subs?.v_sum, subs?.v_n)),
      nullableRound(subAvg(base?.ratings.originality, subs?.o_sum, subs?.o_n)),
      num(reviews[0]?.n),
      perfVotes,
      longHist,
      perfVotes ? round(medianHours(longHist), 1) : null,
      pOpen,
      pLater,
      projectionAvg === null ? null : round(projectionAvg, 2),
      wv,
      JSON.stringify(wearShares),
      pv,
      JSON.stringify(perceivedShares),
      JSON.stringify(phaseCounts),
      JSON.stringify(character),
      own,
      had,
      want,
      wears30,
      wearsTotal,
      round(popularity, 3),
      round(trending, 3),
      Boolean(base),
      baselineRow?.source ?? null,
    ],
  );
}

/** Median from bucketed counts, interpolated inside the bucket that crosses 50%. */
export function medianHours(hist: number[]): number {
  const total = hist.reduce((a, b) => a + b, 0);
  if (!total) return 0;
  let acc = 0;
  for (let i = 0; i < hist.length; i++) {
    const next = acc + hist[i];
    if (next >= total / 2) {
      const b = LONGEVITY_BUCKETS[i];
      const within = hist[i] ? (total / 2 - acc) / hist[i] : 0.5;
      return b.lo + (b.hi - b.lo) * within;
    }
    acc = next;
  }
  return LONGEVITY_BUCKETS[LONGEVITY_BUCKETS.length - 1].lo;
}

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;
const nullableRound = (v: number | null) => (v === null ? null : round(v, 2));

/* ---- Compare: who leads a row, and how many votes stand behind a figure ---- */

/**
 * The index of the cell that leads a compare row, or null when there is nothing to point at:
 * fewer than two real values, or a tie for first. A tie is not a leader; marking one of two
 * equal cells would be a lie, so the row simply carries no mark.
 */
export function leaderIndex(values: Array<number | null | undefined>, prefer: 'max' | 'min' = 'max'): number | null {
  const real = values.map((v, i) => ({ v, i })).filter((x): x is { v: number; i: number } => typeof x.v === 'number' && Number.isFinite(x.v));
  if (real.length < 2) return null;
  const best = real.reduce((a, b) => (prefer === 'max' ? (b.v > a.v ? b : a) : b.v < a.v ? b : a));
  return real.filter((x) => x.v === best.v).length > 1 ? null : best.i;
}

/**
 * "n=1.2k": the sample size as the brightest small text in a cell. Below five votes the figure
 * itself is withheld elsewhere, so the label says why instead of printing a tiny n.
 */
export function sampleLabel(n: number, min = 5): string {
  return n >= min ? `n=${formatCount(n)}` : n === 0 ? 'no votes yet' : `${n} ${n === 1 ? 'vote' : 'votes'}`;
}

/**
 * Of the people who own the first fragrance (`own` or `had`), the share who also own each of
 * the others. Keyed by fragrance id; the base is absent (it would be 100%).
 */
export async function shelfOverlap(ids: string[]): Promise<Map<string, number>> {
  const [base, ...others] = ids;
  if (!base || !others.length) return new Map();
  const rows = await sql<{ fragrance_id: string; n: string; total: string }>(
    `with owners as (
       select c.user_id from public.collection_items i join public.collections c on c.id = i.collection_id
        where i.fragrance_id = $1 and i.status in ('own', 'had'))
     select i.fragrance_id, count(distinct c.user_id) n, (select count(*) from owners) total
       from public.collection_items i join public.collections c on c.id = i.collection_id
      where i.fragrance_id = any($2::uuid[]) and i.status in ('own', 'had') and c.user_id in (select user_id from owners)
      group by i.fragrance_id`,
    [base, others],
  );
  return new Map(rows.map((r) => [r.fragrance_id, Number(r.total) ? Number(r.n) / Number(r.total) : 0]));
}

/** "1 in 10 Sauvage owners also own this": a share as a ratio people can picture. */
export function overlapPhrase(share: number, baseName: string): string {
  if (share <= 0) return `No ${baseName} owners also own this yet`;
  if (share >= 0.95) return `Nearly every ${baseName} owner also owns this`;
  const denom = Math.max(2, Math.round(1 / share));
  return `1 in ${denom} ${baseName} owners also own this`;
}
