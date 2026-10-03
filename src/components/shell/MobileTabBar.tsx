'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon, type IconName } from '@/components/Icon';
import { AtomizerButton } from '@/components/ui/AtomizerButton';
import { Sheet } from '@/components/ui/Sheet';
import { useViewer } from '@/components/viewer/ViewerProvider';
import { duration } from '@/lib/motion';
import { usePageChrome } from './PageChrome';
import styles from './MobileTabBar.module.css';

/**
 * The contextual tab bar's channel to a fragrance page. The bar dispatches a cancelable
 * `wake:action` event on `document` with one of these in `detail`; a page that handles it
 * (opens the shelf menu, the rating sheet, the "what do you smell" sheet, logs the wear) calls
 * `preventDefault()`. Unhandled, the bar falls back to scrolling to the matching section, or to
 * the diary for a wear. The shell never imports the page and the page never imports the shell.
 */
export type ChromeAction = 'shelf' | 'rate' | 'wear' | 'smell';
export const CHROME_ACTION_EVENT = 'wake:action';

/** Section ids and titles of a fragrance page, in page order; one vocabulary with the nav. */
export const FRAGRANCE_SECTIONS: Array<{ id: string; label: string }> = [
  { id: 'journey', label: 'How it moves' },
  { id: 'notes', label: 'Listed vs. smelled' },
  { id: 'performance', label: 'How long, how loud' },
  { id: 'wear', label: 'When to wear it' },
  { id: 'ratings', label: 'Ratings' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'similar', label: 'If you like this' },
  { id: 'details', label: 'Details' },
];

const FALLBACK_TARGET: Record<Exclude<ChromeAction, 'wear'>, string> = { shelf: 'hero-actions', rate: 'ratings', smell: 'notes' };

function dispatchAction(action: ChromeAction): boolean {
  const ev = new CustomEvent<ChromeAction>(CHROME_ACTION_EVENT, { detail: action, cancelable: true, bubbles: false });
  return !document.dispatchEvent(ev);
}

/**
 * Phones get a thumb-reach bar: five places, with Wear in the middle because logging today's
 * scent is the daily habit. On a fragrance page, once the hero's own actions scroll away, the
 * same five slots become the page's actions (Shelf, Rate, Wear, I smell, Sections) so there is
 * one bar, never two.
 */
export function MobileTabBar() {
  const path = usePathname();
  const router = useRouter();
  const { viewer } = useViewer();
  const { contextualActions, sectionInView } = usePageChrome();
  const [sections, setSections] = useState(false);
  const contextual = contextualActions === 'fragrance';
  const slug = path.startsWith('/fragrance/') ? path.split('/')[2] : null;

  const tabs: Array<{ href: string; label: string; icon: IconName }> = [
    { href: '/', label: 'Home', icon: 'home' },
    { href: '/discover', label: 'Discover', icon: 'search' },
    { href: '/shelf', label: 'Shelf', icon: 'shelf' },
    { href: viewer ? `/u/${viewer.handle}` : '/sign-in', label: viewer ? 'You' : 'Sign in', icon: 'user' },
  ];
  const actions: Array<{ action: Exclude<ChromeAction, 'wear'> | 'sections'; label: string; icon: IconName }> = [
    { action: 'shelf', label: 'Shelf', icon: 'shelf' },
    { action: 'rate', label: 'Rate', icon: 'check' },
    { action: 'smell', label: 'I smell…', icon: 'strip' },
    { action: 'sections', label: 'Sections', icon: 'list' },
  ];

  const act = (action: Exclude<ChromeAction, 'wear'> | 'sections') => {
    if (action === 'sections') return setSections(true);
    if (dispatchAction(action)) return;
    const el = document.getElementById(FALLBACK_TARGET[action]);
    el?.scrollIntoView({ block: action === 'shelf' ? 'center' : 'start', behavior: duration('standard') ? 'smooth' : 'auto' });
    if (action === 'shelf') el?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
  };

  const wear = () => {
    if (contextual && dispatchAction('wear')) return;
    // The droplet leaves before the page does.
    setTimeout(() => router.push('/diary?log=1'), duration('quick'));
  };

  const slot = (i: number) => {
    const t = tabs[i];
    const a = actions[i];
    const active = t.href === '/' ? path === '/' : path.startsWith(t.href.split('?')[0]);
    return (
      <div key={t.label} className={styles.slot} data-active={!contextual && active ? '' : undefined}>
        <Link href={t.href} className={styles.tab} aria-current={active && !contextual ? 'page' : undefined} aria-hidden={contextual || undefined} tabIndex={contextual ? -1 : undefined}>
          <span className={styles.icon}>
            <Icon name={t.icon} size={22} />
          </span>
          <span className={styles.label}>{t.label}</span>
        </Link>
        <button
          type="button"
          className={styles.tab}
          onClick={() => act(a.action)}
          aria-hidden={!contextual || undefined}
          tabIndex={contextual ? undefined : -1}
          aria-haspopup={a.action === 'sections' ? 'dialog' : undefined}
          aria-expanded={a.action === 'sections' ? sections : undefined}
          data-current={contextual && a.action === 'sections' && sectionInView ? '' : undefined}
        >
          <span className={styles.icon}>
            <Icon name={a.icon} size={22} />
          </span>
          <span className={styles.label}>{a.label}</span>
        </button>
      </div>
    );
  };

  return (
    <>
      <nav className={styles.bar} aria-label={contextual ? 'This fragrance' : 'Primary'} data-contextual={contextual || undefined}>
        {slot(0)}
        {slot(1)}
        <div className={styles.slot} data-primary>
          <AtomizerButton variant="tab" iconSize={22} className={styles.tab} onClick={wear} aria-label={slug && contextual ? 'Wearing it today' : 'Log a wear'}>
            <span className={styles.label}>Wear</span>
          </AtomizerButton>
        </div>
        {slot(2)}
        {slot(3)}
      </nav>
      <Sheet open={sections} onClose={() => setSections(false)} title="Sections" description="Jump to a part of this page.">
        <ul className={styles.sections} role="list">
          {FRAGRANCE_SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} aria-current={sectionInView === s.id ? 'location' : undefined} onClick={() => setSections(false)}>
                {s.label}
              </a>
            </li>
          ))}
        </ul>
        {slug && (
          <ul className={`${styles.sections} ${styles.sectionsMore}`} role="list">
            <li>
              <Link href={`/fragrance/${slug}/review`} onClick={() => setSections(false)}>
                Write a review
              </Link>
            </li>
            <li>
              <Link href={`/compare?f=${slug}`} onClick={() => setSections(false)}>
                Compare it
              </Link>
            </li>
          </ul>
        )}
      </Sheet>
    </>
  );
}
