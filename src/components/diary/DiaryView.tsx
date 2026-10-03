'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { deleteWear, logWear } from '@/app/actions/community';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { toast } from '@/components/ui/Toaster';
import type { DiaryEntry } from '@/lib/data/diary';
import styles from './DiaryView.module.css';

interface Option {
  slug: string;
  name: string;
  brand: string;
  poster: string | null;
  status: string;
}
const WEATHER = ['hot', 'warm', 'mild', 'cool', 'cold', 'rain', 'humid'];
const OCCASIONS = ['office', 'school', 'casual', 'date', 'nightlife', 'formal', 'special', 'outdoors', 'home'];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export function DiaryView({ entries, options, openLog, today }: { entries: DiaryEntry[]; options: Option[]; openLog: boolean; today: string }) {
  const [logging, setLogging] = useState(openLog);
  const [localToday, setLocalToday] = useState(today);
  const router = useRouter();
  const [pending, start] = useTransition();
  useEffect(() => setLocalToday(new Date().toLocaleDateString('en-CA')), []);

  const month = localToday.slice(0, 7);
  const stats = useMemo(() => {
    const thisMonth = entries.filter((e) => e.date.startsWith(month));
    const counts = new Map<string, { name: string; slug: string; n: number }>();
    for (const e of thisMonth) for (const i of e.items) counts.set(i.slug, { name: i.name, slug: i.slug, n: (counts.get(i.slug)?.n ?? 0) + 1 });
    const top = [...counts.values()].sort((a, b) => b.n - a.n);
    const days = new Set(entries.map((e) => e.date));
    let streak = 0;
    const d = new Date(localToday);
    while (days.has(d.toLocaleDateString('en-CA'))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    const weather = new Map<string, number>();
    for (const e of entries) if (e.weather) weather.set(e.weather, (weather.get(e.weather) ?? 0) + 1);
    const rainy = entries.filter((e) => e.weather === 'rain').flatMap((e) => e.items);
    const rainyTop = rainy.length ? Object.entries(rainy.reduce<Record<string, number>>((m, i) => ((m[i.name] = (m[i.name] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1])[0] : null;
    return { wears: thisMonth.length, distinct: counts.size, top, streak, rainyTop };
  }, [entries, month, localToday]);

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Wear diary</h1>
          <p className={styles.sub}>
            {stats.wears} {stats.wears === 1 ? 'wear' : 'wears'} this month · {stats.distinct} different {stats.distinct === 1 ? 'fragrance' : 'fragrances'}
            {stats.streak > 1 ? ` · ${stats.streak}-day streak` : ''}
          </p>
        </div>
        <button type="button" className="btn" onClick={() => setLogging(true)}>
          <Icon name="atomizer" size={18} /> Log a wear
        </button>
      </header>

      <div className={styles.layout}>
        <div className={styles.main}>
          <Calendar entries={entries} today={localToday} />
          <section aria-labelledby="entries" className={styles.entries}>
            <h2 id="entries" className={styles.h2}>
              Recent wears
            </h2>
            {entries.length === 0 ? (
              <div className={styles.empty}>
                <p className={styles.emptyTitle}>Nothing logged yet.</p>
                <p>Tap “Log a wear” when you spray something. A week of entries is enough to start seeing patterns.</p>
              </div>
            ) : (
              <ol role="list" className={styles.list}>
                {entries.slice(0, 40).map((e) => (
                  <li key={e.id} id={`d-${e.date}`} className={styles.entry}>
                    <time dateTime={e.date} className={styles.date}>
                      <b>{new Date(`${e.date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric' })}</b>
                      <span>{new Date(`${e.date}T12:00:00`).toLocaleDateString('en-GB', { month: 'short', weekday: 'short' })}</span>
                    </time>
                    <div className={styles.items}>
                      {e.items.map((i) => (
                        <Link key={i.slug} href={`/fragrance/${i.slug}`} className={styles.item} style={{ ['--scent' as string]: i.accent }}>
                          <span className={styles.thumb}>{i.poster && <Image src={i.poster} alt="" fill sizes="36px" />}</span>
                          <span>
                            <span className={styles.itemName}>{i.name}</span>
                            <span className={styles.itemMeta}>
                              {i.brand}
                              {i.sprays ? ` · ${i.sprays} sprays` : ''}
                            </span>
                          </span>
                        </Link>
                      ))}
                      {e.items.length > 1 && <span className={styles.layered}>Layered</span>}
                      {(e.weather || e.occasion) && (
                        <p className={styles.ctx}>{[e.weather && cap(e.weather), e.occasion && cap(e.occasion)].filter(Boolean).join(' · ')}</p>
                      )}
                      {e.note && <p className={styles.note}>{e.note}</p>}
                    </div>
                    <button
                      type="button"
                      className={styles.del}
                      aria-label={`Delete the wear on ${e.date}`}
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          const r = await deleteWear(e.id);
                          if (!r.ok) return toast(r.error, 'error');
                          toast('Removed from your diary.');
                          router.refresh();
                        })
                      }
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
        <aside className={styles.side} aria-label="This month">
          <h2 className={styles.h2}>This month</h2>
          {stats.top.length ? (
            <ol role="list" className={styles.top}>
              {stats.top.slice(0, 5).map((t) => (
                <li key={t.slug}>
                  <Link href={`/fragrance/${t.slug}`}>{t.name}</Link>
                  <span className={styles.bar} aria-hidden>
                    <span style={{ width: `${(t.n / stats.top[0].n) * 100}%` }} />
                  </span>
                  <span className="tnum">{t.n}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="t-meta">No wears yet this month.</p>
          )}
          {stats.rainyTop && (
            <p className={styles.obs}>
              On rainy days you reach for <b>{stats.rainyTop[0]}</b> most.
            </p>
          )}
        </aside>
      </div>

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

function Calendar({ entries, today }: { entries: DiaryEntry[]; today: string }) {
  const byDay = useMemo(() => {
    const m = new Map<string, DiaryEntry['items']>();
    for (const e of entries) m.set(e.date, [...(m.get(e.date) ?? []), ...e.items]);
    return m;
  }, [entries]);
  const t = new Date(`${today}T12:00:00`);
  const months = [2, 1, 0].map((back) => new Date(t.getFullYear(), t.getMonth() - back, 1));
  return (
    <section aria-labelledby="cal" className={styles.cal}>
      <h2 id="cal" className="visually-hidden">
        Calendar of wears
      </h2>
      <div className={styles.months}>
        {months.map((m) => {
          const daysIn = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
          const lead = (m.getDay() + 6) % 7; // Monday first
          return (
            <div key={m.toISOString()} className={styles.month}>
              <p className={styles.monthName}>{m.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
              <ol role="list" className={styles.grid}>
                {Array.from({ length: lead }, (_, i) => (
                  <li key={`l${i}`} aria-hidden />
                ))}
                {Array.from({ length: daysIn }, (_, i) => {
                  const d = new Date(m.getFullYear(), m.getMonth(), i + 1).toLocaleDateString('en-CA');
                  const items = byDay.get(d) ?? [];
                  const future = d > today;
                  return (
                    <li key={d} className={styles.day} data-worn={items.length > 0 || undefined} data-today={d === today || undefined} data-future={future || undefined}>
                      {items.length ? (
                        <a href={`#d-${d}`} aria-label={`${new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}: ${items.map((x) => x.name).join(', ')}`}>
                          <span className={styles.dots} aria-hidden>
                            {items.slice(0, 2).map((x, k) => (
                              <i key={k} style={{ background: x.accent }} />
                            ))}
                          </span>
                          <span className={styles.num}>{i + 1}</span>
                        </a>
                      ) : (
                        <span className={styles.num}>{i + 1}</span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LogSheet({ options, today, onClose, onDone }: { options: Option[]; today: string; onClose: () => void; onDone: () => void }) {
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
      toast(picked.length > 1 ? 'Logged. Layering noted.' : `Logged ${picked[0].name}.`);
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
          <button type="button" className={`btn ${styles.logBtn}`} data-pressed={pressed || undefined} disabled={!picked.length || pending} onClick={submit}>
            <Icon name="atomizer" size={18} /> {pending ? 'Logging…' : 'Log it'}
          </button>
        </>
      }
    >
      <div className={styles.sheet}>
        {options.length > 0 && (
          <fieldset className={styles.fs}>
            <legend>From your shelf</legend>
            <div className={styles.opts}>
              {options.map((o) => (
                <button key={o.slug} type="button" className={styles.opt} aria-pressed={picked.some((p) => p.slug === o.slug)} onClick={() => toggle(o.slug, o.name)}>
                  <span className={styles.optThumb}>{o.poster && <Image src={o.poster} alt="" fill sizes="40px" />}</span>
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
                  <button type="button" aria-label={`Fewer sprays of ${p.name}`} onClick={() => setSprays((s) => ({ ...s, [p.slug]: Math.max(1, (s[p.slug] ?? 3) - 1) }))}>
                    −
                  </button>
                  <output className="tnum">{sprays[p.slug] ?? 3}</output>
                  <button type="button" aria-label={`More sprays of ${p.name}`} onClick={() => setSprays((s) => ({ ...s, [p.slug]: Math.min(30, (s[p.slug] ?? 3) + 1) }))}>
                    +
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
