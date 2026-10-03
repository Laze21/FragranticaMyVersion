'use client';

import { useEffect, useRef } from 'react';

/**
 * The "Explore the scent" transition. The atomizer (3D or poster) dispatches `scent:explore`
 * with the nozzle's screen position. We scroll the journey into view, then send a short drift
 * of mist particles from the nozzle to each opening note; each note rises as its particles land.
 * 2D canvas only, ~1.6s, then everything is removed. Reduced motion: a plain scroll.
 */
export function MistOverlay() {
  const busy = useRef(false);

  useEffect(() => {
    const onExplore = async (e: Event) => {
      if (busy.current) return;
      const root = document.querySelector<HTMLElement>('[data-mist-root]');
      if (!root) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const detail = (e as CustomEvent<{ origin: { x: number; y: number } | null; scrollY: number }>).detail;
      if (reduce || !detail?.origin) {
        root.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        root.focus?.();
        return;
      }
      busy.current = true;
      const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-mist-target]'));
      root.setAttribute('data-mist-state', 'waiting');
      targets.forEach((t) => t.removeAttribute('data-arrived'));

      const originDocY = detail.origin.y + detail.scrollY;
      root.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise((r) => setTimeout(r, 650));

      const canvas = document.createElement('canvas');
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: '55' });
      canvas.setAttribute('aria-hidden', 'true');
      document.body.appendChild(canvas);
      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);

      const ox = detail.origin.x;
      const oy = originDocY - window.scrollY;
      type P = { x0: number; y0: number; cx: number; cy: number; x1: number; y1: number; delay: number; dur: number; r: number; color: string; target: HTMLElement };
      const parts: P[] = [];
      targets.forEach((t, i) => {
        const rect = t.getBoundingClientRect();
        const color = t.dataset.mistTarget || '#a79f93';
        for (let k = 0; k < 26; k++) {
          const x1 = rect.left + Math.random() * rect.width;
          const y1 = rect.top + Math.random() * rect.height;
          parts.push({
            x0: ox + (Math.random() - 0.5) * 8,
            y0: oy + (Math.random() - 0.5) * 8,
            cx: (ox + x1) / 2 + (Math.random() - 0.5) * 220,
            cy: Math.min(oy, y1) - 80 - Math.random() * 120,
            x1,
            y1,
            delay: i * 90 + Math.random() * 260,
            dur: 900 + Math.random() * 500,
            r: 0.8 + Math.random() * 1.8,
            color,
            target: t,
          });
        }
      });
      const arrivals = new Map<HTMLElement, number>();
      const t0 = performance.now();
      const step = (now: number) => {
        const t = now - t0;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        for (const p of parts) {
          const u = (t - p.delay) / p.dur;
          if (u < 0) {
            alive = true;
            continue;
          }
          if (u >= 1) {
            const n = (arrivals.get(p.target) ?? 0) + 1;
            arrivals.set(p.target, n);
            if (n === 8) p.target.setAttribute('data-arrived', '');
            continue;
          }
          alive = true;
          const e = 1 - Math.pow(1 - u, 2.2);
          const x = (1 - e) * (1 - e) * p.x0 + 2 * (1 - e) * e * p.cx + e * e * p.x1;
          const y = (1 - e) * (1 - e) * p.y0 + 2 * (1 - e) * e * p.cy + e * e * p.y1;
          ctx.globalAlpha = Math.sin(Math.PI * Math.min(1, u * 1.15)) * 0.85;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(x, y, p.r * (1 + u * 0.8), 0, Math.PI * 2);
          ctx.fill();
        }
        if (alive && t < 3200) requestAnimationFrame(step);
        else {
          canvas.remove();
          targets.forEach((tg) => tg.setAttribute('data-arrived', ''));
          setTimeout(() => {
            root.removeAttribute('data-mist-state');
            busy.current = false;
          }, 700);
        }
      };
      requestAnimationFrame(step);
    };
    window.addEventListener('scent:explore', onExplore);
    return () => window.removeEventListener('scent:explore', onExplore);
  }, []);

  return null;
}
