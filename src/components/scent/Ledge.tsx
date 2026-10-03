import type { CSSProperties, ReactNode } from 'react';
import styles from './Ledge.module.css';

/**
 * The shelf plank: a top face the bottles stand on and a front face with a soft drop beneath.
 * Children are the bottles (or cards) in a row of `slots` columns; they are bottom-aligned so
 * tall and short bottles share one floor. Used by the shelf, profiles, lists, home "Newest",
 * a note's "Officially listed in" and a perfumer's "Fragrances".
 */
export function Ledge({
  children,
  label,
  slots,
  minSlot = 150,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  /** a short caption on the plank's shoulder: "Owned", "Testing", "Newest" */
  label?: ReactNode;
  /** fixed column count; when absent the row packs as many `minSlot`-wide columns as fit */
  slots?: number;
  minSlot?: number;
  className?: string;
  as?: 'div' | 'section' | 'li';
}) {
  const style = { ['--slots' as string]: slots ? String(slots) : undefined, ['--slot-min' as string]: `${minSlot}px` } as CSSProperties;
  return (
    <Tag className={[styles.ledge, className ?? ''].join(' ').trim()} style={style} data-fixed={slots ? '' : undefined}>
      {label && <p className={styles.label}>{label}</p>}
      <div className={styles.row}>{children}</div>
      <div className={styles.plank} aria-hidden="true">
        <span className={styles.top} />
        <span className={styles.front} />
      </div>
    </Tag>
  );
}
