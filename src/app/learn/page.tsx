import type { Metadata } from 'next';
import Link from 'next/link';
import { glossaryTerms } from '@/lib/glossary';
import styles from '../editorial.module.css';

export const metadata: Metadata = {
  title: 'Learn the words',
  description: 'Sillage, drydown, EDT vs EDP, chypre, fougère: fragrance vocabulary in plain language.',
  alternates: { canonical: '/learn' },
};

export default function LearnPage() {
  const terms = glossaryTerms();
  const groups = new Map<string, typeof terms>();
  for (const t of terms) {
    const k = t.term[0].toUpperCase().replace(/[^A-Z]/, '#');
    groups.set(k, [...(groups.get(k) ?? []), t]);
  }
  return (
    <div className={`page ${styles.page}`}>
      <header className={styles.head}>
        <h1 className={styles.title}>Learn the words</h1>
        <p className={styles.lede}>
          Fragrance talk is full of borrowed French and chemistry. Here it is in plain language. Every term on the site links back here when you
          tap it.
        </p>
      </header>
      <dl className={styles.glossary}>
        {[...groups.entries()].map(([letter, ts]) => (
          <div key={letter} className={styles.letter}>
            <p className={styles.letterMark} aria-hidden>
              {letter}
            </p>
            <div>
              {ts.map((t) => (
                <div key={t.slug} className={styles.term}>
                  <dt>
                    <Link href={`/learn/${t.slug}`}>{t.term}</Link>
                  </dt>
                  <dd>{t.short}</dd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}
