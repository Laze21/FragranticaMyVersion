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
        <p className={styles.lede}>Fragrance talk is full of borrowed French and chemistry. Here it is in plain language.</p>
      </header>
      <div className={styles.glossary}>
        {[...groups.entries()].map(([letter, ts]) => (
          <section key={letter} className={styles.letter} aria-label={`Terms starting with ${letter}`}>
            <p className={styles.letterMark} aria-hidden="true">
              {letter}
            </p>
            <ul role="list" className={styles.entries}>
              {ts.map((t) => (
                <li key={t.slug}>
                  <Link href={`/learn/${t.slug}`} className={styles.entry}>
                    <span className={styles.entryName}>{t.term}</span>
                    <span className={styles.entryDef}>{t.short}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
