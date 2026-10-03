'use client';

import { useActionState, useState } from 'react';
import { submitReview, type ReviewFormState } from '@/app/actions/reviews';
import { ScoreRow } from '@/components/fragrance/VoteProvider';
import { REVIEW_FOCUS } from '@/lib/scent/vocab';
import styles from './ReviewComposer.module.css';

interface Initial {
  kind: 'quick' | 'full';
  title: string;
  body: string;
  rating: number;
  focus: string[];
  ownership: string;
  gifted: boolean;
  giftNote: string;
}

const PROMPTS = {
  quick: 'Two to four sentences. What did it smell like on you, and would you wear it again?',
  full: 'Take your time: the opening, how it changed, how long it lasted, where you wore it, what it reminded you of.',
};

export function ReviewComposer({ slug, initial, suggestedOwnership, wears }: { slug: string; initial: Initial | null; suggestedOwnership: string; wears: number }) {
  const [state, action, pending] = useActionState<ReviewFormState, FormData>(submitReview, {});
  const [kind, setKind] = useState<'quick' | 'full'>(initial?.kind ?? 'quick');
  const [body, setBody] = useState(initial?.body ?? '');
  const [rating, setRating] = useState<number | null>(initial?.rating ?? null);
  const [gifted, setGifted] = useState(initial?.gifted ?? false);
  const limit = kind === 'quick' ? 600 : 20000;
  const min = kind === 'quick' ? 20 : 200;

  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="rating" value={rating ?? ''} />
      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}
      <div className={styles.kinds} role="radiogroup" aria-label="Review type">
        <button type="button" role="radio" aria-checked={kind === 'quick'} onClick={() => setKind('quick')}>
          <b>Quick take</b>
          <span>2–4 sentences</span>
        </button>
        <button type="button" role="radio" aria-checked={kind === 'full'} onClick={() => setKind('full')}>
          <b>Full review</b>
          <span>Long-form, with a title</span>
        </button>
      </div>

      <fieldset className={styles.fs}>
        <legend>Your score</legend>
        <ScoreRow label="Overall score out of 10" value={rating} onChange={setRating} />
      </fieldset>

      {kind === 'full' && (
        <div className="field">
          <label htmlFor="title">Title</label>
          <input id="title" name="title" className="input" defaultValue={initial?.title} maxLength={120} placeholder="e.g. Better in the cold than I expected" />
        </div>
      )}
      <div className="field">
        <label htmlFor="body">{kind === 'quick' ? 'Your quick take' : 'Your review'}</label>
        <textarea
          id="body"
          name="body"
          className="textarea"
          rows={kind === 'quick' ? 4 : 14}
          maxLength={limit}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={PROMPTS[kind]}
          aria-describedby="body-count"
        />
        <span id="body-count" className="field-hint" aria-live="polite">
          {body.length < min ? `${min - body.length} more characters to go` : `${body.length.toLocaleString()} / ${limit.toLocaleString()}`}
        </span>
      </div>

      <fieldset className={styles.fs}>
        <legend>What’s it mostly about? (Helps people filter.)</legend>
        <div className={styles.chips}>
          {REVIEW_FOCUS.map((f) => (
            <label key={f.key} className={styles.check}>
              <input type="checkbox" name="focus" value={f.key} defaultChecked={initial?.focus.includes(f.key)} /> {f.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="ownership">How you know it</label>
        <select id="ownership" name="ownership" className="select" defaultValue={initial?.ownership ?? suggestedOwnership}>
          <option value="">Prefer not to say</option>
          <option value="own">I own a bottle</option>
          <option value="owned">I used to own a bottle</option>
          <option value="decant">I have a decant</option>
          <option value="sample">I tried a sample</option>
          <option value="tested">I tested it in a store</option>
        </select>
        {wears > 0 && <span className="field-hint">Your diary shows {wears} {wears === 1 ? 'wear' : 'wears'}; that’s shown next to your review.</span>}
      </div>

      <fieldset className={styles.fs}>
        <legend>Disclosure</legend>
        <label className={styles.check}>
          <input type="checkbox" name="gifted" checked={gifted} onChange={(e) => setGifted(e.target.checked)} /> I got this free (gift, press sample, brand partnership)
        </label>
        {gifted && (
          <div className="field" style={{ marginTop: 8 }}>
            <label htmlFor="giftNote">How you got it</label>
            <input id="giftNote" name="giftNote" className="input" defaultValue={initial?.giftNote} maxLength={200} placeholder="e.g. sent by the house for review" />
          </div>
        )}
      </fieldset>

      <div className={styles.actions}>
        <button className="btn" type="submit" disabled={pending || !rating || body.length < min}>
          {pending ? 'Publishing…' : initial ? 'Update review' : 'Publish'}
        </button>
        <span className="t-meta">Reviews are public. Be specific, be fair, and never paste text from another site.</span>
      </div>
    </form>
  );
}
