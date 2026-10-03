import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { averageCharacter, getBrand } from '@/lib/data/people';
import { brandSlugs } from '@/lib/data/static-params';
import { FragranceCard } from '@/components/cards/FragranceCard';
import { CharacterBars } from '@/components/scent/CharacterBars';
import { Icon } from '@/components/Icon';
import { Term } from '@/components/ui/Term';
import styles from '../../profile.module.css';

export const revalidate = 600;
export async function generateStaticParams() {
  return (await brandSlugs()).map((slug) => ({ slug }));
}

const KIND: Record<string, React.ReactNode> = {
  designer: <Term slug="designer">Designer house</Term>,
  niche: <Term slug="niche">Niche house</Term>,
  heritage: 'Heritage house',
  indie: 'Independent house',
  mass: 'High-street brand',
  regional: 'Middle Eastern house',
};
const COUNTRY = new Intl.DisplayNames(['en'], { type: 'region' });

export async function generateMetadata(props: PageProps<'/house/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const d = await getBrand(slug);
  if (!d) notFound();
  if (!d) return { title: 'House not found' };
  return { title: `${d.brand.name} fragrances`, description: String(d.brand.description ?? ''), alternates: { canonical: `/house/${slug}` } };
}

export default async function HousePage(props: PageProps<'/house/[slug]'>) {
  const { slug } = await props.params;
  const d = await getBrand(slug);
  if (!d) notFound();
  const b = d.brand;
  const sig = averageCharacter(d.cards);
  const byPop = [...d.cards].sort((a, b2) => b2.ownCount - a.ownCount);
  return (
    <article className={`page ${styles.page}`}>
      <header className={styles.head}>
        <p className={styles.kicker}>{KIND[b.kind as string] ?? 'House'}</p>
        <h1 className={styles.title}>{String(b.name)}</h1>
        <p className={styles.facts}>
          {[b.city, b.country ? COUNTRY.of(String(b.country)) : null].filter(Boolean).join(', ')}
          {b.founded_year ? ` · founded ${b.founded_year}` : ''}
          {b.parent_company ? ` · part of ${b.parent_company}` : ''}
        </p>
        {b.description ? <p className={styles.lede}>{String(b.description)}</p> : null}
        <p className={styles.links}>
          {b.website_url ? (
            <a href={String(b.website_url)} target="_blank" rel="noopener nofollow">
              Official site <Icon name="external" size={14} />
            </a>
          ) : null}
          {b.wikidata_qid ? (
            <a href={`https://www.wikidata.org/wiki/${b.wikidata_qid}`} target="_blank" rel="noopener">
              Wikidata {String(b.wikidata_qid)} <Icon name="external" size={14} />
            </a>
          ) : null}
        </p>
      </header>
      <div className={styles.split}>
        <section aria-labelledby="sig">
          <h2 id="sig" className={styles.h2}>
            House signature
          </h2>
          <p className="t-meta">Average character across {d.cards.length} fragrances in our catalogue.</p>
          <div style={{ marginTop: 12 }}>
            <CharacterBars vec={sig} label={`${b.name} signature character`} />
          </div>
        </section>
        <section aria-labelledby="most">
          <h2 id="most" className={styles.h2}>
            On the most shelves
          </h2>
          <ul role="list" className={styles.rows}>
            {byPop.slice(0, 5).map((c, i) => (
              <li key={c.id}>
                <FragranceCard card={c} variant="row" rank={i + 1} />
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section aria-labelledby="all" className={styles.section}>
        <h2 id="all" className={styles.h2}>
          Every {String(b.name)} fragrance here, newest first
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
