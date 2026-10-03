import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFragrance, getNoteIndex } from '@/lib/data/catalog';
import { fragranceSlugs } from '@/lib/data/static-params';
import { listReviews } from '@/lib/data/reviews';
import { getSimilar } from '@/lib/data/similar';
import { APP_NAME, SITE_URL } from '@/lib/config';
import { CONCENTRATION_LABEL, DIMENSION_META } from '@/lib/scent/vocab';
import { topDims } from '@/lib/scent/read';
import { Hero } from '@/components/fragrance/Hero';
import { SectionNav } from '@/components/fragrance/SectionNav';
import { Journey } from '@/components/fragrance/Journey';
import { ListedVsSmelled } from '@/components/fragrance/ListedVsSmelled';
import { Performance } from '@/components/fragrance/Performance';
import { WhenToWear } from '@/components/fragrance/WhenToWear';
import { Ratings } from '@/components/fragrance/Ratings';
import { Similar } from '@/components/fragrance/Similar';
import { Details } from '@/components/fragrance/Details';
import { SectionHead } from '@/components/fragrance/SectionHead';
import { VoteProvider } from '@/components/fragrance/VoteProvider';
import { YourTake } from '@/components/fragrance/YourTake';
import { MobileActionBar } from '@/components/fragrance/MobileActionBar';
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
  if (!f) return { title: 'Fragrance not found' };
  const conc = f.concentration ? CONCENTRATION_LABEL[f.concentration]?.long : '';
  const dims = topDims(f.stats.character.overall, 3, 0.15).map((d) => DIMENSION_META[d].label.toLowerCase());
  const title = `${f.name} by ${f.brandName}`;
  const description = [f.summary, dims.length ? `Character: ${dims.join(', ')}.` : null, `${conc}${f.releaseYear ? `, ${f.releaseYear}` : ''}.`]
    .filter(Boolean)
    .join(' ');
  return {
    title,
    description,
    alternates: { canonical: `/fragrance/${f.slug}` },
    openGraph: { title: `${title} · ${APP_NAME}`, description, type: 'article', url: `${SITE_URL}/fragrance/${f.slug}` },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function FragrancePage(props: PageProps<'/fragrance/[slug]'>) {
  const { slug } = await props.params;
  const f = await getFragrance(slug);
  if (!f) notFound();
  const [similar, noteIndex, reviews] = await Promise.all([getSimilar(f.id), getNoteIndex(), listReviews(f.id, { sort: 'helpful', pageSize: 6 })]);

  // Notes offered first in the "what do you smell" sheet: listed notes, then what others smell.
  const listed = f.notes ? [...f.notes.top, ...f.notes.heart, ...f.notes.base, ...f.notes.unspecified] : [];
  const listedSet = new Set(listed.map((n) => n.slug));
  const pickerNotes = [
    ...listed.map((n) => ({ slug: n.slug, name: n.name, family: n.family, hue: n.hue, listed: true })),
    ...Object.entries(f.stats.perceived)
      .sort((a, b) => b[1] - a[1])
      .filter(([slug]) => !listedSet.has(slug) && noteIndex[slug])
      .map(([slug]) => ({ slug, name: noteIndex[slug].name, family: noteIndex[slug].family, hue: noteIndex[slug].hue, listed: false })),
  ];

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
    ...(!f.stats.includesBaseline && f.stats.ratingCount >= 5 && f.stats.ratingAvg
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: f.stats.ratingAvg, bestRating: 10, worstRating: 1, ratingCount: f.stats.ratingCount } }
      : {}),
  };

  return (
    <div style={{ ['--scent' as string]: f.accent }} className={styles.root}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <VoteProvider slug={f.slug} name={f.name} notes={pickerNotes}>
        <Hero f={f} similar={similar} />
        <SectionNav name={f.name} />
        <div className={`page ${styles.layout}`}>
          <div className={styles.main}>
            <Journey f={f} noteIndex={noteIndex} />
            <ListedVsSmelled f={f} noteIndex={noteIndex} />
            <Performance f={f} />
            <WhenToWear f={f} />
            <Ratings f={f} />
            <section className={s.section} aria-labelledby="reviews">
              <SectionHead id="reviews" title="Reviews" lede="Quick takes and full reviews from people who wore it. Filter by what you care about.">
                <Link href={`/fragrance/${f.slug}/review`} className="btn btn--small">
                  Write a review
                </Link>
              </SectionHead>
              <ReviewList slug={f.slug} initial={reviews.reviews} counts={reviews.counts} initialHasMore={reviews.hasMore} />
            </section>
            <section className={s.section} aria-labelledby="similar">
              <SectionHead id="similar" title="If you like this" lede="Similar, cheaper, fresher, darker. Pick a direction." />
              <Similar groups={similar} name={f.name} />
            </section>
            <Details f={f} />
          </div>
          <aside className={styles.rail} aria-label="Your take">
            <YourTake slug={f.slug} name={f.name} />
          </aside>
        </div>
        <MobileActionBar slug={f.slug} />
      </VoteProvider>
    </div>
  );
}
