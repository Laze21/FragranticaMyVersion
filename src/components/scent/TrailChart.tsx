'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { bandLabelInk, bandPath, buildTrail, describeTrail, longevityTickText, mixAt, projectionAt, type TrailInput } from '@/lib/scent/trail';
import { DIMENSION_META, PROJECTION_LEVELS, type Dimension } from '@/lib/scent/vocab';
import { duration, easeFn, reducedMotion } from '@/lib/motion';
import { TrailMark } from '@/components/shell/TrailMark';
import styles from './TrailChart.module.css';

const LABELS = Object.fromEntries(Object.entries(DIMENSION_META).map(([k, v]) => [k, v.label])) as Record<Dimension, string>;
const MAJOR = [
  { h: 0, label: 'Spray' },
  { h: 0.25, label: '15m' },
  { h: 1, label: '1h' },
  { h: 2, label: '2h' },
  { h: 4, label: '4h' },
  { h: 8, label: '8h' },
  { h: 12, label: '12h' },
];
const MAJOR_NARROW = new Set([0, 1, 4, 8]);
/* Minor ticks make the square-root compression visible instead of arbitrary. */
const MINOR = [0.5, 3, 6, 10];
const STEPS = [0, 0.08, 0.25, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12];
const REST_HOURS = 0.25;
/* Guides: projection levels 2, 3 and 4 as thicknesses, so "thicker" has a scale. */
const GUIDES = [4, 3, 2];

function fmtHours(h: number) {
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  const r = Math.round(h * 2) / 2;
  return `${r} ${r === 1 ? 'hour' : 'hours'}`;
}
function fmtMin(min: number) {
  if (min < 60) return `${min} min`;
  const h = min / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)}h`;
}
function projectionWord(p: number) {
  return PROJECTION_LEVELS[Math.max(0, Math.min(4, Math.round(p) - 1))].label;
}
/* Archivo at 12px runs about 6.4px per character; close enough to keep labels off each other. */
const textW = (s: string, px = 12) => s.length * px * 0.54 + 4;

export interface TrailChartProps {
  input: TrailInput;
  name: string;
  height?: number;
  compareInputs?: Array<{ input: TrailInput; name: string; color: string }>;
  /** fires once, when the draw-on has finished (immediately under reduced motion) */
  onDrawn?: () => void;
  /** `float`: a tooltip follows the pointer. `row`: a fixed readout row under the axis (the coarse-pointer default). */
  readout?: 'float' | 'row';
}

type Edges = { tops: number[][]; bots: number[][] };

/**
 * Full-size Trail: a spindle on a time axis, phase ruler above, a skin line and projection
 * guides under the bands, end-labels in the tail, a scrub line that is also a keyboard slider.
 * Draws on once per visit (IntersectionObserver at 35%, or the explore handoff via the
 * `scent:explore` / `scent:trail-draw` window events); rebalances in place when its input changes.
 */
export function TrailChart({ input, name, height = 220, onDrawn, readout }: TrailChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const figRef = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(960);
  const [scrub, setScrub] = useState<number | null>(null);
  const [pointerY, setPointerY] = useState<number | null>(null);
  const [scrubMode, setScrubMode] = useState<'pointer' | 'keys'>('pointer');
  const [coarse, setCoarse] = useState(false);
  const [drawn, setDrawn] = useState<'pending' | 'done' | null>(null);
  const [lerp, setLerp] = useState<Edges | null>(null);
  const id = useId();
  const padLeft = 10;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const sync = () => setCoarse(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const axisH = 32;
  const topPad = 24;
  const plotH = height - axisH - topPad;
  const g = useMemo(() => buildTrail(input, width, plotH, { samples: 72, padLeft }), [input, width, plotH]);
  const heartH = input.heartAtMin / 60;
  const dryH = input.drydownAtMin / 60;
  const endH = g.lateHours;
  const cy = g.cy;
  const maxHalf = plotH / 2;
  const halfFor = (p: number) => (p / 5) * maxHalf * 0.96;

  /* ---- rebalancing: when the same bands get new numbers, the bands slide rather than snap ---- */
  const prev = useRef<{ key: string; edges: Edges } | null>(null);
  useEffect(() => {
    const key = `${width}:${plotH}:${g.bands.map((b) => b.dim).join(',')}`;
    const next: Edges = { tops: g.bands.map((b) => b.top), bots: g.bands.map((b) => b.bot) };
    const last = prev.current;
    prev.current = { key, edges: next };
    if (!last || last.key !== key || reducedMotion()) {
      setLerp(null);
      return;
    }
    const total = 600;
    const ease = easeFn('evaporate');
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / total);
      const e = ease(t);
      const mixArr = (a: number[], b: number[]) => a.map((v, i) => v + (b[i] - v) * e);
      setLerp({ tops: last.edges.tops.map((row, i) => mixArr(row, next.tops[i])), bots: last.edges.bots.map((row, i) => mixArr(row, next.bots[i])) });
      if (t < 1) raf = requestAnimationFrame(step);
      else setLerp(null);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [g, width, plotH]);

  const xs = useMemo(() => g.samples.map((s) => s.x), [g]);
  const edges: Edges = lerp ?? { tops: g.bands.map((b) => b.top), bots: g.bands.map((b) => b.bot) };
  const paths = useMemo(() => (lerp ? edges.tops.map((t, i) => bandPath(xs, t, edges.bots[i])) : g.bands.map((b) => b.path)), [lerp, edges, xs, g]);
  const outline = lerp && edges.tops.length ? bandPath(xs, edges.tops[0], edges.bots[edges.bots.length - 1]) : g.outline;

  /* ---- draw-on, once ---- */
  const draw = useCallback(() => {
    setDrawn((d) => (d === 'done' ? d : 'done'));
  }, []);
  useLayoutEffect(() => {
    setDrawn(reducedMotion() ? 'done' : 'pending');
  }, []);
  useEffect(() => {
    if (drawn !== 'pending') return;
    const el = figRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) draw();
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    let timer: ReturnType<typeof setTimeout> | null = null;
    // The explore gesture: particles leave the nozzle at 200ms and the trail draws from 700ms.
    const onExplore = () => {
      timer = setTimeout(draw, 700);
    };
    window.addEventListener('scent:explore', onExplore);
    window.addEventListener('scent:trail-draw', draw);
    return () => {
      io.disconnect();
      if (timer) clearTimeout(timer);
      window.removeEventListener('scent:explore', onExplore);
      window.removeEventListener('scent:trail-draw', draw);
    };
  }, [drawn, draw]);
  const drawnCb = useRef(onDrawn);
  drawnCb.current = onDrawn;
  useEffect(() => {
    if (drawn !== 'done') return;
    const t = setTimeout(() => drawnCb.current?.(), duration('signature'));
    return () => clearTimeout(t);
  }, [drawn]);

  /* ---- scrubbing ---- */
  const hoursFromX = (x: number) => {
    const t = Math.min(1, Math.max(0, (x - padLeft) / (width - padLeft)));
    return Math.min(endH, 14 * t * t);
  };
  const steps = STEPS.filter((h) => h <= endH);
  const atHours = scrub ?? REST_HOURS;
  const mix = mixAt(input, atHours);
  const mixSorted = (Object.entries(mix) as Array<[Dimension, number]>).filter(([d]) => g.bands.some((b) => b.dim === d)).sort((a, b) => b[1] - a[1]);
  const mixTotal = mixSorted.reduce((s, [, v]) => s + v, 0) || 1;
  const pct = (v: number) => Math.round((v / mixTotal) * 100);
  const projWord = projectionWord(projectionAt(input, atHours));
  const valueText = `${fmtHours(atHours)}: ${projWord} projection, ${mixSorted
    .slice(0, 3)
    .map(([d, v]) => `${LABELS[d]} ${pct(v)}%`)
    .join(', ')}`;
  const scrubX = g.xForHours(atHours);
  const useRow = readout ? readout === 'row' : coarse;

  // the band under the pointer, for the edge marks
  let hoverBand = -1;
  if (scrub !== null && pointerY !== null) {
    let j = 0;
    for (let k = 0; k < xs.length; k++) if (Math.abs(xs[k] - scrubX) < Math.abs(xs[j] - scrubX)) j = k;
    hoverBand = edges.tops.findIndex((t, i) => pointerY >= t[j] && pointerY <= edges.bots[i][j]);
    if (hoverBand >= 0) {
      const t = edges.tops[hoverBand][j];
      const b = edges.bots[hoverBand][j];
      hoverBand = b - t >= 2 ? hoverBand : -1;
    }
  }
  const hoverEdges =
    hoverBand >= 0
      ? (() => {
          let j = 0;
          for (let k = 0; k < xs.length; k++) if (Math.abs(xs[k] - scrubX) < Math.abs(xs[j] - scrubX)) j = k;
          return { top: edges.tops[hoverBand][j], bot: edges.bots[hoverBand][j] };
        })()
      : null;

  const phases = [
    { key: 'opening' as const, label: 'Opening', window: `0–${fmtMin(input.heartAtMin)}`, from: 0, to: heartH },
    { key: 'heart' as const, label: 'Heart', window: `${fmtMin(input.heartAtMin)}–${fmtMin(input.drydownAtMin)}`, from: heartH, to: dryH },
    { key: 'drydown' as const, label: 'Drydown', window: `${fmtMin(input.drydownAtMin)} on`, from: dryH, to: endH },
  ].filter((p) => p.to > p.from);

  /* ---- labels: two widest in-band when their ink passes, everything in the tail ---- */
  const inBand = [...g.bands]
    .filter((b) => b.labelRoom >= 14 && bandLabelInk(DIMENSION_META[b.dim].hue) !== null)
    .sort((a, b) => b.labelRoom - a.labelRoom)
    .slice(0, 2)
    .map((b) => {
      const j = xs.indexOf(b.labelX);
      const y = j >= 0 ? (edges.tops[g.bands.indexOf(b)][j] + edges.bots[g.bands.indexOf(b)][j]) / 2 : b.labelY;
      return { dim: b.dim, x: b.labelX, y, ink: bandLabelInk(DIMENSION_META[b.dim].hue) };
    });
  const endTexts = g.bands.map((b) => `${LABELS[b.dim]} ${Math.round(b.share * 100)}%`);
  const endW = Math.max(0, ...endTexts.map((t) => textW(t)));
  const endLabelX = Math.min(g.lateX + 14, width - endW);
  const lineH = 16;
  const endY0 = cy - ((g.bands.length - 1) * lineH) / 2;
  const endLabels = g.bands.map((b, i) => {
    const j = xs.indexOf(b.lastX);
    const fromY = j >= 0 ? (edges.tops[i][j] + edges.bots[i][j]) / 2 : b.lastY;
    return { dim: b.dim, text: endTexts[i], x: endLabelX, y: Math.max(8, Math.min(plotH - 8, endY0 + i * lineH)), fromX: b.lastX, fromY };
  });

  /* ---- axis: majors, minors, and the longevity tick with its words ---- */
  const tickText = longevityTickText(input);
  const tickX = input.longevityHrs !== null ? g.endX : null;
  const tickW = tickText ? textW(tickText) : 0;
  const tickAnchorEnd = tickX !== null && tickX + 6 + tickW > width;
  const tickBox = tickX === null ? null : tickAnchorEnd ? [width - tickW, width] : [tickX + 6, tickX + 6 + tickW];
  const majors = MAJOR.filter((t) => t.h <= 13 && (width >= 480 || MAJOR_NARROW.has(t.h))).filter((t) => {
    if (!tickBox) return true;
    const x = g.xForHours(t.h);
    const w = textW(t.label) / 2;
    return x + w < tickBox[0] - 4 || x - w > tickBox[1] + 4;
  });

  const setFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setScrub(hoursFromX(e.clientX - r.left));
    setPointerY(e.clientY - r.top - topPad);
    setScrubMode('pointer');
  };

  return (
    <figure ref={figRef} className={styles.figure} aria-labelledby={`${id}-cap`} data-drawn={drawn ?? undefined} data-trail-chart>
      <div
        ref={ref}
        className={styles.plot}
        style={{ height }}
        data-coarse={coarse || undefined}
        onPointerMove={(e) => {
          if (coarse && e.buttons === 0) return;
          setFromPointer(e);
        }}
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse') return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setFromPointer(e);
        }}
        onPointerLeave={() => {
          if (coarse) return;
          setScrub(null);
          setPointerY(null);
        }}
      >
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${name}. ${describeTrail(input, LABELS)}`} className={styles.svg}>
          <defs>
            <clipPath id={`${id}-solid`}>
              <rect x={-1} y={-1} width={g.endX + 1} height={plotH + 2} />
            </clipPath>
            <clipPath id={`${id}-late`}>
              <rect x={g.endX} y={-1} width={width - g.endX + 1} height={plotH + 2} />
            </clipPath>
          </defs>
          <g transform={`translate(0 ${topPad})`}>
            <g className={styles.guides}>
              <line x1={padLeft} x2={width} y1={cy} y2={cy} className={styles.skin} />
              {GUIDES.map((p) => (
                <g key={p}>
                  <line x1={padLeft} x2={width} y1={cy - halfFor(p)} y2={cy - halfFor(p)} className={styles.guide} />
                  <line x1={padLeft} x2={width} y1={cy + halfFor(p)} y2={cy + halfFor(p)} className={styles.guide} />
                  <text x={0} y={cy - halfFor(p) - 4} className={styles.guideLabel}>
                    {PROJECTION_LEVELS[p - 1].label}
                  </text>
                </g>
              ))}
            </g>
            <g className={styles.rules}>
              {phases.map((p, i) => {
                const x0 = i === 0 ? padLeft : g.xForHours(p.from);
                const x1 = g.xForHours(p.to);
                const room = x1 - x0;
                return (
                  <g key={p.key}>
                    {i > 0 && <line x1={x0} x2={x0} y1={-topPad + 14} y2={plotH} className={styles.phaseRule} />}
                    {room > 40 && (
                      <text x={x0 + (i === 0 ? 0 : 6)} y={-10} className={styles.phaseLabel}>
                        {p.label}
                        {room > textW(`${p.label} · ${p.window}`, 13) && <tspan className={styles.phaseWindow}> · {p.window}</tspan>}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
            <g className={styles.bands}>
              {(['solid', 'late'] as const).map((part) => (
                <g key={part} clipPath={`url(#${id}-${part})`} opacity={part === 'late' ? 0.45 : 1}>
                  {g.bands.map((b, i) => (
                    <path key={b.dim} d={paths[i]} fill={DIMENSION_META[b.dim].hue} stroke="var(--porcelain)" strokeWidth={1} className={styles.band} />
                  ))}
                  <path d={outline} className={styles.outline} />
                </g>
              ))}
            </g>
            {hoverEdges && (
              <g className={styles.bandEdge} style={{ transform: `translateX(${scrubX}px)` }}>
                <line x1={-7} x2={7} y1={hoverEdges.top} y2={hoverEdges.top} />
                <line x1={-7} x2={7} y1={hoverEdges.bot} y2={hoverEdges.bot} />
              </g>
            )}
            <g className={styles.labels}>
              {inBand.map((l) => (
                <text key={`in-${l.dim}`} x={l.x} y={l.y} dy="0.35em" textAnchor="middle" className={styles.bandLabel} data-ink={l.ink ?? undefined}>
                  {LABELS[l.dim]}
                </text>
              ))}
              {endLabels.map((l) => (
                <g key={`end-${l.dim}`} className={styles.endLabel}>
                  <line x1={l.fromX} y1={l.fromY} x2={l.x - 5} y2={l.y} />
                  <text x={l.x} y={l.y} dy="0.35em">
                    {l.text}
                  </text>
                </g>
              ))}
            </g>
          </g>
          <g transform={`translate(0 ${topPad + plotH + 4})`} className={styles.axis}>
            <line x1={padLeft} x2={width} y1={0} y2={0} />
            {MINOR.map((h) => (
              <line key={h} x1={g.xForHours(h)} x2={g.xForHours(h)} y1={0} y2={3} />
            ))}
            {majors.map((t) => {
              const x = g.xForHours(t.h);
              return (
                <g key={t.label} transform={`translate(${x} 0)`}>
                  <line y1={0} y2={5} />
                  <text y={16} textAnchor={t.h === 0 ? 'start' : 'middle'}>
                    {t.label}
                  </text>
                </g>
              );
            })}
            {tickX !== null && tickText && (
              <g className={styles.longevityTick}>
                <line x1={tickX} x2={tickX} y1={0} y2={8} />
                <text x={tickAnchorEnd ? width : tickX + 6} y={16} textAnchor={tickAnchorEnd ? 'end' : 'start'}>
                  {tickText}
                </text>
              </g>
            )}
          </g>
        </svg>
        <span className={styles.nib} data-trail-nib style={{ left: g.xForHours(0), top: topPad + cy }} aria-hidden="true" />
        <div
          className={styles.scrubLine}
          data-mode={scrubMode}
          data-active={scrub !== null || undefined}
          style={{ transform: `translateX(${scrubX}px)`, top: topPad - 6, height: plotH + 10 }}
          aria-hidden="true"
        >
          <i style={{ top: cy + 6 }} />
        </div>
        {!useRow && scrub !== null && (
          <div className={styles.tip} style={{ left: Math.min(width - 190, Math.max(0, scrubX + 12)) }} aria-hidden="true">
            <strong>{fmtHours(atHours)} in</strong>
            <span className={styles.tipProj}>{projWord} projection</span>
            {mixSorted.slice(0, 4).map(([d, v]) => (
              <span key={d} className={styles.tipRow}>
                <i style={{ background: DIMENSION_META[d].hue }} />
                {LABELS[d]} <b>{pct(v)}%</b>
              </span>
            ))}
          </div>
        )}
      </div>
      {useRow && (
        <p className={styles.readout} aria-hidden="true">
          <b>{fmtHours(atHours)}</b>
          <span>{projWord}</span>
          {mixSorted.slice(0, 3).map(([d, v]) => (
            <span key={d} className={styles.readoutDim}>
              <i style={{ background: DIMENSION_META[d].hue }} />
              {LABELS[d]} <b>{pct(v)}%</b>
            </span>
          ))}
        </p>
      )}
      <div
        className={styles.slider}
        role="slider"
        tabIndex={0}
        aria-label={`Move through ${name}'s wear time`}
        aria-description="Arrow keys move through time; Home and End jump to the spray and the end; Escape clears."
        aria-valuemin={0}
        aria-valuemax={Math.round(endH * 60)}
        aria-valuenow={Math.round(atHours * 60)}
        aria-valuetext={valueText}
        onKeyDown={(e) => {
          const i = scrub === null ? steps.findIndex((s) => s >= REST_HOURS - 1e-6) : steps.findIndex((s) => s >= scrub - 1e-6);
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') setScrub(steps[Math.min(steps.length - 1, i + 1)]);
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setScrub(steps[Math.max(0, i - 1)]);
          else if (e.key === 'Home') setScrub(0);
          else if (e.key === 'End') setScrub(steps[steps.length - 1]);
          else if (e.key === 'Escape') setScrub(null);
          else return;
          setScrubMode('keys');
          setPointerY(null);
          e.preventDefault();
        }}
        onBlur={() => {
          if (scrubMode === 'keys') setScrub(null);
        }}
      >
        <TrailMark className={styles.glyph} />
        <span className={styles.sliderWord}>Trail</span>
        <span className={styles.sliderHint}>{scrub === null ? (coarse ? 'Drag across the trail' : 'Hover or drag across the trail') : valueText}</span>
      </div>
      <figcaption id={`${id}-cap`} className="visually-hidden">
        Trail for {name}: {describeTrail(input, LABELS)}
        {tickText ? ` ${tickText}.` : ''}
      </figcaption>
      <table className="visually-hidden">
        <caption>Character mix by phase for {name}</caption>
        <thead>
          <tr>
            <th scope="col">Character</th>
            <th scope="col">Opening</th>
            <th scope="col">Heart</th>
            <th scope="col">Drydown</th>
            <th scope="col">Overall</th>
          </tr>
        </thead>
        <tbody>
          {g.bands.map((b) => (
            <tr key={b.dim}>
              <th scope="row">{LABELS[b.dim]}</th>
              {(['opening', 'heart', 'drydown'] as const).map((p) => (
                <td key={p}>{Math.round((input.character[p]?.[b.dim] ?? 0) * 100)}%</td>
              ))}
              <td>{Math.round(b.share * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
