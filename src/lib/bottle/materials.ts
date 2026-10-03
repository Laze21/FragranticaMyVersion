/**
 * Materials for the bottle builder. Glass is "fake" (alpha + fresnel + environment
 * reflections) rather than physical transmission so it composites over any page background,
 * renders to a transparent PNG and stays cheap on phones.
 */
import * as THREE from 'three';
import type { CapMaterial, Glass, Hex, Metal } from './spec';

export const METAL: Record<Metal, { color: Hex; roughness: number }> = {
  silver: { color: '#d6d8da', roughness: 0.22 },
  chrome: { color: '#e2e4e6', roughness: 0.07 },
  gold: { color: '#d4ad5c', roughness: 0.24 },
  'rose-gold': { color: '#d9a08a', roughness: 0.24 },
  gunmetal: { color: '#55565a', roughness: 0.34 },
  bronze: { color: '#8a6e4e', roughness: 0.4 },
};

export function isMetal(m: string): m is Metal {
  return m in METAL;
}

/** Page tone the posters sit on (Porcelain). Pale juices are shaded against it. */
const PAGE = new THREE.Color('#f2f0eb');

interface GlassShaderOptions {
  edgeAlpha: number;
  edgeDarken?: number;
  /** Use the per-vertex `aAlpha` attribute (gradient opacity). */
  vertexAlpha?: boolean;
}

/**
 * View-dependent alpha (and optional darkening) so glass and liquid read as thick and refractive
 * at grazing angles, the way real bottles photograph against a light background.
 */
export function applyFresnel(m: THREE.Material, edgeAlpha: number, edgeDarken = 0, vertexAlpha = false) {
  const o: GlassShaderOptions = { edgeAlpha, edgeDarken, vertexAlpha };
  m.onBeforeCompile = (shader) => {
    if (o.vertexAlpha) {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aAlpha;\nvarying float vAlpha;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlpha = aAlpha;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vAlpha;');
    }
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `${o.vertexAlpha ? 'diffuseColor.a *= vAlpha;' : ''}
       float fresnelTerm = pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 2.4);
       diffuseColor.a = mix(diffuseColor.a, max(diffuseColor.a, ${o.edgeAlpha.toFixed(2)}), fresnelTerm);
       outgoingLight *= mix(1.0, ${(1 - (o.edgeDarken ?? 0)).toFixed(2)}, fresnelTerm);
       #include <opaque_fragment>`,
    );
  };
  m.customProgramCacheKey = () => `fresnel-${edgeAlpha}-${edgeDarken}-${vertexAlpha ? 'va' : ''}`;
  m.userData.fresnel = [edgeAlpha, edgeDarken, vertexAlpha];
}

export function glassOpacity(g: Glass): number {
  if (g.opacity !== undefined) return g.opacity;
  switch (g.finish) {
    case 'clear':
      return 0.08;
    case 'tinted':
      return 0.5;
    case 'smoked':
      return 0.55;
    case 'frosted':
      return 0.6;
    case 'lacquered':
    case 'mirror':
      return 1;
  }
}

/** The body glass. `gradient` opacity is applied per vertex by the builder via `aAlpha`. */
export function glassMaterial(g: Glass, doc?: Document): THREE.MeshPhysicalMaterial {
  const frosted = g.finish === 'frosted';
  const opaque = g.finish === 'lacquered' || g.finish === 'mirror';
  const m = new THREE.MeshPhysicalMaterial({
    name: 'Glass',
    color: g.finish === 'clear' && !g.opacity ? new THREE.Color(g.color).lerp(new THREE.Color('#ffffff'), 0.2) : g.color,
    metalness: g.finish === 'mirror' ? 1 : 0,
    roughness: g.finish === 'mirror' ? 0.12 : frosted ? 0.55 : g.finish === 'lacquered' ? 0.2 : 0.05,
    transparent: !opaque,
    opacity: glassOpacity(g),
    clearcoat: frosted ? 0.15 : 1,
    clearcoatRoughness: frosted ? 0.4 : 0.04,
    envMapIntensity: frosted ? 0.6 : g.finish === 'mirror' ? 1.4 : 2.0,
    specularIntensity: 1,
    ior: 1.5,
    depthWrite: opaque,
  });
  if (g.texture && g.texture !== 'none' && doc) {
    const t = surfaceTexture(doc, g.texture, g.textureColor);
    m.bumpMap = t.bump;
    m.bumpScale = t.scale;
    if (t.roughness) m.roughnessMap = t.roughness;
  }
  if (!opaque) applyFresnel(m, frosted ? 0.85 : 0.9, frosted ? 0.05 : 0.35, !!g.gradient);
  return m;
}

/**
 * Juice. Saturated juices are lit like any surface. Pale juices are nearly clear, and lit
 * shading turns them into white plastic on a light page, so they are drawn unlit: the colour
 * is solved so that, blended over the page, the result is the page filtered through the juice
 * (what a clear tinted liquid does), with fresnel darkening standing in for refraction.
 */
export function liquidMaterial(hex: string): THREE.MeshPhysicalMaterial {
  const tint = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  tint.getHSL(hsl);
  const pale = hsl.l > 0.7;
  if (!pale) {
    const m = new THREE.MeshPhysicalMaterial({
      name: 'Liquid',
      color: tint,
      roughness: 0.12,
      metalness: 0,
      transparent: true,
      opacity: 0.6,
      envMapIntensity: 0.6,
      depthWrite: false,
    });
    applyFresnel(m, 0.96, 0.42);
    return m;
  }
  const a = 0.5;
  // Blending happens on the canvas in sRGB, so solve there.
  const t = tint.clone().convertLinearToSRGB();
  const page = PAGE.clone().convertLinearToSRGB();
  const filter = new THREE.Color(1, 1, 1).lerp(t, 1.5);
  const want = page.clone().multiply(filter).multiplyScalar(0.97);
  const solve = (w: number, p: number) => Math.min(1, Math.max(0, (w - p * (1 - a)) / a));
  const emissive = new THREE.Color().setRGB(solve(want.r, page.r), solve(want.g, page.g), solve(want.b, page.b), THREE.SRGBColorSpace);
  const m = new THREE.MeshPhysicalMaterial({
    name: 'Liquid',
    color: '#000000',
    emissive,
    roughness: 0.1,
    metalness: 0,
    transparent: true,
    opacity: a,
    envMapIntensity: 0.35,
    depthWrite: false,
    toneMapped: false,
  });
  applyFresnel(m, 0.9, 0.45);
  return m;
}

export function metalMaterial(metal: Metal, name = 'Metal'): THREE.MeshStandardMaterial {
  const m = METAL[metal];
  return new THREE.MeshStandardMaterial({ name, color: m.color, metalness: 1, roughness: m.roughness, envMapIntensity: 1.2 });
}

/** Cap and collar materials. */
export function hardMaterial(mat: CapMaterial | 'rubber' | 'satin', color: Hex | undefined, doc?: Document, texture?: 'none' | 'grain' | 'leather'): THREE.Material {
  if (isMetal(mat)) {
    const m = metalMaterial(mat, 'CapMetal');
    if (color) m.color.set(color);
    return m;
  }
  let m: THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial;
  switch (mat) {
    case 'black':
      m = new THREE.MeshPhysicalMaterial({ name: 'CapLacquer', color: color ?? '#121212', roughness: texture === 'grain' ? 0.5 : 0.24, clearcoat: texture ? 0.3 : 1, clearcoatRoughness: 0.08 });
      break;
    case 'lacquer':
      m = new THREE.MeshPhysicalMaterial({ name: 'CapLacquer', color: color ?? '#7a302c', roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.06 });
      break;
    case 'white':
      m = new THREE.MeshPhysicalMaterial({ name: 'CapCeramic', color: color ?? '#f0ede6', roughness: 0.36, clearcoat: 0.4 });
      break;
    case 'resin':
      m = new THREE.MeshPhysicalMaterial({ name: 'CapResin', color: color ?? '#8a6f4f', roughness: 0.18, clearcoat: 1, transparent: true, opacity: 0.92 });
      break;
    case 'leather':
      m = new THREE.MeshStandardMaterial({ name: 'CapLeather', color: color ?? '#2a2522', roughness: 0.78, metalness: 0 });
      texture = 'leather';
      break;
    case 'rubber':
      m = new THREE.MeshStandardMaterial({ name: 'Rubber', color: color ?? '#1a1a1a', roughness: 0.9, metalness: 0 });
      break;
    case 'satin':
      m = new THREE.MeshPhysicalMaterial({ name: 'Satin', color: color ?? '#2b2b2b', roughness: 0.45, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffffff') });
      break;
    case 'wood': {
      const map = doc ? woodTexture(doc, color ?? '#8a6a48') : null;
      m = new THREE.MeshStandardMaterial({ name: 'CapWood', color: map ? '#ffffff' : color ?? '#8a6a48', map, roughness: 0.62, metalness: 0 });
      break;
    }
    case 'glass-clear':
    case 'glass-frosted':
    case 'glass-smoked':
    case 'glass-tinted': {
      const finish = mat.slice(6) as Glass['finish'];
      const g = glassMaterial({ finish, color: color ?? (finish === 'clear' ? '#dfe7e4' : finish === 'smoked' ? '#2d2a28' : finish === 'frosted' ? '#eef0ee' : '#8aa0b8') });
      g.name = 'CapGlass';
      g.opacity = finish === 'clear' ? 0.22 : finish === 'frosted' ? 0.75 : 0.6;
      return g;
    }
  }
  if (doc && texture && texture !== 'none') {
    const t = surfaceTexture(doc, texture === 'leather' ? 'grain' : texture);
    m.bumpMap = t.bump;
    m.bumpScale = texture === 'leather' ? t.scale * 1.6 : t.scale;
  }
  return m;
}

/* ------------------------------------------------------------------ procedural textures */

const texCache = new WeakMap<Document, Map<string, { bump: THREE.Texture; roughness?: THREE.Texture; scale: number }>>();

export function surfaceTexture(doc: Document, kind: string, color?: Hex): { bump: THREE.Texture; roughness?: THREE.Texture; scale: number } {
  let cache = texCache.get(doc);
  if (!cache) texCache.set(doc, (cache = new Map()));
  const key = `${kind}:${color ?? ''}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = doc.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d')!;
  let seed = 19;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 512, 512);
  let scale = 0.004;
  let roughness: THREE.Texture | undefined;
  if (kind === 'studs') {
    // Sequin studs: domed discs on a staggered grid, slightly irregular.
    const r = 11;
    const rough = doc.createElement('canvas');
    rough.width = rough.height = 512;
    const rctx = rough.getContext('2d')!;
    rctx.fillStyle = '#9a9a9a';
    rctx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512 + r; y += r * 2.1) {
      for (let x = 0; x < 512 + r; x += r * 2.1) {
        const cx = x + (Math.floor(y / (r * 2.1)) % 2 ? r : 0) + (rnd() - 0.5) * 2;
        const cy = y + (rnd() - 0.5) * 2;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.7, '#b0b0b0');
        g.addColorStop(1, '#808080');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        rctx.fillStyle = '#2a2a2a';
        rctx.beginPath();
        rctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
        rctx.fill();
      }
    }
    roughness = new THREE.CanvasTexture(rough);
    roughness.wrapS = roughness.wrapT = THREE.RepeatWrapping;
    scale = 0.03;
  } else if (kind === 'grain') {
    for (let i = 0; i < 26000; i++) {
      const v = Math.floor(96 + rnd() * 64);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(rnd() * 512, rnd() * 512, 1 + rnd() * 2, 1 + rnd() * 2);
    }
    scale = 0.0025;
  } else if (kind === 'hammered') {
    for (let i = 0; i < 700; i++) {
      const cx = rnd() * 512;
      const cy = rnd() * 512;
      const rr = 10 + rnd() * 18;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
      g.addColorStop(0, '#a8a8a8');
      g.addColorStop(1, '#787878');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.fill();
    }
    scale = 0.012;
  } else if (kind === 'meander') {
    // Greek key band, repeated.
    ctx.strokeStyle = '#b4b4b4';
    ctx.lineWidth = 6;
    const unit = 64;
    for (let x = 0; x < 512; x += unit) {
      for (const y of [120, 392]) {
        ctx.beginPath();
        ctx.moveTo(x, y + 24);
        ctx.lineTo(x, y - 24);
        ctx.lineTo(x + 48, y - 24);
        ctx.lineTo(x + 48, y + 8);
        ctx.lineTo(x + 16, y + 8);
        ctx.lineTo(x + 16, y - 8);
        ctx.lineTo(x + 32, y - 8);
        ctx.stroke();
      }
    }
    scale = 0.012;
  } else if (kind === 'flutes-fine') {
    for (let x = 0; x < 512; x += 8) {
      const g = ctx.createLinearGradient(x, 0, x + 8, 0);
      g.addColorStop(0, '#6a6a6a');
      g.addColorStop(0.5, '#9a9a9a');
      g.addColorStop(1, '#6a6a6a');
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, 8, 512);
    }
    scale = 0.006;
  }
  const bump = new THREE.CanvasTexture(c);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  const out = { bump, roughness, scale };
  cache.set(key, out);
  return out;
}

export function woodTexture(doc: Document, base: string): THREE.Texture {
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

export function shade(hex: string, amt: number): string {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amt)));
  return `#${c.getHexString()}`;
}
