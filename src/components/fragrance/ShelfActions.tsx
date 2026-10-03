'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Icon } from '@/components/Icon';
import { toast } from '@/components/ui/Toaster';
import { useViewer } from '@/components/viewer/ViewerProvider';
import { deleteWear, logWear, setFavorite, setShelfStatus } from '@/app/actions/community';
import { COLLECTION_STATUSES } from '@/lib/scent/vocab';
import styles from './ShelfActions.module.css';

/**
 * The three things people do most on a fragrance page, one tap each:
 * put it on the shelf (with a status), log a wear, favourite it.
 */
export function ShelfActions({ slug, name, upcoming, compact }: { slug: string; name: string; upcoming?: boolean; compact?: boolean }) {
  const { viewer, loaded, shelf, setShelfEntry } = useViewer();
  const router = useRouter();
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const [pending, start] = useTransition();
  const [placed, setPlaced] = useState(false);
  const [spraying, setSpraying] = useState(false);
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

  const choose = (status: string | null) => {
    setMenu(false);
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
      toast(status ? `${name}: ${label?.toLowerCase()}.` : `${name} removed from your shelf.`);
    });
  };

  const wearToday = () => {
    if (!viewer) return needAuth();
    setSpraying(true);
    setTimeout(() => setSpraying(false), 900);
    start(async () => {
      const res = await logWear({ slugs: [slug] });
      if (!res.ok) return toast(res.error, 'error');
      if (!entry) setShelfEntry(slug, { status: 'own', favorite: false });
      const id = (res.data as { id: string }).id;
      toast(`Logged: wearing ${name} today.`, 'default', {
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

  const current = entry ? COLLECTION_STATUSES.find((s) => s.key === entry.status) : null;

  return (
    <div className={styles.actions} id="hero-actions" data-compact={compact || undefined} aria-busy={pending || undefined}>
      <div className={styles.menuWrap} ref={menuRef}>
        <button
          type="button"
          className={`btn ${current ? 'btn--quiet' : ''} ${styles.shelfBtn}`}
          aria-haspopup="menu"
          aria-expanded={menu}
          disabled={!loaded}
          onClick={() => (viewer ? setMenu((m) => !m) : needAuth())}
        >
          <span className={styles.shelfIcon} data-placed={placed || undefined} aria-hidden>
            <Icon name={current ? 'check' : 'shelf'} size={18} />
          </span>
          {current ? current.verb : 'Add to shelf'}
          <Icon name="chevron-down" size={16} />
        </button>
        {menu && (
          <div className={styles.menu} role="menu" aria-label="Shelf status">
            {COLLECTION_STATUSES.filter((s) => !(upcoming && (s.key === 'own' || s.key === 'had' || s.key === 'sampled' || s.key === 'testing'))).map((s) => (
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
          </div>
        )}
      </div>
      {!upcoming && (
        <button type="button" className={`btn btn--quiet ${styles.wear}`} onClick={wearToday} data-spraying={spraying || undefined}>
          <span className={styles.atomizer} aria-hidden>
            <Icon name="atomizer" size={18} />
            <span className={styles.mist} />
          </span>
          <span className={styles.wearLong}>Wearing it today</span>
          <span className={styles.wearShort}>Worn today</span>
        </button>
      )}
      <button
        type="button"
        className={`btn btn--quiet ${styles.fav}`}
        aria-pressed={Boolean(entry?.favorite)}
        aria-label={entry?.favorite ? `Remove ${name} from favourites` : `Add ${name} to favourites`}
        onClick={fav}
      >
        <Icon name="heart" size={18} />
      </button>
    </div>
  );
}
