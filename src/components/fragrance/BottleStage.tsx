'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import type { ViewerController } from './bottle3d';
import styles from './BottleStage.module.css';

type Mode = 'poster' | 'loading' | '3d' | 'failed';

interface Props {
  name: string;
  poster: string | null;
  posterAlt: string | null;
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

/**
 * The bottle stage. Poster first, always: it is the LCP image and carries all the information.
 * If the fragrance has a model and the device can afford it, the 3D view is fetched after the
 * page is idle and crossfaded over the poster from an identical camera angle.
 */
export function BottleStage({ name, poster, posterAlt, model }: Props) {
  const [mode, setMode] = useState<Mode>('poster');
  const [offer3d, setOffer3d] = useState(false);
  const holder = useRef<HTMLDivElement>(null);
  const ctrl = useRef<ViewerController | null>(null);

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
      // Still offer it: reduced motion / save-data users can opt in; no-WebGL users can't.
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

  const explore = async () => {
    let origin: { x: number; y: number } | null = null;
    if (mode === '3d' && ctrl.current) origin = await ctrl.current.explore();
    if (!origin && holder.current) {
      const r = holder.current.getBoundingClientRect();
      origin = { x: r.left + r.width / 2, y: r.top + r.height * 0.18 };
    }
    window.dispatchEvent(new CustomEvent('scent:explore', { detail: { origin, scrollY: window.scrollY } }));
  };

  return (
    <div className={styles.stage} data-mode={mode}>
      <div className={styles.frame} ref={holder}>
        {poster ? (
          <Image
            src={poster}
            alt={posterAlt ?? `${name} bottle`}
            fill
            priority
            sizes="(max-width: 719px) 80vw, (max-width: 1100px) 45vw, 560px"
            className={styles.poster}
            quality={82}
          />
        ) : (
          <div className={styles.noImage} role="img" aria-label={`No image of ${name} yet`}>
            <Icon name="bottle" size={40} />
            <p>No bottle image yet</p>
            <a href="/contribute?kind=image">Know what it looks like? Add a photo</a>
          </div>
        )}
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
    </div>
  );
}
