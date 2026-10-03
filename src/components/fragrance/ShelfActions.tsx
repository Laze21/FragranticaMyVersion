'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Icon } from '@/components/Icon';
import { AtomizerButton } from '@/components/ui/AtomizerButton';
import { Sheet } from '@/components/ui/Sheet';
import { toast } from '@/components/ui/Toaster';
import { useViewer } from '@/components/viewer/ViewerProvider';
import { deleteWear, logWear, setFavorite, setShelfStatus } from '@/app/actions/community';
import { COLLECTION_STATUSES } from '@/lib/scent/vocab';
import styles from './ShelfActions.module.css';

type Intent = { kind: 'shelf' } | { kind: 'wear' } | { kind: 'fav' };

/**
 * The three things people do most on a fragrance page, one tap each: put it on the shelf (with
 * a status), log a wear, favourite it. One ink primary; the other two share one outlined border.
 *
 * Renders enabled on first paint: a tap before `/api/me` has answered is kept and run the moment
 * it does (`aria-busy` meanwhile, no dimming). The `primary` instance in the hero also answers the
 * tab bar's Shelf and Wear actions, so the bar never needs to know this component. `compact` is
 * the rail's and the tablet bar's 36px version. On phones the status chooser is a bottom sheet.
 */
export function ShelfActions({ slug, name, upcoming, compact, primary }: { slug: string; name: string; upcoming?: boolean; compact?: boolean; primary?: boolean }) {
  const { viewer, loaded, shelf, setShelfEntry } = useViewer();
  const router = useRouter();
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [pending, start] = useTransition();
  const [placed, setPlaced] = useState(false);
  const queued = useRef<Intent | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const entry = shelf[slug];

  useEffect(() => {
    if (!menu) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [menu]);

  const needAuth = () => {
    router.push(`/sign-in?next=${encodeURIComponent(path)}`);
  };

  const openChooser = () => {
    if (window.matchMedia('(max-width: 719px)').matches) setSheet(true);
    else setMenu((m) => !m);
  };

  const choose = (status: string | null) => {
    setMenu(false);
    setSheet(false);
    if (!viewer) return needAuth();
    const prev = entry ?? null;
    setShelfEntry(slug, status ? { status, favorite: entry?.favorite ?? false } : null);
    if (status) {
      setPlaced(true);
      setTimeout(() => setPlaced(false), 700);
    }
    start(async () => {
      const res = await setShelfStatus(slug, status);
      if (!res.ok) {
        setShelfEntry(slug, prev);
        toast(res.error, 'error');
        return;
      }
      const label = COLLECTION_STATUSES.find((s) => s.key === status)?.verb;
      toast(status ? `${name}: ${label?.toLowerCase()}.` : `${name} taken off your shelf.`, 'default', {
        label: 'Undo',
        onClick: () =>
          start(async () => {
            setShelfEntry(slug, prev);
            await setShelfStatus(slug, prev?.status ?? null);
          }),
      });
    });
  };

  const wearToday = () => {
    if (!viewer) return needAuth();
    start(async () => {
      const res = await logWear({ slugs: [slug] });
      if (!res.ok) return toast(res.error, 'error');
      if (!entry) setShelfEntry(slug, { status: 'own', favorite: false });
      const id = (res.data as { id: string }).id;
      toast(`${name} logged for today.`, 'default', {
        label: 'Undo',
        onClick: () => start(async () => void (await deleteWear(id))),
      });
    });
  };

  const fav = () => {
    if (!viewer) return needAuth();
    const next = !entry?.favorite;
    setShelfEntry(slug, { status: entry?.status ?? 'own', favorite: next });
    start(async () => {
      const res = await setFavorite(slug, next);
      if (!res.ok) toast(res.error, 'error');
    });
  };

  const run = (intent: Intent) => {
    if (!loaded) {
      queued.current = intent;
      return;
    }
    if (intent.kind === 'shelf') return viewer ? openChooser() : needAuth();
    if (intent.kind === 'wear') return wearToday();
    fav();
  };
  const runRef = useRef(run);
  runRef.current = run;

  // The answer from /api/me arrives: whatever was tapped in the meantime happens now.
  useEffect(() => {
    if (!loaded || !queued.current) return;
    const intent = queued.current;
    queued.current = null;
    runRef.current(intent);
  }, [loaded]);

  // The tab bar's Shelf and Wear slots on phones: handled here so the shell never imports the page.
  useEffect(() => {
    if (!primary) return;
    const onAction = (e: Event) => {
      const action = (e as CustomEvent<string>).detail;
      if (action !== 'shelf' && action !== 'wear') return;
      e.preventDefault();
      runRef.current({ kind: action });
    };
    document.addEventListener('wake:action', onAction);
    return () => document.removeEventListener('wake:action', onAction);
  }, [primary]);

  const current = entry ? COLLECTION_STATUSES.find((s) => s.key === entry.status) : null;
  const statuses = COLLECTION_STATUSES.filter((s) => !(upcoming && (s.key === 'own' || s.key === 'had' || s.key === 'sampled' || s.key === 'testing')));
  const busy = pending || (!loaded && queued.current !== null);

  const options = (
    <>
      {statuses.map((s) => (
        <button key={s.key} role="menuitemradio" aria-checked={entry?.status === s.key} type="button" onClick={() => choose(s.key)}>
          <span className={styles.radio} aria-hidden />
          {s.label}
        </button>
      ))}
      {entry && (
        <button role="menuitem" type="button" className={styles.remove} onClick={() => choose(null)}>
          Remove from shelf
        </button>
      )}
    </>
  );

  return (
    <div className={styles.actions} id={primary ? 'hero-actions' : undefined} data-compact={compact || undefined} aria-busy={busy || undefined}>
      <div className={styles.menuWrap} ref={menuRef}>
        <button
          type="button"
          className={`btn ${current ? 'btn--quiet' : ''} ${compact ? 'btn--small' : ''} ${styles.shelfBtn}`}
          aria-haspopup="menu"
          aria-expanded={menu || sheet}
          onClick={() => run({ kind: 'shelf' })}
        >
          <span className={styles.shelfIcon} data-placed={placed || undefined} aria-hidden>
            <Icon name={current ? 'check' : 'shelf'} size={18} />
          </span>
          <span className={styles.shelfLong}>{current ? current.verb : 'Add to shelf'}</span>
          <span className={styles.shelfShort}>{current ? current.label : 'Shelf'}</span>
          <Icon name="chevron-down" size={16} />
        </button>
        {menu && (
          <div className={styles.menu} role="menu" aria-label="Shelf status">
            {options}
          </div>
        )}
      </div>
      <div className={styles.pair}>
        {!upcoming && (
          <AtomizerButton variant="quiet" className={`${styles.wear} ${compact ? 'btn--small' : ''}`} onClick={() => run({ kind: 'wear' })} aria-label={compact ? 'Wearing it today' : undefined}>
            <span className={styles.wearLong}>Wearing it today</span>
            <span className={styles.wearShort}>Worn today</span>
          </AtomizerButton>
        )}
        <button
          type="button"
          className={`btn btn--quiet ${styles.fav}`}
          aria-pressed={Boolean(entry?.favorite)}
          aria-label={entry?.favorite ? `Remove ${name} from favourites` : `Add ${name} to favourites`}
          onClick={() => run({ kind: 'fav' })}
        >
          <Icon name="heart" size={18} />
        </button>
      </div>
      {sheet && (
        <Sheet open onClose={() => setSheet(false)} title={`${name} on your shelf`} description="Pick where it sits. You can change it any time.">
          <div className={styles.sheetMenu} role="menu" aria-label="Shelf status">
            {options}
          </div>
        </Sheet>
      )}
    </div>
  );
}
