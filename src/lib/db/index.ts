import 'server-only';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * One tiny SQL interface over two drivers:
 *  - DATABASE_URL set  -> postgres.js against Supabase Postgres (production / staging)
 *  - otherwise         -> PGlite, real Postgres compiled to WASM, running in-process.
 *
 * Both run the exact same migrations in supabase/migrations, so search (FTS + pg_trgm),
 * constraints and triggers behave identically in local demo mode and in production.
 */
export interface Queryable {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}
export interface Db extends Queryable {
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
  driver: 'pglite' | 'postgres';
}

const ROOT = process.cwd();
const SQL_DIR = path.join(ROOT, 'supabase');

declare global {
  // eslint-disable-next-line no-var
  var __appDb: Promise<Db> | undefined;
}

export function getDb(): Promise<Db> {
  if (!globalThis.__appDb) {
    globalThis.__appDb = (process.env.DATABASE_URL ? connectPostgres(process.env.DATABASE_URL) : connectPglite()).catch((err) => {
      globalThis.__appDb = undefined;
      throw err;
    });
  }
  return globalThis.__appDb;
}

export async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  return db.query<T>(text, params);
}

export async function sqlOne<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await sql<T>(text, params);
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
async function connectPostgres(url: string): Promise<Db> {
  const { default: postgres } = await import('postgres');
  const client = postgres(url, { max: 5, prepare: false, idle_timeout: 20, types: { bigint: postgres.BigInt } });
  const wrap = (c: typeof client): Queryable => ({
    async query<T>(text: string, params: unknown[] = []) {
      return (await c.unsafe(text, params as never[])) as unknown as T[];
    },
  });
  return {
    driver: 'postgres',
    ...wrap(client),
    async tx<T>(fn: (q: Queryable) => Promise<T>) {
      return (await client.begin((t) => fn(wrap(t as unknown as typeof client)))) as T;
    },
  };
}

async function connectPglite(): Promise<Db> {
  const [{ PGlite }, { pg_trgm }, { unaccent }] = await Promise.all([
    import('@electric-sql/pglite'),
    import('@electric-sql/pglite/contrib/pg_trgm'),
    import('@electric-sql/pglite/contrib/unaccent'),
  ]);

  // Persist between restarts in development; build workers and serverless get an in-memory copy.
  const isBuild = process.env.NEXT_PHASE === 'phase-production-build';
  const persistDir =
    process.env.LOCAL_DB_DIR ?? (!isBuild && process.env.NODE_ENV !== 'production' ? path.join(ROOT, '.data', 'pglite') : undefined);
  if (persistDir) mkdirSync(persistDir, { recursive: true });

  const pg = await PGlite.create({ dataDir: persistDir, extensions: { pg_trgm, unaccent } });
  const q: Queryable = {
    async query<T>(text: string, params: unknown[] = []) {
      const res = await pg.query<T>(text, params);
      return res.rows;
    },
  };
  const db: Db = {
    driver: 'pglite',
    ...q,
    async tx<T>(fn: (q: Queryable) => Promise<T>) {
      return pg.transaction(async (t) =>
        fn({
          async query<R>(text: string, params: unknown[] = []) {
            return (await t.query<R>(text, params)).rows;
          },
        }),
      );
    },
  };

  await migrateLocal(pg);
  return db;
}

type Pg = { exec(sql: string): Promise<unknown>; query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> };

async function migrateLocal(pg: Pg) {
  await pg.exec(`create table if not exists public._local_migrations (name text primary key, applied_at timestamptz not null default now())`);
  const applied = new Set((await pg.query<{ name: string }>('select name from public._local_migrations')).rows.map((r) => r.name));
  const fresh = applied.size === 0;

  const steps: Array<{ name: string; file: string }> = [{ name: 'local/auth_shim.sql', file: path.join(SQL_DIR, 'local', 'auth_shim.sql') }];
  for (const f of readdirSync(path.join(SQL_DIR, 'migrations')).sort()) {
    if (f.endsWith('.sql')) steps.push({ name: `migrations/${f}`, file: path.join(SQL_DIR, 'migrations', f) });
  }
  if (fresh || !applied.has('seed.sql')) {
    steps.push({ name: 'seed.sql', file: path.join(SQL_DIR, 'seed.sql') });
    steps.push({ name: 'local/seed_local.sql', file: path.join(SQL_DIR, 'local', 'seed_local.sql') });
  }

  let seeded = false;
  for (const step of steps) {
    if (applied.has(step.name)) continue;
    if (!existsSync(step.file)) {
      if (step.name.includes('seed')) continue; // seed not generated yet: run `npm run seed:generate`
      throw new Error(`Missing SQL file ${step.file}`);
    }
    await pg.exec(readFileSync(step.file, 'utf8'));
    await pg.query('insert into public._local_migrations (name) values ($1)', [step.name]);
    if (step.name === 'seed.sql') seeded = true;
  }

  if (seeded) {
    const { refreshAllStats } = await import('../data/stats');
    await refreshAllStats({
      async query<T>(text: string, params: unknown[] = []) {
        return (await pg.query<T>(text, params)).rows;
      },
    });
  }
}
