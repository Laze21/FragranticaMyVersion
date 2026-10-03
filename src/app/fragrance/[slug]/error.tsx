'use client';

import { useEffect } from 'react';

/** The page for one fragrance failed; the rest of the site is fine, so say so and offer the two ways on. */
export default function FragranceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="page" style={{ paddingTop: 'var(--s-9)', paddingBottom: 'var(--s-10)' }} role="alert">
      <div className="cols-3-10 stack" style={{ ['--stack' as string]: 'var(--s-5)' }}>
        <h1 className="t-display" style={{ fontSize: 'var(--t-title-l)' }}>
          The page for this fragrance didn’t load.
        </h1>
        <p className="t-prose" style={{ color: 'var(--fg-2)' }}>
          Try again, or search for it. Your shelf and votes are safe.
        </p>
        <p className="cluster" style={{ ['--cluster' as string]: 'var(--s-5)' }}>
          <button type="button" className="btn" onClick={reset}>
            Try again
          </button>
          <a href="/discover" className="btn btn--quiet">
            Search for it
          </a>
        </p>
        {error.digest && (
          <p className="t-meta">
            Reference: <span className="tnum">{error.digest}</span>
          </p>
        )}
      </div>
    </div>
  );
}
