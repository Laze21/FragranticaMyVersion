import styles from './loading.module.css';

/**
 * The table's own proportions while the fragrances load: the title line with its two controls,
 * the meta line, three column heads on the ink rule, then rows of label bars and value bars,
 * with the Trail row's three spindles. Three columns is the common case; nothing jumps much
 * when two or four arrive. The shimmer is the global one.
 */
export default function Loading() {
  const cols = [0, 1, 2];
  return (
    <div className={`page ${styles.page}`} aria-busy="true" aria-label="Loading the comparison">
      <div className={styles.headRow}>
        <div className="skeleton" style={{ height: 22, width: 110 }} />
        <div className={styles.controls}>
          <div className="skeleton" style={{ height: 32, width: 150, borderRadius: 999 }} />
          <div className="skeleton" style={{ height: 36, width: 190 }} />
        </div>
      </div>
      <div className="skeleton" style={{ height: 13, width: 260, margin: '10px 0 12px' }} />
      <div className={styles.heads}>
        <div />
        {cols.map((i) => (
          <div key={i} className={styles.head}>
            <div className="skeleton" style={{ width: 22, height: 22, borderRadius: '50%' }} />
            <div className={`skeleton ${styles.bottle}`} />
            <div className={styles.lines}>
              <div className="skeleton" style={{ height: 17, width: '70%' }} />
              <div className="skeleton" style={{ height: 12, width: '40%' }} />
            </div>
          </div>
        ))}
      </div>
      {[64, 64, 40, 36, 36, 36].map((h, r) => (
        <div key={r} className={styles.row}>
          <div className="skeleton" style={{ height: 14, width: r === 1 ? 50 : 90 }} />
          {cols.map((i) => (r === 1 ? <div key={i} className={`skeleton ${styles.spindle}`} /> : <div key={i} className="skeleton" style={{ height: h, width: r === 0 ? '96%' : `${55 + ((i * 17 + r * 9) % 35)}%` }} />))}
        </div>
      ))}
    </div>
  );
}
