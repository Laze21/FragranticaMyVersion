'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import type { ViewerController } from './bottle3d';
import styles from './BottleStage.module.css';

type Mode = 'poster' | 'loading' | '3d' | 'failed';

export interface StageImage {
  url: string;
  alt: string | null;
  kind: 'photo' | 'illustration';
  credit: string | null;
  license: string | null;
  sourceUrl: string | null;
  /** Where the spray leaves the bottle, as fractions of the image (0,0 = top left). */
  nozzle: { x: number; y: number } | null;
}

interface Props {
  name: string;
  accent: string;
  image: StageImage | null;
  model: { url: string; animations: { spray: string | null; open: string | null } } | null;
}

/** Can this device afford the 3D view without being asked? */
function autoLoad3d(): { ok: boolean; reason?: string } {
  if (typeof window === 'undefined') return { ok: false };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return { ok: false, reason: 'reduced-motion' };
  const nav = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string }; deviceMemory?: number };
  if (nav.connection?.saveData) return { ok: false, reason: 'save-data' };
  if (nav.connection?.effectiveType && /(^|-)2g|3g/.test(nav.connection.effectiveType)) return { ok: false, reason: 'slow-network' };
  if (nav.deviceMemory && nav.deviceMemory < 4) return { ok: false, reason: 'low-memory' };
  try {
    const c = document.createElement('canvas');
    if (!c.getContext('webgl2')) return { ok: false, reason: 'no-webgl' };
  } catch {
    return { ok: false, reason: 'no-webgl' };
  }
  return { ok: true };
}

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The bottle stage. The image is the object: it is the LCP image and carries all the information.
 *
 * Interaction is built for a flat cutout, so it works for a product photograph and for an
 * illustration alike: the bottle leans a few degrees toward the pointer, a soft sheen slides
 * across the glass (masked to the bottle's own alpha, so it never paints the background), and
 * "Explore the scent" presses the atomizer, puffs a mist from the nozzle and hands the opening
 * notes to the journey below. A 3D model, when one exists, is a progressive extra on capable
 * devices. Reduced motion: no lean, no sheen, no puff; the explore button scrolls instead.
 */
export function BottleStage({ name, accent, image, model }: Props) {
  const [mode, setMode] = useState<Mode>('poster');
  const [offer3d, setOffer3d] = useState(false);
  const [pressing, setPressing] = useState(false);
  const holder = useRef<HTMLDivElement>(null);
  const object = useRef<HTMLDivElement>(null);
  const ctrl = useRef<ViewerController | null>(null);
  const raf = useRef(0);
  const target = useRef({ rx: 0, ry: 0, sx: 50, sy: 30 });
  const current = useRef({ rx: 0, ry: 0, sx: 50, sy: 30 });

  const load3d = useCallback(async () => {
    if (!model || !holder.current || ctrl.current) return;
    setMode('loading');
    try {
      const { mountViewer } = await import('./bottle3d');
      ctrl.current = await mountViewer(holder.current, {
        modelUrl: model.url,
        animations: model.animations,
        onReady: () => setMode('3d'),
        onError: () => setMode('failed'),
      });
    } catch {
      setMode('failed');
    }
  }, [model]);

  useEffect(() => {
    if (!model) return;
    const verdict = autoLoad3d();
    if (!verdict.ok) {
      setOffer3d(verdict.reason !== 'no-webgl');
      return;
    }
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const handle = ric ? ric(() => void load3d(), { timeout: 2500 }) : window.setTimeout(() => void load3d(), 1200);
    return () => {
      if (!ric) clearTimeout(handle);
    };
  }, [model, load3d]);

  useEffect(() => () => ctrl.current?.dispose(), []);

  // Lean and sheen follow the pointer; everything eases so it feels like weight, not a cursor.
  const animate = useCallback(() => {
    const c = current.current;
    const t = target.current;
    c.rx += (t.rx - c.rx) * 0.1;
    c.ry += (t.ry - c.ry) * 0.1;
    c.sx += (t.sx - c.sx) * 0.08;
    c.sy += (t.sy - c.sy) * 0.08;
    const el = object.current;
    if (el) {
      el.style.setProperty('--rx', `${c.rx.toFixed(3)}deg`);
      el.style.setProperty('--ry', `${c.ry.toFixed(3)}deg`);
      el.style.setProperty('--sx', `${c.sx.toFixed(2)}%`);
      el.style.setProperty('--sy', `${c.sy.toFixed(2)}%`);
    }
    const settled = Math.abs(t.rx - c.rx) < 0.01 && Math.abs(t.ry - c.ry) < 0.01 && Math.abs(t.sx - c.sx) < 0.05;
    raf.current = settled ? 0 : requestAnimationFrame(animate);
  }, []);
  const kick = useCallback(() => {
    if (!raf.current) raf.current = requestAnimationFrame(animate);
  }, [animate]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const onMove = (e: React.PointerEvent) => {
    if (mode === '3d' || reduceMotion() || e.pointerType === 'touch') return;
    const r = holder.current?.getBoundingClientRect();
    if (!r) return;
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    target.current = { ry: px * 7, rx: -py * 4, sx: 50 + px * 70, sy: 30 + py * 50 };
    kick();
  };
  const onLeave = () => {
    target.current = { rx: 0, ry: 0, sx: 50, sy: 30 };
    kick();
  };

  const explore = async () => {
    let origin: { x: number; y: number } | null = null;
    if (mode === '3d' && ctrl.current) origin = await ctrl.current.explore();
    if (!origin && holder.current) {
      const r = holder.current.getBoundingClientRect();
      const n = image?.nozzle ?? { x: 0.5, y: 0.04 };
      origin = { x: r.left + r.width * n.x, y: r.top + r.height * n.y };
      if (!reduceMotion()) {
        // Press the atomizer: the bottle dips, a puff leaves the nozzle.
        setPressing(true);
        window.setTimeout(() => setPressing(false), 420);
        await new Promise((res) => setTimeout(res, 140));
      }
    }
    window.dispatchEvent(new CustomEvent('scent:explore', { detail: { origin, scrollY: window.scrollY } }));
  };

  const nozzle = image?.nozzle ?? { x: 0.5, y: 0.04 };

  return (
    <div className={styles.stage} data-mode={mode} style={{ '--accent': accent } as React.CSSProperties}>
      <div className={styles.frame} ref={holder} onPointerMove={onMove} onPointerLeave={onLeave}>
        {image ? (
          <div
            ref={object}
            className={styles.object}
            data-pressing={pressing || undefined}
            style={{ '--mask': `url("${image.url}")`, '--nx': `${nozzle.x * 100}%`, '--ny': `${nozzle.y * 100}%` } as React.CSSProperties}
          >
            <Image src={image.url} alt={image.alt ?? `${name} bottle`} fill priority sizes="(max-width: 719px) 80vw, (max-width: 1100px) 45vw, 560px" className={styles.poster} quality={84} />
            <span className={styles.sheen} aria-hidden />
            <span className={styles.puff} aria-hidden>
              {Array.from({ length: 9 }, (_, i) => (
                <i key={i} style={{ '--i': i } as React.CSSProperties} />
              ))}
            </span>
          </div>
        ) : (
          <div className={styles.noImage} role="img" aria-label={`No image of ${name} yet`}>
            <Icon name="bottle" size={40} />
            <p>No bottle image yet</p>
            <a href="/contribute?kind=image">Know what it looks like? Add a photo</a>
          </div>
        )}
        <span className={styles.floor} aria-hidden />
      </div>
      <div className={styles.controls}>
        <button type="button" className="btn" onClick={explore}>
          <Icon name="atomizer" size={18} />
          Explore the scent
        </button>
        {mode === '3d' && <span className={styles.hint}>Drag the bottle to turn it</span>}
        {mode === 'loading' && <span className={styles.hint}>Loading 3D view…</span>}
        {mode === 'failed' && <span className={styles.hint}>3D view unavailable. The photo has everything.</span>}
        {mode === 'poster' && offer3d && (
          <button type="button" className="btn btn--bare btn--small" onClick={() => void load3d()}>
            <Icon name="rotate" size={16} /> View in 3D
          </button>
        )}
      </div>
      {image && (
        <p className={styles.credit}>
          {image.kind === 'photo' ? (
            <>
              Photo{image.credit ? `: ${image.credit}` : ''}
              {image.license ? ` · ${image.license}` : ''}
              {image.sourceUrl ? (
                <>
                  {' · '}
                  <a href={image.sourceUrl} rel="noopener license">
                    source
                  </a>
                </>
              ) : null}
            </>
          ) : (
            <>
              Illustration, not a product photo.{' '}
              <a href="/contribute?kind=image">Have a photo we may use?</a>
            </>
          )}
        </p>
      )}
    </div>
  );
}
