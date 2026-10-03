import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fragrancesListing, fragrancesPerceived, getNote, pairedNotes } from '@/lib/data/notes';
import { noteSlugs } from '@/lib/data/static-params';
import type { FragranceCard } from '@/lib/data/types';
import { Blotter } from '@/components/scent/Blotter';
import { Ledge } from '@/components/scent/Ledge';
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
  if (!n) notFound();
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

/* Real scale on the plank: 70mm to 170mm maps to 60-100% of the slot, the same rule the cards use. */
function slotHeight(mm: number | null): number {
  if (!mm) return 76;
  const t = Math.min(1, Math.max(0, (mm - 70) / 100));
  return Math.round(60 + t * 40);
}

const PER_PLANK = 6;
function chunk<T>(xs: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}

/** Bottles standing on planks, with the caption line beneath each. */
function Planks({ items, label }: { items: Array<{ card: FragranceCard; caption: string | null }>; label: string }) {
  return (
    <div className={styles.planks}>
      {chunk(items, PER_PLANK).map((row, i) => (
        <div key={i} className={styles.plankScroll} style={{ ['--fill' as string]: row.length / PER_PLANK }}>
          <Ledge slots={row.length} className={styles.ledge} label={i === 0 ? label : undefined}>
            {row.map(({ card }) => (
              <Link key={card.id} href={`/fragrance/${card.slug}`} className={styles.slot} style={{ ['--scent' as string]: card.accent }} aria-label={`${card.name} by ${card.brandName}`}>
                <span className={styles.bottle} style={{ height: `${slotHeight(card.bottleHeightMm)}%` }}>
                  {card.poster && (
                    <Image
                      src={card.poster}
                      alt=""
                      fill
                      sizes="(max-width: 719px) 30vw, 180px"
                      className={styles.bottleImg}
                      {...(card.blurData ? { placeholder: 'blur' as const, blurDataURL: card.blurData } : {})}
                    />
                  )}
                </span>
              </Link>
            ))}
          </Ledge>
          <ul role="list" className={styles.captions} style={{ ['--slots' as string]: row.length }}>
            {row.map(({ card, caption }) => (
              <li key={card.id}>
                <Link href={`/fragrance/${card.slug}`} className={styles.capName}>
                  {card.name}
                </Link>
                <span className={styles.capHouse}>
                  {card.brandName}
                  {card.posterKind === 'illustration' ? ' · ill.' : ''}
                </span>
                {caption && <span className={`tnum ${styles.capShare}`}>{caption}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default async function NotePage(props: PageProps<'/notes/[slug]'>) {
  const { slug } = await props.params;
  const n = await getNote(slug);
  if (!n) notFound();
  const [listed, perceived, paired] = await Promise.all([fragrancesListing(n.id), fragrancesPerceived(n.slug, n.id), pairedNotes(n.id)]);
  const dims = (Object.entries(n.character) as Array<[Dimension, number]>).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const smelledNotListed = perceived.filter((p) => !p.listed);
  const lower = n.name.toLowerCase();

  return (
    <article style={{ ['--scent' as string]: n.hue }}>
      <header className={styles.hero}>
        <div className={`page ${styles.heroGrid}`}>
          <div className={styles.identity}>
            <p className={styles.crumbs}>
              <Link href="/notes">Notes</Link> <span aria-hidden="true">/</span> {FAMILY_LABEL[n.family] ?? n.family}
            </p>
            <h1 className={`t-display ${styles.name}`}>{n.name}</h1>
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
          {n.smellsLike && (
            <div className={styles.smellsBlock}>
              <h2 className={`kicker ${styles.kicker}`}>What it smells like</h2>
              <p className={styles.smells}>{n.smellsLike}</p>
            </div>
          )}
          {/* One blotter, dipped in the note, standing past the band's edge: the page's object. */}
          <div className={styles.blotter} aria-hidden="true">
            <span className={styles.blotterTip} />
          </div>
        </div>
      </header>

      <div className={`page ${styles.body}`}>
        <div className={styles.two}>
          <section className={styles.origin}>
            <h2 className={styles.h2}>Where it comes from</h2>
            {n.origin ? <p className="t-prose">{n.origin}</p> : <p className={styles.null}>Not known yet</p>}
          </section>
          <section className={styles.does}>
            <h2 className={styles.h2}>What it does</h2>
            {n.contributes ? <p className="t-prose">{n.contributes}</p> : <p className={styles.null}>Not known yet</p>}
            {dims.length > 0 && (
              <ul role="list" className={styles.dims} aria-label={`What ${lower} adds to a fragrance`}>
                {dims.map(([d, v]) => {
                  const pct = Math.round(Math.min(1, v) * 100);
                  return (
                    <li key={d} className={styles.dim}>
                      <span className={styles.dimLine}>
                        <span className={styles.dimName}>Adds {DIMENSION_META[d].label.toLowerCase()}</span>
                        <span className={`tnum ${styles.dimValue}`}>{pct}%</span>
                      </span>
                      <span className={styles.dimTrack} aria-hidden="true">
                        <span className={styles.dimFill} style={{ width: `${pct}%`, ['--bar-hue' as string]: DIMENSION_META[d].hue }} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {paired.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.h2}>Often paired with</h2>
            <ul role="list" className={styles.paired}>
              {paired.map((p) => (
                <li key={p.slug}>
                  <Link href={`/notes/${p.slug}`} className={styles.pairedLink}>
                    <Blotter hue={p.hue} />
                    <span>{p.name}</span>
                    <span className={`tnum ${styles.pairedN}`}>{p.n}×</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className={styles.section} aria-labelledby="smell-h">
          <div className={styles.sectionHead}>
            <h2 id="smell-h" className={styles.h2}>
              People strongly smell it in
            </h2>
            {perceived.length > 0 && <DemoFlag />}
          </div>
          {perceived.length ? (
            <>
              <Planks items={perceived.slice(0, 12).map((p) => ({ card: p.card, caption: `${Math.round(p.share * 100)}% smell it${p.listed ? '' : ' · not on the list'}` }))} label="Where people notice it" />
              {smelledNotListed.length > 0 && (
                <p className={styles.callout}>
                  People pick up {lower} in {smelledNotListed.length} {smelledNotListed.length === 1 ? 'fragrance' : 'fragrances'} that don’t list it. That’s the gap
                  between a marketing pyramid and a nose.
                </p>
              )}
            </>
          ) : (
            <p className={styles.null}>Not enough votes to say where people notice it.</p>
          )}
        </section>

        <section className={styles.section} aria-labelledby="listed-h">
          <h2 id="listed-h" className={styles.h2}>
            Officially listed in
          </h2>
          {listed.length ? (
            <Planks items={listed.map((c) => ({ card: c, caption: null }))} label={`${listed.length} ${listed.length === 1 ? 'fragrance lists' : 'fragrances list'} ${lower}`} />
          ) : (
            <p className={styles.null}>No fragrance in the catalogue lists {lower} yet.</p>
          )}
          <p className={styles.more}>
            <Link href={`/discover?with=${n.slug}`}>Everything with {lower}</Link>
            <Link href={`/discover?without=${n.slug}`}>Everything without it</Link>
          </p>
        </section>
      </div>
    </article>
  );
}
