'use client';

import { useEffect, useRef } from 'react';
import { duration, easeFn, reducedMotion } from '@/lib/motion';
import type { ExploreDetail } from './BottleStage';

/*
 * The "Explore the scent" handoff, timed from the moment the stage dispatches `scent:explore`:
 *   120ms  the page scrolls (rAF, 420ms) so the Trail sits under the stage
 *   200ms  forty droplets leave the nozzle on a shallow upward arc and land on the Trail's nib,
 *          each with its own delay, so the last lands while the Trail is drawing on
 *   700ms  the Trail draws on (TrailChart listens to the same event)
 *   1300ms the Opening note tags rise, 6px and from .35 opacity, 40ms apart, five at most
 * Phones have no room for a flight across the page: the mist rises inside the stage for 280ms
 * and the Trail draws when it scrolls into view. Reduced motion is an instant scroll and nothing
 * drawn. Two instances on one page would animate twice, so only the first mounted one acts.
 */
let instances = 0;

const PARTICLES = 40;

function headerHeight(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--header-h');
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 64;
}

function scrollTo(y: number, ms: number) {
  const from = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const to = Math.max(0, Math.min(max, y));
  if (ms <= 0 || Math.abs(to - from) < 2) {
    window.scrollTo(0, to);
    return;
  }
  const ease = easeFn('evaporate');
  const t0 = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / ms);
    window.scrollTo(0, from + (to - from) * ease(t));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** The Opening tags rise as the mist reaches them. Done with the Web Animations API so no module has to know. */
function riseTags(root: HTMLElement | null, at: number) {
  if (!root) return () => {};
  const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-mist-target]')).slice(0, 5);
  const settle = targets.map((t) => t.animate([{ opacity: 0.35, transform: 'translateY(6px)' }], { duration: 0, fill: 'forwards' }));
  const rise = window.setTimeout(() => {
    targets.forEach((t, i) => {
      const a = t.animate([{ opacity: 0.35, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], {
        duration: 420,
        delay: i * 40,
        easing: 'cubic-bezier(0.2, 0.7, 0.1, 1)',
        fill: 'forwards',
      });
      a.onfinish = () => {
        settle[i]?.cancel();
        a.cancel();
        t.setAttribute('data-arrived', '');
      };
    });
  }, at);
  return () => {
    clearTimeout(rise);
    settle.forEach((a) => a.cancel());
  };
}

export function MistOverlay() {
  const busy = useRef(false);

  useEffect(() => {
    instances += 1;
    const mine = instances === 1;
    const onExplore = (e: Event) => {
      if (!mine || busy.current) return;
      const detail = (e as CustomEvent<ExploreDetail>).detail;
      const fig = document.querySelector<HTMLElement>('[data-trail-chart]');
      if (!fig) return;
      const phone = window.matchMedia('(max-width: 719px)').matches;
      const reduce = reducedMotion();
      const figTop = fig.getBoundingClientRect().top + window.scrollY;
      // Desktop: the figure lands 56px under the header, which puts the nib about 120px below where
      // the stage was. Phones: the figure's top at the top of the viewport.
      const targetY = figTop - headerHeight() - (phone ? 8 : 56);

      if (reduce || !detail?.origin) {
        scrollTo(targetY, 0);
        fig.querySelector<HTMLElement>('[role="slider"]')?.focus({ preventScroll: true });
        return;
      }
      busy.current = true;
      const root = document.querySelector<HTMLElement>('[data-mist-root]');
      root?.querySelectorAll('[data-arrived]').forEach((t) => t.removeAttribute('data-arrived'));
      const undoTags = riseTags(root, 1300);

      const scrollDelay = window.setTimeout(() => scrollTo(targetY, duration('slow')), 120);

      const canvas = document.createElement('canvas');
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: '55' });
      canvas.setAttribute('aria-hidden', 'true');
      document.body.appendChild(canvas);
      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);

      const hues = detail.hues.length ? detail.hues : ['#9a8f80'];
      const originDoc = { x: detail.origin.x, y: detail.origin.y + detail.scrollY };
      const nib = fig.querySelector<HTMLElement>('[data-trail-nib]');
      const ease = easeFn('evaporate');
      type P = { born: number; dur: number; r: number; color: string; jx: number; jy: number; lift: number; wobble: number };
      const parts: P[] = Array.from({ length: PARTICLES }, (_, i) => ({
        born: phone ? 60 + Math.random() * 120 : 200 + (i / PARTICLES) * 500,
        dur: phone ? 280 : 520 + Math.random() * 260,
        r: 1 + Math.random(),
        color: hues[i % hues.length],
        jx: (Math.random() - 0.5) * 6,
        jy: (Math.random() - 0.5) * 6,
        lift: 40 + Math.random() * 30,
        wobble: (Math.random() - 0.5) * 24,
      }));
      const stageBottom = detail.stage ? detail.stage.bottom : null;
      const t0 = performance.now();
      const step = (now: number) => {
        const t = now - t0;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const ox = originDoc.x;
        const oy = originDoc.y - window.scrollY;
        const nr = nib?.getBoundingClientRect();
        const nx = nr ? nr.left : ox;
        const ny = nr ? nr.top : oy - 120;
        let alive = false;
        for (const p of parts) {
          const u = (t - p.born) / p.dur;
          if (u < 0) {
            alive = true;
            continue;
          }
          if (u >= 1) continue;
          alive = true;
          const e = ease(u);
          let x: number;
          let y: number;
          let alpha: number;
          if (phone) {
            // Inside the stage: up and out, fading before the band's edge.
            x = ox + p.jx + p.wobble * e;
            y = oy + p.jy - (40 + p.lift) * e;
            alpha = 0.5 * (1 - u);
            if (stageBottom !== null && y + window.scrollY > stageBottom) alpha = 0;
          } else {
            // A shallow arc: the control point sits 40 to 70px above the chord, never below.
            const x0 = ox + p.jx;
            const y0 = oy + p.jy;
            const cx = (x0 + nx) / 2 + p.wobble;
            const cy = Math.min(y0, ny) - p.lift;
            x = (1 - e) * (1 - e) * x0 + 2 * (1 - e) * e * cx + e * e * nx;
            y = (1 - e) * (1 - e) * y0 + 2 * (1 - e) * e * cy + e * e * ny;
            alpha = u < 0.1 ? 0.5 * (u / 0.1) : u > 0.82 ? 0.5 * (1 - (u - 0.82) / 0.18) : 0.5;
          }
          ctx.globalAlpha = Math.max(0, alpha);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(x, y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        if (alive && t < 2400) requestAnimationFrame(step);
        else {
          canvas.remove();
          window.setTimeout(() => {
            busy.current = false;
          }, 400);
        }
      };
      requestAnimationFrame(step);
      cleanup.current = () => {
        clearTimeout(scrollDelay);
        undoTags();
        canvas.remove();
      };
    };
    const cleanup = { current: () => {} };
    window.addEventListener('scent:explore', onExplore);
    return () => {
      instances -= 1;
      window.removeEventListener('scent:explore', onExplore);
      cleanup.current();
    };
  }, []);

  return null;
}
