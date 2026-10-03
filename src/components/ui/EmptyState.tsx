import { Icon, type IconName } from '@/components/Icon';
import styles from './EmptyState.module.css';

type Variant = 'section' | 'nothing-matches' | 'yours';

/**
 * Three empty states, none of them a flat paper box.
 * - `section`: a data section with nothing in it yet. Hairline top, a 24px mark from the icon
 *   set, the serif line, the sans line that states the rule ("Ranges appear once five people
 *   report"), and the vote button inline, so the state has its own action.
 * - `nothing-matches`: discover with no results. The relax chips (children) and "Nearest we
 *   have" (`nearest`) so the page never ends on nothing.
 * - `yours`: an empty shelf or diary. The ledge drawn empty with one dotted bottle outline,
 *   and the primary call to action standing on it.
 */
export function EmptyState({
  variant = 'section',
  icon,
  title,
  line,
  action,
  children,
  nearest,
  className,
}: {
  variant?: Variant;
  icon?: IconName;
  /** The serif line. Written as a sentence about this fragrance or this person, not a generic "No data". */
  title: React.ReactNode;
  /** The sans line: the rule, or what is honest to say about the gap. */
  line?: React.ReactNode;
  /** The in-state action: a vote button, a link to write, the shelf's "Find something to put on it". */
  action?: React.ReactNode;
  /** `nothing-matches`: the relax chips. */
  children?: React.ReactNode;
  /** `nothing-matches`: the three nearest cards, already rendered. */
  nearest?: React.ReactNode;
  className?: string;
}) {
  if (variant === 'yours') {
    return (
      <div className={`${styles.yours} ${className ?? ''}`}>
        <div className={styles.plank} aria-hidden>
          <svg className={styles.outline} viewBox="0 0 48 120" width="48" height="120">
            <path d="M18 2h12v10h-12zM14 12h20v8h-20zM10 20h28v92a4 4 0 0 1-4 4h-20a4 4 0 0 1-4-4z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" strokeLinejoin="round" />
          </svg>
          <span className={styles.top} />
          <span className={styles.front} />
        </div>
        <p className={styles.serif}>{title}</p>
        {line && <p className={styles.sans}>{line}</p>}
        {action && <div className={styles.action}>{action}</div>}
      </div>
    );
  }
  if (variant === 'nothing-matches') {
    return (
      <div className={`${styles.nothing} ${className ?? ''}`}>
        <p className={styles.serif}>{title}</p>
        {line && <p className={styles.sans}>{line}</p>}
        {children && <div className={styles.chips}>{children}</div>}
        {nearest && (
          <section className={styles.nearest} aria-labelledby="nearest-we-have">
            <h3 id="nearest-we-have" className={styles.nearestHead}>
              Nearest we have
            </h3>
            {nearest}
          </section>
        )}
      </div>
    );
  }
  return (
    <div className={`${styles.section} ${className ?? ''}`}>
      {icon && <Icon name={icon} size={24} className={styles.mark} />}
      <p className={styles.serif}>{title}</p>
      {line && <p className={styles.sans}>{line}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
