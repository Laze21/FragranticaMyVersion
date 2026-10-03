'use client';

import { useEffect } from 'react';
import { useProvidePageChrome, usePageChrome } from '@/components/shell/PageChrome';
import { useVotes } from './VoteProvider';

/**
 * The fragrance page's side of the PageChrome channel. Once `#hero-actions` has left the viewport
 * the shell's tab bar becomes Shelf / Rate / Wear / I smell / Sections and the rail shows its
 * compact actions; when the hero is back, the shell goes back to normal. The bar's Rate and
 * "I smell" open the vote sheets here; Shelf and Wear are answered by the hero's ShelfActions.
 */
export function FragranceChrome() {
  const { setContextualActions } = usePageChrome();
  const { open } = useVotes();
  useProvidePageChrome('none');

  useEffect(() => {
    const el = document.getElementById('hero-actions');
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setContextualActions(!e.isIntersecting && e.boundingClientRect.top < 0 ? 'fragrance' : 'none'), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [setContextualActions]);

  useEffect(() => {
    const onAction = (e: Event) => {
      const action = (e as CustomEvent<string>).detail;
      if (action === 'rate') open('rating');
      else if (action === 'smell') open('perceived');
      else return;
      e.preventDefault();
    };
    document.addEventListener('wake:action', onAction);
    return () => document.removeEventListener('wake:action', onAction);
  }, [open]);

  return null;
}
