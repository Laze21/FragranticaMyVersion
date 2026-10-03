import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { averageCharacter, getPerfumer, housesWorkedWith, signatureTrail, yearsActive } from '@/lib/data/people';
import { perfumerSlugs } from '@/lib/data/static-params';
import { FragranceCard } from '@/components/cards/FragranceCard';
import { CharacterBars } from '@/components/scent/CharacterBars';
import { TrailThumb } from '@/components/scent/TrailThumb';
import { TrailMark } from '@/components/shell/TrailMark';
import { Icon } from '@/components/Icon';
import { Term } from '@/components/ui/Term';
import styles from '../../editorial.module.css';

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
  return {
    title: `${d.perfumer.name}, perfumer`,
    description: String(d.perfumer.bio ?? ''),
    alternates: { canonical: `/perfumer/${slug}` },
  };
}

export default async function PerfumerPage(props: PageProps<'/perfumer/[slug]'>) {
  const { slug } = await props.params;
  const d = await getPerfumer(slug);
  if (!d) notFound();
  const p = d.perfumer;
  const name = String(p.name);
  const n = d.cards.length;
  const houses = housesWorkedWith(d.cards);
  const years = yearsActive(d.cards);
  const trail = signatureTrail(d.cards);

  return (
    <article className={`page ${styles.wide}`}>
      <div className={`${styles.band} ${styles.bandWork}`}>
        <header className={styles.identity}>
          <p className={styles.kicker}>
            <Term slug="perfumer">Perfumer</Term>
          </p>
          <h1 className={styles.title}>{name}</h1>
          <p className={styles.facts}>
            {[p.country ? COUNTRY.of(String(p.country)) : null, p.born_year ? `born ${p.born_year}` : null].filter(Boolean).join(' · ') ||
              'Where and when: not known yet'}
          </p>
          {p.bio ? <p className={styles.lede}>{String(p.bio)}</p> : <p className={`${styles.lede} ${styles.null}`}>No biography yet.</p>}
          {p.source_url ? (
            <p className={styles.links}>
              <a href={String(p.source_url)} target="_blank" rel="noopener nofollow">
                Source <Icon name="external" size={14} />
              </a>
            </p>
          ) : null}
        </header>
        <section className={`${styles.catalogue} ${styles.workSection}`} aria-labelledby="works">
          <div className={styles.catHead}>
            <h2 id="works" className={styles.h2}>
              {n === 1 ? 'One fragrance here' : `${n} fragrances here`}
            </h2>
          </div>
          <ul role="list" className={styles.works}>
            {d.cards.map((c) => (
              <li key={c.id}>
                <FragranceCard card={c} showYear sizes="(max-width: 719px) 46vw, (max-width: 1100px) 30vw, 200px" />
              </li>
            ))}
          </ul>
        </section>

        <aside className={styles.aside} aria-label={`${name} at a glance`}>
          <div className={styles.asideBlock}>
            {trail ? (
              <figure className={styles.trail}>
                <TrailThumb input={trail} size="feature" width={320} height={56} />
                <figcaption className={styles.trailCap}>
                  <TrailMark className={styles.trailMark} />
                  Signature · averaged over {n}
                </figcaption>
              </figure>
            ) : null}
            <CharacterBars vec={averageCharacter(d.cards)} limit={5} label={`${name}'s character`} />
            <p className={styles.sigNote}>
              {n === 1 ? 'One fragrance here, so this is its character, not a style.' : `Across ${n} fragrances here. A small sample, not a verdict.`}
            </p>
          </div>
          {houses.length > 0 && (
            <div className={styles.asideBlock}>
              <h2 className={styles.h3}>Worked with</h2>
              <ul role="list" className={styles.houseList}>
                {houses.map((h) => (
                  <li key={h.slug}>
                    <Link href={`/house/${h.slug}`}>{h.name}</Link>
                    <span className="tnum">{h.count === 1 ? '1 fragrance' : `${h.count} fragrances`}</span>
                  </li>
                ))}
              </ul>
              {years && (
                <p className={styles.years}>
                  {years.from === years.to ? `Work here dates from ${years.from}.` : `Work here runs from ${years.from} to ${years.to}.`}
                  {p.born_year ? '' : ' Earlier work may exist outside this catalogue.'}
                </p>
              )}
            </div>
          )}
        </aside>
      </div>
    </article>
  );
}
