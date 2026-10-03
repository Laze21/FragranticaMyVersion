import type { Metadata } from 'next';
import { getPerfumersIndex, type PerfumerEntry } from '@/lib/data/directory';
import { Entry } from '@/components/directory/Entry';
import styles from '../directory.module.css';

export const revalidate = 600;
export const metadata: Metadata = {
  title: 'Perfumers',
  description: 'The people who composed the fragrances in the catalogue, by surname, with what each tends to make.',
  alternates: { canonical: '/perfumer' },
};

const COUNTRY = new Intl.DisplayNames(['en'], { type: 'region' });

function facts(p: PerfumerEntry) {
  return [p.country ? COUNTRY.of(p.country) : null, p.bornYear ? `born ${p.bornYear}` : null].filter(Boolean).join(' · ');
}

export default async function PerfumersPage() {
  const people = await getPerfumersIndex();
  return (
    <div className={`page ${styles.page}`}>
      <header className={styles.head}>
        <h1 className={`t-display ${styles.title}`}>Perfumers</h1>
        <p className={styles.lede}>
          The people who composed them. A house that credits its perfumer gets the name here; one that keeps quiet is listed as “Not disclosed” on the
          fragrance page, and that silence is a fact too. {people.length} perfumers are credited here; where two share a credit, both are listed.
        </p>
      </header>
      <section className={styles.group} aria-labelledby="all-h">
        <div className={styles.groupHead}>
          <h2 id="all-h" className={styles.groupTitle}>
            By surname
          </h2>
          <span className={styles.groupCount}>{people.length} perfumers</span>
        </div>
        <ul className={styles.list}>
          {people.map((p) => (
            <Entry key={p.slug} href={`/perfumer/${p.slug}`} name={p.name} facts={facts(p)} blurb={p.signature} count={p.count} work={p.work} />
          ))}
        </ul>
      </section>
    </div>
  );
}
