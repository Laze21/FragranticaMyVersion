import { confidence, formatNumber } from '@/lib/scent/read';
import { DemoFlag } from '@/components/ui/DemoFlag';
import styles from './sections.module.css';

export function SectionHead({
  id,
  title,
  lede,
  votes,
  votesLabel = 'people',
  demo,
  children,
}: {
  id: string;
  title: string;
  lede?: React.ReactNode;
  votes?: number;
  votesLabel?: string;
  demo?: boolean;
  children?: React.ReactNode;
}) {
  const c = votes !== undefined ? confidence(votes) : null;
  return (
    <div className={styles.head}>
      <div className={styles.headText}>
        <h2 id={id} className={styles.title}>
          {title}
        </h2>
        {lede && <p className={styles.lede}>{lede}</p>}
      </div>
      {(c || children || demo) && (
        <div className={styles.meta}>
          {votes !== undefined && (
            <span>
              {formatNumber(votes)} {votesLabel}
            </span>
          )}
          {c && (
            <span className={styles.conf} title="How settled this number is, based on how many people contributed">
              <span className={styles.confBars} aria-hidden>
                <i data-on={c.level >= 1 || undefined} />
                <i data-on={c.level >= 2 || undefined} />
                <i data-on={c.level >= 3 || undefined} />
              </span>
              {c.label}
            </span>
          )}
          {demo && <DemoFlag />}
          {children}
        </div>
      )}
    </div>
  );
}
