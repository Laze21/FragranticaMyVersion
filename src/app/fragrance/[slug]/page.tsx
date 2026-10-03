import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFragrance, getNoteIndex } from '@/lib/data/catalog';
import { fragranceSlugs } from '@/lib/data/static-params';
import { listReviews } from '@/lib/data/reviews';
import { getSimilar } from '@/lib/data/similar';
import { APP_NAME, SITE_URL } from '@/lib/config';
import { CONCENTRATION_LABEL, DIMENSION_META } from '@/lib/scent/vocab';
import { histAvg, topDims } from '@/lib/scent/read';
import type { TrailInput } from '@/lib/scent/trail';
import { Hero } from '@/components/fragrance/Hero';
import { SectionNav } from '@/components/fragrance/SectionNav';
import { TrailFigure } from '@/components/fragrance/TrailFigure';
import { Journey } from '@/components/fragrance/Journey';
import { ListedVsSmelled } from '@/components/fragrance/ListedVsSmelled';
import { Performance } from '@/components/fragrance/Performance';
import { WhenToWear } from '@/components/fragrance/WhenToWear';
import { Ratings } from '@/components/fragrance/Ratings';
import { Similar } from '@/components/fragrance/Similar';
import { Details } from '@/components/fragrance/Details';
import { SectionHead } from '@/components/fragrance/SectionHead';
import { VoteProvider } from '@/components/fragrance/VoteProvider';
import { Rail } from '@/components/fragrance/Rail';
import { MistOverlay } from '@/components/fragrance/MistOverlay';
import { FragranceChrome } from '@/components/fragrance/FragranceChrome';
import { SectionBoundary } from '@/components/fragrance/SectionBoundary';
import { ReviewList } from '@/components/reviews/ReviewList';
import s from '@/components/fragrance/sections.module.css';
import styles from './page.module.css';

export const revalidate = 300;

export async function generateStaticParams() {
  return (await fragranceSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<'/fragrance/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const f = await getFragrance(slug);
  if (!f) notFound();
  if (!f) return { title: 'Fragrance not found' };
  const conc = f.concentration ? CONCENTRATION_LABEL[f.concentration]?.long : '';
  const dims = topDims(f.stats.character.overall, 3, 0.15).map((d) => DIMENSION_META[d].label.toLowerCase());
  const title = `${f.name} by ${f.brandName}`;
  const description = [f.summary, dims.length ? `Character: ${dims.join(', ')}.` : null, `${conc}${f.releaseYear ? `, ${f.releaseYear}` : ''}.`].filter(Boolean).join(' ');
  return {
    title,
    description,
    alternates: { canonical: `/fragrance/${f.slug}` },
    openGraph: {
      title: `${title} · ${APP_NAME}`,
      description,
      type: 'article',
      url: `${SITE_URL}/fragrance/${f.slug}`,
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function FragrancePage(props: PageProps<'/fragrance/[slug]'>) {
  const { slug } = await props.params;
  const f = await getFragrance(slug);
  if (!f) notFound();
  const [similar, noteIndex, reviews] = await Promise.all([getSimilar(f.id), getNoteIndex(), listReviews(f.id, { sort: 'helpful', pageSize: 6 })]);
  const st = f.stats;

  // Notes offered first in the "what do you smell" sheet: listed notes, then what others smell.
  const listed = f.notes ? [...f.notes.top, ...f.notes.heart, ...f.notes.base, ...f.notes.unspecified] : [];
  const listedSet = new Set(listed.map((n) => n.slug));
  const pickerNotes = [
    ...listed.map((n) => ({
      slug: n.slug,
      name: n.name,
      family: n.family,
      hue: n.hue,
      listed: true,
    })),
    ...Object.entries(st.perceived)
      .sort((a, b) => b[1] - a[1])
      .filter(([slug]) => !listedSet.has(slug) && noteIndex[slug])
      .map(([slug]) => ({
        slug,
        name: noteIndex[slug].name,
        family: noteIndex[slug].family,
        hue: noteIndex[slug].hue,
        listed: false,
      })),
  ];

  // One Trail input for the hero's thumb and the full figure, so the two are the same drawing.
  const trail: TrailInput = {
    character: st.character,
    longevityHrs: st.longevityMedian,
    projectionOpening: st.perfVotes >= 5 ? histAvg(st.projectionOpeningHist) : null,
    projectionLater: st.perfVotes >= 5 ? histAvg(st.projectionLaterHist) : null,
    heartAtMin: f.heartAtMin,
    drydownAtMin: f.drydownAtMin,
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: f.name,
    brand: { '@type': 'Brand', name: f.brandName },
    category: 'Fragrance',
    description: f.summary ?? undefined,
    image: f.poster ? `${SITE_URL}${f.poster}` : undefined,
    releaseDate: f.releaseYear ? String(f.releaseYear) : undefined,
    url: `${SITE_URL}/fragrance/${f.slug}`,
    // Aggregate ratings are only exposed to search engines when they come from real votes.
    ...(!st.includesBaseline && st.ratingCount >= 5 && st.ratingAvg
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: st.ratingAvg,
            bestRating: 10,
            worstRating: 1,
            ratingCount: st.ratingCount,
          },
        }
      : {}),
  };

  const upcoming = f.status === 'upcoming';

  return (
    <div style={{ ['--scent' as string]: f.accent }} className={styles.root}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <VoteProvider slug={f.slug} name={f.name} notes={pickerNotes}>
        <FragranceChrome />
        <MistOverlay />
        <Hero f={f} similar={similar} trail={trail} />
        <SectionNav name={f.name} slug={f.slug} upcoming={upcoming} />
        <div className={`page ${styles.trail}`}>
          <TrailFigure input={trail} name={f.name} votes={st.perceivedVoters} />
        </div>
        <div className={`page layout-8-3 ${styles.layout}`}>
          <div className={styles.main}>
            <Journey f={f} noteIndex={noteIndex} />
            <ListedVsSmelled f={f} noteIndex={noteIndex} />
            <Performance f={f} />
            <WhenToWear f={f} />
            <Ratings f={f} />
            <section className={`${s.section} ${styles.reviews}`} aria-labelledby="reviews">
              <SectionHead id="reviews" title="Reviews" lede="Quick takes and full reviews from people who wore it.">
                <Link href={`/fragrance/${f.slug}/review`} className="btn btn--quiet btn--small">
                  Write a review
                </Link>
              </SectionHead>
              <SectionBoundary label="Reviews">
                <ReviewList slug={f.slug} initial={reviews.reviews} counts={reviews.counts} initialHasMore={reviews.hasMore} />
              </SectionBoundary>
            </section>
            <section className={`${s.section} ${styles.similar}`} aria-labelledby="similar">
              <SectionHead id="similar" title="If you like this" lede="Similar, cheaper, fresher, darker. Pick a direction.">
                <Link href={`/compare?f=${f.slug}`} className="btn btn--quiet btn--small">
                  Compare it
                </Link>
              </SectionHead>
              <SectionBoundary label="If you like this">
                <Similar groups={similar} name={f.name} />
              </SectionBoundary>
            </section>
            <Details f={f} />
          </div>
          <aside className={styles.rail} aria-label={`${f.name} at a glance`}>
            <Rail
              slug={f.slug}
              name={f.name}
              poster={f.poster}
              blurData={f.blurData}
              ratingAvg={st.ratingAvg}
              ratingCount={st.ratingCount}
              includesBaseline={st.includesBaseline}
              upcoming={upcoming}
              counts={{
                perceived: st.perceivedVoters,
                performance: st.perfVotes,
                wear: st.wearVoters,
                ratings: st.ratingCount,
                reviews: st.reviewCount,
              }}
            />
          </aside>
        </div>
      </VoteProvider>
    </div>
  );
}
