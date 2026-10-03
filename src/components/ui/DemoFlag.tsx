import Link from 'next/link';
import { DEMO_MODE } from '@/lib/config';
import { Popover } from './Popover';
import styles from './DemoFlag.module.css';

/**
 * Marks community figures that include generated demo baselines. Never let fake numbers pass
 * as real. The explanation is a popover, not a title attribute, so it works by touch and
 * keyboard and reads the same everywhere.
 */
export function DemoFlag({ label = 'Demo figures' }: { label?: string }) {
  if (!DEMO_MODE) return null;
  return (
    <Popover label="About the demo figures" triggerClassName={`demo-flag ${styles.flag}`} trigger={label}>
      <span className={styles.head}>{label}</span>
      <span className={styles.body}>
        These distributions are generated so the charts can be explored. No real votes are counted here yet.
      </span>
      <Link href="/about/data" className={styles.more}>
        How the data works
      </Link>
    </Popover>
  );
}
