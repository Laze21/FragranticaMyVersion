'use client';

import { useEffect, useState } from 'react';
import { TrailChart } from '@/components/scent/TrailChart';
import { TrailMark } from '@/components/shell/TrailMark';
import type { TrailInput } from '@/lib/scent/trail';
import { confidence, formatNumber } from '@/lib/scent/read';
import styles from './TrailFigure.module.css';

/**
 * The Trail at full width under the section bar: the page's signature, drawn once per visit.
 * 320px tall on desktop, 220 on tablets, 200 on phones; a caption row above it names the figure
 * and says how many people are behind it.
 */
export function TrailFigure({ input, name, votes }: { input: TrailInput; name: string; votes: number }) {
  const [height, setHeight] = useState(320);
  useEffect(() => {
    const tablet = window.matchMedia('(min-width: 720px) and (max-width: 1099px)');
    const phone = window.matchMedia('(max-width: 719px)');
    const sync = () => setHeight(phone.matches ? 200 : tablet.matches ? 220 : 320);
    sync();
    tablet.addEventListener('change', sync);
    phone.addEventListener('change', sync);
    return () => {
      tablet.removeEventListener('change', sync);
      phone.removeEventListener('change', sync);
    };
  }, []);
  const conf = confidence(votes);
  return (
    <div className={styles.figure} id="trail">
      <div className={styles.caption}>
        <span className={styles.word}>
          <TrailMark className={styles.mark} />
          Trail
        </span>
        <span className={styles.meta}>
          <b>{formatNumber(votes)}</b> {votes === 1 ? 'person' : 'people'}
          <span className={styles.conf}>
            <span className={styles.confBars} aria-hidden>
              <i data-on={conf.level >= 1 || undefined} />
              <i data-on={conf.level >= 2 || undefined} />
              <i data-on={conf.level >= 3 || undefined} />
            </span>
            {conf.label}
          </span>
        </span>
      </div>
      <TrailChart input={input} name={name} height={height} />
    </div>
  );
}
