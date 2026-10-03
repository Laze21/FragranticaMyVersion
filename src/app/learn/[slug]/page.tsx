import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GLOSSARY_BY_SLUG, glossaryTerms } from '@/lib/glossary';
import { getNoteIndex } from '@/lib/data/catalog';
import styles from '../../editorial.module.css';

export function generateStaticParams() {
  return glossaryTerms().map((t) => ({ slug: t.slug }));
}

export async function generateMetadata(props: PageProps<'/learn/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const t = GLOSSARY_BY_SLUG[slug];
  if (!t) return { title: 'Not found' };
  return { title: `${t.term}: what it means`, description: t.short, alternates: { canonical: `/learn/${slug}` } };
}

export default async function TermPage(props: PageProps<'/learn/[slug]'>) {
  const { slug } = await props.params;
  const t = GLOSSARY_BY_SLUG[slug];
  if (!t) notFound();
  const notes = await getNoteIndex();
  return (
    <article className={`page ${styles.page}`}>
      <p className={styles.crumbs}>
        <Link href="/learn">Learn the words</Link>
      </p>
      <h1 className={`t-title ${styles.termTitle}`}>{t.term}</h1>
      <p className={styles.short}>{t.short}</p>
      <div className="t-prose">
        {t.long.split(/\n\n+/).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {(t.seeAlsoNotes?.length ?? 0) > 0 && (
        <section className={styles.related}>
          <h2 className={styles.h2}>Notes to know</h2>
          <ul role="list" className="cluster">
            {t.seeAlsoNotes!.filter((s) => notes[s]).map((s) => (
              <li key={s}>
                <Link className="chip" href={`/notes/${s}`}>
                  <i style={{ width: 10, height: 10, borderRadius: '50%', background: notes[s].hue }} aria-hidden /> {notes[s].name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {(t.related?.length ?? 0) > 0 && (
        <section className={styles.related}>
          <h2 className={styles.h2}>Related words</h2>
          <ul role="list" className="cluster">
            {t.related!.filter((r) => GLOSSARY_BY_SLUG[r]).map((r) => (
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
