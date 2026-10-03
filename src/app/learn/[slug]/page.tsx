import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GLOSSARY_BY_SLUG, glossaryTerms } from '@/lib/glossary';
import { getNoteIndex } from '@/lib/data/catalog';
import { Blotter } from '@/components/scent/Blotter';
import styles from '../../editorial.module.css';

export function generateStaticParams() {
  return glossaryTerms().map((t) => ({ slug: t.slug }));
}

export async function generateMetadata(props: PageProps<'/learn/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const t = GLOSSARY_BY_SLUG[slug];
  if (!t) return { title: 'Not found' };
  return {
    title: `${t.term}: what it means`,
    description: t.short,
    alternates: { canonical: `/learn/${slug}` },
  };
}

export default async function TermPage(props: PageProps<'/learn/[slug]'>) {
  const { slug } = await props.params;
  const t = GLOSSARY_BY_SLUG[slug];
  if (!t) notFound();
  const notes = await getNoteIndex();
  const seeNotes = (t.seeAlsoNotes ?? []).filter((s) => notes[s]);
  const related = (t.related ?? []).filter((r) => GLOSSARY_BY_SLUG[r]);
  return (
    <article className={`page ${styles.page}`}>
      <p className={styles.crumbs}>
        <Link href="/learn">Learn the words</Link>
      </p>
      <h1 className={`${styles.title} ${styles.termTitle}`}>{t.term}</h1>
      <p className={styles.short}>{t.short}</p>
      <div className="t-prose">
        {t.long.split(/\n\n+/).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {seeNotes.length > 0 && (
        <section className={styles.related} aria-labelledby="notes-h">
          <h2 id="notes-h" className={styles.h3}>
            Notes to know
          </h2>
          <ul role="list" className={styles.chips}>
            {seeNotes.map((s) => (
              <li key={s}>
                <Link className={`chip ${styles.chipNote}`} href={`/notes/${s}`}>
                  <Blotter hue={notes[s].hue} />
                  {notes[s].name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {related.length > 0 && (
        <section className={styles.related} aria-labelledby="related-h">
          <h2 id="related-h" className={styles.h3}>
            Related words
          </h2>
          <ul role="list" className={styles.chips}>
            {related.map((r) => (
              <li key={r}>
                <Link className="chip" href={`/learn/${r}`}>
                  {GLOSSARY_BY_SLUG[r].term}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
