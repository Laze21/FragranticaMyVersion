/**
 * Body geometry for BottleSpec v2.
 *
 * Both generators produce a grid of rings and stitch them into one smooth-shaded mesh, so
 * reflections glide over the glass instead of breaking into facets. Creases (a square
 * shoulder, a chamfer) are kept crisp by duplicating the ring at the crease with split normals.
 *
 *   loft        plan (cross-section) × vertical profile, morphing into a round neck
 *   silhouette  front outline × depth profile (lens / slab), for figurative bottles
 */
import * as THREE from 'three';
import { CM, DEFAULTS, type Body, type LoftBody, type SilhouetteBody, type ShoulderKind } from './spec';

export interface BodyDims {
  /** world units (10 cm = 1) */
  h: number; // glass height, base to top of shoulders (where the neck starts)
  hx: number; // half width at the widest
  hz: number; // half depth at the widest
  neckR: number;
  neckH: number;
  /** y where the cap's underside sits (top of the neck) */
  topY: number;
  /** y of the top of the thick base (the liquid starts here) */
  baseY: number;
  /** y where the straight section ends and the shoulder starts */
  shoulderY: number;
  kind: 'loft' | 'silhouette';
  /** x offset of the neck (silhouette bodies with an off-centre neck) */
  neckX: number;
}

interface Ring {
  pts: THREE.Vector3[];
  /** per-point outward normals (computed later), and whether the ring is closed */
  closed: boolean;
  /** indices where the ring's outline has a hard corner (normals split there) */
  corners: Set<number>;
}

export interface BodyMesh {
  geometry: THREE.BufferGeometry;
  dims: BodyDims;
  /** Rings of the outer surface, bottom to top, for decals and decorations to follow. */
  rings: Array<{ y: number; pts: THREE.Vector3[] }>;
}

/* ------------------------------------------------------------------ plan outlines */

interface Outline {
  /** points in the x/z plane, unit-ish (scaled by hx/hz later) */
  pts: THREE.Vector2[];
  corners: Set<number>;
  closed: boolean;
}

function roundedRect(hx: number, hz: number, r: number, perEdge: number, perCorner: number): Outline {
  const pts: THREE.Vector2[] = [];
  const rr = Math.min(r, hx, hz);
  const push = (x: number, z: number) => pts.push(new THREE.Vector2(x, z));
  // Counter-clockwise seen from above, starting at the front-right corner. z+ is the front.
  const corner = (cx: number, cz: number, a0: number) => {
    for (let i = 0; i <= perCorner; i++) {
      const a = a0 + (Math.PI / 2) * (i / perCorner);
      push(cx + Math.cos(a) * rr, cz + Math.sin(a) * rr);
    }
  };
  const edge = (x0: number, z0: number, x1: number, z1: number) => {
    for (let i = 1; i < perEdge; i++) push(x0 + ((x1 - x0) * i) / perEdge, z0 + ((z1 - z0) * i) / perEdge);
  };
  corner(hx - rr, hz - rr, 0); // front-right, sweeping toward front
  edge(hx - rr, hz, -hx + rr, hz); // front edge, right to left
  corner(-hx + rr, hz - rr, Math.PI / 2);
  edge(-hx, hz - rr, -hx, -hz + rr);
  corner(-hx + rr, -hz + rr, Math.PI);
  edge(-hx + rr, -hz, hx - rr, -hz);
  corner(hx - rr, -hz + rr, (3 * Math.PI) / 2);
  edge(hx, -hz + rr, hx, hz - rr);
  return { pts, corners: new Set(), closed: true };
}

function chamferedRect(hx: number, hz: number, c: number, perEdge: number): Outline {
  const cc = Math.min(c, hx * 0.9, hz * 0.9);
  const raw: Array<[number, number]> = [
    [hx, hz - cc],
    [hx - cc, hz],
    [-hx + cc, hz],
    [-hx, hz - cc],
    [-hx, -hz + cc],
    [-hx + cc, -hz],
    [hx - cc, -hz],
    [hx, -hz + cc],
  ];
  return polygonOutline(raw, perEdge);
}

/** Hard-cornered polygon: corners are duplicated so each edge gets its own normals. */
function polygonOutline(raw: Array<[number, number]>, perEdge: number): Outline {
  const pts: THREE.Vector2[] = [];
  const corners = new Set<number>();
  const n = raw.length;
  for (let e = 0; e < n; e++) {
    const [x0, z0] = raw[e];
    const [x1, z1] = raw[(e + 1) % n];
    for (let i = 0; i <= perEdge; i++) {
      if (i === 0) corners.add(pts.length);
      pts.push(new THREE.Vector2(x0 + ((x1 - x0) * i) / perEdge, z0 + ((z1 - z0) * i) / perEdge));
    }
  }
  return { pts, corners, closed: true };
}

function superellipse(hx: number, hz: number, n: number, N: number): Outline {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    pts.push(new THREE.Vector2(Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * hx, Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * hz));
  }
  return { pts, corners: new Set(), closed: true };
}

function planOutline(body: LoftBody, hx: number, hz: number): Outline {
  const N = body.ribs && body.ribs.orientation === 'vertical' ? Math.max(144, body.ribs.count * 12) : 120;
  switch (body.plan) {
    case 'round':
    case 'ellipse':
      return superellipse(hx, hz, 2, N);
    case 'squircle':
      return superellipse(hx, hz, 4, N);
    case 'rect': {
      if (body.chamfer) return chamferedRect(hx, hz, body.chamfer * Math.min(hx, hz), 10);
      const r = (body.cornerRadius ?? 0.12) * Math.min(hx, hz);
      return roundedRect(hx, hz, Math.max(r, 0.004), 12, 8);
    }
    case 'polygon': {
      const sides = Math.max(3, body.sides ?? 8);
      const raw: Array<[number, number]> = [];
      // a flat face toward the front (+z)
      const off = Math.PI / 2 + Math.PI / sides;
      for (let i = 0; i < sides; i++) {
        const a = off + (i / sides) * Math.PI * 2;
        raw.push([Math.cos(a) * hx, Math.sin(a) * hz]);
      }
      return polygonOutline(raw, 6);
    }
    case 'custom': {
      const raw = (body.planPoints ?? []).map(([x, z]) => [x * 2 * hx, z * 2 * hz] as [number, number]);
      if (raw.length < 3) return superellipse(hx, hz, 2, N);
      if (body.flat) return polygonOutline(raw, 6);
      const curve = new THREE.CatmullRomCurve3(raw.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal', 0.5);
      return { pts: curve.getSpacedPoints(N).slice(0, N).map((p) => new THREE.Vector2(p.x, p.z)), corners: new Set(), closed: true };
    }
  }
}

/* ------------------------------------------------------------------ vertical profile */

/** Width scale along the straight section, t in 0..1 (base .. shoulder start). */
function profileScale(body: LoftBody, t: number): number {
  const a = body.profileAmount ?? 0.5;
  switch (body.profile) {
    case 'straight':
      return 1;
    case 'bowed':
      return 1 - 0.18 * a * (1 - Math.sin(Math.PI * t)); // widest at mid-height
    case 'tapered':
      return 1 - 0.45 * a * t;
    case 'flared':
      return 1 - 0.45 * a * (1 - t);
    case 'waisted':
      return 1 - 0.22 * a * Math.sin(Math.PI * t);
    case 'apothecary':
      return 1;
    case 'orb': {
      // sphere-ish: radius follows a circle whose equator sits at 45% height
      const u = (t - 0.45) / 0.62;
      return Math.max(0.35, Math.sqrt(Math.max(0, 1 - u * u)));
    }
    case 'amphora': {
      // belly low, long tapering neck
      const belly = Math.exp(-Math.pow((t - 0.28) / 0.26, 2));
      return 0.5 + 0.5 * belly * (1 - 0.1 * a);
    }
    case 'custom': {
      const pts = body.profilePoints ?? [];
      if (pts.length < 2) return 1;
      if (t <= pts[0][0]) return pts[0][1];
      for (let i = 1; i < pts.length; i++) {
        if (t <= pts[i][0]) {
          const [t0, s0] = pts[i - 1];
          const [t1, s1] = pts[i];
          const u = (t - t0) / Math.max(1e-6, t1 - t0);
          const e = u * u * (3 - 2 * u);
          return s0 + (s1 - s0) * e;
        }
      }
      return pts[pts.length - 1][1];
    }
  }
}

/**
 * Shoulder: scale (1 .. neck ratio) and morph (0 plan .. 1 circle) across the shoulder region,
 * u in 0..1 from the shoulder start to the neck.
 */
function shoulderCurve(kind: ShoulderKind, u: number): { scale: number; morph: number } {
  switch (kind) {
    case 'square':
    case 'flat':
      // stays full width, then the loft duplicates a ring to make the flat top
      return { scale: 1 - 0.02 * u, morph: u * 0.15 };
    case 'sloped':
      return { scale: 1 - u, morph: u };
    case 'round': {
      const s = Math.sqrt(Math.max(0, 1 - u * u));
      return { scale: s, morph: Math.pow(u, 0.8) };
    }
    case 'dome': {
      const s = Math.sqrt(Math.max(0, 1 - u * u));
      return { scale: s, morph: Math.pow(u, 0.6) };
    }
  }
}

/* ------------------------------------------------------------------ loft */

export interface LoftOptions {
  inset?: number; // world units, moves the surface inward (liquid)
  fillTo?: number; // world y, cut the loft flat at this height (liquid)
  /** Stop at the top face (caps and stoppers have no neck). */
  noNeck?: boolean;
}

export function loftDims(body: LoftBody): BodyDims {
  const hx = (body.width / 2) * CM;
  const hz = (body.depth / 2) * CM;
  const h = body.height * CM;
  const shoulderSize = (body.shoulderSize ?? DEFAULTS.shoulderSize[body.shoulder]) * h;
  const neckR = (body.neck?.radius ?? Math.min(DEFAULTS.neck.radius, body.width * 0.3)) * CM;
  const neckH = (body.neck?.height ?? DEFAULTS.neck.height) * CM;
  const baseY = (body.baseThickness ?? DEFAULTS.baseThickness) * CM;
  return { h, hx, hz, neckR, neckH, topY: h + neckH, baseY, shoulderY: h - shoulderSize, kind: 'loft', neckX: 0 };
}

export function buildLoft(body: LoftBody, opts: LoftOptions = {}): BodyMesh {
  const dims = loftDims(body);
  const inset = opts.inset ?? 0;
  const hx = Math.max(0.01, dims.hx - inset);
  const hz = Math.max(0.01, dims.hz - inset);
  const outline = planOutline(body, hx, hz);
  const M = outline.pts.length;
  const neckR = Math.max(0.006, dims.neckR - inset * 0.6);
  const baseR = Math.min((body.baseRadius ?? DEFAULTS.baseRadius) * CM, hx * 0.6, hz * 0.6);
  const edgeR = (body.edgeRadius ?? DEFAULTS.edgeRadius) * CM;

  const bottomY = inset ? dims.baseY : 0;
  const top = dims.h;
  const shoulderY = dims.shoulderY;
  const cut = opts.fillTo;

  // Ribs: modulate radius by angle (vertical) or by height (horizontal).
  const ribs = body.ribs;
  const ribAt = (i: number, y: number): number => {
    if (!ribs || inset) return 1;
    const depth = (ribs.depth * CM) / Math.min(hx, hz);
    if (ribs.orientation === 'vertical') {
      const a = Math.atan2(outline.pts[i].y, outline.pts[i].x);
      const w = ribs.profile === 'sharp' ? Math.abs(((a * ribs.count) / Math.PI) % 2) - 1 : Math.cos(a * ribs.count);
      return 1 - depth * 0.5 + depth * 0.5 * w;
    }
    const w = ribs.profile === 'sharp' ? 1 - 2 * Math.abs(((y / (top / ribs.count)) % 1) - 0.5) : Math.cos((y / top) * ribs.count * Math.PI * 2);
    return 1 - depth * 0.5 + depth * 0.5 * w;
  };

  // Target shape for the shoulder morph, matched point-for-point to the outline: a circle of the
  // plan's mean radius (so a round plan morphs into itself) or the plan itself (a faceted
  // stopper's top, a block cap's plate). Closing into the neck is done by `scale` alone.
  const meanR = outline.pts.reduce((s, p) => s + Math.hypot(p.x, p.y), 0) / M;
  const morphTarget = outline.pts.map((p) => {
    if (body.neckShape === 'plan') return p.clone();
    const a = Math.atan2(p.y, p.x);
    return new THREE.Vector2(Math.cos(a) * meanR, Math.sin(a) * meanR);
  });
  /** scale that brings the mean radius down to the neck radius */
  const neckScale = Math.min(1, neckR / meanR);

  const ring = (y: number, scale: number, morph: number, ribsOn = true): Ring => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < M; i++) {
      const p = outline.pts[i];
      const t = morphTarget[i];
      const r = ribsOn ? ribAt(i, y) : 1;
      const mx = p.x + (t.x - p.x) * morph;
      const mz = p.y + (t.y - p.y) * morph;
      pts.push(new THREE.Vector3(mx * scale * r, y, mz * scale * r));
    }
    return { pts, closed: outline.closed, corners: outline.corners };
  };

  // Segments of rings; a new segment starts at a crease.
  const segments: Ring[][] = [];
  let seg: Ring[] = [];
  const crease = () => {
    if (seg.length) segments.push(seg);
    seg = [];
  };

  // Base: a flat bottom then a quarter round up to full width.
  const baseSteps = 6;
  const bevelPlan = (s: number) => 1 - (baseR / Math.min(hx, hz)) * (1 - s);
  if (!inset) {
    seg.push(ring(bottomY, bevelPlan(0), 0, false));
    crease();
    for (let i = 0; i <= baseSteps; i++) {
      const a = (Math.PI / 2) * (i / baseSteps);
      seg.push(ring(bottomY + baseR - Math.cos(a) * baseR, bevelPlan(Math.sin(a)) * profileScale(body, 0), 0));
    }
  } else {
    seg.push(ring(bottomY, profileScale(body, 0) * 0.985, 0));
  }

  // Straight section.
  const straightStart = inset ? bottomY : bottomY + baseR;
  const straightEnd = Math.min(shoulderY, cut ?? Infinity);
  const rows = body.ribs?.orientation === 'horizontal' ? Math.max(40, body.ribs.count * 8) : body.profile === 'straight' ? 6 : 28;
  for (let i = 1; i <= rows; i++) {
    const y = straightStart + ((straightEnd - straightStart) * i) / rows;
    const t = (y - bottomY) / (shoulderY - bottomY);
    seg.push(ring(y, profileScale(body, Math.min(1, Math.max(0, t))), 0));
  }

  const topScale = profileScale(body, 1);
  const flatTop = body.shoulder === 'square' || body.shoulder === 'flat';
  const er = Math.min(edgeR, Math.max(0.001, top - shoulderY));
  /** Ring anywhere in the shoulder region (used by the liquid, which ignores creases). */
  const shoulderRing = (y: number): Ring => {
    const u = Math.min(1, Math.max(0, (y - shoulderY) / Math.max(1e-6, top - shoulderY)));
    if (flatTop) return ring(y, topScale * (1 - (er / Math.min(hx, hz)) * 0.5 * u), 0);
    const { scale, morph } = shoulderCurve(body.shoulder, u);
    // from full width down to the neck, following the shoulder's curve
    const s = topScale * (neckScale + (1 - neckScale) * scale);
    return ring(y, s, morph, u < 0.5);
  };

  if (cut !== undefined) {
    // Liquid: continue into the shoulder if the fill reaches it, then cut flat.
    if (cut > shoulderY) {
      const steps = 10;
      for (let i = 1; i <= steps; i++) {
        const y = shoulderY + (Math.min(cut, top - 1e-4) - shoulderY) * (i / steps);
        seg.push(shoulderRing(y));
      }
    }
    crease();
  } else {
    // Shoulder, morphing into the neck.
    if (flatTop) {
      // vertical pillow edge then a flat top face
      for (let i = 1; i <= 6; i++) {
        const a = (Math.PI / 2) * (i / 6);
        const y = top - er + Math.sin(a) * er;
        seg.push(ring(y, topScale * (1 - (er / Math.min(hx, hz)) * (1 - Math.cos(a))), 0));
      }
      crease();
      // top face: full ring at the top, then the neck ring at the same height
      const rim = topScale * (1 - er / Math.min(hx, hz));
      seg.push(ring(top, rim, 0, false));
      seg.push(ring(top, neckScale, 1, false));
    } else {
      const steps = 14;
      for (let i = 1; i <= steps; i++) seg.push(shoulderRing(shoulderY + (top - shoulderY) * (i / steps)));
    }
    if (!opts.noNeck) {
      crease();
      seg.push(ring(top, neckScale, 1, false));
      seg.push(ring(dims.topY, neckScale, 1, false));
    }
    crease();
  }

  const geometry = stitch(segments, { closeBottom: true, closeTop: true, flat: !!body.flat });
  const rings = segments.flat().map((r) => ({ y: r.pts[0].y, pts: r.pts }));
  return { geometry, dims, rings };
}

/* ------------------------------------------------------------------ silhouette */

export function silhouetteDims(body: SilhouetteBody): BodyDims {
  const hx = (body.width / 2) * CM;
  const hz = (body.depth / 2) * CM;
  const h = body.height * CM;
  const neckR = (body.neck?.radius ?? Math.min(DEFAULTS.neck.radius, body.width * 0.25)) * CM;
  const neckH = (body.neck?.height ?? DEFAULTS.neck.height) * CM;
  const baseY = (body.baseThickness ?? DEFAULTS.baseThickness) * CM;
  const nx = ((body.neck?.x ?? 0.5) - 0.5) * 2 * hx;
  return { h, hx, hz, neckR, neckH, topY: h + neckH, baseY, shoulderY: h, kind: 'silhouette', neckX: nx };
}

function outlinePoints(body: SilhouetteBody, hx: number, h: number, inset: number): THREE.Vector2[] {
  let pts = body.points.map(([x, y]) => new THREE.Vector2((x - 0.5) * 2 * hx, y * h));
  if (body.smooth !== false) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p.x, p.y, 0)), true, 'centripetal', 0.5);
    pts = curve.getSpacedPoints(160).slice(0, 160).map((p) => new THREE.Vector2(p.x, p.y));
  } else {
    pts = polygonOutline(pts.map((p) => [p.x, p.y] as [number, number]), 8).pts;
  }
  if (inset > 0) pts = offsetPolygon(pts, -inset);
  return pts;
}

/** Offset a closed polygon by d (negative = inward) along per-vertex normals. Good enough for bottle outlines. */
function offsetPolygon(pts: THREE.Vector2[], d: number): THREE.Vector2[] {
  const n = pts.length;
  const area = pts.reduce((a, p, i) => a + p.x * pts[(i + 1) % n].y - pts[(i + 1) % n].x * p.y, 0);
  const sign = area > 0 ? 1 : -1;
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n];
    const b = pts[(i + 1) % n];
    const t = new THREE.Vector2(b.x - a.x, b.y - a.y).normalize();
    const nrm = new THREE.Vector2(t.y * sign, -t.x * sign);
    return new THREE.Vector2(p.x + nrm.x * d, p.y + nrm.y * d);
  });
}

/** Clip a closed polygon to y <= yMax (Sutherland-Hodgman against one half-plane). */
function clipBelow(pts: THREE.Vector2[], yMax: number): THREE.Vector2[] {
  const out: THREE.Vector2[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const ain = a.y <= yMax;
    const bin = b.y <= yMax;
    if (ain) out.push(a);
    if (ain !== bin) {
      const t = (yMax - a.y) / (b.y - a.y);
      out.push(new THREE.Vector2(a.x + (b.x - a.x) * t, yMax));
    }
  }
  return out;
}

export function buildSilhouette(body: SilhouetteBody, opts: LoftOptions = {}): BodyMesh {
  const dims = silhouetteDims(body);
  const inset = opts.inset ?? 0;
  const hz = Math.max(0.01, dims.hz - inset);
  let outline = outlinePoints(body, dims.hx, dims.h, inset);
  if (opts.fillTo !== undefined) outline = clipBelow(outline, opts.fillTo);
  if (inset) outline = outline.map((p) => new THREE.Vector2(p.x, Math.max(p.y, dims.baseY)));
  const cx = outline.reduce((s, p) => s + p.x, 0) / outline.length;
  const cy = outline.reduce((s, p) => s + p.y, 0) / outline.length;
  const edgeR = Math.min((body.edgeRadius ?? 0.25) * CM, hz * 0.9);
  const taper = body.sideTaper ?? 0;

  // Depth profile: z from -hz to +hz; scale shrinks toward the faces by edgeR, and overall by taper.
  const steps = 10;
  const zs: number[] = [];
  const scales: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (Math.PI / 2) * (i / steps);
    zs.push(-hz + edgeR - Math.cos(a) * edgeR);
    scales.push(1 - (edgeR * (1 - Math.sin(a))) / Math.max(dims.hx, 0.01));
  }
  const inner = zs.slice(0, -1).reverse().map((z) => -z);
  const innerScales = scales.slice(0, -1).reverse();
  const allZ = [...zs, ...inner];
  const allS = [...scales, ...innerScales];

  const shrink = (p: THREE.Vector2, s: number) => new THREE.Vector2(cx + (p.x - cx) * s, cy + (p.y - cy) * s);
  const rings: Ring[] = allZ.map((z, i) => {
    const lens = taper ? 1 - taper * (1 - Math.sqrt(Math.max(0, 1 - (z / hz) * (z / hz)))) : 1;
    const s = allS[i] * lens;
    return { pts: outline.map((p) => {
      const q = shrink(p, s);
      return new THREE.Vector3(q.x, q.y, z);
    }), closed: true, corners: new Set() };
  });
  const geometry = stitch([rings], { closeBottom: true, closeTop: true, flat: !!body.flat, capFaces: true });
  const bodyRings = rings.map((r) => ({ y: 0, pts: r.pts }));
  return { geometry, dims, rings: bodyRings };
}

/* ------------------------------------------------------------------ stitching */

interface StitchOptions {
  closeBottom: boolean;
  closeTop: boolean;
  flat: boolean;
  /** silhouette mode: the first and last rings are planar outlines to triangulate as faces */
  capFaces?: boolean;
}

function stitch(segments: Ring[][], o: StitchOptions): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const tmp = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const vert = new THREE.Vector3();

  for (const seg of segments) {
    const base = positions.length / 3;
    const R = seg.length;
    const M = seg[0].pts.length;
    for (let r = 0; r < R; r++) {
      const ring = seg[r];
      const prev = seg[Math.max(0, r - 1)];
      const next = seg[Math.min(R - 1, r + 1)];
      for (let i = 0; i < M; i++) {
        const p = ring.pts[i];
        positions.push(p.x, p.y, p.z);
        // ring tangent: one-sided at corners, central elsewhere
        const atCorner = ring.corners.has(i);
        const nextIsCorner = ring.corners.has((i + 1) % M);
        const a = ring.pts[atCorner ? i : (i - 1 + M) % M];
        const b = ring.pts[nextIsCorner ? i : (i + 1) % M];
        tan.set(b.x - a.x, b.y - a.y, b.z - a.z);
        // vertical tangent
        vert.set(next.pts[i].x - prev.pts[i].x, next.pts[i].y - prev.pts[i].y, next.pts[i].z - prev.pts[i].z);
        tmp.crossVectors(tan, vert);
        if (tmp.lengthSq() < 1e-12) {
          // degenerate (apex ring): point outward from the axis
          tmp.set(p.x, 0, p.z);
          if (tmp.lengthSq() < 1e-12) tmp.set(0, 1, 0);
        }
        tmp.normalize();
        normals.push(tmp.x, tmp.y, tmp.z);
      }
    }
    for (let r = 0; r < R - 1; r++) {
      for (let i = 0; i < M; i++) {
        const i1 = (i + 1) % M;
        if (!seg[r].closed && i1 === 0) break;
        const a = base + r * M + i;
        const b = base + r * M + i1;
        const c = base + (r + 1) * M + i1;
        const d = base + (r + 1) * M + i;
        indices.push(a, b, c, a, c, d);
      }
    }
  }

  // Close the first and last rings (fan to the centroid, or triangulate a planar outline).
  const closeRing = (ring: Ring, flip: boolean, normal: THREE.Vector3) => {
    const start = positions.length / 3;
    const c = ring.pts.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / ring.pts.length);
    if (o.capFaces) {
      const contour = ring.pts.map((p) => new THREE.Vector2(p.x, p.y));
      const tris = THREE.ShapeUtils.triangulateShape(contour, []);
      for (const p of ring.pts) {
        positions.push(p.x, p.y, p.z);
        normals.push(normal.x, normal.y, normal.z);
      }
      for (const [a, b, cc] of tris) indices.push(...(flip ? [start + a, start + cc, start + b] : [start + a, start + b, start + cc]));
      return;
    }
    positions.push(c.x, c.y, c.z);
    normals.push(normal.x, normal.y, normal.z);
    for (const p of ring.pts) {
      positions.push(p.x, p.y, p.z);
      normals.push(normal.x, normal.y, normal.z);
    }
    const M = ring.pts.length;
    for (let i = 0; i < M; i++) {
      const a = start + 1 + i;
      const b = start + 1 + ((i + 1) % M);
      indices.push(...(flip ? [start, b, a] : [start, a, b]));
    }
  };
  const first = segments[0][0];
  const last = segments[segments.length - 1][segments[segments.length - 1].length - 1];
  if (o.capFaces) {
    if (o.closeBottom) closeRing(first, true, new THREE.Vector3(0, 0, -1));
    if (o.closeTop) closeRing(last, false, new THREE.Vector3(0, 0, 1));
  } else {
    if (o.closeBottom) closeRing(first, true, new THREE.Vector3(0, -1, 0));
    if (o.closeTop) closeRing(last, false, new THREE.Vector3(0, 1, 0));
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  if (o.flat) {
    const flat = geo.toNonIndexed();
    flat.computeVertexNormals();
    return flat;
  }
  return geo;
}

/* ------------------------------------------------------------------ bands and rings */

/**
 * A solid band following a ring of the body (plan-shaped, so it hugs rectangular bottles too):
 * from y0 to y1, pushed out by `outset` and `thick` deep. Used for collars, metal bands, neck rings.
 */
export function extrudeRing(pts: THREE.Vector3[], y0: number, y1: number, outset: number, thick: number, roundTop = true): THREE.BufferGeometry {
  const c = pts.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / pts.length);
  const at = (y: number, off: number) =>
    ({
      pts: pts.map((p) => {
        const n = new THREE.Vector3(p.x - c.x, 0, p.z - c.z).normalize();
        return new THREE.Vector3(p.x + n.x * off, y, p.z + n.z * off);
      }),
      closed: true,
      corners: new Set<number>(),
    }) as Ring;
  const inner = outset - thick;
  const segments: Ring[][] = [];
  if (roundTop) {
    // outer wall with rounded top and bottom edges
    const r = Math.min(thick * 0.5, (y1 - y0) * 0.45);
    const wall: Ring[] = [];
    for (let i = 0; i <= 4; i++) {
      const a = (Math.PI / 2) * (i / 4);
      wall.push(at(y0 + r - Math.cos(a) * r, outset - r + Math.sin(a) * r));
    }
    for (let i = 4; i >= 0; i--) {
      const a = (Math.PI / 2) * (i / 4);
      wall.push(at(y1 - r + Math.cos(a) * r, outset - r + Math.sin(a) * r));
    }
    segments.push(wall);
  } else {
    segments.push([at(y0, outset), at(y1, outset)]);
  }
  segments.push([at(y1, outset), at(y1, inner)]); // top face
  segments.push([at(y1, inner), at(y0, inner)]); // inner wall (faces inward: fine, hidden)
  segments.push([at(y0, inner), at(y0, outset)]); // bottom face
  return stitch(segments, { closeBottom: false, closeTop: false, flat: false });
}

/** The body's outline at a given height (interpolated between rings). */
export function ringAt(mesh: BodyMesh, y: number): THREE.Vector3[] | null {
  const rings = mesh.rings.filter((r) => r.pts.length > 3);
  if (!rings.length) return null;
  if (y <= rings[0].y) return rings[0].pts;
  for (let i = 1; i < rings.length; i++) {
    const a = rings[i - 1];
    const b = rings[i];
    if (a.y <= y && b.y >= y && b.y > a.y) {
      const t = (y - a.y) / (b.y - a.y);
      return a.pts.map((p, k) => p.clone().lerp(b.pts[k], t));
    }
  }
  return rings[rings.length - 1].pts;
}

/* ------------------------------------------------------------------ dispatch */

export function bodyDimsOf(body: Body): BodyDims {
  return body.kind === 'loft' ? loftDims(body) : silhouetteDims(body);
}

export function buildBodyMesh(body: Body, opts: LoftOptions = {}): BodyMesh {
  return body.kind === 'loft' ? buildLoft(body, opts) : buildSilhouette(body, opts);
}

/**
 * Front patch of the body surface between y0 and y1 (world), pushed out by `lift`, for decals.
 * Returns a geometry with UVs (u across, v up) that hugs the body, plus the patch's world width.
 */
export function frontPatch(mesh: BodyMesh, y0: number, y1: number, lift: number, spread = 1): { geometry: THREE.BufferGeometry; width: number; height: number } | null {
  const dims = mesh.dims;
  if (dims.kind === 'silhouette') {
    // flat front face: a plane at the front z, clipped to the outline's bounding box
    const hz = dims.hz;
    const w = dims.hx * 2 * 0.86 * spread;
    const h = y1 - y0;
    const geo = new THREE.PlaneGeometry(w, h, 1, 1);
    geo.translate(dims.neckX * 0, y0 + h / 2, hz + lift);
    return { geometry: geo, width: w, height: h };
  }
  // Sample rings between y0 and y1 (interpolating ends), keep the front-facing arc.
  const rings = mesh.rings.filter((r) => r.pts.length > 3);
  const sample = (y: number): THREE.Vector3[] | null => {
    for (let i = 1; i < rings.length; i++) {
      const a = rings[i - 1];
      const b = rings[i];
      if (a.y <= y && b.y >= y && b.y > a.y) {
        const t = (y - a.y) / (b.y - a.y);
        return a.pts.map((p, k) => p.clone().lerp(b.pts[k], t));
      }
    }
    return null;
  };
  const rows = 14;
  const sampled: THREE.Vector3[][] = [];
  for (let r = 0; r <= rows; r++) {
    const y = y0 + ((y1 - y0) * r) / rows;
    const s = sample(y) ?? sample(Math.min(y1, Math.max(y0, y)) - 1e-4);
    if (!s) return null;
    sampled.push(s);
  }
  // Front arc: points whose angle from +z is within the spread. For rect plans use the flat face.
  const M = sampled[0].length;
  const maxAngle = Math.min(Math.PI * 0.42, (Math.PI / 2) * spread);
  const keep: number[] = [];
  for (let i = 0; i < M; i++) {
    const p = sampled[Math.floor(rows / 2)][i];
    const ang = Math.atan2(p.x, p.z);
    if (p.z > 0 && Math.abs(ang) <= maxAngle) keep.push(i);
  }
  if (keep.length < 3) return null;
  // order left (x negative) to right
  keep.sort((a, b) => sampled[Math.floor(rows / 2)][a].x - sampled[Math.floor(rows / 2)][b].x);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let width = 0;
  for (let r = 0; r <= rows; r++) {
    const pts = keep.map((i) => sampled[r][i]);
    // arc length for u
    const cum = [0];
    for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + pts[k].distanceTo(pts[k - 1]));
    const len = cum[cum.length - 1] || 1;
    if (r === Math.floor(rows / 2)) width = len;
    for (let k = 0; k < pts.length; k++) {
      const p = pts[k];
      const n = new THREE.Vector3(p.x, 0, p.z).normalize();
      positions.push(p.x + n.x * lift, p.y, p.z + n.z * lift);
      normals.push(n.x, n.y, n.z);
      uvs.push(cum[k] / len, r / rows);
    }
  }
  const K = keep.length;
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < K - 1; k++) {
      const a = r * K + k;
      const b = a + 1;
      const c = (r + 1) * K + k + 1;
      const d = (r + 1) * K + k;
      indices.push(a, b, c, a, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return { geometry: geo, width, height: y1 - y0 };
}
