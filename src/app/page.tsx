import Image from 'next/image';
import Link from 'next/link';
import { getCards } from '@/lib/data/catalog';
import { getNotesIndex } from '@/lib/data/notes';
import { sql } from '@/lib/db';
import { FEELINGS } from '@/lib/search/feelings';
import { glossaryTerms } from '@/lib/glossary';
import { FragranceCard } from '@/components/cards/FragranceCard';
import { TrailThumb } from '@/components/scent/TrailThumb';
import { HomeSearch } from '@/components/home/HomeSearch';
import { TodayPanel } from '@/components/home/TodayPanel';
import { DemoFlag } from '@/components/ui/DemoFlag';
import { DIMENSION_META } from '@/lib/scent/vocab';
import { topDims } from '@/lib/scent/read';
import styles from './page.module.css';

export const revalidate = 900;

function season(month: number) {
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

export default async function Home() {
  const now = new Date();
  const s = season(now.getMonth());
  const week = isoWeek(now);

  const [trending, seasonal, newest, notes, lists, feelingCounts] = await Promise.all([
    getCards(`f.status <> 'upcoming'`, [], 's.trending desc nulls last', 9),
    getCards(`coalesce((s.wear ->> $1)::numeric, 0) >= 0.6`, [s.key], 's.rating_avg desc nulls last', 8),
    getCards('f.release_year is not null', [], 'f.release_year desc, s.popularity desc nulls last', 8),
    getNotesIndex(),
    sql<{ slug: string; title: string; description: string; handle: string; display_name: string; n: string; posters: string[] }>(
      `select l.slug, l.title, l.description, p.handle, p.display_name, count(li.fragrance_id) n,
              array_remove(array_agg(a.url order by li.position), null) posters
         from public.lists l join public.profiles p on p.id = l.user_id
         left join public.list_items li on li.list_id = l.id
         left join public.fragrance_primary_image a on a.fragrance_id = li.fragrance_id
        where l.is_public group by l.id, p.handle, p.display_name order by l.created_at desc limit 4`,
    ),
    Promise.resolve(FEELINGS),
  ]);

  const feature = trending[0];
  const rest = trending.slice(1);
  const candidates = notes.filter((n) => Number(n.listed) >= 3 && n.kind !== 'descriptor');
  const noteOfWeek = candidates[week % Math.max(1, candidates.length)];
  const noteFrags = noteOfWeek
    ? await getCards(`exists (select 1 from public.fragrance_notes fn join public.notes n on n.id = fn.note_id where fn.fragrance_id = f.id and n.slug = $1)`, [noteOfWeek.slug], 's.popularity desc nulls last', 4)
    : [];
  const terms = glossaryTerms();
  const termPick = [0, 1, 2, 3].map((i) => terms[(week * 3 + i * 7) % terms.length]);
  const dateLine = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className={styles.home}>
      <section className={`page ${styles.top}`} aria-labelledby="home-ask">
        <div className={styles.ask}>
          <p className={styles.dateline}>
            {dateLine} · {s.label}
          </p>
          <h1 id="home-ask" className={styles.askTitle}>
            What do you want to smell like?
          </h1>
          <HomeSearch />
          <TodayPanel />
        </div>

        {feature && (
          <article className={styles.feature} style={{ ['--scent' as string]: feature.accent }} aria-labelledby="feature-name">
            <p className={styles.featureKicker}>Most worn this week</p>
            <div className={styles.featureStage}>
              {feature.poster && (
                <Image src={feature.poster} alt={feature.posterAlt ?? ''} fill priority sizes="(max-width: 960px) 90vw, 560px" className={styles.featureImg} />
              )}
            </div>
            <div className={styles.featureText}>
              <p className={styles.featureHouse}>{feature.brandName}</p>
              <h2 id="feature-name" className={`t-title ${styles.featureName}`}>
                <Link href={`/fragrance/${feature.slug}`}>{feature.name}</Link>
              </h2>
              <TrailThumb
                input={{
                  character: feature.character,
                  longevityHrs: feature.longevityHrs,
                  projectionOpening: feature.projectionOpening,
                  projectionLater: feature.projectionLater,
                  heartAtMin: feature.heartAtMin,
                  drydownAtMin: feature.drydownAtMin,
                }}
                width={320}
                height={48}
                className={styles.featureTrail}
              />
              <p className={styles.featureDims}>{topDims(feature.character.overall, 3, 0.15).map((d) => DIMENSION_META[d].label).join(' · ')}</p>
              <Link href={`/fragrance/${feature.slug}`} className="arrow-link">
                Read it in ten seconds →
              </Link>
            </div>
          </article>
        )}
      </section>

      <section className={`page ${styles.feelings}`} aria-labelledby="feelings">
        <h2 id="feelings" className={styles.sectionLabel}>
          Explore by feeling
        </h2>
        <ul role="list" className={styles.feelingList}>
          {feelingCounts.map((f) => (
            <li key={f.slug}>
              <Link href={`/discover?feel=${f.slug}`}>
                <span className={styles.feelingWord}>{f.title}</span>
                <span className={styles.feelingLine}>{f.line}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className={`page ${styles.split}`}>
        <section aria-labelledby="trending">
          <div className={styles.headRow}>
            <h2 id="trending" className={styles.h2}>
              Trending
            </h2>
            <DemoFlag label="Demo activity" />
          </div>
          <p className={styles.sub}>Most logged in wear diaries over the last 30 days.</p>
          <ol role="list" className={styles.ranked}>
            {rest.slice(0, 8).map((c, i) => (
              <li key={c.id}>
                <FragranceCard card={c} variant="row" rank={i + 2} />
              </li>
            ))}
          </ol>
        </section>
        <section aria-labelledby="seasonal">
          <h2 id="seasonal" className={styles.h2}>
            Made for {s.label.toLowerCase()}
          </h2>
          <p className={styles.sub}>Highest rated among fragrances most people say suit this season.</p>
          <ul role="list" className={styles.plates}>
            {seasonal.slice(0, 6).map((c) => (
              <li key={c.id}>
                <FragranceCard card={c} sizes="(max-width: 719px) 46vw, 220px" />
              </li>
            ))}
          </ul>
          <Link href={`/discover?season=${s.key}&sort=rating`} className="arrow-link">
            All {s.label.toLowerCase()} picks →
          </Link>
        </section>
      </div>

      {noteOfWeek && (
        <section className={styles.note} style={{ ['--scent' as string]: noteOfWeek.hue }} aria-labelledby="note-week">
          <div className={`page ${styles.noteGrid}`}>
            <div className={styles.noteText}>
              <p className={styles.sectionLabel}>Note of the week</p>
              <h2 id="note-week" className={`t-title ${styles.noteName}`}>
                <Link href={`/notes/${noteOfWeek.slug}`}>{noteOfWeek.name}</Link>
              </h2>
              <p className={styles.noteSmells}>{noteOfWeek.smells_like}</p>
              <Link href={`/notes/${noteOfWeek.slug}`} className="arrow-link">
                Where it comes from, and where people smell it →
              </Link>
            </div>
            <ul role="list" className={styles.noteFrags}>
              {noteFrags.map((c) => (
                <li key={c.id}>
                  <FragranceCard card={c} sizes="(max-width: 719px) 46vw, 200px" />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className={`page ${styles.newest}`} aria-labelledby="newest">
        <h2 id="newest" className={styles.h2}>
          Newest in the catalogue
        </h2>
        <ul role="list" className={styles.shelfRow}>
          {newest.map((c) => (
            <li key={c.id}>
              <FragranceCard card={c} sizes="200px" />
            </li>
          ))}
        </ul>
      </section>

      <div className={`page ${styles.split}`}>
        <section aria-labelledby="lists">
          <h2 id="lists" className={styles.h2}>
            Lists
          </h2>
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
                  </span>
                  <span className={styles.listText}>
                    <span className={styles.listTitle}>{l.title}</span>
                    <span className="t-meta">
                      {l.n} fragrances · by {l.display_name}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="words">
          <h2 id="words" className={styles.h2}>
            Words worth knowing
          </h2>
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
          <Link href="/learn" className="arrow-link">
            The whole glossary →
          </Link>
        </section>
      </div>
    </div>
  );
}
