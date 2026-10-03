import styles from './page.module.css';

/**
 * The shelf's own proportions while the collection loads: the title line, the tab row, one
 * plank with bottle-shaped blocks standing on it and the rail's rules on desktop. The shimmer
 * is the global one.
 */
export default function Loading() {
  const slots = 8;
  return (
    <div className={`page ${styles.page}`} aria-busy="true" aria-label="Loading your shelf">
      <div className={styles.skelHead}>
        <div className="skeleton" style={{ height: 20, width: 220 }} />
        <div className="skeleton" style={{ height: 36, width: 150 }} />
      </div>
      <div className={styles.skelTabs}>
        {[96, 72, 84, 80, 76].map((w, i) => (
          <div key={i} className="skeleton" style={{ height: 32, width: w, borderRadius: 999 }} />
        ))}
      </div>
      <div className={styles.skelLayout}>
        <div>
          <div className={styles.skelPlank} style={{ ['--slots' as string]: slots }}>
            {[128, 112, 140, 104, 120, 96, 132, 116].map((h, i) => (
              <div key={i} className={`skeleton ${styles.skelBottle}`} style={{ height: h }} />
            ))}
          </div>
          <div className={styles.skelCaps} style={{ ['--slots' as string]: slots }}>
            {Array.from({ length: slots }, (_, i) => (
              <div key={i} style={{ display: 'grid', gap: 4 }}>
                <div className="skeleton" style={{ height: 17, width: '80%' }} />
                <div className="skeleton" style={{ height: 12, width: '50%' }} />
              </div>
            ))}
          </div>
        </div>
        <div className={styles.skelRail}>
          {[21, 64, 18, 18, 110, 70, 60, 100].map((h, i) => (
            <div key={i} className="skeleton" style={{ height: h, width: i === 0 ? '60%' : '100%' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
