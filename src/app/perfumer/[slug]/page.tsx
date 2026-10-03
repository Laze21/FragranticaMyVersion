import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { averageCharacter, getPerfumer } from '@/lib/data/people';
import { perfumerSlugs } from '@/lib/data/static-params';
import { FragranceCard } from '@/components/cards/FragranceCard';
import { CharacterBars } from '@/components/scent/CharacterBars';
import { Icon } from '@/components/Icon';
import { Term } from '@/components/ui/Term';
import styles from '../../profile.module.css';

export const revalidate = 600;
export async function generateStaticParams() {
  return (await perfumerSlugs()).map((slug) => ({ slug }));
}
const COUNTRY = new Intl.DisplayNames(['en'], { type: 'region' });

export async function generateMetadata(props: PageProps<'/perfumer/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const d = await getPerfumer(slug);
  if (!d) notFound();
  if (!d) return { title: 'Perfumer not found' };
  return { title: `${d.perfumer.name}, perfumer`, description: String(d.perfumer.bio ?? ''), alternates: { canonical: `/perfumer/${slug}` } };
}

export default async function PerfumerPage(props: PageProps<'/perfumer/[slug]'>) {
  const { slug } = await props.params;
  const d = await getPerfumer(slug);
  if (!d) notFound();
  const p = d.perfumer;
  const houses = Array.from(new Map(d.cards.map((c) => [c.brandSlug, c.brandName])).entries());
  return (
    <article className={`page ${styles.page}`}>
      <header className={styles.head}>
        <p className={styles.kicker}>
          <Term slug="perfumer">Perfumer</Term>
        </p>
        <h1 className={styles.title}>{String(p.name)}</h1>
        <p className={styles.facts}>
          {p.country ? COUNTRY.of(String(p.country)) : null}
          {p.born_year ? ` · born ${p.born_year}` : ''}
          {houses.length ? (
            <>
              {' '}
              · worked with{' '}
              {houses.map(([s, n], i) => (
                <span key={s}>
                  {i > 0 && ', '}
                  <Link href={`/house/${s}`}>{n}</Link>
                </span>
              ))}
            </>
          ) : null}
        </p>
        {p.bio ? <p className={styles.lede}>{String(p.bio)}</p> : null}
        {p.source_url ? (
          <p className={styles.links}>
            <a href={String(p.source_url)} target="_blank" rel="noopener nofollow">
              Source <Icon name="external" size={14} />
            </a>
          </p>
        ) : null}
      </header>
      <section aria-labelledby="sig" className={styles.section}>
        <h2 id="sig" className={styles.h2}>
          Their work, in character
        </h2>
        <p className="t-meta">Average across {d.cards.length} fragrances in our catalogue. A small sample, not a verdict.</p>
        <div style={{ marginTop: 12, maxWidth: 560 }}>
          <CharacterBars vec={averageCharacter(d.cards)} label={`${p.name}'s character`} />
        </div>
      </section>
      <section aria-labelledby="works" className={styles.section}>
        <h2 id="works" className={styles.h2}>
          Fragrances
        </h2>
        <ul role="list" className={styles.grid}>
          {d.cards.map((c) => (
            <li key={c.id}>
              <FragranceCard card={c} />
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
