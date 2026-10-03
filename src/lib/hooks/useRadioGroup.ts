'use client';

import { useCallback, useRef, type KeyboardEvent } from 'react';

interface Options<T> {
  /** The options in visual order. */
  values: readonly T[];
  /** The checked value, if any. Tab lands on it; otherwise on the first option. */
  value: T | null | undefined;
  onChange: (value: T) => void;
  /** Arrow keys move along both axes by default; a one-line row can restrict to horizontal. */
  orientation?: 'horizontal' | 'vertical' | 'both';
}

/**
 * Keyboard behaviour for a row of buttons that act as radios (score rows, the vote sheets, review
 * kinds, the discover segments). One Tab stop per group with a roving tabindex; Left/Right/Up/Down
 * move and check, Home/End jump, wrapping at the ends, as the ARIA radio-group pattern asks.
 * Spread `group()` on the container and `item(value)` on each button.
 */
export function useRadioGroup<T extends string | number>({ values, value, onChange, orientation = 'both' }: Options<T>) {
  const root = useRef<HTMLElement | null>(null);
  const focusIndex = useRef(-1);

  const indexOf = useCallback((v: T | null | undefined) => (v == null ? -1 : values.indexOf(v)), [values]);

  const focusAt = useCallback(
    (i: number) => {
      const el = root.current;
      if (!el) return;
      const radios = Array.from(el.querySelectorAll<HTMLElement>('[role="radio"]'));
      const target = radios[i];
      if (!target) return;
      focusIndex.current = i;
      target.focus();
    },
    [],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      const n = values.length;
      if (!n) return;
      const horizontal = orientation !== 'vertical';
      const vertical = orientation !== 'horizontal';
      let step = 0;
      if ((e.key === 'ArrowRight' && horizontal) || (e.key === 'ArrowDown' && vertical)) step = 1;
      else if ((e.key === 'ArrowLeft' && horizontal) || (e.key === 'ArrowUp' && vertical)) step = -1;
      let next: number;
      if (step) {
        const cur = focusIndex.current >= 0 ? focusIndex.current : Math.max(0, indexOf(value));
        next = (cur + step + n) % n;
      } else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = n - 1;
      else return;
      e.preventDefault();
      focusAt(next);
      onChange(values[next]);
    },
    [values, value, orientation, indexOf, focusAt, onChange],
  );

  const group = useCallback(
    () => ({
      ref: (el: HTMLElement | null) => {
        root.current = el;
      },
      role: 'radiogroup' as const,
      onKeyDown,
    }),
    [onKeyDown],
  );

  const item = useCallback(
    (v: T) => {
      const i = values.indexOf(v);
      const checked = value === v;
      // Tab stops on the checked option, or the first one when nothing is checked yet.
      const tabbable = checked || (indexOf(value) === -1 && i === 0);
      return {
        role: 'radio' as const,
        'aria-checked': checked,
        tabIndex: tabbable ? 0 : -1,
        onClick: () => onChange(v),
        onFocus: () => {
          focusIndex.current = i;
        },
      };
    },
    [values, value, indexOf, onChange],
  );

  return { group, item };
}
