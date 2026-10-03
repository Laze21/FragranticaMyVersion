import styles from './page.module.css';

/**
 * The page's own proportions while the first search answers: the title bar, the 52px field,
 * the rail's label bars on desktop and a grid of floors with a bottle-shaped block standing on
 * each, so nothing jumps when the cards arrive. The shimmer is the global one.
 */
export default function Loading() {
  return (
    <div className={`page ${styles.page}`} aria-busy="true" aria-label="Loading discover">
      <div className={`skeleton ${styles.skelTitle}`} />
      <div className={`skeleton ${styles.skelField}`} />
      <div className={styles.skelLayout}>
        <div className={styles.skelRail}>
          {[120, 44, 44, 132, 90, 44, 160, 90].map((h, i) => (
            <div key={i} className="skeleton" style={{ height: h, width: i % 3 === 0 ? '40%' : '100%' }} />
          ))}
        </div>
        <div className={styles.skelGrid}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={styles.skelCard}>
              <div className={styles.skelGround}>
                <div className={`skeleton ${styles.skelBottle}`} />
              </div>
              <div className="skeleton" style={{ height: 13, width: '45%' }} />
              <div className="skeleton" style={{ height: 20, width: '70%' }} />
              <div className="skeleton" style={{ height: 13, width: '85%' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
