'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment, useEffect, useMemo, useState, useTransition } from 'react';
import { deleteWear, logWear } from '@/app/actions/community';
import { Icon } from '@/components/Icon';
import { AtomizerButton } from '@/components/ui/AtomizerButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Sheet } from '@/components/ui/Sheet';
import { toast } from '@/components/ui/Toaster';
import type { DiaryEntry, DiaryItem, DiaryObservation, DiaryWeek, ShelfOption } from '@/lib/data/diary';
import styles from './DiaryView.module.css';

const WEATHER = ['hot', 'warm', 'mild', 'cool', 'cold', 'rain', 'humid'];
const OCCASIONS = ['office', 'school', 'casual', 'date', 'nightlife', 'formal', 'special', 'outdoors', 'home'];
const PAGE = 14;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const local = (d: string) => new Date(`${d}T12:00:00`);
const fmt = (d: string, opts: Intl.DateTimeFormatOptions) => local(d).toLocaleDateString('en-GB', opts);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "Oct Fri": three letters each, so the row's date column never wraps on a phone. */
const dayTag = (d: string) => `${MONTHS[local(d).getMonth()]} ${fmt(d, { weekday: 'short' })}`;
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
/** "Sauvage", "Sauvage and Khamrah", "Sauvage, Khamrah and Not a Perfume". */
const andList = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

/* The 24px bottle in a calendar cell, the 30x40 one in a row, the 16x22 one in the legend: one idiom. */
function Thumb({ item, sizes, className }: { item: Pick<DiaryItem, 'poster' | 'blur' | 'accent'>; sizes: string; className: string }) {
  const blur = item.blur ? ({ placeholder: 'blur', blurDataURL: item.blur } as const) : {};
  return (
    <span className={className} style={{ ['--scent' as string]: item.accent }}>
      <Icon name="bottle" size={14} className={styles.ghost} />
      {item.poster && <Image src={item.poster} alt="" fill sizes={sizes} {...blur} />}
    </span>
  );
}

export function DiaryView({
  entries,
  weeks,
  observations,
  options,
  openLog,
  today,
}: {
  entries: DiaryEntry[];
  weeks: DiaryWeek[];
  observations: DiaryObservation[];
  options: ShelfOption[];
  openLog: boolean;
  today: string;
}) {
  const [logging, setLogging] = useState(openLog);
  const [localToday, setLocalToday] = useState(today);
  const router = useRouter();
  // The server's date is UTC; the calendar and "this month" follow the phone's clock once it is known.
  useEffect(() => setLocalToday(new Date().toLocaleDateString('en-CA')), []);

  const month = localToday.slice(0, 7);
  const stats = useMemo(() => {
    const thisMonth = entries.filter((e) => e.date.startsWith(month));
    const counts = new Map<string, { name: string; slug: string; n: number }>();
    for (const e of thisMonth) for (const i of e.items) counts.set(i.slug, { name: i.name, slug: i.slug, n: (counts.get(i.slug)?.n ?? 0) + 1 });
    const top = [...counts.values()].sort((a, b) => b.n - a.n);
    const days = new Set(entries.map((e) => e.date));
    let streak = 0;
    const d = local(localToday);
    // A streak counts back from today, or from yesterday if today is not logged yet.
    if (!days.has(localToday)) d.setDate(d.getDate() - 1);
    while (days.has(d.toLocaleDateString('en-CA'))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return { wears: thisMonth.length, distinct: counts.size, top, streak };
  }, [entries, month, localToday]);

  const subline =
    stats.wears === 0
      ? 'No wears logged this month yet'
      : stats.distinct === 1
        ? `${stats.wears} ${stats.wears === 1 ? 'wear' : 'wears'} this month, ${stats.wears === 1 ? '' : 'all '}${stats.top[0].name}`
        : `${stats.wears} wears this month across ${stats.distinct} fragrances`;

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div className={styles.titleRow}>
          <h1 className={`t-h3 ${styles.title}`}>Wear diary</h1>
          <p className={styles.sub}>{subline}</p>
        </div>
        <AtomizerButton variant="ink" onClick={() => setLogging(true)}>
          Log a wear
        </AtomizerButton>
      </header>

      <div className={`layout-8-3 ${styles.layout}`}>
        <aside className={styles.strip} aria-labelledby="this-month">
          <h2 id="this-month" className={styles.asideTitle}>
            This month
          </h2>
          <dl className={styles.stats}>
            <div>
              <dd className="t-figure-serif">{stats.wears}</dd>
              <dt>{stats.wears === 1 ? 'wear' : 'wears'}</dt>
            </div>
            <div>
              <dd className="t-figure-serif">{stats.distinct}</dd>
              <dt>{stats.distinct === 1 ? 'bottle' : 'bottles'}</dt>
            </div>
            <div>
              <dd className="t-figure-serif">{stats.streak}</dd>
              <dt>day streak</dt>
            </div>
          </dl>
        </aside>

        <Calendar entries={entries} today={localToday} />

        {entries.length > 0 && (
          <div className={styles.rest}>
            <section aria-labelledby="most-worn" className={styles.restSection}>
              <h3 id="most-worn" className={styles.eyebrow}>
                Most worn this month
              </h3>
              {stats.top.length ? (
                <ol role="list" className={styles.top}>
                  {stats.top.slice(0, 3).map((t) => (
                    <li key={t.slug}>
                      <Link href={`/fragrance/${t.slug}`} className={styles.topName}>
                        {t.name}
                      </Link>
                      <span className={styles.bar} aria-hidden>
                        <span style={{ width: `${(t.n / stats.top[0].n) * 100}%` }} />
                      </span>
                      <span className={`tnum ${styles.topN}`}>{t.n}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={styles.quiet}>Nothing yet this month. The {fmt(entries[0].date, { day: 'numeric', month: 'long' })} wear was the last one.</p>
              )}
            </section>
            {observations.length > 0 && (
              <section aria-labelledby="noticed" className={styles.restSection}>
                <h3 id="noticed" className={styles.eyebrow}>
                  Noticed
                </h3>
                <ul role="list" className={styles.obs}>
                  {observations.map((o) => (
                    <li key={o.kind}>
                      {o.before}
                      <Link href={`/fragrance/${o.slug}`} className={styles.obsName}>
                        {o.name}
                      </Link>
                      {o.after}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>

      <section aria-labelledby="entries" className={styles.entries}>
        <h2 id="entries" className={`t-h3 ${styles.h2}`}>
          Recent wears
        </h2>
        {entries.length === 0 ? (
          <EmptyState
            variant="yours"
            title="Nothing logged yet."
            line="Log a wear when you spray something. A week of entries is enough to start seeing patterns."
            action={
              <AtomizerButton variant="ink" onClick={() => setLogging(true)}>
                Log today’s wear
              </AtomizerButton>
            }
          />
        ) : (
          <Weeks weeks={weeks} total={entries.length} onChanged={() => router.refresh()} />
        )}
      </section>

      {logging && (
        <LogSheet
          options={options}
          today={localToday}
          onClose={() => setLogging(false)}
          onDone={() => {
            setLogging(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

/* ---------- Calendar ---------- */

function Calendar({ entries, today }: { entries: DiaryEntry[]; today: string }) {
  const [cursor, setCursor] = useState(() => today.slice(0, 7));
  const [hover, setHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  useEffect(() => setCursor(today.slice(0, 7)), [today]);
  const focus = pinned ?? hover;

  const byDay = useMemo(() => {
    const m = new Map<string, { items: DiaryItem[]; anchor: string }>();
    for (const e of entries) {
      const cur = m.get(e.date);
      if (cur) cur.items.push(...e.items);
      else m.set(e.date, { items: [...e.items], anchor: e.id });
    }
    return m;
  }, [entries]);

  const t = local(today);
  const current = new Date(t.getFullYear(), t.getMonth(), 1);
  const [cy, cm] = cursor.split('-').map(Number);
  const shown = new Date(cy, cm - 1, 1);
  const months = [new Date(cy, cm - 2, 1), shown];
  // The window is 140 days; the calendar cannot go further back than the month that window starts in.
  const earliest = new Date(t.getFullYear(), t.getMonth(), t.getDate() - 140);
  const canPrev = monthKey(shown) > monthKey(earliest);
  const canNext = monthKey(shown) < monthKey(current);
  const move = (by: number) => setCursor(monthKey(new Date(cy, cm - 1 + by, 1)));

  const legend = useMemo(() => {
    const seen = new Map<string, DiaryItem>();
    const keys = months.map(monthKey);
    for (const [d, { items }] of byDay) if (keys.includes(d.slice(0, 7))) for (const i of items) if (!seen.has(i.slug)) seen.set(i.slug, i);
    return [...seen.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byDay, cursor]);

  return (
    <section aria-labelledby="cal" className={styles.cal}>
      <h2 id="cal" className="visually-hidden">
        Calendar of wears
      </h2>
      <div className={styles.months}>
        {months.map((m, mi) => {
          const daysIn = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
          const lead = (m.getDay() + 6) % 7; // Monday first
          const last = mi === months.length - 1;
          return (
            <div key={monthKey(m)} className={styles.month} data-prev={last ? undefined : ''}>
              <div className={styles.monthHead}>
                <p className={styles.monthName}>{m.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
                {last && (
                  <div className={styles.nav}>
                    <button type="button" className={styles.navBtn} onClick={() => move(-1)} disabled={!canPrev} aria-label="Previous month">
                      ‹
                    </button>
                    <button type="button" className={styles.navBtn} onClick={() => move(1)} disabled={!canNext} aria-label="Next month">
                      ›
                    </button>
                    {canNext && (
                      <button type="button" className={styles.navLink} onClick={() => setCursor(monthKey(current))}>
                        This month
                      </button>
                    )}
                  </div>
                )}
              </div>
              <ol role="list" className={styles.grid}>
                {Array.from({ length: lead }, (_, i) => (
                  <li key={`l${i}`} aria-hidden />
                ))}
                {Array.from({ length: daysIn }, (_, i) => {
                  const d = new Date(m.getFullYear(), m.getMonth(), i + 1).toLocaleDateString('en-CA');
                  const day = byDay.get(d);
                  const items = day?.items ?? [];
                  const dim = focus !== null && items.length > 0 && !items.some((x) => x.slug === focus);
                  return (
                    <li
                      key={d}
                      className={styles.day}
                      data-worn={items.length > 0 || undefined}
                      data-today={d === today || undefined}
                      data-future={d > today || undefined}
                      data-dim={dim || undefined}
                    >
                      {day ? (
                        <a href={`#w-${day.anchor}`} aria-label={`${fmt(d, { day: 'numeric', month: 'long' })}: ${andList(items.map((x) => x.name))}`}>
                          <span className={`${styles.num} tnum`}>{i + 1}</span>
                          {items.length > 2 ? (
                            <span className={styles.dots} aria-hidden>
                              {items.slice(0, 4).map((x, k) => (
                                <i key={k} style={{ background: x.accent }} />
                              ))}
                            </span>
                          ) : (
                            <span className={styles.cellThumbs} aria-hidden>
                              {items.map((x, k) => (
                                <Thumb key={k} item={x} sizes="24px" className={styles.cellThumb} />
                              ))}
                            </span>
                          )}
                        </a>
                      ) : (
                        <span className={`${styles.num} tnum`}>{i + 1}</span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
      </div>
      {legend.length > 0 && (
        <ul role="list" className={styles.legend} aria-label="Fragrances worn in these months">
          {legend.slice(0, 6).map((i) => (
            <li key={i.slug}>
              <button
                type="button"
                className={`hit ${styles.legendBtn}`}
                aria-pressed={pinned === i.slug}
                onMouseEnter={() => setHover(i.slug)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i.slug)}
                onBlur={() => setHover(null)}
                onClick={() => setPinned((p) => (p === i.slug ? null : i.slug))}
              >
                <Thumb item={i} sizes="16px" className={styles.legendThumb} />
                <span className={styles.legendName}>{i.name}</span>
              </button>
            </li>
          ))}
          {legend.length > 6 && <li className={styles.legendMore}>+{legend.length - 6} more</li>}
        </ul>
      )}
    </section>
  );
}

/* ---------- Recent wears ---------- */

function Weeks({ weeks, total, onChanged }: { weeks: DiaryWeek[]; total: number; onChanged: () => void }) {
  const [shown, setShown] = useState(PAGE);
  const [gone, setGone] = useState<Set<string>>(() => new Set());
  const [open, setOpen] = useState<DiaryEntry | null>(null);
  const [pending, start] = useTransition();

  const remove = (e: DiaryEntry) =>
    start(async () => {
      setGone((g) => new Set(g).add(e.id));
      const r = await deleteWear(e.id);
      if (!r.ok) {
        setGone((g) => {
          const n = new Set(g);
          n.delete(e.id);
          return n;
        });
        return toast(r.error, 'error');
      }
      toast(`${andList(e.items.map((i) => i.name))} removed from your diary.`, 'default', {
        label: 'Undo',
        onClick: () =>
          start(async () => {
            const sprays = Object.fromEntries(e.items.filter((i) => i.sprays).map((i) => [i.slug, i.sprays as number]));
            const res = await logWear({ slugs: e.items.map((i) => i.slug), date: e.date, sprays, weather: e.weather, occasion: e.occasion, note: e.note });
            if (!res.ok) return toast(res.error, 'error');
            onChanged();
          }),
      });
      onChanged();
    });

  // Fourteen rows at a time, cut inside a week rather than padded to one.
  let budget = shown;
  const visible = weeks
    .map((w) => {
      const rows = w.entries.filter((e) => !gone.has(e.id)).slice(0, Math.max(0, budget));
      budget -= rows.length;
      return { ...w, rows };
    })
    .filter((w) => w.rows.length > 0);
  const remaining = total - gone.size - shown;

  return (
    <>
      {visible.map((w) => (
        <Fragment key={w.start}>
          <h3 className={styles.weekHead}>
            Week of {fmt(w.start, { day: 'numeric' })} {MONTHS[local(w.start).getMonth()]}
            <span className={styles.weekMeta}>
              {' · '}
              <span className="tnum">{w.wears}</span> {w.wears === 1 ? 'wear' : 'wears'} ·{' '}
              <span className="tnum">{w.bottles}</span> {w.bottles === 1 ? 'bottle' : 'bottles'}
            </span>
          </h3>
          <ol role="list" className={styles.list}>
            {w.rows.map((e) => (
              <Row key={e.id} entry={e} pending={pending} onDelete={() => remove(e)} onOpen={() => setOpen(e)} />
            ))}
          </ol>
        </Fragment>
      ))}
      {remaining > 0 && (
        <p className={styles.more}>
          <button type="button" className="btn btn--quiet" onClick={() => setShown((n) => n + PAGE)}>
            Show earlier wears
            <span className={`${styles.moreCount} tnum`}>{remaining} more</span>
          </button>
        </p>
      )}
      {open && (
        <Sheet
          open
          onClose={() => setOpen(null)}
          title={fmt(open.date, { weekday: 'long', day: 'numeric', month: 'long' })}
          description={metaLine(open)}
          footer={
            <>
              <button type="button" className="btn btn--quiet" onClick={() => setOpen(null)}>
                Close
              </button>
              <button
                type="button"
                className="btn btn--quiet"
                disabled={pending}
                onClick={() => {
                  const e = open;
                  setOpen(null);
                  remove(e);
                }}
              >
                <Icon name="trash" size={16} /> Delete this wear
              </button>
            </>
          }
        >
          <ul role="list" className={styles.sheetItems}>
            {open.items.map((i) => (
              <li key={i.slug}>
                <Link href={`/fragrance/${i.slug}`} className={styles.sheetItem}>
                  <Thumb item={i} sizes="30px" className={styles.thumb} />
                  <span>
                    <span className={styles.name}>{i.name}</span>
                    <span className={styles.sheetBrand}>{i.brand}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {open.note && <p className={styles.note}>{open.note}</p>}
        </Sheet>
      )}
    </>
  );
}

/** "Dior · 3 sprays · Cold · Office", or for a layered wear "Layered · Dior 3 sprays, Lattafa 2 sprays · Cold". */
function metaLine(e: DiaryEntry) {
  const sprays = (n: number | null) => (n ? `${n} ${n === 1 ? 'spray' : 'sprays'}` : null);
  const head =
    e.items.length === 1
      ? [e.items[0].brand, sprays(e.items[0].sprays)]
      : ['Layered', e.items.map((i) => [i.brand, sprays(i.sprays)].filter(Boolean).join(' ')).join(', ')];
  return [...head, e.weather && cap(e.weather), e.occasion && cap(e.occasion)].filter(Boolean).join(' · ');
}

function Row({ entry: e, pending, onDelete, onOpen }: { entry: DiaryEntry; pending: boolean; onDelete: () => void; onOpen: () => void }) {
  return (
    <li id={`w-${e.id}`} className={styles.row}>
      <time dateTime={e.date} className={styles.date}>
        <b className="t-figure">{fmt(e.date, { day: 'numeric' })}</b>
        <span>{dayTag(e.date)}</span>
      </time>
      <span className={styles.thumbs}>
        {e.items.map((i) => (
          <Thumb key={i.slug} item={i} sizes="30px" className={styles.thumb} />
        ))}
      </span>
      <div className={styles.body}>
        <p className={styles.names}>
          {e.items.map((i, k) => (
            <Fragment key={i.slug}>
              {k > 0 && <span className={styles.plus}> + </span>}
              <Link href={`/fragrance/${i.slug}`} className={styles.name}>
                {i.name}
              </Link>
            </Fragment>
          ))}
        </p>
        <p className={styles.meta}>{metaLine(e)}</p>
        {e.note && <p className={styles.note}>{e.note}</p>}
      </div>
      <button type="button" className={`hit ${styles.del}`} aria-label={`Delete the wear on ${fmt(e.date, { day: 'numeric', month: 'long' })}`} disabled={pending} onClick={onDelete}>
        <Icon name="trash" size={16} />
      </button>
      <button type="button" className={`hit ${styles.rowMore}`} aria-label={`More about the wear on ${fmt(e.date, { day: 'numeric', month: 'long' })}`} onClick={onOpen}>
        ···
      </button>
    </li>
  );
}

/* ---------- Log a wear ---------- */

function LogSheet({ options, today, onClose, onDone }: { options: ShelfOption[]; today: string; onClose: () => void; onDone: () => void }) {
  const [picked, setPicked] = useState<Array<{ slug: string; name: string }>>([]);
  const [sprays, setSprays] = useState<Record<string, number>>({});
  const [date, setDate] = useState(today);
  const [weather, setWeather] = useState<string | null>(null);
  const [occasion, setOccasion] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Array<{ slug: string; label: string; sub: string }>>([]);
  const [pressed, setPressed] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (q.trim().length < 2) return setFound([]);
    const t = setTimeout(async () => {
      const r = await fetch(`/api/search/suggest?q=${encodeURIComponent(q.trim())}`);
      const d = (await r.json()) as { items: Array<{ type: string; slug: string; label: string; sub: string }> };
      setFound(d.items.filter((i) => i.type === 'fragrance').slice(0, 5));
    }, 120);
    return () => clearTimeout(t);
  }, [q]);

  const toggle = (slug: string, name: string) =>
    setPicked((p) => (p.some((x) => x.slug === slug) ? p.filter((x) => x.slug !== slug) : p.length >= 4 ? p : [...p, { slug, name }]));

  const submit = () =>
    start(async () => {
      setPressed(true);
      const res = await logWear({ slugs: picked.map((p) => p.slug), date, sprays, weather, occasion, note });
      if (!res.ok) {
        setPressed(false);
        return toast(res.error, 'error');
      }
      const when = date === today ? 'today' : `${fmt(date, { day: 'numeric' })} ${MONTHS[local(date).getMonth()]}`;
      toast(`${andList(picked.map((p) => p.name))} logged for ${when}.`);
      // The mist has left the nozzle by now; the sheet can go.
      setTimeout(onDone, 500);
    });

  return (
    <Sheet
      open
      onClose={onClose}
      title="What are you wearing?"
      description="Pick up to four if you’re layering."
      footer={
        <>
          <button type="button" className="btn btn--quiet" onClick={onClose}>
            Cancel
          </button>
          <AtomizerButton variant="ink" pressed={pressed} disabled={!picked.length} aria-busy={pending || undefined} onClick={() => !pending && submit()}>
            {pending ? 'Logging…' : 'Log it'}
          </AtomizerButton>
        </>
      }
    >
      <div className={styles.sheet}>
        {options.length > 0 && (
          <fieldset className={styles.fs}>
            <legend>From your shelf</legend>
            <div className={styles.opts}>
              {options.map((o) => (
                <button
                  key={o.slug}
                  type="button"
                  className={styles.opt}
                  style={{ ['--scent' as string]: o.accent }}
                  aria-pressed={picked.some((p) => p.slug === o.slug)}
                  onClick={() => toggle(o.slug, o.name)}
                >
                  <Thumb item={o} sizes="28px" className={styles.optThumb} />
                  <span className={styles.optName}>{o.name}</span>
                </button>
              ))}
            </div>
          </fieldset>
        )}
        <div className="field">
          <label htmlFor="log-find">{options.length ? 'Or find another' : 'Find the fragrance'}</label>
          <input id="log-find" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a name" autoComplete="off" />
          {found.length > 0 && (
            <ul role="list" className={styles.found}>
              {found.map((f) => (
                <li key={f.slug}>
                  <button
                    type="button"
                    onClick={() => {
                      toggle(f.slug, f.label);
                      setQ('');
                    }}
                  >
                    <span className={styles.optName}>{f.label}</span> <span className="t-meta">{f.sub}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {picked.length > 0 && (
          <fieldset className={styles.fs}>
            <legend>Sprays</legend>
            {picked.map((p) => (
              <div key={p.slug} className={styles.sprayRow}>
                <span className={styles.optName}>{p.name}</span>
                <div className={styles.stepper}>
                  <button type="button" className="hit" aria-label={`Fewer sprays of ${p.name}`} onClick={() => setSprays((s) => ({ ...s, [p.slug]: Math.max(1, (s[p.slug] ?? 3) - 1) }))}>
                    <Icon name="minus" size={16} />
                  </button>
                  <output className="tnum">{sprays[p.slug] ?? 3}</output>
                  <button type="button" className="hit" aria-label={`More sprays of ${p.name}`} onClick={() => setSprays((s) => ({ ...s, [p.slug]: Math.min(30, (s[p.slug] ?? 3) + 1) }))}>
                    <Icon name="plus" size={16} />
                  </button>
                </div>
              </div>
            ))}
          </fieldset>
        )}
        <div className="field">
          <label htmlFor="log-date">Date</label>
          <input id="log-date" type="date" className="input" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
        </div>
        <fieldset className={styles.fs}>
          <legend>Weather (optional)</legend>
          <div className="cluster">
            {WEATHER.map((w) => (
              <button key={w} type="button" className="chip" aria-pressed={weather === w} onClick={() => setWeather(weather === w ? null : w)}>
                {cap(w)}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className={styles.fs}>
          <legend>Occasion (optional)</legend>
          <div className="cluster">
            {OCCASIONS.map((o) => (
              <button key={o} type="button" className="chip" aria-pressed={occasion === o} onClick={() => setOccasion(occasion === o ? null : o)}>
                {cap(o)}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="field">
          <label htmlFor="log-note">Note (optional)</label>
          <textarea id="log-note" className="textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Lasted through dinner. Someone asked." />
        </div>
      </div>
    </Sheet>
  );
}
