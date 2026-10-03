'use client';

import { useEffect } from 'react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="page" style={{ paddingTop: 'var(--s-9)', paddingBottom: 'var(--s-10)' }} role="alert">
      <div className="cols-3-10 stack" style={{ ['--stack' as string]: 'var(--s-5)' }}>
        <h1 className="t-display" style={{ fontSize: 'var(--t-title-l)' }}>
          Something went wrong.
        </h1>
        <p className="t-prose" style={{ color: 'var(--fg-2)' }}>
          It’s us, not you. Your shelf and votes are safe. Try again, and if it keeps happening, it’s on our list.
        </p>
        <p className="cluster" style={{ ['--cluster' as string]: 'var(--s-5)' }}>
          <button type="button" className="btn" onClick={reset}>
            Try again
          </button>
          <a className="arrow-link" href="/">
            Home
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
