'use client';

import { useEffect, useState } from 'react';

export type ScrollDirection = 'up' | 'down';

interface Options {
  /** Pixels of travel before a direction change counts; small jitters from rubber-banding do not flip the header. */
  threshold?: number;
  /** Below this scrollY the direction is always "up" so the header is present at the top of a page. */
  top?: number;
  /** Only observe when the media query matches (the header hides under 1100px only). */
  media?: string;
}

/**
 * Which way the page last moved, debounced by a travel threshold. The header under 1100px hides
 * on "down" and returns on "up"; at the top of the page it is always shown. Listens passively and
 * coalesces to one state update per animation frame. Returns "up" on the server and whenever the
 * media query does not match, so a static header never reads a stale "down".
 */
export function useScrollDirection({ threshold = 12, top = 24, media = '(max-width: 1099px)' }: Options = {}): ScrollDirection {
  const [dir, setDir] = useState<ScrollDirection>('up');

  useEffect(() => {
    const mql = window.matchMedia(media);
    let active = false;
    let lastY = window.scrollY;
    let raf = 0;

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        if (y <= top) {
          lastY = y;
          setDir('up');
          return;
        }
        const delta = y - lastY;
        if (Math.abs(delta) < threshold) return;
        lastY = y;
        setDir(delta > 0 ? 'down' : 'up');
      });
    };

    const start = () => {
      if (active) return;
      active = true;
      lastY = window.scrollY;
      window.addEventListener('scroll', onScroll, { passive: true });
    };
    const stop = () => {
      if (!active) return;
      active = false;
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      setDir('up');
    };
    const sync = () => (mql.matches ? start() : stop());

    sync();
    mql.addEventListener('change', sync);
    return () => {
      mql.removeEventListener('change', sync);
      stop();
    };
  }, [threshold, top, media]);

  return dir;
}
