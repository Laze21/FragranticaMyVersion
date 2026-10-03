'use client';

import { useEffect } from 'react';
import styles from './editorial.module.css';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className={`page ${styles.page}`} role="alert">
      <h1 className={styles.title}>Something went wrong.</h1>
      <p className={styles.lede}>It’s us, not you. Your shelf and votes are safe. Try again, and if it keeps happening, it’s on our list.</p>
      <p className="cluster" style={{ marginTop: 'var(--s-5)' }}>
        <button type="button" className="btn" onClick={reset}>
          Try again
        </button>
        <a className="btn btn--quiet" href="/">
          Home
        </a>
      </p>
      {error.digest && <p className="t-meta">Reference: {error.digest}</p>}
    </div>
  );
}
