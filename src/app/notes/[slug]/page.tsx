import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fragrancesListing, fragrancesPerceived, getNote, pairedNotes } from '@/lib/data/notes';
import { noteSlugs } from '@/lib/data/static-params';
import { FragranceCard } from '@/components/cards/FragranceCard';
import { Term } from '@/components/ui/Term';
import { DemoFlag } from '@/components/ui/DemoFlag';
import { DIMENSION_META, type Dimension } from '@/lib/scent/vocab';
import styles from './page.module.css';

export const revalidate = 600;

export async function generateStaticParams() {
  return (await noteSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<'/notes/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const n = await getNote(slug);
  if (!n) return { title: 'Note not found' };
  return {
    title: `${n.name}: what it smells like`,
    description: `${n.smellsLike ?? ''} Where ${n.name.toLowerCase()} comes from, what it does in a fragrance, and where people notice it most.`.trim(),
    alternates: { canonical: `/notes/${n.slug}` },
  };
}

const FAMILY_LABEL: Record<string, string> = {
  citrus: 'Citrus',
  aromatic: 'Aromatic herbs',
  green: 'Green',
  marine: 'Marine & watery',
  floral: 'Floral',
  fruity: 'Fruity',
  spice: 'Spice',
  gourmand: 'Gourmand',
  woody: 'Woods',
  resinous: 'Resins & amber',
  musk: 'Musks & clean',
  leather: 'Leather & animalic',
  smoky: 'Smoke & tobacco',
  earthy: 'Earth & moss',
  tea: 'Tea',
  mineral: 'Mineral',
};

export default async function NotePage(props: PageProps<'/notes/[slug]'>) {
  const { slug } = await props.params;
  const n = await getNote(slug);
  if (!n) notFound();
  const [listed, perceived, paired] = await Promise.all([fragrancesListing(n.id), fragrancesPerceived(n.slug, n.id), pairedNotes(n.id)]);
  const dims = (Object.entries(n.character) as Array<[Dimension, number]>).sort((a, b) => b[1] - a[1]);
  const smelledNotListed = perceived.filter((p) => !p.listed);

  return (
    <article style={{ ['--scent' as string]: n.hue }}>
      <header className={styles.hero}>
        <div className={`page ${styles.heroGrid}`}>
          <div>
            <p className={styles.crumbs}>
              <Link href="/notes">Notes</Link> <span aria-hidden>/</span> {FAMILY_LABEL[n.family] ?? n.family}
            </p>
            <h1 className={`t-title ${styles.name}`}>{n.name}</h1>
            <p className={styles.kind}>
              {n.kind === 'material' ? 'Raw material' : n.kind === 'accord' ? <Term slug="accord">Accord</Term> : 'Descriptor: a word people use for what they smell'}
              {n.synthetic && n.kind !== 'descriptor' && <> · {n.synthetic === 'natural' ? 'Natural' : n.synthetic === 'synthetic' ? 'Synthetic' : 'Natural or synthetic'}</>}
              {n.volatility && (
                <>
                  {' '}
                  · usually a <Term slug={`${n.volatility}-notes`}>{n.volatility} note</Term>
                </>
              )}
            </p>
            {n.aliases.length > 0 && <p className={styles.aka}>Also called {n.aliases.join(', ')}</p>}
          </div>
          <div className={styles.blotter} aria-hidden>
            <span />
          </div>
        </div>
      </header>

      <div className={`page ${styles.body}`}>
        <section className={styles.lead}>
          <h2 className={styles.kicker}>What it smells like</h2>
          <p className={styles.smells}>{n.smellsLike}</p>
        </section>

        <div className={styles.two}>
          {n.origin && (
            <section>
              <h2 className={styles.h2}>Where it comes from</h2>
              <p className="t-prose">{n.origin}</p>
            </section>
          )}
          {n.contributes && (
            <section>
              <h2 className={styles.h2}>What it does in a fragrance</h2>
              <p className="t-prose">{n.contributes}</p>
              {dims.length > 0 && (
                <ul role="list" className={styles.dims}>
                  {dims.map(([d, v]) => (
                    <li key={d}>
                      <i style={{ background: DIMENSION_META[d].hue }} aria-hidden /> Adds {DIMENSION_META[d].label.toLowerCase()}
                      <span className={styles.dimBar} aria-hidden>
                        <span style={{ width: `${v * 100}%` }} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        {paired.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.h2}>Often paired with</h2>
            <ul role="list" className={styles.paired}>
              {paired.map((p) => (
                <li key={p.slug}>
                  <Link href={`/notes/${p.slug}`}>
                    <i style={{ background: p.hue }} aria-hidden />
                    {p.name}
                  </Link>
                  <span className="t-meta">{p.n}×</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.h2}>Where people smell it most</h2>
            {perceived.length > 0 && <DemoFlag />}
          </div>
          {perceived.length ? (
            <>
              <ul role="list" className={styles.perceived}>
                {perceived.slice(0, 12).map((p) => (
                  <li key={p.card.id}>
                    <FragranceCard card={p.card} variant="mini" why={`${Math.round(p.share * 100)}% notice it${p.listed ? '' : ' · not on the official list'}`} />
                  </li>
                ))}
              </ul>
              {smelledNotListed.length > 0 && (
                <p className={styles.callout}>
                  People pick up {n.name.toLowerCase()} in {smelledNotListed.length} {smelledNotListed.length === 1 ? 'fragrance' : 'fragrances'} that don’t list it. That’s
                  the gap between a marketing pyramid and a nose.
                </p>
              )}
            </>
          ) : (
            <p className="t-meta">Not enough votes yet to say where people notice it.</p>
          )}
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>Officially listed in</h2>
          {listed.length ? (
            <ul role="list" className={styles.grid}>
              {listed.map((c) => (
                <li key={c.id}>
                  <FragranceCard card={c} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="t-meta">No fragrance in our catalogue lists {n.name.toLowerCase()} yet.</p>
          )}
          <p className={styles.more}>
            <Link className="arrow-link" href={`/discover?with=${n.slug}`}>
              Search everything with {n.name.toLowerCase()} →
            </Link>{' '}
            <Link className="arrow-link" href={`/discover?without=${n.slug}`}>
              …or everything without it →
            </Link>
          </p>
        </section>
      </div>
    </article>
  );
}
