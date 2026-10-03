import styles from './loading.module.css';

/**
 * The skeleton in the page's real proportions: the hero grid with its wash at the left, a 4:5
 * stage, the name bar, the actions row and the rule; then the section bar and the Trail's box.
 * Nothing jumps when the content arrives. The shimmer is the global 1.8s one.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading fragrance" className={styles.root}>
      <div className={`page ${styles.hero}`}>
        <div className={styles.stageCol}>
          <div className={`skeleton ${styles.stage}`} />
        </div>
        <div className={styles.identity}>
          <div className="skeleton" style={{ height: 18, width: 160 }} />
          <div className={`skeleton ${styles.name}`} />
          <div className="skeleton" style={{ height: 16, width: 260 }} />
          <div className="skeleton" style={{ height: 44, width: 360, maxWidth: '100%', marginTop: 8 }} />
          <div className={styles.rule} />
          <div className="skeleton" style={{ height: 12, width: 120 }} />
          <div className="skeleton" style={{ height: 84, width: '90%' }} />
          <div className="skeleton" style={{ height: 40, width: 260, maxWidth: '100%' }} />
        </div>
      </div>
      <div className={styles.nav} />
      <div className="page">
        <div className={`skeleton ${styles.trail}`} />
      </div>
    </div>
  );
}
