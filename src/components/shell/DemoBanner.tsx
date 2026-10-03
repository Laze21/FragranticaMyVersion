'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DEMO_MODE } from '@/lib/config';
import styles from './DemoBanner.module.css';

/** Honest by default: the prototype says up front that its catalogue and community are demo data. */
export function DemoBanner() {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      setHidden(sessionStorage.getItem('demo-banner') === 'off');
    } catch {
      setHidden(false);
    }
  }, []);
  if (!DEMO_MODE || hidden) return null;
  return (
    <div className={styles.banner} role="note">
      <p className="page">
        <span>
          Prototype: real fragrances, but community figures are demo data and bottle images are illustrations. <Link href="/about/data">How the data works</Link>
        </span>
        <button
          type="button"
          aria-label="Hide this notice"
          onClick={() => {
            setHidden(true);
            try {
              sessionStorage.setItem('demo-banner', 'off');
            } catch {}
          }}
        >
          Hide
        </button>
      </p>
    </div>
  );
}
