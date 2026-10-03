import Image from 'next/image';
import Link from 'next/link';
import type { FragranceCard } from '@/lib/data/types';
import { Icon } from '@/components/Icon';
import styles from '@/app/directory.module.css';

/**
 * One line of a directory: who, the facts, what they are known for, and the three fragrances of
 * theirs people own most, named in the text and standing as small bottles on the rule.
 */
export function Entry({ href, name, facts, blurb, count, work }: { href: string; name: string; facts: string; blurb: string | null; count: number; work: FragranceCard[] }) {
  return (
    <li className={styles.row}>
      <div className={styles.rowMain}>
        <h3 className={styles.name}>
          <Link href={href}>{name}</Link>
        </h3>
        {facts ? <p className={styles.facts}>{facts}</p> : null}
        {blurb ? <p className={styles.known}>{blurb}</p> : null}
        <p className={styles.names}>
          {work.map((c, i) => (
            <span key={c.slug}>
              {i > 0 ? ', ' : ''}
              <Link href={`/fragrance/${c.slug}`}>{c.name}</Link>
            </span>
          ))}
          {count > work.length ? ` and ${count - work.length} more` : ''}
        </p>
      </div>
      <div className={styles.work}>
        <span className={styles.count}>{count === 1 ? '1 here' : `${count} here`}</span>
        <ul className={styles.thumbs} aria-hidden="true">
          {work.map((c) => (
            <li key={c.slug} className={styles.thumb}>
              {c.poster ? <Image src={c.poster} alt="" fill sizes="44px" /> : <Icon name="bottle" size={24} />}
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}
