import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { unaccent } from '@electric-sql/pglite/contrib/unaccent';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Queryable } from '@/lib/db';
import { refreshAllStats } from '@/lib/data/stats';

/** Fresh in-memory database with migrations + seed, exactly as the app bootstraps it. */
export async function freshDb(opts: { seed?: boolean } = { seed: true }) {
  const pg = await PGlite.create({ extensions: { pg_trgm, unaccent } });
  const dir = path.join(process.cwd(), 'supabase');
  await pg.exec(readFileSync(path.join(dir, 'local/auth_shim.sql'), 'utf8'));
  for (const f of readdirSync(path.join(dir, 'migrations')).sort()) await pg.exec(readFileSync(path.join(dir, 'migrations', f), 'utf8'));
  const q: Queryable = { query: async <T,>(t: string, p: unknown[] = []) => (await pg.query<T>(t, p)).rows };
  if (opts.seed !== false) {
    await pg.exec(readFileSync(path.join(dir, 'seed.sql'), 'utf8'));
    await pg.exec(readFileSync(path.join(dir, 'local/seed_local.sql'), 'utf8'));
    await refreshAllStats(q);
  }
  return { pg, q };
}
