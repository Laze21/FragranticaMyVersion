'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from 'react';
import { FragranceCard } from '@/components/cards/FragranceCard';
import { CharacterBars } from '@/components/scent/CharacterBars';
import { Ledge } from '@/components/scent/Ledge';
import { SeasonsGlyph } from '@/components/scent/SeasonsGlyph';
import { TrailThumb } from '@/components/scent/TrailThumb';
import { TrailMark } from '@/components/shell/TrailMark';
import { Icon } from '@/components/Icon';
import { EmptyState } from '@/components/ui/EmptyState';
import { Popover } from '@/components/ui/Popover';
import { Sheet } from '@/components/ui/Sheet';
import { toast } from '@/components/ui/Toaster';
import { setShelfStatus, updateShelfItem } from '@/app/actions/community';
import type { ShelfInsights, ShelfItem } from '@/lib/data/shelf';
import { COLLECTION_STATUSES, FORMATS } from '@/lib/scent/vocab';
import { relativeDays } from '@/lib/scent/read';
import styles from './ShelfView.module.css';

type View = 'shelf' | 'grid' | 'list';
const TABS = [
  { key: 'own', label: 'On the shelf' },
  { key: 'testing', label: 'Testing' },
  { key: 'want_sample', label: 'To sample' },
  { key: 'sampled', label: 'Sampled' },
  { key: 'want', label: 'Wishlist' },
  { key: 'had', label: 'Owned before' },
  { key: 'fav', label: 'Favourites' },
];
/* Slot pitch on the plank: 96px of column plus the 16px gap the Ledge puts between columns. */
const SLOT_PITCH = 112;
/* A bottle placed in the last ten seconds settles onto the plank; everything else is already standing. */
const JUST_ADDED_MS = 10_000;

const formatLabel = (key: string | null) => FORMATS.find((f) => f.key === key)?.label ?? null;

/*
 * Real scale on the plank: 70mm (a 30ml flacon) to 170mm (a 200ml splash) maps to 55-100% of
 * the standing room; an unknown height stands at 80%, a believable 100ml. The poster frame
 * carries ~15% of air over the cap, so the box is 198px at 100% to land a 168px bottle.
 */
const STAND = 168;
function objectHeight(mm: number | null): number {
  const pct = mm ? 55 + Math.min(1, Math.max(0, (mm - 70) / 100)) * 45 : 80;
  return Math.round((STAND * 1.18 * pct) / 100);
}

/*
 * "last Tue" inside a week, "3 wks ago" inside a season, then the month. Twelve pixels in a
 * 96px column have no room for more; the spaces are non-breaking so a wrap happens only at the dot.
 */
const NB = '\u00a0';
function lastWornShort(iso: string, now = Date.now()): string {
  const d = new Date(iso);
  const days = Math.floor((now - d.getTime()) / 86400000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `last${NB}${d.toLocaleDateString('en-GB', { weekday: 'short' })}`;
  if (days < 90) return `${Math.round(days / 7)}${NB}wks${NB}ago`;
  if (days < 365) return `in${NB}${d.toLocaleDateString('en-GB', { month: 'short' })}`;
  return relativeDays(iso, now).replace(/ /g, NB);
}

/* "Decant · 10 ml": the format only when it is not the plain bottle, the size when known. */
function formatLine(i: ShelfItem): string | null {
  const parts = [i.format && i.format !== 'bottle' ? formatLabel(i.format) : null, i.sizeMl ? `${i.sizeMl} ml` : null].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

export function ShelfView({ items: serverItems, insights, owner, editable }: { items: ShelfItem[]; insights: ShelfInsights; owner: { handle: string; displayName: string }; editable?: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState('own');
  const [view, setView] = useState<View>('shelf');
  const [editing, setEditing] = useState<ShelfItem | null>(null);
  const [adding, setAdding] = useState(false);
  // Optimistic copy of the shelf: edits land here first, the server's version replaces it on refresh.
  const [items, setItems] = useState(serverItems);
  useEffect(() => setItems(serverItems), [serverItems]);

  useEffect(() => {
    try {
      const v = localStorage.getItem('shelf-view') as View | null;
      if (v === 'shelf' || v === 'grid' || v === 'list') setView(v);
    } catch {}
  }, []);
  const chooseView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem('shelf-view', v);
    } catch {}
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { fav: items.filter((i) => i.favorite).length };
    for (const i of items) c[i.status] = (c[i.status] ?? 0) + 1;
    return c;
  }, [items]);
  const ofStatus = (key: string) => items.filter((i) => (key === 'fav' ? i.favorite : i.status === key));
  const shown = ofStatus(tab);
  const title = editable ? 'Your shelf' : `${owner.displayName}’s shelf`;

  const saveEdit = (item: ShelfItem, next: { status: string; format: string; sizeMl: number | null; fill: number; batchCode: string | null; pricePaid: number | null; notes: string | null }) => {
    const before = items;
    setItems((cur) => cur.map((i) => (i.card.id === item.card.id ? { ...i, ...next } : i)));
    setEditing(null);
    return (async () => {
      if (next.status !== item.status) {
        const r = await setShelfStatus(item.card.slug, next.status);
        if (!r.ok) throw new Error(r.error);
      }
      const res = await updateShelfItem(item.card.slug, { format: next.format, sizeMl: next.sizeMl, fill: next.fill, batchCode: next.batchCode, pricePaid: next.pricePaid, notes: next.notes });
      if (!res.ok) throw new Error(res.error);
      toast(`${item.card.name}: details saved.`);
      router.refresh();
    })().catch((e: Error) => {
      setItems(before);
      toast(e.message, 'error');
    });
  };

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div className={styles.titleRow}>
          <h1 className={`t-h3 ${styles.title}`}>{title}</h1>
          <p className={`${styles.sub} tnum`}>
            {counts.own ?? 0} on the shelf · {(counts.want ?? 0) + (counts.want_sample ?? 0)} wanted · {counts.sampled ?? 0} sampled
          </p>
        </div>
        <div className={styles.tools}>
          <div className={styles.views} role="radiogroup" aria-label="View">
            {(
              [
                ['shelf', 'shelf', 'Shelf'],
                ['grid', 'grid', 'Grid'],
                ['list', 'list', 'List'],
              ] as const
            ).map(([k, icon, label]) => (
              <button key={k} type="button" role="radio" className="hit" aria-checked={view === k} onClick={() => chooseView(k)} aria-label={`${label} view`}>
                <Icon name={icon} size={18} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          {editable && (
            <Popover hover={false} label="More" trigger={<span aria-hidden="true">···</span>} triggerClassName={`btn btn--quiet btn--small ${styles.more}`} as="div">
              <ul role="list" className={styles.menu}>
                <li>
                  <a href="/api/me/shelf.csv" download>
                    Export as CSV
                  </a>
                </li>
                <li>
                  <Link href={`/u/${owner.handle}/shelf`}>Your public shelf</Link>
                </li>
              </ul>
            </Popover>
          )}
        </div>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="Shelf sections">
        {TABS.map((t) => {
          const n = counts[t.key] ?? 0;
          return (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className="chip" data-on={tab === t.key || undefined} data-empty={n === 0 || undefined} onClick={() => setTab(t.key)}>
              {t.label}
              {n > 0 && <span className={`${styles.count} tnum`}>{n}</span>}
              {n === 0 && <span className="visually-hidden">, none</span>}
            </button>
          );
        })}
      </div>

      <div className={styles.layout} data-rail={tab === 'own' && insights.ownedCount > 0 ? '' : undefined}>
        <div role="tabpanel" className={styles.main}>
          {shown.length === 0 ? (
            <Empty tab={tab} editable={editable} owner={owner.displayName} onAdd={() => setAdding(true)} />
          ) : view === 'shelf' ? (
            <Cabinet
              groups={
                tab === 'own'
                  ? [
                      { key: 'own', items: shown, label: counts.want || counts.sampled ? 'On the shelf' : undefined },
                      { key: 'want', items: ofStatus('want'), label: 'Wishlist' },
                      { key: 'sampled', items: ofStatus('sampled'), label: 'Sampled' },
                    ].filter((g) => g.items.length > 0)
                  : [{ key: tab, items: shown }]
              }
              editable={editable}
              onEdit={setEditing}
              onAdd={() => setAdding(true)}
            />
          ) : view === 'grid' ? (
            <ul role="list" className={styles.grid}>
              {shown.map((i) => (
                <li key={i.card.id} className={styles.gridItem}>
                  <FragranceCard card={i.card} sizes="(max-width: 719px) 50vw, 220px" />
                  {editable && <EditButton item={i} onEdit={setEditing} />}
                </li>
              ))}
            </ul>
          ) : (
            <ShelfTable items={shown} editable={editable} onEdit={setEditing} />
          )}
        </div>
        {tab === 'own' && insights.ownedCount > 0 && <Insights insights={insights} editable={editable} owner={owner.displayName} />}
      </div>
      {editing && <EditSheet item={editing} onClose={() => setEditing(null)} onSave={saveEdit} />}
      {adding && <AddSheet status={tab === 'fav' ? 'own' : tab} onClose={() => setAdding(false)} />}
    </div>
  );
}

/* ---------- The cabinet ---------- */

interface Group {
  key: string;
  items: ShelfItem[];
  label?: string;
}

/**
 * Planks across the main column with 112px slots. Bottles fill the planks left to right; empty
 * slots are ticks, and the owner's last slot is the dashed outline that adds a bottle. The
 * plank count follows the column width, measured, so a phone gets a 3-up ledge and a desktop
 * eight across.
 */
function Cabinet({ groups, editable, onEdit, onAdd }: { groups: Group[]; editable?: boolean; onEdit: (i: ShelfItem) => void; onAdd: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [perPlank, setPerPlank] = useState(8);
  const firstPaint = useRef(true);
  const mountedAt = useRef(Date.now());
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setPerPlank(Math.max(3, Math.floor((el.clientWidth + 16) / SLOT_PITCH)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    // The stagger plays once, on the first paint. Tab switches and refreshes do not re-run it.
    const t = setTimeout(() => (firstPaint.current = false), 1200);
    return () => clearTimeout(t);
  }, []);
  const settleAll = firstPaint.current;

  return (
    <div ref={ref} className={styles.cabinet}>
      {groups.map((g, gi) => {
        const planks: ShelfItem[][] = [];
        for (let i = 0; i < g.items.length; i += perPlank) planks.push(g.items.slice(i, i + perPlank));
        // The add slot goes after the last bottle of the group the tab is about; a full plank gets a new one.
        const addHere = editable && gi === 0;
        if (addHere && (planks.length === 0 || planks[planks.length - 1].length === perPlank)) planks.push([]);
        return planks.map((row, pi) => {
          const last = pi === planks.length - 1;
          const fill = perPlank - row.length - (addHere && last ? 1 : 0);
          return (
            <div key={`${g.key}-${pi}`} className={styles.plankBlock}>
              <Ledge slots={perPlank} className={styles.ledge} label={pi === 0 ? g.label : undefined}>
                {row.map((i, n) => (
                  <Bottle key={i.card.id} item={i} index={n} settle={settleAll || Date.now() - new Date(i.addedAt).getTime() < JUST_ADDED_MS || new Date(i.addedAt).getTime() > mountedAt.current} editable={editable} onEdit={onEdit} />
                ))}
                {addHere && last && (
                  <button type="button" className={styles.add} onClick={onAdd}>
                    <svg viewBox="0 0 48 120" width="40" height="100" aria-hidden="true">
                      <path d="M18 2h12v10h-12zM14 12h20v8h-20zM10 20h28v92a4 4 0 0 1-4 4h-20a4 4 0 0 1-4-4z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" strokeLinejoin="round" />
                    </svg>
                    <span>Add a bottle</span>
                  </button>
                )}
                {Array.from({ length: Math.max(0, fill) }, (_, k) => (
                  <span key={`tick-${k}`} className={styles.tick} aria-hidden="true" />
                ))}
              </Ledge>
              <ul role="list" className={styles.captions} style={{ ['--slots' as string]: perPlank }}>
                {row.map((i) => (
                  <Caption key={i.card.id} item={i} />
                ))}
              </ul>
            </div>
          );
        });
      })}
    </div>
  );
}

function Bottle({ item: i, index, settle, editable, onEdit }: { item: ShelfItem; index: number; settle: boolean; editable?: boolean; onEdit: (i: ShelfItem) => void }) {
  return (
    <div className={styles.slot} style={{ ['--i' as string]: index, ['--scent' as string]: i.card.accent }} data-settle={settle || undefined}>
      <Link href={`/fragrance/${i.card.slug}`} className={styles.bottleLink} aria-label={`${i.card.name}, ${i.card.brandName}`}>
        <span className={styles.base} aria-hidden="true" />
        <span className={styles.object} style={{ height: objectHeight(i.card.bottleHeightMm) }}>
          {i.card.poster ? (
            <Image src={i.card.poster} alt="" fill sizes="126px" className={styles.img} {...(i.card.blurData ? { placeholder: 'blur' as const, blurDataURL: i.card.blurData } : {})} />
          ) : (
            <Icon name="bottle" size={28} className={styles.ghost} />
          )}
        </span>
      </Link>
      {i.favorite && <Icon name="heart" size={14} className={styles.heart} label="Favourite" />}
      {editable && <EditButton item={i} onEdit={onEdit} />}
    </div>
  );
}

function Caption({ item: i }: { item: ShelfItem }) {
  const fmt = formatLine(i);
  const worn = i.wears > 0 ? `worn${NB}${i.wears}×${i.lastWorn ? ` · ${lastWornShort(i.lastWorn)}` : ''}` : i.status === 'own' ? 'not worn yet' : null;
  const pct = i.fill !== null ? Math.round(i.fill * 100) : null;
  return (
    <li className={styles.caption} style={{ ['--scent' as string]: i.card.accent }}>
      <Link href={`/fragrance/${i.card.slug}`} className={styles.name}>
        {i.card.name}
      </Link>
      <span className={styles.house}>{i.card.brandName}</span>
      {fmt && <span className={styles.fmt}>{fmt}</span>}
      {worn && <span className={`${styles.worn} tnum`}>{worn}</span>}
      {pct !== null && (
        <span className={styles.fill}>
          <span className={styles.fillBar} aria-hidden="true">
            <span style={{ width: `${pct}%` }} />
          </span>
          <span className="visually-hidden">{pct}% left</span>
        </span>
      )}
    </li>
  );
}

function EditButton({ item, onEdit }: { item: ShelfItem; onEdit: (i: ShelfItem) => void }) {
  return (
    <button type="button" className={`${styles.editBtn} hit`} onClick={() => onEdit(item)} aria-label={`Edit ${item.card.name}`}>
      <Icon name="edit" size={16} />
    </button>
  );
}

/* ---------- List view ---------- */

function ShelfTable({ items, editable, onEdit }: { items: ShelfItem[]; editable?: boolean; onEdit: (i: ShelfItem) => void }) {
  const cell = {
    format: (i: ShelfItem) => formatLabel(i.format) ?? '—',
    size: (i: ShelfItem) => (i.sizeMl ? `${i.sizeMl} ml` : '—'),
    left: (i: ShelfItem) => (i.fill !== null ? `${Math.round(i.fill * 100)}%` : '—'),
    last: (i: ShelfItem) => (i.lastWorn ? relativeDays(i.lastWorn) : 'Never'),
    paid: (i: ShelfItem) => (i.pricePaid !== null ? `$${Math.round(i.pricePaid)}` : '—'),
    perWear: (i: ShelfItem) => (i.pricePaid !== null && i.wears > 0 ? `$${(i.pricePaid / i.wears).toFixed(2)}` : '—'),
  };
  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Fragrance</th>
              <th scope="col">Format</th>
              <th scope="col" className={styles.num}>
                Size
              </th>
              <th scope="col" className={styles.num}>
                Left
              </th>
              <th scope="col" className={styles.num}>
                Worn
              </th>
              <th scope="col">Last worn</th>
              <th scope="col" className={styles.num}>
                Paid
              </th>
              <th scope="col" className={styles.num}>
                Per wear
              </th>
              {editable && (
                <th scope="col">
                  <span className="visually-hidden">Edit</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.card.id}>
                <th scope="row">
                  <Link href={`/fragrance/${i.card.slug}`} className={styles.tName}>
                    {i.card.name}
                  </Link>
                  <span className={styles.tHouse}>
                    {i.card.brandName}
                    {i.favorite && (
                      <>
                        {' '}
                        <Icon name="heart" size={12} className={styles.tHeart} label="Favourite" />
                      </>
                    )}
                  </span>
                </th>
                <td>{cell.format(i)}</td>
                <td className={styles.num}>{cell.size(i)}</td>
                <td className={styles.num}>{cell.left(i)}</td>
                <td className={styles.num}>{i.wears}</td>
                <td>{cell.last(i)}</td>
                <td className={styles.num}>{cell.paid(i)}</td>
                <td className={styles.num}>{cell.perWear(i)}</td>
                {editable && (
                  <td className={styles.tEdit}>
                    <EditButton item={i} onEdit={onEdit} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Phones: the same facts stacked, nothing scrolls sideways. */}
      <ul role="list" className={styles.stack}>
        {items.map((i) => (
          <li key={i.card.id} className={styles.stackItem}>
            <div className={styles.stackHead}>
              <Link href={`/fragrance/${i.card.slug}`} className={styles.tName}>
                {i.card.name}
              </Link>
              <span className={styles.tHouse}>{i.card.brandName}</span>
              {editable && <EditButton item={i} onEdit={onEdit} />}
            </div>
            <dl className={styles.stackGrid}>
              <div>
                <dt>Format</dt>
                <dd>{cell.format(i)}</dd>
              </div>
              <div>
                <dt>Size</dt>
                <dd>{cell.size(i)}</dd>
              </div>
              <div>
                <dt>Left</dt>
                <dd>{cell.left(i)}</dd>
              </div>
              <div>
                <dt>Worn</dt>
                <dd>{i.wears}×</dd>
              </div>
            </dl>
            <p className={`${styles.stackMeta} tnum`}>
              Last worn {cell.last(i)} · Paid {cell.paid(i)} · {cell.perWear(i)} a wear
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ---------- Your shelf, read back ---------- */

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

function Insights({ insights: s, editable, owner }: { insights: ShelfInsights; editable?: boolean; owner: string }) {
  const whose = editable ? 'Your' : `${owner}’s`;
  const yours = editable ? 'your' : 'their';
  const hasLists = s.topNotes.length + s.houses.length + s.perfumers.length > 0;
  return (
    <aside className={styles.insights} aria-labelledby="read-back">
      <h2 id="read-back" className={styles.iTitle}>
        {whose} shelf, read back
      </h2>
      {s.trail && (
        <figure className={styles.trail}>
          <TrailThumb input={s.trail} size="feature" width={320} height={64} />
          <figcaption className={styles.trailCap}>
            <TrailMark className={styles.trailMark} />
            {whose} shelf, as a trail
          </figcaption>
        </figure>
      )}
      {s.sentences.length > 0 && (
        <ul role="list" className={styles.sentences}>
          {s.sentences.map((t) => (
            <li key={t}>{editable ? t : t.replace(/^You own/, `${owner} owns`).replace(/\byour\b/g, 'their')}</li>
          ))}
        </ul>
      )}

      <section className={styles.iSection} aria-labelledby="i-character">
        <h3 id="i-character" className={styles.iHead}>
          Character
        </h3>
        <CharacterBars vec={s.character} limit={5} label={`${whose} shelf's character`} />
      </section>

      <section className={styles.iSection} aria-labelledby="i-seasons">
        <h3 id="i-seasons" className={styles.iHead}>
          Seasons it suits
        </h3>
        {s.seasonsSpread < 0.15 ? (
          <p className={styles.iLine}>{s.seasonsSpread === 0 ? 'Not enough votes' : 'Much the same in every season.'}</p>
        ) : (
          <>
            {s.seasonsLine && <p className={styles.iLine}>{s.seasonsLine}</p>}
            <SeasonsGlyph values={s.seasons} label="Seasons the shelf suits" />
          </>
        )}
      </section>

      {hasLists ? (
        <>
          {s.topNotes.length > 0 && (
            <section className={styles.iSection} aria-labelledby="i-notes">
              <h3 id="i-notes" className={styles.iHead}>
                Notes {yours === 'your' ? 'you keep' : 'they keep'} coming back to
              </h3>
              <p className={styles.iText}>
                {s.topNotes.map((n, i) => (
                  <span key={n.slug}>
                    {i > 0 && ', '}
                    <Link href={`/notes/${n.slug}`}>{n.name}</Link> <span className={`${styles.iCount} tnum`}>{n.count}</span>
                  </span>
                ))}
              </p>
            </section>
          )}
          {s.houses.length > 0 && (
            <section className={styles.iSection} aria-labelledby="i-houses">
              <h3 id="i-houses" className={styles.iHead}>
                Houses
              </h3>
              <p className={styles.iText}>
                {s.houses.map((h, i) => (
                  <span key={h.slug}>
                    {i > 0 && ', '}
                    <Link href={`/house/${h.slug}`}>{h.name}</Link> <span className={`${styles.iCount} tnum`}>{h.count}</span>
                  </span>
                ))}
              </p>
            </section>
          )}
          {s.perfumers.length > 0 && (
            <section className={styles.iSection} aria-labelledby="i-perfumers">
              <h3 id="i-perfumers" className={styles.iHead}>
                Perfumers
              </h3>
              <p className={styles.iText}>
                {s.perfumers.map((p, i) => (
                  <span key={p.slug}>
                    {i > 0 && ', '}
                    <Link href={`/perfumer/${p.slug}`}>{p.name}</Link> <span className={`${styles.iCount} tnum`}>{p.count}</span>
                  </span>
                ))}
              </p>
            </section>
          )}
        </>
      ) : (
        s.noRepeats && <p className={styles.iLine}>{s.noRepeats}</p>
      )}

      <dl className={styles.stats}>
        <div>
          <dt>Average longevity</dt>
          <dd className="tnum">{s.avgLongevity ? `${s.avgLongevity.toFixed(1)} h` : 'Not known yet'}</dd>
        </div>
        <div>
          <dt>Most worn</dt>
          <dd className="tnum">
            {s.mostWorn[0] ? (
              <>
                <i className={styles.iName}>{s.mostWorn[0].card.name}</i> · {s.mostWorn[0].wears}×
              </>
            ) : (
              'No wears logged'
            )}
          </dd>
        </div>
        {s.neglected[0] && (
          <div>
            <dt>Due a wear</dt>
            <dd>
              <i className={styles.iName}>{s.neglected[0].card.name}</i>
              {s.neglected[0].lastWorn ? <span className={styles.iMuted}> · {relativeDays(s.neglected[0].lastWorn)}</span> : <span className={styles.iMuted}> · never</span>}
            </dd>
          </div>
        )}
        {s.spent !== null && (
          <div className={styles.stat}>
            <dt>
              Paid, where {yours === 'your' ? 'you' : 'they'} told us
              <span className={styles.iMuted}>
                {' '}
                · {s.spentCount} of {s.ownedCount}
              </span>
            </dt>
            <dd className="tnum">
              {money(s.spent)} recorded{s.costPerWear !== null ? ` · about ${s.costPerWear < 1 ? '$1' : money(s.costPerWear)} a wear` : ''}
            </dd>
          </div>
        )}
      </dl>
    </aside>
  );
}

/* ---------- Empty ---------- */

function Empty({ tab, editable, owner, onAdd }: { tab: string; editable?: boolean; owner: string; onAdd: () => void }) {
  if (tab === 'own') {
    return (
      <EmptyState
        variant="yours"
        title={editable ? 'Nothing on the shelf yet.' : `Nothing on ${owner}’s shelf yet.`}
        line={editable ? 'Open any fragrance and use Add to shelf, or put one here now.' : undefined}
        action={
          editable ? (
            <>
              <Link href="/discover" className="btn">
                Find something to put on it
              </Link>
              <button type="button" className="btn btn--quiet" onClick={onAdd}>
                Add a bottle
              </button>
            </>
          ) : undefined
        }
      />
    );
  }
  const msg: Record<string, [string, string]> = {
    testing: ['Nothing being tested right now.', 'Mark a fragrance as Testing from its page and it shows up here with the sample size and a fill level.'],
    want_sample: ['No samples on the list.', 'Want to sample is for things you have read about and not yet smelled.'],
    sampled: ['No samples logged yet.', 'Sampled keeps the vials you have tried, so you remember which you have ruled out.'],
    want: ['The wishlist is empty.', 'Want is for the full bottle you are saving for.'],
    had: ['Nothing owned before.', 'Owned before keeps the bottles you finished or let go, so the shelf still remembers them.'],
    fav: ['No favourites yet.', 'The heart lives in Edit details on each bottle.'],
  };
  const [title, line] = msg[tab] ?? ['Nothing here yet.', ''];
  return <EmptyState variant="section" icon="shelf" title={title} line={editable ? line : undefined} />;
}

/* ---------- Sheets ---------- */

function EditSheet({
  item,
  onClose,
  onSave,
}: {
  item: ShelfItem;
  onClose: () => void;
  onSave: (item: ShelfItem, next: { status: string; format: string; sizeMl: number | null; fill: number; batchCode: string | null; pricePaid: number | null; notes: string | null }) => void;
}) {
  const [format, setFormat] = useState(item.format ?? 'bottle');
  const [size, setSize] = useState(item.sizeMl?.toString() ?? '');
  const [fill, setFill] = useState(Math.round((item.fill ?? 1) * 100));
  const [batch, setBatch] = useState(item.batchCode ?? '');
  const [price, setPrice] = useState(item.pricePaid?.toString() ?? '');
  const [notes, setNotes] = useState(item.notes ?? '');
  const [status, setStatus] = useState(item.status);
  const save = () =>
    onSave(item, {
      status,
      format,
      sizeMl: size ? Number(size) : null,
      fill: fill / 100,
      batchCode: batch || null,
      pricePaid: price ? Number(price) : null,
      notes: notes || null,
    });
  return (
    <Sheet
      open
      onClose={onClose}
      title={item.card.name}
      description={item.card.brandName}
      footer={
        <>
          <button type="button" className="btn btn--quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn" onClick={save}>
            Save
          </button>
        </>
      }
    >
      <div className={styles.form}>
        <div className="field">
          <label htmlFor="e-status">Where it sits</label>
          <select id="e-status" className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
            {COLLECTION_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="e-format">Format</label>
          <select id="e-format" className="select" value={format} onChange={(e) => setFormat(e.target.value)}>
            {FORMATS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="e-size">Size (ml)</label>
          <input id="e-size" className="input" inputMode="decimal" value={size} onChange={(e) => setSize(e.target.value.replace(/[^\d.]/g, ''))} />
        </div>
        <div className="field">
          <label htmlFor="e-fill">How full: {fill}%</label>
          <input id="e-fill" type="range" min={0} max={100} step={5} value={fill} onChange={(e) => setFill(Number(e.target.value))} />
        </div>
        <div className="field">
          <label htmlFor="e-batch">Batch code</label>
          <input id="e-batch" className="input" value={batch} onChange={(e) => setBatch(e.target.value)} maxLength={40} />
          <span className="field-hint">Usually printed on the bottom of the bottle or box.</span>
        </div>
        <div className="field">
          <label htmlFor="e-price">What you paid (USD)</label>
          <input id="e-price" className="input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))} />
        </div>
        <div className="field">
          <label htmlFor="e-notes">Private notes</label>
          <textarea id="e-notes" className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
        </div>
      </div>
    </Sheet>
  );
}

const STATUS_TOAST: Record<string, (name: string) => string> = {
  own: (n) => `${n}: on your shelf.`,
  testing: (n) => `${n}: testing.`,
  want_sample: (n) => `${n}: on the sample list.`,
  sampled: (n) => `${n}: sampled.`,
  want: (n) => `${n}: on your wishlist.`,
  had: (n) => `${n}: owned before.`,
};

/** The same suggest search the diary uses, adding straight to the status the open tab shows. */
function AddSheet({ status, onClose }: { status: string; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Array<{ slug: string; label: string; sub: string }>>([]);
  const [pending, start] = useTransition();
  const where = COLLECTION_STATUSES.find((s) => s.key === status)?.verb.toLowerCase() ?? 'on your shelf';

  useEffect(() => {
    if (q.trim().length < 2) return setFound([]);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search/suggest?q=${encodeURIComponent(q.trim())}`);
        const d = (await r.json()) as { items: Array<{ type: string; slug: string; label: string; sub: string }> };
        setFound(d.items.filter((i) => i.type === 'fragrance').slice(0, 6));
      } catch {
        setFound([]);
      }
    }, 120);
    return () => clearTimeout(t);
  }, [q]);

  const pick = (slug: string, name: string) =>
    start(async () => {
      const r = await setShelfStatus(slug, status);
      if (!r.ok) return toast(r.error, 'error');
      toast((STATUS_TOAST[status] ?? STATUS_TOAST.own)(name));
      onClose();
      router.refresh();
    });

  return (
    <Sheet open onClose={onClose} title="Add a bottle" description={`It goes ${where}. Sizes and what you paid can come after.`}>
      <div className={styles.form}>
        <div className="field">
          <label htmlFor="add-find">Find the fragrance</label>
          <input id="add-find" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a name" autoComplete="off" autoFocus />
        </div>
        {found.length > 0 && (
          <ul role="list" className={styles.found} aria-busy={pending || undefined}>
            {found.map((f) => (
              <li key={f.slug}>
                <button type="button" className={styles.foundBtn} disabled={pending} onClick={() => pick(f.slug, f.label)}>
                  <span className={styles.foundName}>{f.label}</span>
                  <span className={styles.foundSub}>{f.sub}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {q.trim().length >= 2 && found.length === 0 && <p className="t-meta">Nothing by that name yet. Try the house, or the first word.</p>}
      </div>
    </Sheet>
  );
}
