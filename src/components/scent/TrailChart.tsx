'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { buildTrail, describeTrail, mixAt, projectionAt, type TrailInput } from '@/lib/scent/trail';
import { DIMENSION_META, PHASE_META, PROJECTION_LEVELS, type Dimension } from '@/lib/scent/vocab';
import styles from './TrailChart.module.css';

const LABELS = Object.fromEntries(Object.entries(DIMENSION_META).map(([k, v]) => [k, v.label])) as Record<Dimension, string>;
const TICKS = [
  { h: 0, label: 'Spray' },
  { h: 0.25, label: '15m' },
  { h: 1, label: '1h' },
  { h: 2, label: '2h' },
  { h: 4, label: '4h' },
  { h: 8, label: '8h' },
  { h: 12, label: '12h' },
];

function fmtHours(h: number) {
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  const r = Math.round(h * 2) / 2;
  return `${r} ${r === 1 ? 'hour' : 'hours'}`;
}

export interface TrailChartProps {
  input: TrailInput;
  name: string;
  height?: number;
  compareInputs?: Array<{ input: TrailInput; name: string; color: string }>;
}

/**
 * Full-size Trail with phase regions, labelled bands, a time axis and a scrubber.
 * Pointer: hover/drag to read the mix at any moment. Keyboard: it is a slider (arrows, Home/End).
 */
export function TrailChart({ input, name, height = 220 }: TrailChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(960);
  const [scrub, setScrub] = useState<number | null>(null);
  const id = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const axisH = 26;
  const topPad = 22;
  const plotH = height - axisH - topPad;
  const g = useMemo(() => buildTrail(input, width, plotH, { samples: 72 }), [input, width, plotH]);
  const heartH = input.heartAtMin / 60;
  const dryH = input.drydownAtMin / 60;
  const endH = g.samples[g.samples.length - 1].hours;
  const longevity = input.longevityHrs;

  const scrubHours = scrub ?? null;
  const mix = scrubHours !== null ? mixAt(input, scrubHours) : null;
  const mixSorted = mix
    ? (Object.entries(mix) as Array<[Dimension, number]>)
        .filter(([d]) => g.bands.some((b) => b.dim === d))
        .sort((a, b) => b[1] - a[1])
    : [];
  const mixTotal = mixSorted.reduce((s, [, v]) => s + v, 0) || 1;
  const valueText =
    scrubHours !== null
      ? `${fmtHours(scrubHours)}: ${mixSorted
          .slice(0, 3)
          .map(([d, v]) => `${LABELS[d]} ${Math.round((v / mixTotal) * 100)}%`)
          .join(', ')}`
      : 'Use arrow keys to move through time';

  const hoursFromX = (x: number) => {
    const t = Math.min(1, Math.max(0, x / width));
    return Math.min(endH, 14 * t * t);
  };
  const steps = [0, 0.08, 0.25, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12].filter((h) => h <= endH);

  const phases = [
    { key: 'opening' as const, from: 0, to: heartH },
    { key: 'heart' as const, from: heartH, to: dryH },
    { key: 'drydown' as const, from: dryH, to: endH },
  ].filter((p) => p.to > p.from);

  return (
    <figure className={styles.figure} aria-labelledby={`${id}-cap`}>
      <div
        ref={ref}
        className={styles.plot}
        style={{ height }}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setScrub(hoursFromX(e.clientX - r.left));
        }}
        onPointerLeave={() => setScrub(null)}
      >
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${name}. ${describeTrail(input, LABELS)}`}>
          <g transform={`translate(0 ${topPad})`}>
            {phases.map((p, i) => {
              const x0 = g.xForHours(p.from);
              const x1 = g.xForHours(p.to);
              return (
                <g key={p.key}>
                  {i % 2 === 1 && <rect x={x0} y={-topPad} width={x1 - x0} height={plotH + topPad} fill="var(--scent-wash, var(--linen))" opacity={0.55} />}
                  {x1 - x0 > 54 && (
                    <text x={x0 + 6} y={-8} className={styles.phaseLabel}>
                      {PHASE_META[p.key].label}
                    </text>
                  )}
                </g>
              );
            })}
            {g.bands.map((b) => (
              <path key={b.dim} d={b.path} fill={DIMENSION_META[b.dim].hue} stroke="var(--porcelain)" strokeWidth={1} className={styles.band} />
            ))}
            {g.bands
              .filter((b) => b.labelRoom >= 15)
              .map((b) => (
                <text
                  key={`l-${b.dim}`}
                  x={b.labelX}
                  y={b.labelY}
                  dy="0.35em"
                  textAnchor="middle"
                  className={styles.bandLabel}
                  data-dark={['smoky', 'earthy', 'spicy', 'woody', 'green'].includes(b.dim) || undefined}
                >
                  {LABELS[b.dim]}
                </text>
              ))}
            {longevity !== null && (
              <g>
                <line x1={g.xForHours(longevity)} x2={g.xForHours(longevity)} y1={4} y2={plotH} className={styles.endLine} />
                <text x={g.xForHours(longevity) + 6} y={14} className={styles.endLabel}>
                  typical end ~{Math.round(longevity)}h
                </text>
              </g>
            )}
            {scrubHours !== null && (
              <line x1={g.xForHours(scrubHours)} x2={g.xForHours(scrubHours)} y1={-topPad + 4} y2={plotH} className={styles.scrub} />
            )}
          </g>
          <g transform={`translate(0 ${topPad + plotH + 8})`} className={styles.axis}>
            <line x1={0} x2={width} y1={0} y2={0} />
            {TICKS.filter((t) => t.h <= 13).map((t) => {
              const x = g.xForHours(t.h);
              return (
                <g key={t.label} transform={`translate(${x} 0)`}>
                  <line y1={0} y2={5} />
                  <text y={18} textAnchor={t.h === 0 ? 'start' : 'middle'}>
                    {t.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
        {scrubHours !== null && mix && (
          <div
            className={styles.tip}
            style={{ left: Math.min(width - 190, Math.max(0, g.xForHours(scrubHours) + 10)) }}
            aria-hidden="true"
          >
            <strong>{fmtHours(scrubHours)} in</strong>
            <span className={styles.tipProj}>{PROJECTION_LEVELS[Math.max(0, Math.min(4, Math.round(projectionAt(input, scrubHours)) - 1))].label} projection</span>
            {mixSorted.slice(0, 4).map(([d, v]) => (
              <span key={d} className={styles.tipRow}>
                <i style={{ background: DIMENSION_META[d].hue }} />
                {LABELS[d]} <b>{Math.round((v / mixTotal) * 100)}%</b>
              </span>
            ))}
          </div>
        )}
      </div>
      <div
        className={styles.slider}
        role="slider"
        tabIndex={0}
        aria-label={`Move through ${name}'s wear time`}
        aria-valuemin={0}
        aria-valuemax={Math.round(endH * 60)}
        aria-valuenow={Math.round((scrubHours ?? 0) * 60)}
        aria-valuetext={valueText}
        onKeyDown={(e) => {
          const i = scrubHours === null ? -1 : steps.findIndex((s) => s >= scrubHours - 1e-6);
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') setScrub(steps[Math.min(steps.length - 1, i + 1)]);
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') setScrub(steps[Math.max(0, i - 1)]);
          else if (e.key === 'Home') setScrub(0);
          else if (e.key === 'End') setScrub(steps[steps.length - 1]);
          else if (e.key === 'Escape') setScrub(null);
          else return;
          e.preventDefault();
        }}
        onBlur={() => setScrub(null)}
      >
        <span className="t-meta">{scrubHours === null ? 'Hover or drag across the trail, or focus here and use arrow keys.' : valueText}</span>
      </div>
      <figcaption id={`${id}-cap`} className="visually-hidden">
        Trail for {name}: {describeTrail(input, LABELS)}
      </figcaption>
      <table className="visually-hidden">
        <caption>Character mix by phase for {name}</caption>
        <thead>
          <tr>
            <th scope="col">Character</th>
            <th scope="col">Opening</th>
            <th scope="col">Heart</th>
            <th scope="col">Drydown</th>
          </tr>
        </thead>
        <tbody>
          {g.bands.map((b) => (
            <tr key={b.dim}>
              <th scope="row">{LABELS[b.dim]}</th>
              {(['opening', 'heart', 'drydown'] as const).map((p) => (
                <td key={p}>{Math.round((input.character[p]?.[b.dim] ?? 0) * 100)}%</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
