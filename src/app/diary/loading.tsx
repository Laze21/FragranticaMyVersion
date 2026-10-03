import styles from './page.module.css';

/**
 * The diary's own proportions while the wears load: the title line with the button, two month
 * grids beside the aside's rules on desktop, then five 56px rows. The shimmer is the global one.
 */
export default function Loading() {
  const cells = Array.from({ length: 35 });
  return (
    <div className={`page ${styles.page}`} aria-busy="true" aria-label="Loading your diary">
      <div className={styles.skelHead}>
        <div className="skeleton" style={{ height: 20, width: 240 }} />
        <div className="skeleton" style={{ height: 44, width: 132 }} />
      </div>
      <div className={styles.skelLayout}>
        <div className={styles.skelMonths}>
          {[0, 1].map((m) => (
            <div key={m} className={styles.skelMonth}>
              <div className="skeleton" style={{ height: 14, width: 120 }} />
              <div className={styles.skelGrid}>
                {cells.map((_, i) => (
                  <div key={i} className={`skeleton ${styles.skelCell}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className={styles.skelRail}>
          {[21, 44, 18, 18, 18, 60, 60].map((h, i) => (
            <div key={i} className="skeleton" style={{ height: h, width: i === 0 ? '55%' : '100%' }} />
          ))}
        </div>
      </div>
      <div className={styles.skelRows}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={styles.skelRow}>
            <div className="skeleton" style={{ height: 28, width: 40 }} />
            <div className="skeleton" style={{ height: 40, width: 30 }} />
            <div className="skeleton" style={{ height: 17, width: `${36 + ((i * 17) % 30)}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
