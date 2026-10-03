'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { demoSignInAction, signInAction, signUpAction, type AuthState } from '@/app/actions/auth';
import styles from './AuthForms.module.css';

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signInAction, {});
  return (
    <div className={styles.box}>
      <form action={action} className={styles.form} noValidate>
        <input type="hidden" name="next" value={next} />
        {state.error && (
          <p className={styles.error} role="alert">
            {state.error}
          </p>
        )}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" className="input" defaultValue={state.fields?.email} required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" className="input" required />
        </div>
        <button className="btn" type="submit" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <div className={styles.demo}>
        <p>
          <b>Just looking around?</b> Use the demo account: it already has a shelf and a wear diary. (Email <code>demo@example.com</code>, password{' '}
          <code>fragrance</code>.)
        </p>
        <form action={demoSignInAction}>
          <input type="hidden" name="next" value={next} />
          <button className="btn btn--quiet" type="submit">
            Continue as the demo account
          </button>
        </form>
      </div>
      <p className={styles.switch}>
        New here? <Link href={`/sign-up?next=${encodeURIComponent(next)}`}>Create an account</Link>
      </p>
    </div>
  );
}

export function SignUpForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUpAction, {});
  return (
    <div className={styles.box}>
      <form action={action} className={styles.form} noValidate>
        <input type="hidden" name="next" value={next} />
        {state.error && (
          <p className={styles.error} role="alert">
            {state.error}
          </p>
        )}
        <div className="field">
          <label htmlFor="displayName">Your name</label>
          <input id="displayName" name="displayName" autoComplete="name" className="input" defaultValue={state.fields?.displayName} required maxLength={60} />
        </div>
        <div className="field">
          <label htmlFor="handle">Handle</label>
          <input
            id="handle"
            name="handle"
            className="input"
            autoComplete="username"
            defaultValue={state.fields?.handle}
            required
            pattern="[a-z0-9_.]{3,20}"
            aria-describedby="handle-hint"
            autoCapitalize="none"
          />
          <span id="handle-hint" className="field-hint">
            3–20 lowercase letters, numbers, dots or underscores. Your shelf lives at /u/handle.
          </span>
        </div>
        <div className="field">
          <label htmlFor="su-email">Email</label>
          <input id="su-email" name="email" type="email" autoComplete="email" className="input" defaultValue={state.fields?.email} required />
        </div>
        <div className="field">
          <label htmlFor="su-password">Password</label>
          <input id="su-password" name="password" type="password" autoComplete="new-password" className="input" minLength={8} required aria-describedby="pw-hint" />
          <span id="pw-hint" className="field-hint">
            At least 8 characters.
          </span>
        </div>
        <fieldset className={styles.exp}>
          <legend>How well do you know fragrance? (Optional, shown next to your reviews.)</legend>
          {[
            ['new', 'Just starting'],
            ['learning', 'Learning'],
            ['enthusiast', 'Enthusiast'],
            ['collector', 'Collector'],
            ['professional', 'Work in the industry'],
          ].map(([k, l]) => (
            <label key={k} className={styles.radio}>
              <input type="radio" name="experience" value={k} defaultChecked={(state.fields?.experience ?? 'learning') === k} /> {l}
            </label>
          ))}
        </fieldset>
        <button className="btn" type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create account'}
        </button>
      </form>
      <p className={styles.switch}>
        Already have one? <Link href={`/sign-in?next=${encodeURIComponent(next)}`}>Sign in</Link>
      </p>
    </div>
  );
}
