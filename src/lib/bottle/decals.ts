/**
 * Decals: text and shapes drawn onto a face of the bottle. Layers are grouped by face and
 * material, rendered into a canvas, and mapped onto a patch that hugs the glass (curved for
 * round bottles, flat for flacons), so lettering sits on the surface instead of floating.
 */
import * as THREE from 'three';
import type { BuiltCap } from './caps';
import { frontPatch, type BodyMesh } from './shapes';
import { CM, type Decal, type DecalFont, type DecalMaterial, type LoftBody } from './spec';

export interface DecalContext {
  doc: Document;
  fonts: { sans: string; serif: string };
  body: BodyMesh;
  plan: LoftBody['plan'] | 'silhouette';
  cap: BuiltCap | null;
  wall: number; // world
}

type Ctx2D = CanvasRenderingContext2D & { letterSpacing?: string; fontStretch?: string };

function fontFor(font: DecalFont | undefined, px: number, fonts: DecalContext['fonts']): { css: string; stretch: string } {
  const { sans, serif } = fonts;
  switch (font) {
    case 'sans-light':
      return { css: `300 ${px}px ${sans}`, stretch: 'normal' };
    case 'sans-bold':
      return { css: `700 ${px}px ${sans}`, stretch: 'normal' };
    case 'sans-wide':
      return { css: `500 ${px}px ${sans}`, stretch: 'expanded' };
    case 'sans-condensed':
      return { css: `500 ${px}px ${sans}`, stretch: 'condensed' };
    case 'serif':
      return { css: `400 ${px}px ${serif}`, stretch: 'normal' };
    case 'serif-italic':
      return { css: `italic 400 ${px}px ${serif}`, stretch: 'normal' };
    case 'serif-bold':
      return { css: `600 ${px}px ${serif}`, stretch: 'normal' };
    case 'script':
      return { css: `italic 300 ${px}px ${serif}`, stretch: 'normal' };
    case 'display':
      return { css: `800 ${px}px ${sans}`, stretch: 'expanded' };
    default:
      return { css: `400 ${px}px ${sans}`, stretch: 'normal' };
  }
}

function drawLayer(ctx: Ctx2D, d: Decal, W: number, H: number, fonts: DecalContext['fonts'], mask: boolean) {
  const x = d.x * W;
  const y = (1 - d.y) * H;
  const color = mask ? '#ffffff' : d.color ?? '#1c1a17';
  const fill = mask ? '#ffffff' : d.fill ?? color;
  ctx.save();
  ctx.globalAlpha = d.opacity ?? 1;
  ctx.translate(x, y);
  if (d.rotation) ctx.rotate((d.rotation * Math.PI) / 180);
  const w = (d.w ?? 0) * W;
  const h = (d.h ?? 0) * H;
  const strokeW = Math.max(1, (d.stroke ?? 0.004) * W);
  switch (d.kind) {
    case 'rect': {
      ctx.fillStyle = fill;
      const r = (d.radius ?? 0) * w;
      ctx.beginPath();
      if (r > 0 && 'roundRect' in ctx) (ctx as CanvasRenderingContext2D & { roundRect: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect(-w / 2, -h / 2, w, h, r);
      else ctx.rect(-w / 2, -h / 2, w, h);
      ctx.fill();
      if (d.stroke) {
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeW;
        ctx.stroke();
      }
      break;
    }
    case 'ellipse': {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      if (d.stroke) {
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeW;
        ctx.stroke();
      }
      break;
    }
    case 'frame': {
      if (d.fill) {
        ctx.fillStyle = fill;
        ctx.fillRect(-w / 2, -h / 2, w, h);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeW;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      break;
    }
    case 'line': {
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeW;
      ctx.beginPath();
      ctx.moveTo(-w / 2, 0);
      ctx.lineTo(w / 2, 0);
      ctx.stroke();
      break;
    }
    case 'ring': {
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeW;
      ctx.beginPath();
      ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'text': {
      const text = d.text ?? '';
      let px = Math.max(6, (d.size ?? 0.05) * H);
      const f = fontFor(d.font, px, fonts);
      ctx.fontStretch = f.stretch as CanvasFontStretch;
      ctx.font = f.css;
      ctx.letterSpacing = `${(d.tracking ?? 0) * px}px`;
      ctx.textAlign = d.align ?? 'center';
      ctx.textBaseline = 'middle';
      // Shrink to fit the given width.
      const maxW = (d.w ?? 0.9) * W;
      while (ctx.measureText(text).width > maxW && px > 6) {
        px -= Math.max(1, px * 0.06);
        ctx.font = fontFor(d.font, px, fonts).css;
        ctx.letterSpacing = `${(d.tracking ?? 0) * px}px`;
      }
      ctx.fillStyle = color;
      if (d.weight) {
        ctx.strokeStyle = color;
        ctx.lineWidth = d.weight * px;
        ctx.lineJoin = 'round';
        ctx.strokeText(text, 0, 0);
      }
      ctx.fillText(text, 0, 0);
      break;
    }
  }
  ctx.restore();
}

function materialFor(kind: DecalMaterial, tex: THREE.Texture, tint: string | undefined): THREE.Material {
  switch (kind) {
    case 'metal':
      return new THREE.MeshStandardMaterial({ name: 'DecalMetal', color: tint ?? '#d8dadc', alphaMap: tex, transparent: true, metalness: 1, roughness: 0.16, envMapIntensity: 1.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    case 'paper':
      return new THREE.MeshStandardMaterial({ name: 'DecalPaper', map: tex, transparent: true, roughness: 0.92, metalness: 0, envMapIntensity: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    case 'plate':
      return new THREE.MeshStandardMaterial({ name: 'DecalPlate', map: tex, transparent: true, roughness: 0.3, metalness: 0.85, envMapIntensity: 1.2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    case 'etch':
      return new THREE.MeshStandardMaterial({ name: 'DecalEtch', map: tex, transparent: true, opacity: 0.85, roughness: 1, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    case 'inside':
      return new THREE.MeshStandardMaterial({ name: 'DecalInside', map: tex, transparent: true, roughness: 0.5, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
    default:
      return new THREE.MeshStandardMaterial({ name: 'DecalPrint', map: tex, transparent: true, roughness: 0.55, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  }
}

export function buildDecals(decals: Decal[], ctx: DecalContext): { body: THREE.Object3D[]; cap: THREE.Object3D[] } {
  const out = { body: [] as THREE.Object3D[], cap: [] as THREE.Object3D[] };
  const groups = new Map<string, Decal[]>();
  for (const d of decals) {
    const key = `${d.face ?? 'front'}:${d.material ?? 'print'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  }
  const { dims, rings } = ctx.body;
  for (const [key, layers] of groups) {
    const [face, material] = key.split(':') as [NonNullable<Decal['face']>, DecalMaterial];
    const mask = material === 'metal';
    let geometry: THREE.BufferGeometry | null = null;
    let width = 0;
    let height = 0;
    let onCap = false;
    if (face === 'front' || face === 'back') {
      if (!rings.length) continue;
      const lift = material === 'inside' ? -ctx.wall * 0.92 : 0.0022;
      const spread = ctx.plan === 'rect' || ctx.plan === 'polygon' || ctx.plan === 'custom' || ctx.plan === 'squircle' ? Math.atan2(dims.hx * 0.86, dims.hz) / (Math.PI / 2) : 0.72;
      const patch = frontPatch(ctx.body, dims.baseY * 0.4, dims.h * 0.985, lift, spread);
      if (!patch) continue;
      geometry = patch.geometry;
      width = patch.width;
      height = patch.height;
    } else if (ctx.cap) {
      onCap = true;
      if (face === 'cap-top') {
        width = ctx.cap.width;
        height = ctx.cap.depth;
        geometry = new THREE.PlaneGeometry(width * 0.96, height * 0.96);
        geometry.rotateX(-Math.PI / 2);
        geometry.translate(0, ctx.cap.topY + 0.0012, 0);
      } else {
        width = ctx.cap.width;
        height = ctx.cap.height;
        geometry = new THREE.PlaneGeometry(width * 0.96, height * 0.96);
        geometry.translate(0, height / 2, ctx.cap.depth / 2 + 0.0015);
      }
    } else continue;

    const W = 1024;
    const H = Math.max(64, Math.round((W * height) / Math.max(width, 1e-6)));
    const canvas = ctx.doc.createElement('canvas');
    canvas.width = W;
    canvas.height = Math.min(H, 2048);
    const c2 = canvas.getContext('2d')! as Ctx2D;
    if (mask) {
      c2.fillStyle = '#000000';
      c2.fillRect(0, 0, W, canvas.height);
    }
    for (const d of layers) drawLayer(c2, d, W, canvas.height, ctx.fonts, mask);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    const mesh = new THREE.Mesh(geometry, materialFor(material, tex, mask ? layers[0].color : undefined));
    mesh.name = `Decal:${key}`;
    mesh.renderOrder = material === 'inside' ? 1 : 5;
    if (face === 'back') mesh.rotation.y = Math.PI;
    (onCap ? out.cap : out.body).push(mesh);
  }
  return out;
}

/** World size of 1 cm, for callers that lay out decals in centimetres. */
export const DECAL_CM = CM;
