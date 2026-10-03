'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DEMO_MODE } from '@/lib/config';
import styles from './DemoBanner.module.css';

const HIDE_KEY = 'demo-banner-hidden-until';
const RESHOWN_KEY = 'demo-banner-reshown';
const HIDE_FOR_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Honest by default: one line saying the catalogue is real and the community is not, yet.
 * "Hide" keeps it away for 30 days; the first fragrance page of a session brings it back once,
 * because that is where the demo figures sit.
 */
export function DemoBanner() {
  const path = usePathname();
  const [hidden, setHidden] = useState(true);
  const onFragrance = path.startsWith('/fragrance/');

  useEffect(() => {
    try {
      const until = Number(localStorage.getItem(HIDE_KEY) ?? 0);
      if (until > Date.now()) {
        if (onFragrance && !sessionStorage.getItem(RESHOWN_KEY)) {
          sessionStorage.setItem(RESHOWN_KEY, '1');
          setHidden(false);
        } else {
          setHidden(true);
        }
        return;
      }
      setHidden(false);
    } catch {
      setHidden(false);
    }
  }, [onFragrance]);

  if (!DEMO_MODE || hidden) return null;
  return (
    <div className={styles.banner} role="note">
      <p className="page">
        <span className={styles.text}>
          Prototype: real fragrances, demo votes, illustrated bottles. <Link href="/about/data">How the data works</Link>
        </span>
        <button
          type="button"
          aria-label="Hide this notice for 30 days"
          onClick={() => {
            setHidden(true);
            try {
              localStorage.setItem(HIDE_KEY, String(Date.now() + HIDE_FOR_MS));
            } catch {}
          }}
        >
          Hide
        </button>
      </p>
    </div>
  );
}
