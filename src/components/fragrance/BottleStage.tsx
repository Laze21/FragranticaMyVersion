'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { Popover } from '@/components/ui/Popover';
import { useViewer } from '@/components/viewer/ViewerProvider';
import { reducedMotion } from '@/lib/motion';
import type { StageLayers } from '@/lib/data/types';
import type { ViewerController } from './bottle3d';
import styles from './BottleStage.module.css';

type Mode = 'poster' | 'loading' | '3d' | 'failed';
type OffReason = 'reduced-motion' | 'save-data' | 'slow-network' | 'low-memory' | 'no-webgl' | 'turned-off';

export interface StageImage {
  url: string;
  alt: string | null;
  kind: 'photo' | 'illustration';
  credit: string | null;
  license: string | null;
  sourceUrl: string | null;
  layers: StageLayers | null;
}

/** What the stage hands the page when the atomizer is pressed; MistOverlay and TrailChart listen. */
export interface ExploreDetail {
  origin: { x: number; y: number } | null;
  scrollY: number;
  /** Hues of the opening's strongest character bands: the colours of the mist. */
  hues: string[];
  /** The stage's frame in document coordinates, so the phone flight can fade at its bottom edge. */
  stage: { top: number; bottom: number; left: number; right: number } | null;
}

interface Props {
  name: string;
  accent: string;
  image: StageImage | null;
  model: { url: string; animations: { spray: string | null; open: string | null } } | null;
  mistHues?: string[];
}

/** Can this device afford the 3D view without being asked? */
function autoLoad3d(): { ok: boolean; reason?: OffReason } {
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

const OFF_COPY: Record<OffReason, string> = {
  'reduced-motion': 'Turning bottle off: you asked for reduced motion.',
  'save-data': 'Turning bottle off: saving data.',
  'slow-network': 'Turning bottle off: slow connection.',
  'low-memory': 'Turning bottle off: this device is short on memory.',
  'no-webgl': '',
  'turned-off': 'Turning bottle off.',
};

const SIZES = '(max-width: 719px) 60vw, (max-width: 1099px) 45vw, 640px';

/**
 * The bottle stage. The image is the object: it is the LCP image and carries all the information.
 *
 * Built for a flat cutout, so it works for a product photograph and for an illustration alike.
 * Illustrations arrive as three layers in one frame (shadow, body, cap): the body and cap lean a
 * couple of degrees toward the pointer while the shadow stays on the floor; "Explore the scent"
 * (or the nozzle itself) lifts the cap, presses the atomizer, puffs a mist from the nozzle and
 * hands the opening notes to the Trail below; the cap clicks back on afterwards. A single-layer
 * photo keeps the lean and the puff and skips the cap. A 3D model, when one exists, is a
 * progressive extra on capable devices; the canvas is a focusable region the arrow keys turn.
 * Reduced motion: nothing moves; explore scrolls to the Trail.
 *
 * The renders are 3:4 with the foot at about 88% of the image, so the object is bottom-aligned and
 * enlarged a touch inside the 4:5 frame; the foot lands on the frame's bottom edge, which the hero
 * lets overhang the horizon rule.
 */
export function BottleStage({ name, accent, image, model, mistHues = [] }: Props) {
  const { threeD, setThreeD } = useViewer();
  const [mode, setMode] = useState<Mode>('poster');
  const [off, setOff] = useState<OffReason | null>(null);
  const [phase, setPhase] = useState<'rest' | 'open' | 'press' | 'close'>('rest');
  const [dragged, setDragged] = useState(false);
  const [focused, setFocused] = useState(false);
  const holder = useRef<HTMLDivElement>(null);
  const object = useRef<HTMLDivElement>(null);
  const nozzleBtn = useRef<HTMLButtonElement>(null);
  const ctrl = useRef<ViewerController | null>(null);
  const raf = useRef(0);
  const busy = useRef(false);
  const target = useRef({ rx: 0, ry: 0, px: 0, py: 0 });
  const current = useRef({ rx: 0, ry: 0, px: 0, py: 0 });
  const layered = !!(image?.layers?.body && image.layers.capUrl && image.layers.shadow);
  const nozzle = image?.layers?.nozzle ?? { x: 0.5, y: 0.03 };

  // The lean and the sheen follow the pointer through an easing loop, so it feels like weight.
  const animate = useCallback(() => {
    const c = current.current;
    const t = target.current;
    c.rx += (t.rx - c.rx) * 0.1;
    c.ry += (t.ry - c.ry) * 0.1;
    c.px += (t.px - c.px) * 0.08;
    c.py += (t.py - c.py) * 0.08;
    const el = object.current;
    if (el) {
      el.style.setProperty('--rx', `${c.rx.toFixed(3)}deg`);
      el.style.setProperty('--ry', `${c.ry.toFixed(3)}deg`);
      el.style.setProperty('--px', c.px.toFixed(3));
      el.style.setProperty('--py', c.py.toFixed(3));
    }
    const settled = Math.abs(t.rx - c.rx) < 0.005 && Math.abs(t.ry - c.ry) < 0.005 && Math.abs(t.px - c.px) < 0.002 && Math.abs(t.py - c.py) < 0.002;
    raf.current = settled ? 0 : requestAnimationFrame(animate);
  }, []);
  const kick = useCallback(() => {
    if (!raf.current) raf.current = requestAnimationFrame(animate);
  }, [animate]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const explore = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    const reduce = reducedMotion();
    let origin: { x: number; y: number } | null = null;
    if (mode === '3d' && ctrl.current) origin = await ctrl.current.explore();
    if (!origin && holder.current) {
      const r = (nozzleBtn.current ?? holder.current).getBoundingClientRect();
      origin = nozzleBtn.current ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: r.left + r.width * nozzle.x, y: r.top + r.height * nozzle.y };
      if (!reduce && phase === 'rest') {
        // 0ms the cap lifts; 60ms the atomizer is pressed and the puff leaves; 1400ms the cap
        // returns and clicks. The page's mist and the Trail take their cues from the event below.
        if (layered) setPhase('open');
        window.setTimeout(() => setPhase('press'), layered ? 60 : 0);
        window.setTimeout(() => setPhase(layered ? 'close' : 'rest'), 1400);
        if (layered) window.setTimeout(() => setPhase('rest'), 1400 + 260);
      }
    }
    const fr = holder.current?.getBoundingClientRect() ?? null;
    const detail: ExploreDetail = {
      origin,
      scrollY: window.scrollY,
      hues: mistHues,
      stage: fr ? { top: fr.top + window.scrollY, bottom: fr.bottom + window.scrollY, left: fr.left, right: fr.right } : null,
    };
    window.dispatchEvent(new CustomEvent<ExploreDetail>('scent:explore', { detail }));
    window.setTimeout(() => {
      busy.current = false;
    }, reduce ? 300 : 1800);
  }, [mode, phase, layered, nozzle.x, nozzle.y, mistHues]);
  const exploreRef = useRef(explore);
  exploreRef.current = explore;

  const load3d = useCallback(async () => {
    if (!model || !holder.current || ctrl.current) return;
    setMode('loading');
    setOff(null);
    try {
      const { mountViewer } = await import('./bottle3d');
      ctrl.current = await mountViewer(holder.current, {
        modelUrl: model.url,
        name,
        animations: model.animations,
        onReady: () => {
          // Settle the lean to zero first, then crossfade, so the bottle's angle never jumps.
          target.current = { rx: 0, ry: 0, px: 0, py: 0 };
          kick();
          const wait = () => {
            const c = current.current;
            if (Math.abs(c.rx) + Math.abs(c.ry) < 0.2) setMode('3d');
            else requestAnimationFrame(wait);
          };
          wait();
        },
        onError: () => setMode('failed'),
        onDrag: () => setDragged(true),
        onFocus: setFocused,
        onExplore: () => void exploreRef.current(),
      });
    } catch {
      setMode('failed');
    }
  }, [model, name, kick]);

  useEffect(() => {
    if (!model) return;
    if (threeD === 'off') {
      setOff('turned-off');
      return;
    }
    const verdict = autoLoad3d();
    if (!verdict.ok && !(threeD === 'on' && verdict.reason !== 'no-webgl')) {
      setOff(verdict.reason ?? null);
      return;
    }
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const handle = ric ? ric(() => void load3d(), { timeout: 2500 }) : window.setTimeout(() => void load3d(), 1200);
    return () => {
      if (!ric) clearTimeout(handle);
    };
  }, [model, threeD, load3d]);

  useEffect(() => () => ctrl.current?.dispose(), []);

  const onMove = (e: React.PointerEvent) => {
    if (mode === '3d' || reducedMotion() || e.pointerType === 'touch') return;
    const r = holder.current?.getBoundingClientRect();
    if (!r) return;
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    target.current = { ry: px * 5, rx: -py * 2.4, px: px * 2, py: -py * 2 };
    kick();
  };
  const onLeave = () => {
    target.current = { rx: 0, ry: 0, px: 0, py: 0 };
    kick();
  };

  const capStyle = image?.layers?.cap
    ? ({ '--cap-x': `${image.layers.cap.x * 100}%`, '--cap-y': `${(image.layers.cap.y + image.layers.cap.h) * 100}%` } as React.CSSProperties)
    : undefined;

  const status = (() => {
    if (!model) return null;
    if (mode === 'loading')
      return (
        <>
          <span className={styles.hairline} aria-hidden />
          Loading the turning bottle
        </>
      );
    if (mode === 'failed') return <>The turning bottle didn’t load. The picture has everything.</>;
    if (mode === '3d') {
      if (focused) return <>Arrow keys turn it</>;
      return (
        <span className={styles.dragHint} data-faded={dragged || undefined}>
          <Icon name="rotate" size={14} />
          Drag to turn
        </span>
      );
    }
    if (off && OFF_COPY[off])
      return (
        <>
          {OFF_COPY[off]}{' '}
          <button
            type="button"
            className={styles.turnOn}
            onClick={() => {
              setThreeD('on');
              void load3d();
            }}
          >
            Turn on
          </button>
        </>
      );
    return null;
  })();

  const puff = (
    <span className={styles.puff} aria-hidden>
      {Array.from({ length: 9 }, (_, i) => (
        <i key={i} style={{ '--i': i } as React.CSSProperties} />
      ))}
    </span>
  );

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
                    {puff}
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
                  {puff}
                </div>
              </div>
            )}
            {/* The nozzle is its own 44px target: pressing the atomizer is the gesture, the button below is the label for it. */}
            <button ref={nozzleBtn} type="button" className={styles.nozzle} onClick={() => void explore()} aria-label="Press to spray">
              <span className={styles.tip} aria-hidden>
                Press to spray
              </span>
            </button>
          </div>
        ) : (
          <div className={styles.noImage} role="img" aria-label={`No image of ${name} yet`}>
            <Icon name="bottle" size={40} />
            <p>No bottle image yet</p>
            <a href="/contribute?kind=image">Know what it looks like? Add a photo</a>
          </div>
        )}
      </div>
      {image && (
        <div className={styles.tagWrap}>
          {image.kind === 'photo' ? (
            <Popover label="About this photo" trigger="Photo" triggerClassName={styles.tag}>
            <span className={styles.creditHead}>Product photo</span>
            <span className={styles.creditBody}>
              {image.credit ? `By ${image.credit}` : 'Credit on file'}
              {image.license ? ` · ${image.license}` : ''}
            </span>
            {image.sourceUrl && (
              <a href={image.sourceUrl} rel="noopener license" className={styles.creditLink}>
              Where it came from
              </a>
          )}
            </Popover>
          ) : (
            <Popover label="About this illustration" trigger="Illustration" triggerClassName={styles.tag}>
            <span className={styles.creditHead}>An illustration, not a product photo</span>
            <span className={styles.creditBody}>Drawn from the house’s own imagery. The real bottle may differ in small ways; the label is ours, not theirs.</span>
            <a href="/contribute?kind=image" className={styles.creditLink}>
              Have a photo we may use?
            </a>
            </Popover>
        )}
        </div>
      )}
      <div className={styles.foot}>
        <button type="button" className={`btn btn--quiet ${styles.explore}`} onClick={() => void explore()} disabled={phase !== 'rest' && mode !== '3d'}>
          <Icon name="atomizer" size={18} />
          Explore the scent
        </button>
        {status && (
          <p className={styles.status} aria-live="polite">
            {status}
          </p>
        )}
      </div>
    </div>
  );
}
