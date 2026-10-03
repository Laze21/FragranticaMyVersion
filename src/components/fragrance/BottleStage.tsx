'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import type { StageLayers } from '@/lib/data/types';
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
  layers: StageLayers | null;
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
const SIZES = '(max-width: 719px) 80vw, (max-width: 1100px) 45vw, 560px';

/**
 * The bottle stage. The image is the object: it is the LCP image and carries all the information.
 *
 * Built for a flat cutout, so it works for a product photograph and for an illustration alike.
 * Illustrations arrive as three layers in one frame (shadow, body, cap): the body and cap lean a
 * couple of degrees toward the pointer while the shadow stays on the floor; "Explore the scent"
 * lifts the cap, presses the atomizer, puffs a mist from the nozzle and hands the opening notes to
 * the journey below; the cap clicks back on afterwards. A single-layer photo keeps the lean and the
 * puff and skips the cap. A 3D model, when one exists, is a progressive extra on capable devices.
 * Reduced motion: nothing moves; the explore button scrolls.
 */
export function BottleStage({ name, accent, image, model }: Props) {
  const [mode, setMode] = useState<Mode>('poster');
  const [offer3d, setOffer3d] = useState(false);
  const [phase, setPhase] = useState<'rest' | 'open' | 'press' | 'close'>('rest');
  const holder = useRef<HTMLDivElement>(null);
  const object = useRef<HTMLDivElement>(null);
  const ctrl = useRef<ViewerController | null>(null);
  const raf = useRef(0);
  const target = useRef({ rx: 0, ry: 0, px: 0 });
  const current = useRef({ rx: 0, ry: 0, px: 0 });
  const layered = !!(image?.layers?.body && image.layers.capUrl && image.layers.shadow);
  const nozzle = image?.layers?.nozzle ?? { x: 0.5, y: 0.03 };

  const load3d = useCallback(async () => {
    if (!model || !holder.current || ctrl.current) return;
    setMode('loading');
    try {
      const { mountViewer } = await import('./bottle3d');
      ctrl.current = await mountViewer(holder.current, {
        modelUrl: model.url,
        animations: model.animations,
        onReady: () => {
          // Settle the lean first so the crossfade does not change the bottle's angle.
          target.current = { rx: 0, ry: 0, px: 0 };
          kick();
          window.setTimeout(() => setMode('3d'), 320);
        },
        onError: () => setMode('failed'),
      });
    } catch {
      setMode('failed');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // The lean and the sheen follow the pointer through an easing loop, so it feels like weight.
  const animate = useCallback(() => {
    const c = current.current;
    const t = target.current;
    c.rx += (t.rx - c.rx) * 0.1;
    c.ry += (t.ry - c.ry) * 0.1;
    c.px += (t.px - c.px) * 0.08;
    const el = object.current;
    if (el) {
      el.style.setProperty('--rx', `${c.rx.toFixed(3)}deg`);
      el.style.setProperty('--ry', `${c.ry.toFixed(3)}deg`);
      el.style.setProperty('--px', c.px.toFixed(3));
    }
    const settled = Math.abs(t.rx - c.rx) < 0.005 && Math.abs(t.ry - c.ry) < 0.005 && Math.abs(t.px - c.px) < 0.002;
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
    target.current = { ry: px * 5, rx: -py * 2.4, px: px * 2 };
    kick();
  };
  const onLeave = () => {
    target.current = { rx: 0, ry: 0, px: 0 };
    kick();
  };

  const explore = async () => {
    let origin: { x: number; y: number } | null = null;
    if (mode === '3d' && ctrl.current) origin = await ctrl.current.explore();
    if (!origin && holder.current) {
      const r = holder.current.getBoundingClientRect();
      origin = { x: r.left + r.width * nozzle.x, y: r.top + r.height * nozzle.y };
      if (!reduceMotion() && phase === 'rest') {
        // Cap lifts, the atomizer is pressed, a puff leaves the nozzle, the cap clicks back on.
        if (layered) {
          setPhase('open');
          await new Promise((res) => setTimeout(res, 360));
        }
        setPhase('press');
        window.setTimeout(() => setPhase(layered ? 'close' : 'rest'), layered ? 1400 : 460);
        if (layered) window.setTimeout(() => setPhase('rest'), 1400 + 260);
        await new Promise((res) => setTimeout(res, 150));
      }
    }
    window.dispatchEvent(new CustomEvent('scent:explore', { detail: { origin, scrollY: window.scrollY } }));
  };

  const capStyle = image?.layers?.cap
    ? ({ '--cap-x': `${image.layers.cap.x * 100}%`, '--cap-y': `${(image.layers.cap.y + image.layers.cap.h) * 100}%` } as React.CSSProperties)
    : undefined;

  return (
    <div className={styles.stage} data-mode={mode} style={{ '--accent': accent } as React.CSSProperties}>
      <div className={styles.frame} ref={holder} onPointerMove={onMove} onPointerLeave={onLeave}>
        {image ? (
          <div
            ref={object}
            className={styles.object}
            data-phase={phase}
            data-layered={layered || undefined}
            style={{ '--mask': `url("${image.url}")`, '--nx': `${nozzle.x * 100}%`, '--ny': `${nozzle.y * 100}%`, ...capStyle } as React.CSSProperties}
          >
            {layered ? (
              <>
                <Image src={image.layers!.shadow!} alt="" fill sizes={SIZES} className={styles.shadow} aria-hidden quality={70} />
                <div className={styles.lean}>
                  <div className={styles.pressable}>
                    <Image src={image.layers!.body!} alt={image.alt ?? `${name} bottle`} fill priority sizes={SIZES} className={styles.poster} quality={82} />
                    <span className={styles.sheen} aria-hidden />
                    <span className={styles.puff} aria-hidden>
                      {Array.from({ length: 9 }, (_, i) => (
                        <i key={i} style={{ '--i': i } as React.CSSProperties} />
                      ))}
                    </span>
                  </div>
                  <div className={styles.cap}>
                    <Image src={image.layers!.capUrl!} alt="" fill priority sizes={SIZES} className={styles.poster} aria-hidden quality={82} />
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.lean}>
                <div className={styles.pressable}>
                  <Image src={image.url} alt={image.alt ?? `${name} bottle`} fill priority sizes={SIZES} className={styles.poster} quality={82} />
                  <span className={styles.sheen} aria-hidden />
                  <span className={styles.puff} aria-hidden>
                    {Array.from({ length: 9 }, (_, i) => (
                      <i key={i} style={{ '--i': i } as React.CSSProperties} />
                    ))}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.noImage} role="img" aria-label={`No image of ${name} yet`}>
            <Icon name="bottle" size={40} />
            <p>No bottle image yet</p>
            <a href="/contribute?kind=image">Know what it looks like? Add a photo</a>
          </div>
        )}
      </div>
      <div className={styles.controls}>
        <button type="button" className="btn btn--quiet" onClick={explore} disabled={phase !== 'rest' && mode !== '3d'}>
          <Icon name="atomizer" size={18} />
          Explore the scent
        </button>
        {mode === 'loading' && <span className={styles.hint}>Loading 3D view…</span>}
        {mode === 'failed' && <span className={styles.hint}>3D view unavailable. The picture has everything.</span>}
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
