'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { toast } from '@/components/ui/Toaster';
import { duration, ease, reducedMotion } from '@/lib/motion';
import { useScrollDirection } from '@/lib/hooks/useScrollDirection';
import { ComparePicker, compareHref } from './ComparePicker';
import styles from './CompareShell.module.css';

export interface CompareItem {
  slug: string;
  name: string;
  brandName: string;
  letter: string;
}

type Pair = 'ab' | 'cd';

const Ctx = createContext<{ remove: (slug: string) => void } | null>(null);

/* Which slugs the previous render of this route showed. Module scope: it survives in-app
   navigation (add, remove, replace) and resets on a full load, which is exactly when a column
   should and should not enter with motion. */
let lastSlugs: string[] | null = null;

/**
 * The compare table's client frame. Holds what the URL cannot: which pair of four is on screen
 * under 1100px, the column that is leaving (it fades before the navigation), the column that
 * just arrived (it enters, and its Trail draws on), the phone's pill row with its sheet, and the
 * share button. The rows themselves are server-rendered children; cells carry `data-col`.
 */
export function CompareShell({ items, head, meta, children }: { items: CompareItem[]; head: ReactNode; meta?: ReactNode; children: ReactNode }) {
  const router = useRouter();
  const [pair, setPair] = useState<Pair>('ab');
  const [open, setOpen] = useState<CompareItem | null>(null);
  const [replacing, setReplacing] = useState(false);
  const table = useRef<HTMLDivElement>(null);
  const slugs = items.map((i) => i.slug);
  const key = slugs.join(',');

  useLayoutEffect(() => {
    const prev = lastSlugs;
    lastSlugs = slugs;
    if (!prev || !table.current) return;
    const fresh = slugs.findIndex((s) => !prev.includes(s));
    if (fresh < 0) return;
    const ms = duration('standard');
    if (!ms) return;
    const cells = table.current.querySelectorAll<HTMLElement>(`[data-col="${fresh}"]`);
    cells.forEach((el) => el.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: ms, easing: ease('evaporate') }));
    // The arriving Trail draws on from the nose, the same reveal the chart uses, over 600ms.
    table.current.querySelectorAll<SVGElement>(`[data-col="${fresh}"] [data-trail]`).forEach((svg) => {
      svg.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 600, easing: ease('evaporate') });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const remove = useCallback(
    (slug: string) => {
      const index = slugs.indexOf(slug);
      const next = compareHref(slugs.filter((s) => s !== slug));
      const ms = reducedMotion() ? 0 : duration('exit');
      const cells = table.current?.querySelectorAll<HTMLElement>(`[data-col="${index}"]`) ?? [];
      if (!ms || !cells.length) return router.push(next);
      cells.forEach((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms, easing: ease('exit'), fill: 'forwards' }));
      setTimeout(() => router.push(next), ms);
    },
    [router, slugs],
  );

  const four = items.length === 4;
  const visible = four ? items.slice(pair === 'ab' ? 0 : 2, pair === 'ab' ? 2 : 4) : items;

  return (
    <Ctx.Provider value={{ remove }}>
      <div ref={table} className={styles.table} style={{ ['--cols' as string]: items.length } as CSSProperties} data-cols={items.length} data-pair={four ? pair : undefined} role="table" aria-label="Side by side">
        <PillRow items={visible} all={items} four={four} pair={pair} setPair={setPair} onOpen={setOpen} />
        {meta}
        <div className={styles.sticky} role="row">
          <div className={styles.corner} role="columnheader" aria-label="Attribute">
            {four && <PairControl pair={pair} setPair={setPair} items={items} />}
          </div>
          {head}
        </div>
        {children}
      </div>

      <Sheet
        open={open !== null}
        onClose={() => {
          setOpen(null);
          setReplacing(false);
        }}
        title={open?.name ?? ''}
        description={open ? `${open.brandName} · column ${open.letter}` : undefined}
      >
        {open && !replacing && (
          <ul role="list" className={styles.sheetList}>
            <li>
              <Link href={`/fragrance/${open.slug}`} className={styles.sheetRow}>
                <Icon name="external" size={18} />
                Open its page
              </Link>
            </li>
            <li>
              <button type="button" className={styles.sheetRow} onClick={() => setReplacing(true)}>
                <Icon name="rotate" size={18} />
                Replace it
              </button>
            </li>
            {items.length > 1 && (
              <li>
                <button
                  type="button"
                  className={styles.sheetRow}
                  onClick={() => {
                    const slug = open.slug;
                    setOpen(null);
                    remove(slug);
                  }}
                >
                  <Icon name="close" size={18} />
                  Remove from the comparison
                </button>
              </li>
            )}
          </ul>
        )}
        {open && replacing && (
          <div className={styles.sheetPicker}>
            <ComparePicker current={slugs} replace={open.slug} autoFocus onPicked={() => setOpen(null)} />
          </div>
        )}
      </Sheet>
    </Ctx.Provider>
  );
}

/** The phone's sticky row: one 40px pill per column on screen, the pair control at four, "+" at the end. */
function PillRow({
  items,
  all,
  four,
  pair,
  setPair,
  onOpen,
}: {
  items: CompareItem[];
  all: CompareItem[];
  four: boolean;
  pair: Pair;
  setPair: (p: Pair) => void;
  onOpen: (i: CompareItem) => void;
}) {
  const dir = useScrollDirection();
  return (
    <div className={styles.pillRow} data-header-hidden={dir === 'down' || undefined} role="presentation">
      <ul role="list" className={styles.pills} aria-label="Fragrances in this comparison">
        {items.map((i) => (
          <li key={i.slug}>
            <button type="button" className={`hit ${styles.pill}`} onClick={() => onOpen(i)} aria-label={`${i.letter}, ${i.name}: open, replace or remove`}>
              <span className={styles.pillLetter} aria-hidden="true">
                {i.letter}
              </span>
              <span className={styles.pillName}>{i.name}</span>
            </button>
          </li>
        ))}
      </ul>
      {four ? <PairControl pair={pair} setPair={setPair} items={all} /> : <AddPill current={all.map((i) => i.slug)} />}
    </div>
  );
}

/** "+" at the end of the pill row: opens the picker in a sheet, where the keyboard has room. */
function AddPill({ current }: { current: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={`hit ${styles.addPill}`} onClick={() => setOpen(true)} aria-label="Add a fragrance">
        <Icon name="plus" size={18} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Add a fragrance" description="Up to four side by side.">
        <div className={styles.sheetPicker}>{open && <ComparePicker current={current} autoFocus onPicked={() => setOpen(false)} />}</div>
      </Sheet>
    </>
  );
}

/** Four fragrances on a narrow screen: two at a time, A·B or C·D. */
function PairControl({ pair, setPair, items }: { pair: Pair; setPair: (p: Pair) => void; items: CompareItem[] }) {
  const names = (a: number, b: number) => `${items[a]?.name} and ${items[b]?.name}`;
  return (
    <div className={styles.seg} role="radiogroup" aria-label="Which two to show">
      <button type="button" role="radio" className="hit" aria-checked={pair === 'ab'} onClick={() => setPair('ab')} aria-label={`A and B: ${names(0, 1)}`}>
        A·B
      </button>
      <button type="button" role="radio" className="hit" aria-checked={pair === 'cd'} onClick={() => setPair('cd')} aria-label={`C and D: ${names(2, 3)}`}>
        C·D
      </button>
    </div>
  );
}

/** The × in a column head. Fades its column before the URL changes, so the removal reads as one. */
export function RemoveColumn({ slug, name, href }: { slug: string; name: string; href: string }) {
  const ctx = useContext(Ctx);
  return (
    <a
      href={href}
      className={`hit ${styles.remove}`}
      aria-label={`Remove ${name} from the comparison`}
      onClick={(e) => {
        if (!ctx) return;
        e.preventDefault();
        ctx.remove(slug);
      }}
    >
      <Icon name="close" size={16} />
    </a>
  );
}

/** Copies the page URL. The URL is the whole state, so a link is the comparison. */
export function ShareButton() {
  return (
    <button
      type="button"
      className="btn btn--quiet"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          toast('Comparison link copied.');
        } catch {
          toast('The link could not be copied. Copy it from the address bar.', 'error');
        }
      }}
    >
      <Icon name="share" size={16} />
      Share this comparison
    </button>
  );
}
