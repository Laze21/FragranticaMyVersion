import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { getFragrance, getNoteIndex } from '@/lib/data/catalog';
import { leaderIndex, overlapPhrase, sampleLabel, shelfOverlap } from '@/lib/data/stats';
import type { FragranceDetail } from '@/lib/data/types';
import { APP_NAME, SITE_URL } from '@/lib/config';
import { TrailThumb } from '@/components/scent/TrailThumb';
import { SeasonsGlyph } from '@/components/scent/SeasonsGlyph';
import { ComparePicker } from '@/components/compare/ComparePicker';
import { CompareShell, RemoveColumn, ShareButton } from '@/components/compare/CompareShell';
import { Term } from '@/components/ui/Term';
import { DemoFlag } from '@/components/ui/DemoFlag';
import { Icon } from '@/components/Icon';
import { CONCENTRATION_LABEL, DIMENSION_META, PRICE_BANDS, WEAR_CONTEXTS, type Dimension, type PriceBand } from '@/lib/scent/vocab';
import { histAvg, longevityRange, projectionLabel, topDims } from '@/lib/scent/read';
import { longevityPercentile, longevityTickText, trailEnds, xScale, type TrailInput } from '@/lib/scent/trail';
import styles from './page.module.css';

const LETTERS = ['A', 'B', 'C', 'D'];
const COUNT_WORD = ['', 'One', 'Two', 'Three', 'Four'];
const ALL_WORD = ['', '', 'Both', 'All three', 'All four'];
const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
const SEASON_NAME: Record<(typeof SEASONS)[number], string> = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' };
/* The hero's status words, so a status reads the same here as there (handoff: a shared map in vocab.ts). */
const STATUS_NOTE: Record<string, string> = { reformulated: 'Reformulated', discontinued: 'Discontinued', limited: 'Limited edition', upcoming: 'Announced' };
/* The ruler under the Trail row, in hours. Four columns get a 260-wide thumb so its 12px end-labels never scale under 12px at 1280. */
const AXIS_HOURS = [0, 2, 4, 8, 12];
const thumbBox = (n: number) => (n === 4 ? { width: 260, height: 56 } : { width: 300, height: 64 });

function parseSlugs(raw: unknown): string[] {
  return String(raw ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''))
    .filter(Boolean)
    .slice(0, 4);
}

export async function generateMetadata(props: PageProps<'/compare'>): Promise<Metadata> {
  const sp = await props.searchParams;
  const slugs = parseSlugs(sp.f);
  const items = (await Promise.all(slugs.map((s) => getFragrance(s)))).filter(Boolean) as FragranceDetail[];
  if (items.length === 0) {
    return {
      title: 'Compare fragrances',
      description: 'Put two to four fragrances side by side: notes, what people smell, how long they last, how loud they are, seasons, price and ratings.',
    };
  }
  const names = items.map((i) => i.name);
  const title = names.join(' vs ');
  const description = `${names.slice(0, -1).join(', ')}${names.length > 1 ? ` and ${names.at(-1)}` : names[0]} side by side: notes, what people smell, the Trail, longevity, seasons, price and ratings.`;
  const f = items.map((i) => i.slug).join(',');
  return {
    title,
    description,
    openGraph: {
      title: `${title} · ${APP_NAME}`,
      description,
      type: 'website',
      url: `${SITE_URL}/compare?f=${f}`,
      images: [{ url: `${SITE_URL}/compare/og?f=${f}`, width: 1200, height: 630, alt: `${title}, compared on ${APP_NAME}` }],
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function ComparePage(props: PageProps<'/compare'>) {
  const sp = await props.searchParams;
  const slugs = parseSlugs(sp.f);
  const items = (await Promise.all(slugs.map((s) => getFragrance(s)))).filter(Boolean) as FragranceDetail[];

  if (items.length === 0) {
    return (
      <div className={`page ${styles.page}`}>
        <div className={styles.headRow}>
          <h1 className={`t-h3 ${styles.title}`}>Compare</h1>
        </div>
        <p className={styles.lede}>Pick two to four fragrances. Notes, what people smell, how long they last and what they cost, side by side.</p>
        <div className={styles.startPicker}>
          <ComparePicker current={[]} />
        </div>
        <p className={styles.try}>
          Or start from <Link href="/compare?f=dior-sauvage,bleu-de-chanel-edp,ysl-y-edp">three famous blue fragrances</Link>, or{' '}
          <Link href="/compare?f=tobacco-vanille,khamrah,jazz-club">three tobacco-sweet ones</Link>.
        </p>
      </div>
    );
  }

  const noteIndex = await getNoteIndex();
  const n = items.length;

  // Shared notes across the comparison: officially listed or strongly perceived by 2+ fragrances.
  const noteSets = items.map((f) => new Set([...(f.notes ? Object.values(f.notes).flat().map((x) => x.slug) : []), ...Object.entries(f.stats.perceived).filter(([, v]) => v >= 0.35).map(([k]) => k)]));
  const shared = new Set([...noteSets.flatMap((s) => [...s])].filter((slug) => noteSets.filter((s) => s.has(slug)).length >= 2));

  const overlap = await shelfOverlap(items.map((i) => i.id));
  const trails: TrailInput[] = items.map((f) => ({
    character: f.stats.character,
    longevityHrs: f.stats.longevityMedian,
    longevityLateHrs: longevityPercentile(f.stats.longevityHist, 0.72),
    projectionOpening: histAvg(f.stats.projectionOpeningHist),
    projectionLater: histAvg(f.stats.projectionLaterHist),
    heartAtMin: f.heartAtMin,
    drydownAtMin: f.drydownAtMin,
  }));

  // Leaders: one mark per row, only where there is a real difference to point at.
  const ratingLead = leaderIndex(items.map((f) => (f.stats.ratingAvg !== null && f.stats.ratingCount >= 5 ? f.stats.ratingAvg : null)));
  const lastsLead = leaderIndex(items.map((f) => (f.stats.perfVotes >= 5 ? f.stats.longevityMedian : null)));
  const perMl = items.map((f) => (f.priceUsd && f.sizeMl ? f.priceUsd / f.sizeMl : null));
  const priceLead = leaderIndex(perMl, 'min');

  // Character: the union of each fragrance's top four, ordered once by the strongest value anywhere.
  const dims = [...new Set(items.flatMap((f) => topDims(f.stats.character.overall, 4, 0.1)))].sort(
    (a, b) => Math.max(...items.map((f) => f.stats.character.overall[b] ?? 0)) - Math.max(...items.map((f) => f.stats.character.overall[a] ?? 0)),
  );

  const concentrations = items.map((f) => (f.concentration ? CONCENTRATION_LABEL[f.concentration].long : null));
  const sameConcentration = n > 1 && concentrations.every((c) => c !== null && c === concentrations[0]);

  const cell = (f: FragranceDetail, i: number, body: ReactNode, extra?: string) => (
    <div key={f.slug} className={[styles.cell, extra ?? ''].join(' ').trim()} role="cell" data-col={i} style={{ ['--scent' as string]: f.accent } as CSSProperties}>
      <span className={styles.cellLetter}>
        <span aria-hidden="true">{LETTERS[i]}</span>
        <span className="visually-hidden">{f.name}: </span>
      </span>
      <div className={styles.cellBody}>{body}</div>
    </div>
  );

  const head = items.map((f, i) => (
    <div key={f.slug} className={styles.colHead} role="columnheader" data-col={i} style={{ ['--scent' as string]: f.accent } as CSSProperties}>
      <span className={styles.letter} aria-hidden="true">
        {LETTERS[i]}
      </span>
      <div className={styles.thumb} aria-hidden="true">
        <Icon name="bottle" size={22} className={styles.ghost} />
        {f.poster && (
          <div className={styles.thumbObject} style={{ height: `${slotHeight(f.bottleHeightMm)}%` }}>
            <Image src={f.poster} alt="" fill sizes="56px" className={styles.thumbImg} placeholder={f.blurData ? 'blur' : 'empty'} blurDataURL={f.blurData ?? undefined} />
          </div>
        )}
      </div>
      <div className={styles.colName}>
        <Link href={`/fragrance/${f.slug}`} className={styles.nameLink}>
          {f.name}
        </Link>
        <span className={styles.brand}>{f.brandName}</span>
      </div>
      {n > 1 && (
        <RemoveColumn
          slug={f.slug}
          name={f.name}
          href={`/compare?f=${items
            .filter((x) => x.slug !== f.slug)
            .map((x) => x.slug)
            .join(',')}`}
        />
      )}
    </div>
  ));

  return (
    <div className={`page ${styles.page}`}>
      <div className={styles.headRow}>
        <h1 className={`t-h3 ${styles.title}`}>Compare</h1>
        <div className={styles.controls}>
          {n < 4 && (
            <div className={styles.headPicker}>
              <ComparePicker variant="chip" current={items.map((i) => i.slug)} />
            </div>
          )}
          <ShareButton />
        </div>
      </div>
      <CompareShell
        items={items.map((f, i) => ({ slug: f.slug, name: f.name, brandName: f.brandName, letter: LETTERS[i] }))}
        head={head}
        meta={
          <p className={styles.meta}>
            <span>
              {COUNT_WORD[n]} {n === 1 ? 'fragrance' : 'fragrances'} side by side
            </span>
            {n > 1 && <span>Shared notes in bold</span>}
            {items.some((i) => i.stats.includesBaseline) && <DemoFlag />}
          </p>
        }
      >
        <Row label="Smells like" kind="prose">
          {items.map((f, i) => cell(f, i, <p className={styles.summary}>{f.summary ?? <span className={styles.null}>Not known yet</span>}</p>))}
        </Row>

        <Row label="Trail" note="One time scale for all. Longer lasts, thicker projects." kind="trail">
          {items.map((f, i) =>
            cell(
              f,
              i,
              <div className={styles.trailCell}>
                <div className={styles.trailCaption}>
                  <span className={styles.trailTick}>{longevityTickText(trails[i]) ?? 'Not enough votes to say how long'}</span>
                </div>
                <TrailThumb input={trails[i]} size="compare" {...thumbBox(n)} className={styles.trail} id={`cmp-${f.slug}`} />
                <TrailAxis input={trails[i]} width={thumbBox(n).width} />
              </div>,
              styles.trailCol,
            ),
          )}
          <div className={styles.axisShared} aria-hidden="true">
            <TrailAxis width={thumbBox(n).width} />
          </div>
        </Row>

        <Row label="Rating" note="Out of 10, from everyone who rated it.">
          {items.map((f, i) =>
            cell(
              f,
              i,
              f.stats.ratingAvg !== null && f.stats.ratingCount >= 5 ? (
                <Figure lead={ratingLead === i} caption="highest rated" n={sampleLabel(f.stats.ratingCount)}>
                  <b className={`t-figure ${styles.big}`}>{f.stats.ratingAvg.toFixed(1)}</b>
                  <span className={styles.outOf}>/10</span>
                </Figure>
              ) : (
                <Null n={sampleLabel(f.stats.ratingCount)}>Not enough votes</Null>
              ),
            ),
          )}
        </Row>

        {n > 1 && (
          <Row label="Shelf overlap" note={`Of the people with ${items[0].name} on their shelf.`}>
            {items.map((f, i) =>
              cell(
                f,
                i,
                i === 0 ? (
                  <span className={styles.dash}>the reference</span>
                ) : (
                  <span className={styles.phrase}>
                    <span className={styles.phraseLong}>{overlapPhrase(overlap.get(f.id) ?? 0, items[0].name)}</span>
                    <span className={styles.phraseShort}>{overlapPhrase(overlap.get(f.id) ?? 0)}</span>
                  </span>
                ),
              ),
            )}
          </Row>
        )}

        <Row label={<Term slug="longevity">Lasts</Term>}>
          {items.map((f, i) => {
            const range = f.stats.perfVotes >= 5 ? longevityRange(f.stats.longevityHist) : null;
            return cell(
              f,
              i,
              range ? (
                <Figure lead={lastsLead === i} caption="longest" n={sampleLabel(f.stats.perfVotes)}>
                  <span className={styles.value}>{range.text}</span>
                </Figure>
              ) : (
                <Null n={sampleLabel(f.stats.perfVotes)}>Not enough votes</Null>
              ),
            );
          })}
        </Row>

        <Row label={<Term slug="projection">Projection</Term>}>
          {items.map((f, i) => {
            if (f.stats.perfVotes < 5) return cell(f, i, <Null n={sampleLabel(f.stats.perfVotes)}>Not enough votes</Null>);
            const open = projectionLabel(histAvg(f.stats.projectionOpeningHist));
            const later = projectionLabel(histAvg(f.stats.projectionLaterHist));
            return cell(f, i, <span className={styles.value}>{open === later ? open : `${open}, then ${later.toLowerCase()}`}</span>);
          })}
        </Row>

        <div className={styles.group} role="rowgroup">
          <div className={styles.groupHead} role="row">
            <div className={styles.label} role="rowheader">
              Character
              <span className={styles.labelNote}>What the mix leans to, as a share of the whole.</span>
            </div>
          </div>
          <div className={styles.groupLetters} aria-hidden="true">
            <span />
            {items.map((f, i) => (
              <span key={f.slug} data-col={i}>
                {LETTERS[i]}
              </span>
            ))}
          </div>
          {dims.map((d) => (
            <div key={d} className={styles.subRow} role="row">
              <div className={styles.subLabel} role="rowheader">
                {DIMENSION_META[d].label}
              </div>
              {items.map((f, i) => {
                const v = f.stats.character.overall[d] ?? 0;
                return cell(
                  f,
                  i,
                  v >= 0.1 ? (
                    <span className={styles.bar} style={{ ['--bar-hue' as string]: DIMENSION_META[d].hue } as CSSProperties}>
                      <span className={styles.track} aria-hidden="true">
                        <span className={styles.fill} style={{ width: `${Math.min(100, v * 140)}%` }} />
                      </span>
                      <span className={styles.barValue}>{Math.round(v * 100)}%</span>
                    </span>
                  ) : (
                    <span className={styles.dash}>under 10%</span>
                  ),
                );
              })}
            </div>
          ))}
        </div>

        <Row label="Seasons" note="Share of voters who said it suits the season." kind="wide">
          {items.map((f, i) => {
            const top = SEASONS.reduce((a, b) => ((f.stats.wear[b] ?? 0) > (f.stats.wear[a] ?? 0) ? b : a));
            const v = f.stats.wear[top] ?? 0;
            return cell(
              f,
              i,
              f.stats.wearVoters >= 5 ? (
                <div className={styles.seasons}>
                  <SeasonsGlyph values={f.stats.wear} label={`Seasons people wear ${f.name} in`} />
                  <span className={styles.seasonCaption}>
                    {SEASON_NAME[top]} {Math.round(v * 100)}%
                  </span>
                </div>
              ) : (
                <Null n={sampleLabel(f.stats.wearVoters)}>Not enough votes</Null>
              ),
            );
          })}
        </Row>

        <Row label="Best for">
          {items.map((f, i) => {
            const best = WEAR_CONTEXTS.filter((c) => c.grp === 'occasion' && (f.stats.wear[c.key] ?? 0) > 0)
              .sort((a, b) => (f.stats.wear[b.key] ?? 0) - (f.stats.wear[a.key] ?? 0))
              .slice(0, 3)
              .map((c) => c.label);
            return cell(f, i, best.length ? <span className={styles.value}>{best.join(' · ')}</span> : <Null>Not enough votes</Null>);
          })}
        </Row>

        <Row label="Price">
          {items.map((f, i) =>
            cell(
              f,
              i,
              f.priceBand ? (
                <Figure lead={priceLead === i} caption="cheapest per ml">
                  <span className={styles.value}>{PRICE_BANDS[f.priceBand as PriceBand].label}</span>
                  {f.priceUsd && f.sizeMl ? (
                    <span className={styles.sub}>
                      <span className={styles.subLine}>
                        ~${Math.round(f.priceUsd)} / {f.sizeMl} ml
                      </span>
                      <span className={styles.subLine}>${(f.priceUsd / f.sizeMl).toFixed(2)} per ml</span>
                    </span>
                  ) : null}
                </Figure>
              ) : (
                <Null>Not known yet</Null>
              ),
            ),
          )}
        </Row>

        <Row label="Released">
          {items.map((f, i) =>
            cell(
              f,
              i,
              <span className={styles.value}>
                {f.releaseYear ?? <span className={styles.null}>Not known yet</span>}
                {f.status !== 'current' && STATUS_NOTE[f.status] ? (
                  <span className={styles.sub}>
                    {STATUS_NOTE[f.status]}
                    {f.status === 'discontinued' && f.discontinuedYear ? ` ${f.discontinuedYear}` : ''}
                  </span>
                ) : null}
              </span>,
            ),
          )}
        </Row>

        <Row label="Concentration" merged={sameConcentration}>
          {sameConcentration ? (
            <div className={styles.merged} role="cell">
              {ALL_WORD[n]}: {concentrations[0]}
            </div>
          ) : (
            items.map((f, i) => cell(f, i, concentrations[i] ? <span className={styles.value}>{concentrations[i]}</span> : <Null>Not published</Null>))
          )}
        </Row>

        <Row label="Perfumer">
          {items.map((f, i) =>
            cell(
              f,
              i,
              f.perfumers.length ? (
                <span className={styles.value}>
                  {f.perfumers.map((p, k) => (
                    <span key={p.slug}>
                      {k > 0 && ', '}
                      <Link href={`/perfumer/${p.slug}`} className="link-quiet">
                        {p.name}
                      </Link>
                    </span>
                  ))}
                </span>
              ) : (
                <Null>Not disclosed</Null>
              ),
            ),
          )}
        </Row>

        <Row label={<Term slug="note-pyramid">Listed notes</Term>} note="What the house prints." kind="prose">
          {items.map((f, i) =>
            cell(
              f,
              i,
              f.notes ? (
                <p className={styles.notes}>
                  {Object.values(f.notes)
                    .flat()
                    .map((x, k) => (
                      <span key={x.slug + k}>
                        {k > 0 && ', '}
                        {shared.has(x.slug) ? <b>{x.name}</b> : x.name}
                      </span>
                    ))}
                </p>
              ) : (
                <Null>Not published</Null>
              ),
            ),
          )}
        </Row>

        <Row label="What people smell" note="Share of voters who noticed each note." kind="prose">
          {items.map((f, i) => {
            const top = Object.entries(f.stats.perceived)
              .sort((a, b) => b[1] - a[1])
              .filter(([s]) => noteIndex[s])
              .slice(0, 5);
            return cell(
              f,
              i,
              top.length ? (
                <p className={styles.notes}>
                  {top.map(([s, v], k) => (
                    <span key={s}>
                      {k > 0 && ', '}
                      {shared.has(s) ? <b>{noteIndex[s].name}</b> : noteIndex[s].name} <span className={styles.pct}>{Math.round(v * 100)}%</span>
                    </span>
                  ))}
                  <span className={styles.n}>{sampleLabel(f.stats.perceivedVoters)}</span>
                </p>
              ) : (
                <Null n={sampleLabel(f.stats.perceivedVoters)}>Not enough votes</Null>
              ),
            );
          })}
        </Row>
      </CompareShell>
    </div>
  );
}

/* One attribute across the table. `prose` rows stack on phones; `wide` rows (seasons) stack too; `trail` rows share one axis under 1100px. */
function Row({ label, note, kind, merged, children }: { label: ReactNode; note?: ReactNode; kind?: 'prose' | 'trail' | 'wide'; merged?: boolean; children: ReactNode }) {
  return (
    <div className={styles.row} role="row" data-kind={kind} data-merged={merged || undefined}>
      <div className={styles.label} role="rowheader">
        {label}
        {note && <span className={styles.labelNote}>{note}</span>}
      </div>
      {children}
    </div>
  );
}

/* A figure with its sample size, and the leader's mark: a 2px bergamot rule under the figure and a 12px word. */
function Figure({ children, lead, caption, n }: { children: ReactNode; lead: boolean; caption: string; n?: string }) {
  return (
    <span className={styles.figure} data-lead={lead || undefined}>
      <span className={styles.figureMain}>{children}</span>
      <span className={styles.figureMeta}>
        {lead && <span className={styles.leadCap}>{caption}</span>}
        {n && <span className={styles.n}>{n}</span>}
      </span>
    </span>
  );
}

function Null({ children, n }: { children: ReactNode; n?: string }) {
  return (
    <span className={styles.figure}>
      <span className={styles.null}>{children}</span>
      {n && (
        <span className={styles.figureMeta}>
          <span className={styles.n}>{n}</span>
        </span>
      )}
    </span>
  );
}

/*
 * The ruler under a Trail: Spray · 2h · 4h · 8h · 12h on the thumb's own scale, plus this
 * column's median as an ink tick ("~8h"). A fixed label within 28px of the median gives way to
 * it. Without an input it is the bare shared axis the stacked layout draws once.
 */
function TrailAxis({ input, width }: { input?: TrailInput; width: number }) {
  const x = xScale(width);
  const median = input && input.longevityHrs !== null ? trailEnds(input).median : null;
  const mx = median !== null ? x(median) : null;
  return (
    <svg className={styles.axis} viewBox={`0 0 ${width} 22`} width={width} height={22} aria-hidden="true">
      <line x1={0} x2={width} y1={1.5} y2={1.5} className={styles.axisLine} />
      {AXIS_HOURS.map((h) => {
        const px = x(h);
        const yields = mx !== null && Math.abs(px - mx) < 28;
        return (
          <g key={h}>
            <line x1={px} x2={px} y1={1} y2={5} className={styles.axisLine} />
            {!yields && (
              <text x={px} y={17} textAnchor={h === 0 ? 'start' : h === 12 ? 'end' : 'middle'} className={styles.axisText}>
                {h === 0 ? 'Spray' : `${h}h`}
              </text>
            )}
          </g>
        );
      })}
      {mx !== null && median !== null && (
        <g className={styles.axisMedian}>
          <line x1={mx} x2={mx} y1={0} y2={7} />
          <text x={mx} y={17} textAnchor={mx > width * 0.72 ? 'end' : 'middle'}>
            ~{Math.round(median)}h
          </text>
        </g>
      )}
    </svg>
  );
}

/* Same mapping as the card: 70mm to 170mm fills 60 to 100% of the slot; unknown heights stand at 76%. */
function slotHeight(mm: number | null): number {
  if (!mm) return 76;
  const t = Math.min(1, Math.max(0, (mm - 70) / 100));
  return Math.round(60 + t * 40);
}
