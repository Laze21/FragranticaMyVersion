'use client';

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { duration } from '@/lib/motion';
import styles from './AtomizerButton.module.css';

/*
 * Seven droplets in a 32 degree cone from the nozzle, each with its own radius and travel
 * (10 to 14px), drawn as dx/dy so the CSS stays trig-free. Angles are measured upward and to
 * the right, the way an atomizer throws.
 */
const DOTS = [
  { r: 1.5, angle: -2, dist: 14 },
  { r: 1.5, angle: 8, dist: 12 },
  { r: 2, angle: -9, dist: 13 },
  { r: 1.5, angle: 14, dist: 10 },
  { r: 2, angle: -15, dist: 11 },
  { r: 1, angle: 3, dist: 14 },
  { r: 1.5, angle: -6, dist: 10 },
].map((d, i) => {
  const a = (d.angle * Math.PI) / 180;
  return { r: d.r, dx: Math.cos(a) * d.dist, dy: -Math.sin(a) * d.dist - 2, delay: i * 30 };
});

/* The tab-bar glyph: the atomizer with its body filled, so Wear reads as the one action among four places. */
export function FilledAtomizer({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8 10h8v10.2a.8.8 0 0 1-.8.8H8.8a.8.8 0 0 1-.8-.8V10Zm2-3h4v3h-4zM11 4h3v3h-3z" fill="currentColor" />
      <path d="M14 5.5h3M18.5 4.5l1.5-1M18.8 5.5H21M18.5 6.5l1.5 1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export interface AtomizerButtonHandle {
  /** Play the press without a click (a parent confirming an action started elsewhere). */
  spray: () => void;
}

type Variant = 'ink' | 'quiet' | 'bare' | 'tab';

/**
 * The atomizer press, one of the four signature motions. Used wherever a wear is logged:
 * "Wearing it today" on a fragrance page, "Log a wear" in the diary, the picks on the home
 * panel and the tab bar's Wear. On press the head dips, a short mist leaves the nozzle in the
 * fragrance's accent (`--scent`, falling back to ink), and the button flashes its wash. The tab
 * variant is quieter: a 1px dip and a single droplet before the page changes. Under reduced
 * motion only the flash remains.
 */
export const AtomizerButton = forwardRef<
  AtomizerButtonHandle,
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
    children?: React.ReactNode;
    variant?: Variant;
    iconSize?: number;
    /** Keep the mist and dip after the press (a parent that navigates away can leave it). */
    pressed?: boolean;
  }
>(function AtomizerButton({ children, variant = 'quiet', iconSize = 18, className, onClick, disabled, pressed, ...rest }, ref) {
  const [spraying, setSpraying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spray = () => {
    setSpraying(true);
    if (timer.current) clearTimeout(timer.current);
    // The last droplet lands at 180 + 560ms; the flash is long gone by then.
    timer.current = setTimeout(() => setSpraying(false), Math.max(duration('standard'), 760));
  };
  useImperativeHandle(ref, () => ({ spray }));
  const dots = variant === 'tab' ? DOTS.slice(2, 3) : DOTS;
  const cls = variant === 'tab' ? styles.tab : `btn ${variant === 'ink' ? '' : variant === 'bare' ? 'btn--bare' : 'btn--quiet'} ${styles.btn}`;
  return (
    <button
      type="button"
      {...rest}
      className={`${cls} ${className ?? ''}`}
      data-spraying={spraying || pressed || undefined}
      data-variant={variant}
      disabled={disabled}
      onClick={(e) => {
        if (!disabled) spray();
        onClick?.(e);
      }}
    >
      <span className={styles.head} aria-hidden style={variant === 'tab' ? undefined : { width: iconSize, height: iconSize }}>
        {variant === 'tab' ? (
          <span className={styles.icon}>
            <FilledAtomizer size={iconSize} />
          </span>
        ) : (
          <Icon name="atomizer" size={iconSize} className={styles.icon} />
        )}
        <span className={styles.mist} style={{ left: iconSize * 0.79, top: iconSize * 0.21 }}>
          {dots.map((d, i) => (
            <i
              key={i}
              style={{
                width: d.r * 2,
                height: d.r * 2,
                marginLeft: -d.r,
                marginTop: -d.r,
                ['--dx' as string]: `${d.dx}px`,
                ['--dy' as string]: `${d.dy}px`,
                ['--delay' as string]: `${d.delay}ms`,
              }}
            />
          ))}
        </span>
      </span>
      {children}
    </button>
  );
});
