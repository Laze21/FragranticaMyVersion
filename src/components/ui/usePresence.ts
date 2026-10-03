'use client';

import { useEffect, useRef, useState } from 'react';
import { duration, reducedMotion } from '@/lib/motion';

/**
 * Keeps an overlay mounted for its exit. `open` flips off, the layer loses its open attribute
 * and transitions out, and only then is it unmounted; under reduced motion it goes at once.
 * `exitMs` defaults to the `--d-exit` token; a layer with a longer exit (the phone sheet, the
 * toast) passes its own.
 */
export function usePresence(open: boolean, exitMs?: number): boolean {
  const [exiting, setExiting] = useState(false);
  const wasOpen = useRef(open);
  useEffect(() => {
    const closing = wasOpen.current && !open;
    wasOpen.current = open;
    if (open) {
      setExiting(false);
      return;
    }
    if (!closing) return;
    const ms = reducedMotion() ? 0 : (exitMs ?? duration('exit'));
    if (!ms) return;
    setExiting(true);
    const t = setTimeout(() => setExiting(false), ms + 20);
    return () => clearTimeout(t);
  }, [open, exitMs]);
  return open || exiting;
}
