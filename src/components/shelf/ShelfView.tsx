'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { FragranceCard } from '@/components/cards/FragranceCard';
import { CharacterBars } from '@/components/scent/CharacterBars';
import { Icon } from '@/components/Icon';
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

export function ShelfView({ items, insights, owner, editable }: { items: ShelfItem[]; insights: ShelfInsights; owner: { handle: string; displayName: string }; editable?: boolean }) {
  const [tab, setTab] = useState('own');
  const [view, setView] = useState<View>('shelf');
  const [editing, setEditing] = useState<ShelfItem | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem('shelf-view') as View | null;
      if (v) setView(v);
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
  const shown = items.filter((i) => (tab === 'fav' ? i.favorite : i.status === tab));
  const title = editable ? 'Your shelf' : `${owner.displayName}’s shelf`;

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.sub}>
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
              <button key={k} type="button" role="radio" aria-checked={view === k} onClick={() => chooseView(k)} aria-label={`${label} view`}>
                <Icon name={icon} size={18} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          {editable && (
            <a className="btn btn--quiet btn--small" href="/api/me/shelf.csv" download>
              Export CSV
            </a>
          )}
        </div>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="Shelf sections">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className="chip" data-on={tab === t.key || undefined} onClick={() => setTab(t.key)}>
            {t.label} <span className={styles.count}>{counts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className={styles.layout}>
        <div role="tabpanel" className={styles.main}>
          {shown.length === 0 ? (
            <Empty tab={tab} editable={editable} />
          ) : view === 'shelf' ? (
            <ShelfLedges items={shown} />
          ) : view === 'grid' ? (
            <ul role="list" className={styles.grid}>
              {shown.map((i) => (
                <li key={i.card.id}>
                  <FragranceCard card={i.card} />
                  {editable && (
                    <button type="button" className={styles.editBtn} onClick={() => setEditing(i)}>
                      Edit details
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <ShelfTable items={shown} editable={editable} onEdit={setEditing} />
          )}
        </div>
        {tab === 'own' && insights.ownedCount > 0 && <Insights insights={insights} />}
      </div>
      {editing && <EditSheet item={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ShelfLedges({ items }: { items: ShelfItem[] }) {
  return (
    <div className={styles.ledges}>
      <ul role="list" className={styles.ledge}>
        {items.map((i, n) => (
          <li key={i.card.id} className={styles.bottle} style={{ ['--i' as string]: n, ['--scent' as string]: i.card.accent }}>
            <Link href={`/fragrance/${i.card.slug}`} className={styles.bottleLink}>
              <span className={styles.bottleImg}>{i.card.poster ? <Image src={i.card.poster} alt="" fill sizes="140px" /> : <span className={styles.noImg} />}</span>
              <span className={styles.bottleName}>{i.card.name}</span>
              <span className={styles.bottleHouse}>{i.card.brandName}</span>
            </Link>
            {i.favorite && (
              <span className={styles.fav} aria-label="Favourite">
                ♥
              </span>
            )}
            {i.format && i.format !== 'bottle' && <span className={styles.format}>{FORMATS.find((f) => f.key === i.format)?.label}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ShelfTable({ items, editable, onEdit }: { items: ShelfItem[]; editable?: boolean; onEdit: (i: ShelfItem) => void }) {
  return (
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
                <span className={styles.tHouse}>{i.card.brandName}</span>
              </th>
              <td>{FORMATS.find((f) => f.key === i.format)?.label ?? '—'}</td>
              <td className={styles.num}>{i.sizeMl ? `${i.sizeMl} ml` : '—'}</td>
              <td className={styles.num}>{i.fill !== null ? `${Math.round(i.fill * 100)}%` : '—'}</td>
              <td className={styles.num}>{i.wears}</td>
              <td>{i.lastWorn ? relativeDays(i.lastWorn) : 'Never'}</td>
              <td className={styles.num}>{i.pricePaid !== null ? `$${Math.round(i.pricePaid)}` : '—'}</td>
              <td className={styles.num}>{i.pricePaid !== null && i.wears > 0 ? `$${(i.pricePaid / i.wears).toFixed(2)}` : '—'}</td>
              {editable && (
                <td>
                  <button type="button" className="btn btn--bare btn--small" onClick={() => onEdit(i)} aria-label={`Edit ${i.card.name}`}>
                    <Icon name="edit" size={16} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Insights({ insights: s }: { insights: ShelfInsights }) {
  const seasonMax = Math.max(0.01, ...Object.values(s.seasons));
  return (
    <aside className={styles.insights} aria-label="About your shelf">
      <h2 className={styles.iTitle}>Your shelf, read back</h2>
      {s.sentences.length > 0 && (
        <ul role="list" className={styles.sentences}>
          {s.sentences.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
      <h3 className={styles.iHead}>Character</h3>
      <CharacterBars vec={s.character} limit={5} label="Your shelf's character" />
      <h3 className={styles.iHead}>Seasons it suits</h3>
      <div className={styles.seasons}>
        {Object.entries(s.seasons).map(([k, v]) => (
          <span key={k}>
            <i style={{ height: `${(v / seasonMax) * 100}%` }} aria-hidden />
            <small>{k[0].toUpperCase() + k.slice(1)}</small>
          </span>
        ))}
      </div>
      {s.topNotes.length > 0 && (
        <>
          <h3 className={styles.iHead}>Notes you keep coming back to</h3>
          <p className={styles.small}>
            {s.topNotes.slice(0, 6).map((n, i) => (
              <span key={n.slug}>
                {i > 0 && ', '}
                <Link href={`/notes/${n.slug}`}>{n.name}</Link> <span className="t-meta">({n.count})</span>
              </span>
            ))}
          </p>
        </>
      )}
      {s.houses.length > 0 && (
        <>
          <h3 className={styles.iHead}>Houses</h3>
          <p className={styles.small}>{s.houses.map((h) => `${h.name} (${h.count})`).join(', ')}</p>
        </>
      )}
      {s.perfumers.length > 0 && (
        <>
          <h3 className={styles.iHead}>Perfumers</h3>
          <p className={styles.small}>{s.perfumers.map((p) => `${p.name} (${p.count})`).join(', ')}</p>
        </>
      )}
      <dl className={styles.stats}>
        <div>
          <dt>Average longevity</dt>
          <dd>{s.avgLongevity ? `${s.avgLongevity.toFixed(1)} h` : '—'}</dd>
        </div>
        <div>
          <dt>Most worn</dt>
          <dd>{s.mostWorn[0] ? `${s.mostWorn[0].card.name} (${s.mostWorn[0].wears})` : '—'}</dd>
        </div>
        {s.neglected[0] && (
          <div>
            <dt>Due a wear</dt>
            <dd>{s.neglected[0].card.name}</dd>
          </div>
        )}
        {s.spent !== null && (
          <div>
            <dt>Spent (recorded)</dt>
            <dd>${Math.round(s.spent).toLocaleString('en-US')}</dd>
          </div>
        )}
      </dl>
    </aside>
  );
}

function Empty({ tab, editable }: { tab: string; editable?: boolean }) {
  const msg: Record<string, string> = {
    own: 'Nothing on the shelf yet.',
    testing: 'Nothing being tested right now.',
    want_sample: 'No samples on the list.',
    sampled: 'No samples logged yet.',
    want: 'The wishlist is empty.',
    had: 'Nothing here yet.',
    fav: 'No favourites yet.',
  };
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>{msg[tab]}</p>
      {editable && (
        <p>
          Open any fragrance and use <b>Add to shelf</b>. Or <Link href="/discover">find something</Link>.
        </p>
      )}
    </div>
  );
}

function EditSheet({ item, onClose }: { item: ShelfItem; onClose: () => void }) {
  const [format, setFormat] = useState(item.format ?? 'bottle');
  const [size, setSize] = useState(item.sizeMl?.toString() ?? '');
  const [fill, setFill] = useState(Math.round((item.fill ?? 1) * 100));
  const [batch, setBatch] = useState(item.batchCode ?? '');
  const [price, setPrice] = useState(item.pricePaid?.toString() ?? '');
  const [notes, setNotes] = useState(item.notes ?? '');
  const [status, setStatus] = useState(item.status);
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      if (status !== item.status) await setShelfStatus(item.card.slug, status);
      const res = await updateShelfItem(item.card.slug, {
        format,
        sizeMl: size ? Number(size) : null,
        fill: fill / 100,
        batchCode: batch || null,
        pricePaid: price ? Number(price) : null,
        notes: notes || null,
      });
      if (!res.ok) return toast(res.error, 'error');
      toast('Saved.');
      onClose();
      location.reload();
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
          <button type="button" className="btn" onClick={save} disabled={pending}>
            {pending ? 'Saving…' : 'Save'}
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
