'use server';

import { redirect } from 'next/navigation';
import { AuthError, createAccount, createSession, demoUserId, destroySession, verifyCredentials } from '@/lib/auth/session';

export interface AuthState {
  error?: string;
  fields?: Record<string, string>;
}

function safeNext(v: FormDataEntryValue | null): string {
  const s = typeof v === 'string' ? v : '';
  return s.startsWith('/') && !s.startsWith('//') ? s : '/';
}

export async function signInAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!email || !password) return { error: 'Enter your email and password.', fields: { email } };
  const userId = await verifyCredentials(email, password);
  if (!userId) return { error: 'That email and password don’t match an account.', fields: { email } };
  await createSession(userId);
  redirect(safeNext(form.get('next')));
}

export async function demoSignInAction(form: FormData) {
  const id = await demoUserId();
  if (!id) throw new Error('Demo account missing: run the seed.');
  await createSession(id);
  redirect(safeNext(form.get('next')));
}

export async function signUpAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const fields = {
    email: String(form.get('email') ?? '').trim(),
    handle: String(form.get('handle') ?? '').trim().toLowerCase(),
    displayName: String(form.get('displayName') ?? '').trim(),
    experience: String(form.get('experience') ?? 'learning'),
  };
  const password = String(form.get('password') ?? '');
  if (!/^\S+@\S+\.\S+$/.test(fields.email)) return { error: 'That email doesn’t look right.', fields };
  if (!/^[a-z0-9_.]{3,20}$/.test(fields.handle)) return { error: 'Handles are 3–20 letters, numbers, dots or underscores.', fields };
  if (fields.displayName.length < 1 || fields.displayName.length > 60) return { error: 'Add a display name (up to 60 characters).', fields };
  if (password.length < 8) return { error: 'Use at least 8 characters for your password.', fields };
  if (!['new', 'learning', 'enthusiast', 'collector', 'professional'].includes(fields.experience)) fields.experience = 'learning';
  try {
    const id = await createAccount({ ...fields, password });
    await createSession(id);
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message, fields };
    throw e;
  }
  redirect(safeNext(form.get('next')) === '/' ? '/shelf?welcome=1' : safeNext(form.get('next')));
}

export async function signOutAction() {
  await destroySession();
  redirect('/');
}
