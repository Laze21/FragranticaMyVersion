'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { submitContribution, type ContributeState } from '@/app/actions/moderation';
import styles from './ContributeForm.module.css';

const KINDS = [
  ['new_fragrance', 'A fragrance that’s missing'],
  ['correction', 'A correction'],
  ['official_notes', 'Official notes'],
  ['perfumer_attribution', 'Who made it'],
  ['new_concentration', 'A new concentration or flanker'],
  ['image', 'A photo you took'],
] as const;

export function ContributeForm({ target, initialKind }: { target: { slug: string; name: string } | null; initialKind: string }) {
  const [state, action, pending] = useActionState<ContributeState, FormData>(submitContribution, {});
  const [kind, setKind] = useState(initialKind);
  const needsTarget = kind !== 'new_fragrance';
  return (
    <form action={action} className={styles.form}>
      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}
      <fieldset className={styles.fs}>
        <legend>What are you suggesting?</legend>
        <div className="cluster">
          {KINDS.map(([k, l]) => (
            <label key={k} className={`chip ${styles.kind}`} data-on={kind === k || undefined}>
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="visually-hidden" />
              {l}
            </label>
          ))}
        </div>
      </fieldset>
      {needsTarget && (
        <div className="field">
          <label htmlFor="fragrance">Which fragrance? (its address, e.g. dior-sauvage)</label>
          <input id="fragrance" name="fragrance" className="input" defaultValue={target?.slug} required />
          {target && <span className="field-hint">About {target.name}</span>}
        </div>
      )}
      {kind === 'new_fragrance' && (
        <div className={styles.two}>
          <div className="field">
            <label htmlFor="name">Fragrance name</label>
            <input id="name" name="name" className="input" required />
          </div>
          <div className="field">
            <label htmlFor="house">House</label>
            <input id="house" name="house" className="input" required />
          </div>
          <div className="field">
            <label htmlFor="year">Launch year</label>
            <input id="year" name="year" className="input" inputMode="numeric" maxLength={4} />
          </div>
          <div className="field">
            <label htmlFor="concentration">Concentration</label>
            <select id="concentration" name="concentration" className="select" defaultValue="">
              <option value="">Not sure</option>
              <option value="edt">Eau de Toilette</option>
              <option value="edp">Eau de Parfum</option>
              <option value="parfum">Parfum</option>
              <option value="extrait">Extrait</option>
              <option value="cologne">Cologne</option>
              <option value="body_mist">Body mist</option>
            </select>
          </div>
        </div>
      )}
      {kind === 'correction' && (
        <div className={styles.two}>
          <div className="field">
            <label htmlFor="field">What’s wrong?</label>
            <select id="field" name="field" className="select">
              <option value="release_year">Launch year</option>
              <option value="concentration">Concentration</option>
              <option value="status">Availability (discontinued etc.)</option>
              <option value="perfumers">Perfumer</option>
              <option value="notes">Notes</option>
              <option value="name">Name</option>
              <option value="other">Something else</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="value">What should it say?</label>
            <input id="value" name="value" className="input" required />
          </div>
        </div>
      )}
      {(kind === 'official_notes' || kind === 'new_fragrance') && (
        <div className="field">
          <label htmlFor="notes">Official notes, as the house lists them</label>
          <textarea id="notes" name="notes" className="textarea" rows={3} placeholder="Top: … Heart: … Base: …" />
        </div>
      )}
      <div className="field">
        <label htmlFor="sourceUrl">Source</label>
        <input id="sourceUrl" name="sourceUrl" className="input" type="url" placeholder="https://… the house’s product page or press release" />
        <span className="field-hint">The house’s own page, a press release, or a retailer listing. Not another fragrance database.</span>
      </div>
      <div className="field">
        <label htmlFor="evidenceUrl">Photo of the box or bottle (optional link)</label>
        <input id="evidenceUrl" name="evidenceUrl" className="input" type="url" />
      </div>
      <div className="field">
        <label htmlFor="details">Anything else?</label>
        <textarea id="details" name="details" className="textarea" rows={3} />
      </div>
      {state.duplicate && (
        <div className={styles.dupe} role="alert">
          <p>
            Is it <Link href={`/fragrance/${state.duplicate.slug}`}>{state.duplicate.name}</Link> by {state.duplicate.brand}? If so, suggest a correction on that page
            instead.
          </p>
          <label className={styles.check}>
            <input type="checkbox" name="confirmNotDuplicate" /> No, this is a different fragrance
          </label>
        </div>
      )}
      <label className={styles.check}>
        <input type="checkbox" name="attest" required /> I didn’t copy this from another fragrance database or website’s descriptions.
      </label>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? 'Sending…' : 'Send for review'}
      </button>
    </form>
  );
}
