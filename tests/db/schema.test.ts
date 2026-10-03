import { beforeAll, describe, expect, it } from 'vitest';
import { refreshFragranceStats } from '@/lib/data/stats';
import { freshDb } from '../helpers/pglite';

let db: Awaited<ReturnType<typeof freshDb>>;

beforeAll(async () => {
  db = await freshDb();
});

const one = async <T>(sql: string, params: unknown[] = []) => (await db.q.query<T>(sql, params))[0];

describe('migrations and seed', () => {
  it('loads the real catalogue', async () => {
    const r = await one<{ n: string }>('select count(*) n from public.fragrances');
    expect(Number(r.n)).toBe(50);
    const demo = await one<{ n: string }>('select count(*) n from public.fragrances where is_demo');
    expect(Number(demo.n)).toBe(0);
  });

  it('gives every fragrance exactly one primary image, illustration or photo', async () => {
    const r = await one<{ n: string }>('select count(*) n from public.fragrance_primary_image');
    expect(Number(r.n)).toBe(50);
    const kinds = await db.q.query<{ kind: string }>('select distinct kind from public.fragrance_primary_image');
    for (const k of kinds) expect(['photo', 'poster']).toContain(k.kind);
  });

  it('keeps official notes separate from perceived votes', async () => {
    const official = await one<{ n: string }>(`select count(*) n from public.fragrance_notes`);
    expect(Number(official.n)).toBeGreaterThan(200);
    const perceived = await one<{ n: string }>(`select count(*) n from public.perceived_note_votes`);
    expect(Number(perceived.n)).toBe(0); // demo aggregates live in community_baselines, not in the vote tables
    const baselines = await one<{ n: string }>(`select count(*) n from public.community_baselines`);
    expect(Number(baselines.n)).toBe(50);
  });

  it('attaches provenance to every fragrance', async () => {
    const r = await one<{ n: string }>(`select count(distinct fragrance_id) n from public.fragrance_source_records where status = 'accepted'`);
    expect(Number(r.n)).toBe(50);
    const fields = await db.q.query<{ field: string }>(`select distinct field from public.fragrance_source_records`);
    expect(fields.map((f) => f.field)).toEqual(expect.arrayContaining(['notes', 'image', 'identity', 'perfumers']));
  });

  it('writes no reviews for real products', async () => {
    const r = await one<{ n: string }>('select count(*) n from public.reviews');
    expect(Number(r.n)).toBe(0);
  });

  it('builds a read model with sample sizes', async () => {
    const r = await one<{ rating_count: number; longevity_median_hrs: string; includes_baseline: boolean }>(
      `select s.rating_count, s.longevity_median_hrs, s.includes_baseline from public.fragrance_stats s join public.fragrances f on f.id = s.fragrance_id where f.slug = 'dior-sauvage'`,
    );
    expect(r.rating_count).toBeGreaterThan(100);
    expect(Number(r.longevity_median_hrs)).toBeGreaterThan(4);
    expect(r.includes_baseline).toBe(true);
  });
});

describe('search', () => {
  it('forgives typos through trigrams', async () => {
    const rows = await db.q.query<{ slug: string }>(
      `select f.slug from public.fragrances f join public.brands b on b.id = f.brand_id
        where extensions.word_similarity(public.immutable_unaccent(lower($1)), public.immutable_unaccent(lower(f.name || ' ' || b.name))) > 0.35
        order by extensions.word_similarity(public.immutable_unaccent(lower($1)), public.immutable_unaccent(lower(f.name || ' ' || b.name))) desc limit 3`,
      ['savage'],
    );
    expect(rows.map((r) => r.slug)).toContain('dior-sauvage');
  });

  it('ignores accents', async () => {
    const rows = await db.q.query<{ slug: string }>(
      `select f.slug from public.fragrance_search s join public.fragrances f on f.id = s.fragrance_id
        where s.tsv @@ plainto_tsquery('simple', public.immutable_unaccent($1)) limit 5`,
      ['terre d hermes'],
    );
    expect(rows.map((r) => r.slug)).toContain('terre-d-hermes');
  });
});

describe('community writes', () => {
  it('counts helpful votes on top of the demo baseline and refreshes stats', async () => {
    const user = await one<{ id: string }>(`select id from public.profiles where handle = 'demo'`);
    const frag = await one<{ id: string }>(`select id from public.fragrances where slug = 'santal-33'`);
    await db.q.query(`insert into public.reviews (id, user_id, fragrance_id, kind, body, rating_overall) values ('00000000-0000-0000-0000-00000000aaaa', $1, $2, 'quick', 'Dry, salty wood. A little goes a long way.', 8)`, [user.id, frag.id]);
    const other = await one<{ id: string }>(`select id from public.profiles where handle <> 'demo' limit 1`);
    await db.q.query(`insert into public.review_votes (review_id, user_id) values ('00000000-0000-0000-0000-00000000aaaa', $1)`, [other.id]);
    const r = await one<{ helpful_count: number; helpful_baseline: number }>(`select helpful_count, helpful_baseline from public.reviews where id = '00000000-0000-0000-0000-00000000aaaa'`);
    expect(r.helpful_count).toBe(r.helpful_baseline + 1);
    await refreshFragranceStats(db.q, frag.id);
    const s = await one<{ review_count: number }>(`select review_count from public.fragrance_stats where fragrance_id = $1`, [frag.id]);
    expect(s.review_count).toBeGreaterThanOrEqual(1);
  });

  it('keeps marketed_for separate from wearability', async () => {
    const cols = await db.q.query<{ column_name: string }>(`select column_name from information_schema.columns where table_name = 'fragrances'`);
    const names = cols.map((c) => c.column_name);
    expect(names).toContain('marketed_for');
    expect(names).not.toContain('gender');
    const wear = await db.q.query<{ column_name: string }>(`select column_name from information_schema.columns where table_name = 'wearability_votes'`);
    expect(wear.map((c) => c.column_name)).toContain('context_key');
  });
});
