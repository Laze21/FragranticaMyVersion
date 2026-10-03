'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import styles from './Popover.module.css';

/**
 * Small non-modal popover anchored to a trigger. Opens on click/tap (and on hover for fine
 * pointers), closes on Escape or outside click, keeps focus on the trigger, and flips to stay
 * inside the viewport.
 */
export function Popover({
  trigger,
  children,
  label,
  triggerClassName,
  hover = true,
  as = 'span',
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  label: string;
  triggerClassName?: string;
  hover?: boolean;
  as?: 'span' | 'div';
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; above: boolean } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();
  const Wrap = as;

  useLayoutEffect(() => {
    if (!open || !btn.current || !pop.current) return;
    const b = btn.current.getBoundingClientRect();
    const p = pop.current.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const above = b.bottom + p.height + 12 > window.innerHeight && b.top > p.height + 12;
    const left = Math.min(Math.max(8, b.left + b.width / 2 - p.width / 2), vw - p.width - 8);
    setPos({ left, top: above ? b.top - p.height - 8 : b.bottom + 8, above });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: Event) => {
      if (e instanceof KeyboardEvent) {
        if (e.key === 'Escape') {
          setOpen(false);
          btn.current?.focus();
        }
        return;
      }
      const t = e.target as Node;
      if (!btn.current?.contains(t) && !pop.current?.contains(t)) setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onDoc);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('keydown', onDoc);
      window.removeEventListener('scroll', onScroll);
    };
  }, [open]);

  const fine = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const enter = () => {
    if (!hover || !fine()) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), 260);
  };
  const leave = () => {
    if (!hover || !fine()) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 200);
  };

  return (
    <Wrap className={styles.wrap} onMouseEnter={enter} onMouseLeave={leave}>
      <button
        ref={btn}
        type="button"
        className={triggerClassName}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        {trigger}
      </button>
      {open && (
        <div
          ref={pop}
          id={id}
          role="dialog"
          aria-label={label}
          className={styles.pop}
          data-above={pos?.above || undefined}
          style={pos ? { left: pos.left, top: pos.top } : { visibility: 'hidden', left: 0, top: 0 }}
          onMouseEnter={enter}
          onMouseLeave={leave}
        >
          {children}
        </div>
      )}
    </Wrap>
  );
}
