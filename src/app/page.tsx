import Image from 'next/image';
import Link from 'next/link';
import { getCards, noteOfWeekCards } from '@/lib/data/catalog';
import { getNote, getNotesIndex } from '@/lib/data/notes';
import { recentReviewExcerpts } from '@/lib/data/reviews';
import { discover } from '@/lib/data/search';
import type { FragranceCard as Card } from '@/lib/data/types';
import { sql } from '@/lib/db';
import { glossaryTerms } from '@/lib/glossary';
import { formatCount, longevityRange, projectionLabel, histAvg } from '@/lib/scent/read';
import { CONCENTRATION_LABEL } from '@/lib/scent/vocab';
import { seasonalFeelings, withFeelingCounts, type SeasonKey } from '@/lib/search/feelings';
import { FragranceCard } from '@/components/cards/FragranceCard';
import { Blotter } from '@/components/scent/Blotter';
import { Ledge } from '@/components/scent/Ledge';
import { TrailThumb } from '@/components/scent/TrailThumb';
import { TrailMark } from '@/components/shell/TrailMark';
import { HomeSearch } from '@/components/home/HomeSearch';
import { SeasonalPicks } from '@/components/home/SeasonalPicks';
import { TodayPanel } from '@/components/home/TodayPanel';
import { Avatar } from '@/components/ui/Avatar';
import { DemoFlag } from '@/components/ui/DemoFlag';
import styles from './page.module.css';

export const revalidate = 900;

function season(month: number): { key: SeasonKey; label: string } {
  if (month >= 2 && month <= 4) return { key: 'spring', label: 'Spring' };
  if (month >= 5 && month <= 7) return { key: 'summer', label: 'Summer' };
  if (month >= 8 && month <= 10) return { key: 'autumn', label: 'Autumn' };
  return { key: 'winter', label: 'Winter' };
}
function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  return Math.ceil(((t.getTime() - Date.UTC(t.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
}

/* Which glossary entry explains a note family, for "Words worth knowing". */
const FAMILY_TERM: Record<string, string> = {
  resinous: 'oriental-amber',
  gourmand: 'gourmand',
  marine: 'aquatic',
  citrus: 'eau-de-cologne',
  aromatic: 'fougere',
  musk: 'skin-scent',
  green: 'chypre',
  floral: 'accord',
  woody: 'base-notes',
  spice: 'heart-notes',
  fruity: 'top-notes',
};

function trailInput(c: Card) {
  return {
    character: c.character,
    longevityHrs: c.longevityHrs,
    projectionOpening: c.projectionOpening,
    projectionLater: c.projectionLater,
    heartAtMin: c.heartAtMin,
    drydownAtMin: c.drydownAtMin,
  };
}

export default async function Home() {
  const now = new Date();
  const s = season(now.getMonth());
  const week = isoWeek(now);
  const year = now.getFullYear();
  const feelings = seasonalFeelings(s.key);

  const [trending, seasonalCards, newestByYear, notes, lists, quotes, lead, rest] = await Promise.all([
    // Ranked by the figure the rows print, so "412 wears" never sits under "398 wears".
    getCards(`f.status <> 'upcoming'`, [], 's.wears_30d desc nulls last, s.trending desc nulls last', 9),
    getCards(`coalesce((s.wear ->> $1)::numeric, 0) >= 0.6`, [s.key], 's.rating_avg desc nulls last, s.rating_count desc', 18),
    getCards('f.release_year is not null', [], 'f.release_year desc, s.popularity desc nulls last', 7),
    getNotesIndex(),
    sql<{ slug: string; title: string; description: string | null; handle: string; display_name: string; n: string; posters: string[] }>(
      `select l.slug, l.title, l.description, p.handle, p.display_name, count(li.fragrance_id) n,
              array_remove(array_agg(a.url order by li.position), null) posters
         from public.lists l join public.profiles p on p.id = l.user_id
         left join public.list_items li on li.list_id = l.id
         left join public.fragrance_primary_image a on a.fragrance_id = li.fragrance_id
        where l.is_public group by l.id, p.handle, p.display_name order by l.created_at desc limit 4`,
    ),
    recentReviewExcerpts(3, { minLength: 300, chars: 180 }),
    // Counted under relevance order: the dims a feeling sets are bound into that order clause, and
    // the count is the same whichever way the rows are sorted.
    withFeelingCounts(feelings.lead, async (f) => (await discover({ ...f, sort: 'relevance' }, 0)).total),
    withFeelingCounts(feelings.rest, async (f) => (await discover({ ...f, sort: 'relevance' }, 0)).total),
  ]);

  const feature = trending[0];
  const ranked = trending.slice(1, 9);
  const ids = trending.map((c) => c.id);
  const [statRows, featureRow, featureNotes] = await Promise.all([
    sql<{ fragrance_id: string; wears_30d: string; longevity_hist: number[]; projection_opening_hist: number[] }>(
      `select fragrance_id, wears_30d, longevity_hist, projection_opening_hist from public.fragrance_stats where fragrance_id = any($1::uuid[])`,
      [ids],
    ),
    feature ? sql<{ summary: string | null }>('select summary from public.fragrances where id = $1', [feature.id]) : Promise.resolve([]),
    feature
      ? sql<{ slug: string }>(`select n.slug from public.fragrance_notes fn join public.notes n on n.id = fn.note_id where fn.fragrance_id = $1`, [feature.id])
      : Promise.resolve([]),
  ]);
  const stats = new Map(statRows.map((r) => [r.fragrance_id, r]));
  const wears = (c: Card) => Number(stats.get(c.id)?.wears_30d ?? 0);
  const featureStats = feature ? stats.get(feature.id) : undefined;
  const featureSummary = featureRow[0]?.summary ?? null;
  const lasts = featureStats ? longevityRange(featureStats.longevity_hist) : null;
  const opening = featureStats ? projectionLabel(histAvg(featureStats.projection_opening_hist)) : null;

  // "New releases" only earns its name while the newest release is recent; otherwise it is what we added last.
  const recentlyAdded = !newestByYear[0]?.releaseYear || newestByYear[0].releaseYear < year - 2;
  let newest = newestByYear;
  let addedOn = new Map<string, string>();
  if (recentlyAdded) {
    newest = await getCards('true', [], 'f.created_at desc, f.name', 7);
    const rows = await sql<{ id: string; created_at: string }>('select id, created_at from public.fragrances where id = any($1::uuid[])', [newest.map((c) => c.id)]);
    addedOn = new Map(rows.map((r) => [r.id, new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })]));
  }

  // Note of the week: rotate through the notes with enough listings, but only stop on one that
  // three fragrances can illustrate, so the band is never two bottles and a gap.
  const candidates = notes.filter((n) => Number(n.listed) >= 3 && n.kind !== 'descriptor');
  let noteOfWeek: (typeof candidates)[number] | null = null;
  let examples: Awaited<ReturnType<typeof noteOfWeekCards>> = [];
  for (let i = 0; i < Math.min(6, candidates.length) && !noteOfWeek; i++) {
    const n = candidates[(week + i) % candidates.length];
    const ids = await sql<{ id: string }>('select id from public.notes where slug = $1', [n.slug]);
    const found = ids[0] ? await noteOfWeekCards(n.slug, ids[0].id, 3) : [];
    if (found.length >= 3) {
      noteOfWeek = n;
      examples = found;
    }
  }
  const noteDetail = noteOfWeek ? await getNote(noteOfWeek.slug) : null;

  // Words worth knowing: the terms this page already uses, not four at random.
  const terms = glossaryTerms();
  const noteSlugs = new Set(featureNotes.map((n) => n.slug));
  const wanted: string[] = [];
  const concTerm = feature?.concentration ? CONCENTRATION_LABEL[feature.concentration]?.glossary : undefined;
  if (concTerm) wanted.push(concTerm);
  if (noteOfWeek && FAMILY_TERM[noteOfWeek.family]) wanted.push(FAMILY_TERM[noteOfWeek.family]);
  const byNotes = terms
    .map((t) => ({ t, hits: (t.seeAlsoNotes ?? []).filter((n) => noteSlugs.has(n) || n === noteOfWeek?.slug).length }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .map((x) => x.t.slug);
  wanted.push(...byNotes);
  for (let i = 0; wanted.length < 8 && i < terms.length; i++) wanted.push(terms[(week * 3 + i * 7) % terms.length].slug);
  const termPick = [...new Set(wanted)]
    .map((slug) => terms.find((t) => t.slug === slug))
    .filter(Boolean)
    .slice(0, 4) as typeof terms;

  const dateLine = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className={`page ${styles.home}`}>
      <section className={styles.top} aria-labelledby="home-ask">
        <div className={styles.ask}>
          <p className={`kicker ${styles.dateline}`}>
            {dateLine} · {s.label}
          </p>
          <h1 id="home-ask" className={`t-display ${styles.askTitle}`}>
            What do you want to smell like?
          </h1>
          <HomeSearch />
          <TodayPanel />
        </div>

        {feature && (
          <article className={styles.feature} style={{ ['--scent' as string]: feature.accent }} aria-labelledby="feature-name">
            <div className={styles.featureStage}>
              <div className={styles.featureObject}>
                {feature.poster && (
                  <Image
                    src={feature.poster}
                    alt={feature.posterAlt ?? `${feature.name} bottle`}
                    fill
                    priority
                    sizes="(max-width: 719px) 45vw, (max-width: 1099px) 40vw, 480px"
                    className={styles.featureImg}
                    {...(feature.blurData ? { placeholder: 'blur' as const, blurDataURL: feature.blurData } : {})}
                  />
                )}
              </div>
              {feature.posterKind === 'illustration' && (
                <span className={styles.featureIll} aria-hidden>
                  ill.
                </span>
              )}
            </div>
            <div className={styles.featureText}>
              <p className={`kicker ${styles.featureKicker}`}>
                No. 1 this week · <span className="tnum">{formatCount(wears(feature))}</span> wears
              </p>
              <p className={styles.featureHouse}>
                <Link href={`/house/${feature.brandSlug}`} className="link-quiet">
                  {feature.brandName}
                </Link>
              </p>
              <h2 id="feature-name" className={`t-title ${styles.featureName}`}>
                <Link href={`/fragrance/${feature.slug}`}>{feature.name}</Link>
              </h2>
              {featureSummary && <p className={styles.featureSummary}>{featureSummary}</p>}
              <figure className={styles.featureTrail}>
                <TrailThumb input={trailInput(feature)} size="feature" width={420} height={64} id="home-feature" />
                <figcaption className={styles.featureCaption}>
                  <TrailMark className={styles.mark} />
                  <span>
                    Trail{lasts ? ` · lasts ${lasts.text.replace(' hours', 'h')}` : ''}
                    {opening && opening !== 'Not enough votes' ? ` · ${opening.toLowerCase()} at first` : ''}
                  </span>
                </figcaption>
              </figure>
              <Link href={`/fragrance/${feature.slug}`} className={styles.featureLink}>
                Read it in ten seconds
              </Link>
            </div>
          </article>
        )}
      </section>

      <section className={styles.feelings} aria-labelledby="feelings">
        <h2 id="feelings" className={`kicker ${styles.feelingsHead}`}>
          Explore by feeling
        </h2>
        <div className={styles.feelingSplit}>
          {/* The three for the season, large. Hidden on phones, where the compact list below carries all twelve. */}
          <ul role="list" className={styles.feelingLead}>
            {lead.map((f) => (
              <li key={f.slug}>
                <Link href={`/discover?feel=${f.slug}`} className={styles.leadLink}>
                  <span className={`t-display ${styles.leadWord}`}>
                    {f.title}
                    <span className={styles.leadCount}>
                      {' '}
                      · <span className="tnum">{f.count}</span>
                    </span>
                  </span>
                  <span className={styles.leadLine}>{f.line}</span>
                </Link>
              </li>
            ))}
          </ul>
          <ul role="list" className={styles.feelingList}>
            {[...lead, ...rest].map((f, i) => (
              <li key={f.slug} data-lead={i < lead.length || undefined}>
                <Link href={`/discover?feel=${f.slug}`} className={styles.feelingLink}>
                  <span className={styles.feelingWord}>
                    {f.title}
                    <span className={styles.feelingCount}>
                      {' '}
                      · <span className="tnum">{f.count}</span>
                    </span>
                  </span>
                  <span className={styles.feelingLine} data-later={i >= 4 || undefined}>
                    {f.line}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={styles.trending} aria-labelledby="trending">
        <div className={styles.headRow}>
          <h2 id="trending" className="t-h3">
            Trending
          </h2>
          <p className={styles.sub}>Most logged in wear diaries over the last 30 days. Number one is up top.</p>
          <DemoFlag label="Demo activity" />
        </div>
        <p className={styles.colHead}>
          <span>No. · fragrance · rating /10</span>
          <span>Wears, 30 days</span>
        </p>
        <ol role="list" className={styles.ranked}>
          {ranked.map((c, i) => (
            <li key={c.id}>
              <FragranceCard card={c} variant="row" rank={i + 2} metric={`${formatCount(wears(c))} wears`} />
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.seasonal} aria-labelledby="seasonal">
        <SeasonalPicks season={s.label} seasonKey={s.key} cards={seasonalCards} />
      </section>

      {quotes.length >= 3 && (
        <section className={styles.saying} aria-labelledby="saying">
          <p className="kicker">What people are saying</p>
          <h2 id="saying" className={`t-display ${styles.sayingTitle}`}>
            Three recent reviews, in their own words
          </h2>
          {quotes.every((q) => q.isDemo) && <p className={styles.sub}>From the demo accounts, until real ones arrive.</p>}
          <ul role="list" className={styles.quotes}>
            {quotes.map((q, i) => (
              <li key={q.id} className={styles.quote} data-wide={i === 0 || undefined} style={{ ['--scent' as string]: q.fragrance.accent }}>
                <blockquote className={styles.quoteBody}>
                  <p>{q.excerpt}</p>
                </blockquote>
                <footer className={styles.quoteFoot}>
                  <span className={styles.quoteThumb}>{q.fragrance.poster && <Image src={q.fragrance.poster} alt="" fill sizes="44px" />}</span>
                  <span className={styles.quoteMeta}>
                    <Link href={`/fragrance/${q.fragrance.slug}`} className={`t-title ${styles.quoteName}`}>
                      {q.fragrance.name}
                    </Link>
                    <span className={styles.quoteBy}>
                      <Avatar name={q.author.displayName} hue={q.author.avatarHue} size={16} />
                      <Link href={`/u/${q.author.handle}`} className="link-quiet">
                        {q.author.displayName}
                      </Link>
                      {' · '}
                      <Link href={`/fragrance/${q.fragrance.slug}#reviews`} className="link-quiet">
                        {q.kind === 'quick' ? 'Quick take' : 'Full review'}
                      </Link>
                      {q.isDemo && (
                        <>
                          {' · '}
                          <DemoFlag label="Demo account" />
                        </>
                      )}
                    </span>
                  </span>
                </footer>
              </li>
            ))}
          </ul>
        </section>
      )}

      {noteOfWeek && (
        <section className={`bleed ${styles.note}`} style={{ ['--scent' as string]: noteOfWeek.hue }} aria-labelledby="note-week">
          <div className={styles.noteGrid}>
            <div className={styles.noteText}>
              <p className="kicker">Note of the week</p>
              <h2 id="note-week" className={`t-display ${styles.noteName}`}>
                <Link href={`/notes/${noteOfWeek.slug}`}>{noteOfWeek.name}</Link>
              </h2>
              {noteOfWeek.smells_like && <p className={styles.noteSmells}>{noteOfWeek.smells_like}</p>}
              {noteDetail?.origin && <p className={styles.noteOrigin}>{noteDetail.origin}</p>}
              <Link href={`/notes/${noteOfWeek.slug}`} className={styles.noteLink}>
                Where it comes from, and where people smell it
              </Link>
            </div>
            <ul role="list" className={styles.noteFrags}>
              {examples.map(({ card, share }) => (
                <li key={card.id}>
                  <FragranceCard card={card} variant="plate" sizes="(max-width: 719px) 46vw, 200px" reason={share !== null ? `${Math.round(share * 100)}% smell it` : 'Listed in the base'} />
                </li>
              ))}
              <li className={styles.noteStrip}>
                <Blotter hue={noteOfWeek.hue} size="strip" label={`${noteOfWeek.name}, as a blotter`} />
                <span className={styles.noteFamily}>{noteOfWeek.family}</span>
              </li>
            </ul>
          </div>
        </section>
      )}

      <section className={styles.newest} aria-labelledby="newest">
        <div className={styles.headRow}>
          <h2 id="newest" className="t-h3">
            {recentlyAdded ? 'Recently added' : 'New releases'}
          </h2>
          <p className={styles.sub}>{recentlyAdded ? 'The last bottles to join the catalogue.' : 'The newest releases in the catalogue, with the year.'}</p>
        </div>
        <div className={styles.shelfScroll}>
          <Ledge slots={newest.length} className={styles.ledge}>
            {newest.map((c) => (
              <FragranceCard key={c.id} card={c} sizes="180px" showYear={!recentlyAdded} reason={recentlyAdded && addedOn.get(c.id) ? `Added ${addedOn.get(c.id)}` : undefined} />
            ))}
          </Ledge>
        </div>
      </section>

      <div className={styles.foot}>
        <section aria-labelledby="lists">
          <div className={styles.headRow}>
            <h2 id="lists" className="t-h3">
              Lists
            </h2>
            <p className={styles.sub}>Shortlists and rotations from people who wear what is on them.</p>
          </div>
          <ul role="list" className={styles.lists}>
            {lists.map((l) => (
              <li key={l.slug}>
                <Link href={`/lists/${l.handle}/${l.slug}`} className={styles.listLink}>
                  <span className={styles.listFan} aria-hidden>
                    {l.posters.slice(0, 4).map((p, i) => (
                      <span key={p} style={{ ['--i' as string]: i }}>
                        <Image src={p} alt="" fill sizes="60px" />
                      </span>
                    ))}
                    <span className={styles.listPlank} />
                  </span>
                  <span className={styles.listText}>
                    <span className={styles.listTitle}>{l.title}</span>
                    {l.description && <span className={styles.listDesc}>{l.description}</span>}
                    <span className="t-meta">
                      <span className="tnum">{l.n}</span> fragrances · by {l.display_name}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="words">
          <div className={styles.headRow}>
            <h2 id="words" className="t-h3">
              Words worth knowing
            </h2>
            <p className={styles.sub}>The ones this page uses.</p>
          </div>
          <dl className={styles.terms}>
            {termPick.map((t) => (
              <div key={t.slug}>
                <dt>
                  <Link href={`/learn/${t.slug}`}>{t.term}</Link>
                </dt>
                <dd>{t.short}</dd>
              </div>
            ))}
          </dl>
          <Link href="/learn" className={styles.more}>
            The whole glossary
          </Link>
        </section>
      </div>
    </div>
  );
}
