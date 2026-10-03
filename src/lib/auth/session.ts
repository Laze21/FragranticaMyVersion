import 'server-only';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { sql, sqlOne, getDb } from '@/lib/db';

/**
 * Sessions for local demo mode (embedded Postgres).
 *
 * Production uses Supabase Auth: swap getViewerId() for `supabase.auth.getUser()` via
 * @supabase/ssr and drop the local credential table. Everything else in the app only depends
 * on getViewer() / requireViewer(), so the swap is contained to this file.
 */
const COOKIE = 'sid';
const MAX_AGE = 60 * 60 * 24 * 30;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
    throw new Error('SESSION_SECRET (32+ chars) is required in production');
  }
  return 'local-demo-session-secret-not-for-production-use';
}

function sign(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export async function createSession(userId: string) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = Buffer.from(`${userId}.${exp}`).toString('base64url');
  const jar = await cookies();
  jar.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && !process.env.ALLOW_INSECURE_COOKIES,
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getViewerId(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, mac] = raw.split('.');
  if (!payload || !mac) return null;
  const expected = sign(payload);
  if (expected.length !== mac.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(mac))) return null;
  const [userId, exp] = Buffer.from(payload, 'base64url').toString().split('.');
  if (!userId || Number(exp) < Date.now() / 1000) return null;
  return userId;
}

export interface Viewer {
  id: string;
  handle: string;
  displayName: string;
  role: 'member' | 'moderator' | 'admin';
  avatarHue: string | null;
  experience: string;
  isPrivate: boolean;
  createdAt: string;
}

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const id = await getViewerId();
  if (!id) return null;
  const row = await sqlOne<Record<string, unknown>>(
    `select id, handle, display_name, role, avatar_hue, experience_level, is_private, created_at from public.profiles where id = $1 and deleted_at is null`,
    [id],
  );
  if (!row) return null;
  return {
    id: row.id as string,
    handle: row.handle as string,
    displayName: row.display_name as string,
    role: row.role as Viewer['role'],
    avatarHue: (row.avatar_hue as string) ?? null,
    experience: row.experience_level as string,
    isPrivate: Boolean(row.is_private),
    createdAt: String(row.created_at),
  };
});

export class AuthError extends Error {}

export async function requireViewer(): Promise<Viewer> {
  const v = await getViewer();
  if (!v) throw new AuthError('Sign in to do that.');
  return v;
}

export async function requireModerator(): Promise<Viewer> {
  const v = await requireViewer();
  if (v.role !== 'moderator' && v.role !== 'admin') throw new AuthError('Moderators only.');
  return v;
}

// ---------------------------------------------------------------------------
// Local credentials (demo mode only)
// ---------------------------------------------------------------------------
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(password, salt, 32).toString('hex')}`;
}

function verifyHash(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const candidate = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export async function verifyCredentials(email: string, password: string): Promise<string | null> {
  const row = await sqlOne<{ id: string; password_hash: string }>(
    `select u.id, c.password_hash from auth.users u join auth.local_credentials c on c.user_id = u.id where lower(u.email) = lower($1)`,
    [email.trim()],
  );
  if (!row) {
    verifyHash(password, 'scrypt$0000$00'); // keep timing similar for unknown emails
    return null;
  }
  return verifyHash(password, row.password_hash) ? row.id : null;
}

export async function createAccount(input: { email: string; password: string; handle: string; displayName: string; experience: string }) {
  const db = await getDb();
  return db.tx(async (q) => {
    const exists = await q.query<{ x: number }>(
      `select 1 x from auth.users where lower(email) = lower($1) union all select 1 from public.profiles where lower(handle) = lower($2)`,
      [input.email, input.handle],
    );
    if (exists.length) throw new AuthError('That email or handle is already taken.');
    const [user] = await q.query<{ id: string }>('insert into auth.users (email) values ($1) returning id', [input.email.trim().toLowerCase()]);
    await q.query('insert into auth.local_credentials (user_id, password_hash) values ($1, $2)', [user.id, hashPassword(input.password)]);
    const hues = ['#8E7F6A', '#6F7F78', '#8A6E6A', '#7A7590', '#7E8A62', '#9A7B52', '#5F6F7F'];
    await q.query(
      `insert into public.profiles (id, handle, display_name, experience_level, avatar_hue) values ($1, $2, $3, $4, $5)`,
      [user.id, input.handle.toLowerCase(), input.displayName, input.experience, hues[Math.floor(Math.random() * hues.length)]],
    );
    await q.query(`insert into public.collections (user_id, slug, name, kind) values ($1, 'shelf', 'Shelf', 'main')`, [user.id]);
    return user.id;
  });
}

export async function demoUserId(): Promise<string | null> {
  const row = await sqlOne<{ id: string }>(`select id from public.profiles where handle = 'demo'`);
  return row?.id ?? null;
}

export async function mainCollectionId(userId: string): Promise<string> {
  const row = await sqlOne<{ id: string }>(`select id from public.collections where user_id = $1 and kind = 'main'`, [userId]);
  if (row) return row.id;
  const [created] = await sql<{ id: string }>(
    `insert into public.collections (user_id, slug, name, kind) values ($1, 'shelf', 'Shelf', 'main') returning id`,
    [userId],
  );
  return created.id;
}
