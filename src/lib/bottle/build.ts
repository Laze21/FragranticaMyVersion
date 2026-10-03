/**
 * Parametric bottle builder.
 *
 * One function turns a BottleSpec into a Three.js group. It feeds three consumers:
 *   1. scripts/bottles  -> renders the static poster image for every fragrance (headless Chromium)
 *   2. scripts/bottles  -> exports a GLB with named animation clips for fragrances that get 3D
 *   3. BottleViewer     -> (only as a fallback) builds the bottle live if a GLB is missing
 *
 * Because posters and the live 3D view share geometry, materials, lighting and camera framing,
 * the poster -> 3D crossfade on the fragrance page has no visible jump.
 *
 * Glass is deliberately "fake" (alpha + fresnel + environment reflections) rather than physical
 * transmission: it composites over any page background, renders identically to a transparent
 * PNG, and is far cheaper on phones.
 */
import * as THREE from 'three';
import type { BottleSpec } from '@/seed/types';

export interface BuildOptions {
  brand?: string;
  name?: string;
  /** Provide a document to draw label / wood / stone textures (browser only). */
  doc?: Document;
  /** Font families available in the document for the label. */
  fonts?: { sans: string; serif: string };
}

export interface BuiltBottle {
  root: THREE.Group;
  /** Named parts for animation. */
  parts: { body: THREE.Object3D; liquid: THREE.Object3D; cap: THREE.Object3D; collar: THREE.Object3D; actuator: THREE.Object3D; nozzle: THREE.Object3D };
  /** Overall bounds (cap on) for camera framing. */
  height: number;
  width: number;
  bodyHeight: number;
}

interface BodyDims {
  kind: 'lathe' | 'extrude';
  h: number;
  /** half width (x) and half depth (z) at the widest point */
  hx: number;
  hz: number;
  neckR: number;
}

const METAL: Record<string, string> = { gold: '#c8a35a', silver: '#d4d6d8', gunmetal: '#4b4c50' };

export function bodyDims(spec: BottleSpec): BodyDims {
  const d = baseDims(spec);
  if (d.kind === 'extrude' && spec.depth) d.hz *= spec.depth;
  return d;
}

function baseDims(spec: BottleSpec): BodyDims {
  const w = spec.width ?? 1;
  const hm = spec.height ?? 1;
  switch (spec.body) {
    case 'cylinder':
      return { kind: 'lathe', h: 0.95 * hm, hx: 0.3 * w, hz: 0.3 * w, neckR: 0.075 };
    case 'tapered':
      return { kind: 'lathe', h: 0.92 * hm, hx: 0.34 * w, hz: 0.34 * w, neckR: 0.075 };
    case 'apothecary':
      return { kind: 'lathe', h: 0.86 * hm, hx: 0.32 * w, hz: 0.32 * w, neckR: 0.085 };
    case 'orb':
      return { kind: 'lathe', h: 0.8 * hm, hx: 0.42 * w, hz: 0.42 * w, neckR: 0.08 };
    case 'faceted':
      return { kind: 'lathe', h: 0.84 * hm, hx: 0.34 * w, hz: 0.34 * w, neckR: 0.08 };
    case 'tall':
      return { kind: 'extrude', h: 1.12 * hm, hx: 0.22 * w, hz: 0.12 * w, neckR: 0.07 };
    case 'flask':
      return { kind: 'extrude', h: 0.86 * hm, hx: 0.32 * w, hz: 0.11 * w, neckR: 0.07 };
    case 'block':
      return { kind: 'extrude', h: 0.7 * hm, hx: 0.3 * w, hz: 0.3 * w, neckR: 0.08 };
    case 'pebble':
      return { kind: 'extrude', h: 0.58 * hm, hx: 0.34 * w, hz: 0.18 * w, neckR: 0.075 };
  }
}

/** Lathe profile for round bodies, from the axis at the bottom to the axis at the top. */
function latheProfile(spec: BottleSpec, d: BodyDims, inset = 0): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  const r = d.hx - inset;
  const h = d.h - inset;
  const y0 = inset * 1.6; // thicker glass base
  const arc = (cx: number, cy: number, rad: number, a0: number, a1: number, n = 8) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      pts.push(new THREE.Vector2(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad));
    }
  };
  const b = 0.035;
  pts.push(new THREE.Vector2(0, y0));
  switch (spec.body) {
    case 'cylinder':
    case 'faceted': {
      arc(r - b, y0 + b, b, -Math.PI / 2, 0);
      const sh = spec.body === 'faceted' ? 0.03 : 0.06;
      arc(r - sh, h - sh, sh, 0, Math.PI / 2);
      pts.push(new THREE.Vector2(Math.max(d.neckR - inset, 0.01), h));
      break;
    }
    case 'tapered': {
      const top = r * 0.66;
      arc(r - b, y0 + b, b, -Math.PI / 2, -0.06);
      pts.push(new THREE.Vector2(top, h - 0.04));
      arc(top - 0.04, h - 0.04, 0.04, 0, Math.PI / 2, 5);
      pts.push(new THREE.Vector2(Math.max(d.neckR - inset, 0.01), h));
      break;
    }
    case 'apothecary': {
      const shoulderY = h * 0.68;
      arc(r - b, y0 + b, b, -Math.PI / 2, 0);
      pts.push(new THREE.Vector2(r, shoulderY));
      const c = new THREE.QuadraticBezierCurve(
        new THREE.Vector2(r, shoulderY),
        new THREE.Vector2(r, h * 0.94),
        new THREE.Vector2(d.neckR * 1.05 - inset, h * 0.93),
      );
      pts.push(...c.getPoints(14).slice(1));
      pts.push(new THREE.Vector2(Math.max(d.neckR - inset, 0.01), h));
      break;
    }
    case 'orb': {
      const R = r;
      const a0 = -0.95;
      const cy = -R * Math.sin(a0) + y0;
      arc(0, cy, R, a0, 1.25, 28);
      pts.push(new THREE.Vector2(Math.max(d.neckR - inset, 0.01), Math.min(h, cy + R * Math.sin(1.25) + 0.02)));
      break;
    }
    default:
      break;
  }
  const last = pts[pts.length - 1];
  pts.push(new THREE.Vector2(0, last.y));
  return pts;
}

function extrudeBody(spec: BottleSpec, d: BodyDims, inset = 0, fillTo?: number): THREE.BufferGeometry {
  const hx = d.hx - inset;
  const hz = d.hz - inset;
  const shape = new THREE.Shape();
  if (spec.body === 'pebble') {
    shape.absellipse(0, 0, hx, hz, 0, Math.PI * 2, false, 0);
  } else {
    const rr = Math.min(spec.body === 'block' ? 0.05 : 0.04, hx * 0.5, hz * 0.5);
    shape.moveTo(-hx + rr, -hz);
    shape.lineTo(hx - rr, -hz);
    shape.quadraticCurveTo(hx, -hz, hx, -hz + rr);
    shape.lineTo(hx, hz - rr);
    shape.quadraticCurveTo(hx, hz, hx - rr, hz);
    shape.lineTo(-hx + rr, hz);
    shape.quadraticCurveTo(-hx, hz, -hx, hz - rr);
    shape.lineTo(-hx, -hz + rr);
    shape.quadraticCurveTo(-hx, -hz, -hx + rr, -hz);
  }
  const bevel = spec.body === 'pebble' ? Math.min(0.14, d.h * 0.24) : 0.03;
  const y0 = inset * 1.6;
  const top = fillTo ?? d.h - inset;
  const depth = Math.max(0.01, top - y0 - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: spec.body === 'pebble' ? bevel * 0.45 : bevel * 0.6,
    bevelSegments: spec.body === 'pebble' ? 10 : 4,
    curveSegments: 36,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, y0 + bevel, 0);
  geo.computeVertexNormals();
  return geo;
}

/** Glass: alpha + view-dependent fresnel so edges read as thick glass. */
export function glassMaterial(spec: BottleSpec): THREE.MeshPhysicalMaterial {
  const tint = new THREE.Color(spec.glassTint ?? (spec.glass === 'smoked' ? '#3a3632' : spec.glass === 'frosted' ? '#eef0ee' : '#b9c6c1'));
  const frosted = spec.glass === 'frosted';
  const strong = spec.glass === 'smoked' || spec.glass === 'tinted';
  const m = new THREE.MeshPhysicalMaterial({
    name: 'Glass',
    color: tint,
    metalness: 0,
    roughness: frosted ? 0.5 : 0.05,
    transparent: true,
    opacity: frosted ? 0.5 : strong ? 0.42 : 0.08,
    clearcoat: frosted ? 0.2 : 1,
    clearcoatRoughness: 0.04,
    envMapIntensity: frosted ? 0.7 : 2.2,
    specularIntensity: 1,
    ior: 1.5,
    depthWrite: false,
  });
  applyFresnel(m, frosted ? 0.8 : 0.9, frosted ? 0.05 : 0.35);
  return m;
}

/**
 * View-dependent alpha (and optional darkening) so glass and liquid read as thick and refractive
 * at grazing angles, the way real bottles photograph against a light background.
 */
export function applyFresnel(m: THREE.Material, edgeAlpha: number, edgeDarken = 0) {
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `float fresnelTerm = pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 2.4);
       diffuseColor.a = mix(diffuseColor.a, ${edgeAlpha.toFixed(2)}, fresnelTerm);
       outgoingLight *= mix(1.0, ${(1 - edgeDarken).toFixed(2)}, fresnelTerm);
       #include <opaque_fragment>`,
    );
  };
  m.customProgramCacheKey = () => `fresnel-${edgeAlpha}-${edgeDarken}`;
}

function capMaterial(spec: BottleSpec, opts: BuildOptions): THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial {
  const mat = spec.capMaterial;
  if (mat in METAL) {
    return new THREE.MeshStandardMaterial({ name: 'CapMetal', color: METAL[mat], metalness: 1, roughness: mat === 'gunmetal' ? 0.35 : 0.22, envMapIntensity: 1.2 });
  }
  if (mat === 'black') return new THREE.MeshPhysicalMaterial({ name: 'CapLacquer', color: spec.capColor ?? '#141312', roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 });
  if (mat === 'white') return new THREE.MeshPhysicalMaterial({ name: 'CapCeramic', color: spec.capColor ?? '#efede8', roughness: 0.38, clearcoat: 0.4 });
  if (mat === 'resin')
    return new THREE.MeshPhysicalMaterial({ name: 'CapResin', color: spec.capColor ?? '#8a6f4f', roughness: 0.18, clearcoat: 1, transparent: true, opacity: 0.92 });
  const texture = opts.doc ? (mat === 'wood' ? woodTexture(opts.doc, spec.capColor ?? '#8a6a48') : stoneTexture(opts.doc, spec.capColor ?? '#b9b2a6')) : null;
  return new THREE.MeshStandardMaterial({
    name: mat === 'wood' ? 'CapWood' : 'CapStone',
    color: texture ? '#ffffff' : spec.capColor ?? (mat === 'wood' ? '#8a6a48' : '#b9b2a6'),
    map: texture,
    roughness: mat === 'wood' ? 0.62 : 0.86,
    metalness: 0,
  });
}

function capGeometry(spec: BottleSpec, d: BodyDims): { geo: THREE.BufferGeometry; h: number } {
  const base = capGeometryBase(spec, d);
  const cw = spec.capWidth ?? 1;
  const ch = spec.capHeight ?? 1;
  if (cw !== 1 || ch !== 1) base.geo.scale(cw, ch, cw);
  return { geo: base.geo, h: base.h * ch };
}

function capGeometryBase(spec: BottleSpec, d: BodyDims): { geo: THREE.BufferGeometry; h: number } {
  const scale = Math.min(1.15, Math.max(0.8, (d.hx + d.hz) / 0.55));
  switch (spec.cap) {
    case 'cylinder': {
      const r = 0.15 * scale;
      const h = 0.2;
      const g = roundedCylinder(r, h, 0.012, 48);
      return { geo: g, h };
    }
    case 'tall': {
      const g = roundedCylinder(0.1 * scale, 0.34, 0.01, 48);
      return { geo: g, h: 0.34 };
    }
    case 'disc': {
      const g = roundedCylinder(0.22 * scale, 0.075, 0.02, 64);
      return { geo: g, h: 0.075 };
    }
    case 'faceted': {
      const g = new THREE.CylinderGeometry(0.15 * scale, 0.17 * scale, 0.2, 6, 1);
      g.translate(0, 0.1, 0);
      return { geo: g.toNonIndexed(), h: 0.2 };
    }
    case 'cube': {
      const s = 0.27 * scale;
      const shape = new THREE.Shape();
      const rr = 0.025;
      shape.moveTo(-s / 2 + rr, -s / 2);
      shape.lineTo(s / 2 - rr, -s / 2);
      shape.quadraticCurveTo(s / 2, -s / 2, s / 2, -s / 2 + rr);
      shape.lineTo(s / 2, s / 2 - rr);
      shape.quadraticCurveTo(s / 2, s / 2, s / 2 - rr, s / 2);
      shape.lineTo(-s / 2 + rr, s / 2);
      shape.quadraticCurveTo(-s / 2, s / 2, -s / 2, s / 2 - rr);
      shape.lineTo(-s / 2, -s / 2 + rr);
      shape.quadraticCurveTo(-s / 2, -s / 2, -s / 2 + rr, -s / 2);
      const g = new THREE.ExtrudeGeometry(shape, { depth: s - 0.03, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 3 });
      g.rotateX(-Math.PI / 2);
      g.translate(0, 0.015, 0);
      return { geo: g, h: s };
    }
    case 'sphere': {
      const r = 0.15 * scale;
      const g = new THREE.SphereGeometry(r, 48, 32);
      g.translate(0, r * 0.92, 0);
      return { geo: g, h: r * 1.92 };
    }
    case 'pebble': {
      const r = 0.19 * scale;
      const g = new THREE.SphereGeometry(r, 48, 24);
      g.scale(1, 0.5, 0.82);
      g.translate(0, r * 0.5, 0);
      return { geo: g, h: r };
    }
    case 'dome': {
      const r = 0.16 * scale;
      const g = new THREE.SphereGeometry(r, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
      const base = new THREE.CylinderGeometry(r, r, 0.04, 48);
      base.translate(0, 0.02, 0);
      g.translate(0, 0.04, 0);
      return { geo: mergeSimple([base, g]), h: r + 0.04 };
    }
  }
}

function roundedCylinder(r: number, h: number, bevel: number, seg: number) {
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, 0)];
  for (let i = 0; i <= 6; i++) {
    const a = -Math.PI / 2 + (Math.PI / 2) * (i / 6);
    pts.push(new THREE.Vector2(r - bevel + Math.cos(a) * bevel, bevel + Math.sin(a) * bevel));
  }
  for (let i = 0; i <= 6; i++) {
    const a = (Math.PI / 2) * (i / 6);
    pts.push(new THREE.Vector2(r - bevel + Math.cos(a) * bevel, h - bevel + Math.sin(a) * bevel));
  }
  pts.push(new THREE.Vector2(0, h));
  return new THREE.LatheGeometry(pts, seg);
}

function mergeSimple(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const parts = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  const total = parts.reduce((n, g) => n + g.attributes.position.count, 0);
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  let o = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array as Float32Array, o * 3);
    nor.set(g.attributes.normal.array as Float32Array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

export function buildBottle(spec: BottleSpec, opts: BuildOptions = {}): BuiltBottle {
  const d = bodyDims(spec);
  const root = new THREE.Group();
  root.name = 'Bottle';

  // Glass body: back faces first, then front faces, for stable transparent sorting.
  const glass = glassMaterial(spec);
  const bodyGeo =
    d.kind === 'lathe' ? new THREE.LatheGeometry(latheProfile(spec, d), spec.body === 'faceted' ? 8 : 72) : extrudeBody(spec, d);
  if (spec.body === 'faceted') bodyGeo.rotateY(Math.PI / 8);
  if (spec.glassGradient) {
    // Tint fades from glassTint at the base to glassGradient at the shoulder (e.g. blue to black).
    const bottom = new THREE.Color(spec.glassTint ?? '#b9c6c1');
    const top = new THREE.Color(spec.glassGradient);
    const pos = bodyGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const t = Math.min(1, Math.max(0, pos.getY(i) / d.h));
      c.copy(bottom).lerp(top, t * t);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    bodyGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    glass.vertexColors = true;
    glass.color.set('#ffffff');
  }
  const body = new THREE.Group();
  body.name = 'Body';
  const back = new THREE.Mesh(bodyGeo, glass.clone());
  back.name = 'GlassBack';
  (back.material as THREE.Material).side = THREE.BackSide;
  (back.material as THREE.Material).name = 'GlassBack';
  applyFresnel(back.material as THREE.Material, 0.6);
  back.renderOrder = 1;
  const front = new THREE.Mesh(bodyGeo, glass);
  front.name = 'GlassFront';
  front.renderOrder = 3;
  body.add(back, front);
  root.add(body);

  // Liquid
  const fill = Math.min(0.97, Math.max(0.15, spec.fill ?? 0.84));
  const inset = spec.body === 'block' ? 0.045 : 0.032;
  let liquidGeo: THREE.BufferGeometry;
  if (d.kind === 'lathe') {
    const prof = latheProfile(spec, d, inset).filter((p) => p.y <= d.h * fill);
    const lastY = d.h * fill;
    const maxR = Math.max(...latheProfile(spec, d, inset).filter((p) => Math.abs(p.y - lastY) < d.h * 0.12).map((p) => p.x), 0.05);
    prof.push(new THREE.Vector2(Math.min(maxR, prof[prof.length - 1]?.x ?? maxR), lastY), new THREE.Vector2(0, lastY));
    liquidGeo = new THREE.LatheGeometry(prof, spec.body === 'faceted' ? 8 : 72);
    if (spec.body === 'faceted') liquidGeo.rotateY(Math.PI / 8);
  } else {
    liquidGeo = extrudeBody(spec, d, inset, d.h * fill);
  }
  const liquid = new THREE.Mesh(
    liquidGeo,
    new THREE.MeshPhysicalMaterial({
      name: 'Liquid',
      color: new THREE.Color(spec.liquid),
      roughness: 0.15,
      metalness: 0,
      transparent: true,
      opacity: 0.58,
      envMapIntensity: 0.6,
      depthWrite: false,
    }),
  );
  applyFresnel(liquid.material as THREE.Material, 0.96, 0.42);
  liquid.name = 'Liquid';
  liquid.renderOrder = 2;
  root.add(liquid);

  // Collar + neck + atomizer
  const collarMatName = spec.collar === 'none' ? spec.capMaterial : spec.collar;
  const collarMat =
    collarMatName === 'black'
      ? new THREE.MeshPhysicalMaterial({ name: 'Collar', color: '#151413', roughness: 0.3, clearcoat: 1 })
      : new THREE.MeshStandardMaterial({ name: 'Collar', color: METAL[collarMatName] ?? METAL.silver, metalness: 1, roughness: 0.25 });
  const collar = new THREE.Mesh(roundedCylinder(d.neckR + 0.012, 0.055, 0.008, 48), collarMat);
  collar.name = 'Collar';
  collar.position.y = d.h - 0.005;
  root.add(collar);

  const actuator = new THREE.Group();
  actuator.name = 'Actuator';
  const stem = new THREE.Mesh(roundedCylinder(0.038, 0.06, 0.008, 32), collarMat);
  actuator.add(stem);
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.02, 16), new THREE.MeshStandardMaterial({ name: 'NozzleHole', color: '#111' }));
  hole.rotation.x = Math.PI / 2;
  hole.position.set(0, 0.038, 0.034);
  actuator.add(hole);
  const nozzle = new THREE.Object3D();
  nozzle.name = 'Nozzle';
  nozzle.position.set(0, 0.038, 0.045);
  actuator.add(nozzle);
  actuator.position.y = d.h + 0.045;
  root.add(actuator);

  // Cap sits over collar and actuator.
  const { geo: capGeo, h: capH } = capGeometry(spec, d);
  const capMesh = new THREE.Mesh(capGeo, capMaterial(spec, opts));
  if (spec.cap === 'faceted') capMesh.material.flatShading = true;
  const cap = new THREE.Group();
  cap.name = 'Cap';
  capMesh.name = 'CapMesh';
  cap.add(capMesh);
  cap.position.y = d.h + 0.012;
  root.add(cap);

  // Label
  if (spec.label !== 'none' && opts.doc) {
    const label = buildLabel(spec, d, opts);
    if (label) root.add(label);
  }

  // Contact shadow
  if (opts.doc) root.add(blobShadow(opts.doc, d));

  // Framing data travels with the GLB (exported as glTF extras) so the live view matches the poster.
  root.userData = { framingHeight: d.h + 0.012 + capH, framingWidth: Math.max(d.hx, d.hz) * 2 };

  return {
    root,
    parts: { body, liquid, cap, collar, actuator, nozzle },
    height: d.h + 0.012 + capH,
    width: Math.max(d.hx, d.hz) * 2,
    bodyHeight: d.h,
  };
}

function buildLabel(spec: BottleSpec, d: BodyDims, opts: BuildOptions): THREE.Mesh | null {
  const doc = opts.doc!;
  const W = 512;
  const H = 320;
  const canvas = doc.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const paper = spec.label === 'paper';
  const plate = spec.label === 'plate';
  if (paper) {
    ctx.fillStyle = spec.labelColor ?? '#f1ece2';
    ctx.fillRect(0, 0, W, H);
  } else if (plate) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    const base = spec.labelColor ?? '#c8a35a';
    g.addColorStop(0, base);
    g.addColorStop(0.5, shade(base, 0.25));
    g.addColorStop(1, shade(base, -0.15));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.fillStyle = spec.labelInk ?? (spec.glass === 'smoked' || (spec.glass === 'tinted' && !paper && !plate) ? '#f2efe8' : '#1c1a17');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const sans = opts.fonts?.sans ?? 'Helvetica, Arial, sans-serif';
  const serif = opts.fonts?.serif ?? 'Georgia, serif';
  const brand = (opts.brand ?? '').toUpperCase();
  const name = opts.name ?? '';
  ctx.font = `600 34px ${sans}`;
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '6px';
  ctx.fillText(brand, W / 2, H * 0.3, W * 0.88);
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '0px';
  let size = 76;
  ctx.font = `italic 400 ${size}px ${serif}`;
  while (ctx.measureText(name).width > W * 0.86 && size > 28) {
    size -= 4;
    ctx.font = `italic 400 ${size}px ${serif}`;
  }
  ctx.fillText(name.length > 40 ? `No. ${name.match(/No\.?\s*(\d+)/)?.[1] ?? ''}`.trim() || name.slice(0, 24) : name, W / 2, H * 0.64, W * 0.9);
  if (paper || plate) {
    ctx.strokeStyle = 'rgba(28,26,23,0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(12, 12, W - 24, H - 24);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({
    name: 'Label',
    map: tex,
    // Transparent so it is drawn in the same pass as the glass, after it (renderOrder 5).
    transparent: true,
    metalness: plate ? 0.7 : 0,
    roughness: plate ? 0.32 : 0.8,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const lw = Math.min(d.hx * 1.45, 0.42);
  const lh = (lw * H) / W;
  const yMid = spec.body === 'apothecary' ? d.h * 0.38 : spec.body === 'orb' ? d.h * 0.42 : d.h * 0.45;
  let geo: THREE.BufferGeometry;
  if (d.kind === 'lathe' && spec.body !== 'faceted') {
    const r = (spec.body === 'tapered' ? d.hx * 0.86 : d.hx) + 0.003;
    const theta = lw / r;
    geo = new THREE.CylinderGeometry(r, r, lh, 32, 1, true, -theta / 2, theta);
    geo.translate(0, yMid, 0);
  } else {
    geo = new THREE.PlaneGeometry(lw, lh);
    const z = d.kind === 'lathe' ? d.hx * Math.cos(Math.PI / 8) + 0.003 : d.hz + (spec.body === 'pebble' ? 0.004 : 0.012);
    geo.translate(0, yMid, z);
  }
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'Label';
  mesh.renderOrder = 5;
  return mesh;
}

function blobShadow(doc: Document, d: BodyDims): THREE.Mesh {
  const c = doc.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 4, 128, 128, 128);
  g.addColorStop(0, 'rgba(28,26,23,0.55)');
  g.addColorStop(0.45, 'rgba(28,26,23,0.22)');
  g.addColorStop(1, 'rgba(28,26,23,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(d.hx * 3.2, Math.max(d.hz, 0.12) * 3.4),
    new THREE.MeshBasicMaterial({ name: 'Shadow', map: tex, transparent: true, depthWrite: false }),
  );
  m.name = 'Shadow';
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.001;
  m.renderOrder = 0;
  return m;
}

function woodTexture(doc: Document, base: string): THREE.Texture {
  const c = doc.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 70; i++) {
    const x = rnd() * 256;
    ctx.strokeStyle = `rgba(40,24,10,${0.05 + rnd() * 0.12})`;
    ctx.lineWidth = 0.5 + rnd() * 2.2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    for (let y = 0; y <= 256; y += 16) ctx.lineTo(x + Math.sin(y / 30 + i) * 3, y);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function stoneTexture(doc: Document, base: string): THREE.Texture {
  const c = doc.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 2400; i++) {
    ctx.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${rnd() * 0.12})` : `rgba(20,18,16,${rnd() * 0.12})`;
    ctx.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function shade(hex: string, amt: number): string {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amt)));
  return `#${c.getHexString()}`;
}

/**
 * Camera framing shared by poster renders and the live viewer.
 * The bottle is turned a little off-axis so the poster shows depth.
 */
export const FRAMING = {
  fov: 24,
  yaw: -0.38,
  pitch: 0.1,
  aspect: 3 / 4,
  fill: 0.74, // fraction of frame height the bottle occupies
} as const;

export function cameraFor(built: { height: number; width: number }, aspect = FRAMING.aspect) {
  const cam = new THREE.PerspectiveCamera(FRAMING.fov, aspect, 0.05, 50);
  const targetH = Math.max(built.height, (built.width / aspect) * 0.92) / FRAMING.fill;
  const dist = targetH / 2 / Math.tan(THREE.MathUtils.degToRad(FRAMING.fov / 2));
  const cy = built.height * 0.47;
  cam.position.set(0, cy + Math.sin(FRAMING.pitch) * dist, Math.cos(FRAMING.pitch) * dist);
  cam.lookAt(0, cy, 0);
  return cam;
}

/** Named clips: CapLift, Spray, Explode. Times in seconds. */
export function buildClips(b: BuiltBottle): THREE.AnimationClip[] {
  const capY = b.parts.cap.position.y;
  const actY = b.parts.actuator.position.y;
  const colY = b.parts.collar.position.y;
  const q = (x: number, z: number) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, 0, z)).toArray();
  const capLift = new THREE.AnimationClip('CapLift', 0.9, [
    new THREE.VectorKeyframeTrack('Cap.position', [0, 0.35, 0.9], [0, capY, 0, 0, capY + 0.1, 0, 0.26, capY + 0.2, -0.04]),
    new THREE.QuaternionKeyframeTrack('Cap.quaternion', [0, 0.35, 0.9], [...q(0, 0), ...q(0, -0.04), ...q(-0.12, -0.32)]),
  ]);
  const spray = new THREE.AnimationClip('Spray', 0.42, [
    new THREE.VectorKeyframeTrack('Actuator.position', [0, 0.12, 0.2, 0.42], [0, actY, 0, 0, actY - 0.028, 0, 0, actY - 0.028, 0, 0, actY, 0]),
  ]);
  const explode = new THREE.AnimationClip('Explode', 1.2, [
    new THREE.VectorKeyframeTrack('Cap.position', [0, 1.2], [0, capY, 0, 0, capY + 0.55, 0]),
    new THREE.VectorKeyframeTrack('Actuator.position', [0, 1.2], [0, actY, 0, 0, actY + 0.36, 0]),
    new THREE.VectorKeyframeTrack('Collar.position', [0, 1.2], [0, colY, 0, 0, colY + 0.2, 0]),
    new THREE.VectorKeyframeTrack('Liquid.position', [0, 1.2], [0, 0, 0, 0, 0.04, 0]),
  ]);
  const idle = new THREE.AnimationClip('Idle', 1, [new THREE.VectorKeyframeTrack('Cap.position', [0, 1], [0, capY, 0, 0, capY, 0])]);
  return [idle, capLift, spray, explode];
}
