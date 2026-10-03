/**
 * Parametric bottle builder (BottleSpec v2).
 *
 * One function turns a spec into a Three.js group. It feeds three consumers:
 *   1. scripts/bottles  -> renders the static poster image for every fragrance (headless Chromium)
 *   2. scripts/bottles  -> exports a GLB with named animation clips when a baked model is wanted
 *   3. BottleStage      -> builds the bottle live in the browser for the interactive view
 *
 * Because posters and the live 3D view share geometry, materials, lighting and camera framing,
 * the poster -> 3D crossfade on the fragrance page has no visible jump.
 *
 * Glass is deliberately "fake" (alpha + fresnel + environment reflections) rather than physical
 * transmission: it composites over any page background, renders identically to a transparent
 * PNG, and is far cheaper on phones.
 */
import * as THREE from 'three';
import { buildCap, type BuiltCap } from './caps';
import { buildDecals } from './decals';
import { buildDecor } from './decor';
import { applyFresnel, glassMaterial, glassOpacity, hardMaterial, isMetal, liquidMaterial, metalMaterial } from './materials';
import { bodyDimsOf, buildBodyMesh, extrudeRing, ringAt, type BodyDims } from './shapes';
import { CM, DEFAULTS, type BottleSpec, type Glass } from './spec';

export { applyFresnel } from './materials';
export type { BottleSpec } from './spec';

export interface BuildOptions {
  /** Provide a document to draw labels and textures (browser only). */
  doc?: Document;
  /** Font families available in the document for decals. */
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
  dims: BodyDims;
  cap: BuiltCap;
}

const DEFAULT_FONTS = { sans: 'Archivo, Helvetica, Arial, sans-serif', serif: 'Newsreader, Georgia, serif' };

/** Per-vertex colour and alpha for gradient glass (opaque base fading to a translucent top). */
function applyGradient(geo: THREE.BufferGeometry, g: Glass, dims: BodyDims, material: THREE.MeshPhysicalMaterial) {
  const grad = g.gradient!;
  const from = new THREE.Color(g.color);
  const to = new THREE.Color(grad.to);
  const a0 = grad.opacityBase ?? glassOpacity(g);
  const a1 = grad.opacityTop ?? glassOpacity(g);
  const start = (grad.start ?? 0.25) * dims.h;
  const end = (grad.end ?? 0.85) * dims.h;
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const alphas = new Float32Array(pos.count);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, (pos.getY(i) - start) / Math.max(1e-6, end - start)));
    const e = t * t * (3 - 2 * t);
    c.copy(from).lerp(to, e);
    colors.set([c.r, c.g, c.b], i * 3);
    alphas[i] = a0 + (a1 - a0) * e;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
  material.vertexColors = true;
  material.color.set('#ffffff');
  material.opacity = 1;
}

export function buildBottle(spec: BottleSpec, opts: BuildOptions = {}): BuiltBottle {
  const dims = bodyDimsOf(spec.body);
  const wall = (spec.body.wall ?? DEFAULTS.wall) * CM;
  const fonts = opts.fonts ?? DEFAULT_FONTS;
  const root = new THREE.Group();
  root.name = 'Bottle';

  // Glass body: back faces first, then front faces, for stable transparent sorting.
  const outer = buildBodyMesh(spec.body);
  const glass = glassMaterial(spec.glass, opts.doc);
  const opaque = spec.glass.finish === 'lacquered' || spec.glass.finish === 'mirror';
  if (spec.glass.gradient && !opaque) applyGradient(outer.geometry, spec.glass, dims, glass);
  const body = new THREE.Group();
  body.name = 'Body';
  if (!opaque) {
    const backMat = glass.clone();
    backMat.name = 'GlassBack';
    backMat.side = THREE.BackSide;
    applyFresnel(backMat, 0.6, 0, !!spec.glass.gradient);
    const back = new THREE.Mesh(outer.geometry, backMat);
    back.name = 'GlassBack';
    back.renderOrder = 1;
    body.add(back);
  }
  const front = new THREE.Mesh(outer.geometry, glass);
  front.name = 'GlassFront';
  front.renderOrder = opaque ? 0 : 3;
  body.add(front);
  // Silhouette bodies have no neck in their outline; add a glass neck.
  if (spec.body.kind === 'silhouette') {
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(dims.neckR, dims.neckR, dims.neckH + 0.01, 40), opaque ? glass : glass.clone());
    neck.position.set(dims.neckX, dims.h + dims.neckH / 2 - 0.005, 0);
    neck.name = 'Neck';
    neck.renderOrder = 3;
    body.add(neck);
  }
  root.add(body);

  // Liquid
  let liquid: THREE.Object3D;
  if (!opaque && spec.liquid.visible !== false && spec.liquid.fill > 0) {
    const fillY = dims.baseY + Math.min(0.985, Math.max(0.05, spec.liquid.fill)) * (dims.h - dims.baseY);
    const liq = buildBodyMesh(spec.body, { inset: wall, fillTo: fillY });
    const mesh = new THREE.Mesh(liq.geometry, liquidMaterial(spec.liquid.color));
    mesh.name = 'Liquid';
    mesh.renderOrder = 2;
    liquid = mesh;
  } else {
    liquid = new THREE.Object3D();
    liquid.name = 'Liquid';
  }
  root.add(liquid);

  // Collar
  const collar = new THREE.Group();
  collar.name = 'Collar';
  if (spec.collar.material !== 'none') {
    const mat = isMetal(spec.collar.material) ? metalMaterial(spec.collar.material, 'Collar') : hardMaterial(spec.collar.material, spec.collar.color, opts.doc);
    const shape = spec.collar.shape ?? 'ring';
    const h = (spec.collar.height ?? (shape === 'band' ? 0.3 : 0.45)) * CM;
    if (shape === 'band') {
      const ring = ringAt(outer, Math.max(dims.baseY, dims.h - h * 0.5 - 0.002));
      if (ring) collar.add(new THREE.Mesh(extrudeRing(ring, dims.h - h, dims.h + 0.001, 0.005, 0.012, false), mat));
    } else if (shape === 'sleeve') {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(dims.neckR + 0.004, dims.neckR + 0.004, dims.neckH + 0.004, 48), mat);
      m.position.set(dims.neckX, dims.h + dims.neckH / 2, 0);
      collar.add(m);
    } else {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(dims.neckR + 0.004, dims.neckR + 0.004, h, 48), mat);
      m.position.set(dims.neckX, dims.topY - h / 2 + 0.002, 0);
      collar.add(m);
    }
  }
  root.add(collar);

  // Actuator + nozzle (the mist's origin). Stoppered bottles release scent from the opening.
  const actuator = new THREE.Group();
  actuator.name = 'Actuator';
  const nozzle = new THREE.Object3D();
  nozzle.name = 'Nozzle';
  if (spec.sprayer === 'atomizer') {
    const r = Math.max(0.02, dims.neckR * 0.5);
    const stemMat = spec.collar.material !== 'none' && isMetal(spec.collar.material) ? metalMaterial(spec.collar.material, 'Stem') : hardMaterial('black', undefined, opts.doc);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.06, 32), stemMat);
    stem.position.y = 0.03;
    actuator.add(stem);
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.02, 12), new THREE.MeshStandardMaterial({ name: 'NozzleHole', color: '#111' }));
    hole.rotation.x = Math.PI / 2;
    hole.position.set(0, 0.04, r - 0.004);
    actuator.add(hole);
    nozzle.position.set(0, 0.04, r + 0.008);
  } else {
    nozzle.position.set(0, 0.01, 0);
  }
  actuator.add(nozzle);
  actuator.position.set(dims.neckX, dims.topY, 0);
  root.add(actuator);

  // Cap
  const cap = buildCap(spec.cap, { doc: opts.doc, body: spec.body, dims });
  cap.group.position.x = dims.neckX;
  root.add(cap.group);

  // Decals and ornaments
  if (opts.doc) {
    const decals = buildDecals(spec.decals ?? [], { doc: opts.doc, fonts, body: outer, plan: spec.body.kind === 'loft' ? spec.body.plan : 'silhouette', cap, wall });
    decals.body.forEach((o) => root.add(o));
    decals.cap.forEach((o) => cap.group.add(o));
  }
  const decor = buildDecor(spec.decor ?? [], { doc: opts.doc, fonts, body: outer, cap });
  decor.body.forEach((o) => root.add(o));
  decor.cap.forEach((o) => cap.group.add(o));

  // Contact shadow
  if (opts.doc) root.add(blobShadow(opts.doc, dims));

  const height = cap.baseY + cap.height;
  const width = Math.max(dims.hx, dims.hz, cap.width / 2) * 2 + 0.02;
  // Framing data travels with the GLB (exported as glTF extras) so the live view matches the poster.
  root.userData = { framingHeight: height, framingWidth: width, yaw: spec.pose?.yaw ?? 0, pitch: spec.pose?.pitch ?? 0, removal: spec.cap.removal, sprayer: spec.sprayer };

  return { root, parts: { body, liquid, cap: cap.group, collar, actuator, nozzle }, height, width, bodyHeight: dims.h, dims, cap };
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
  const m = new THREE.Mesh(new THREE.PlaneGeometry(d.hx * 3.2, Math.max(d.hz, 0.12) * 3.4), new THREE.MeshBasicMaterial({ name: 'Shadow', map: tex, transparent: true, depthWrite: false }));
  m.name = 'Shadow';
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.001;
  m.renderOrder = 0;
  return m;
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

/** Named clips: Idle, CapLift, Spray, Explode. Times in seconds. The lift depends on how the cap comes off. */
export function buildClips(b: BuiltBottle): THREE.AnimationClip[] {
  const capP = b.parts.cap.position;
  const actY = b.parts.actuator.position.y;
  const actX = b.parts.actuator.position.x;
  const q = (x: number, y: number, z: number) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z)).toArray();
  const removal = (b.root.userData.removal as string) ?? 'pull';
  const lift = b.cap.height * 0.9 + 0.08;
  let capLift: THREE.AnimationClip;
  switch (removal) {
    case 'screw':
      capLift = new THREE.AnimationClip('CapLift', 1.1, [
        new THREE.VectorKeyframeTrack('Cap.position', [0, 0.7, 1.1], [capP.x, capP.y, 0, capP.x, capP.y + lift * 0.35, 0, capP.x + 0.22, capP.y + lift, -0.04]),
        new THREE.QuaternionKeyframeTrack('Cap.quaternion', [0, 0.35, 0.7, 1.1], [...q(0, 0, 0), ...q(0, Math.PI, 0), ...q(0, Math.PI * 2, 0), ...q(-0.1, Math.PI * 2, -0.3)]),
      ]);
      break;
    case 'stopper':
      capLift = new THREE.AnimationClip('CapLift', 0.9, [
        new THREE.VectorKeyframeTrack('Cap.position', [0, 0.5, 0.9], [capP.x, capP.y, 0, capP.x, capP.y + lift * 0.8, 0, capP.x + 0.2, capP.y + lift * 1.1, -0.02]),
        new THREE.QuaternionKeyframeTrack('Cap.quaternion', [0, 0.5, 0.9], [...q(0, 0, 0), ...q(0, 0, 0.02), ...q(-0.05, 0, -0.18)]),
      ]);
      break;
    case 'fixed':
      // A lid that twists to reveal the nozzle (it never leaves the bottle).
      capLift = new THREE.AnimationClip('CapLift', 0.7, [
        new THREE.VectorKeyframeTrack('Cap.position', [0, 0.7], [capP.x, capP.y, 0, capP.x, capP.y + 0.012, 0]),
        new THREE.QuaternionKeyframeTrack('Cap.quaternion', [0, 0.7], [...q(0, 0, 0), ...q(0, Math.PI / 2, 0)]),
      ]);
      break;
    default:
      capLift = new THREE.AnimationClip('CapLift', 0.9, [
        new THREE.VectorKeyframeTrack('Cap.position', [0, 0.35, 0.9], [capP.x, capP.y, 0, capP.x, capP.y + lift * 0.5, 0, capP.x + 0.26, capP.y + lift, -0.04]),
        new THREE.QuaternionKeyframeTrack('Cap.quaternion', [0, 0.35, 0.9], [...q(0, 0, 0), ...q(0, 0, -0.04), ...q(-0.12, 0, -0.32)]),
      ]);
  }
  const spray =
    b.root.userData.sprayer === 'atomizer'
      ? new THREE.AnimationClip('Spray', 0.42, [
          new THREE.VectorKeyframeTrack('Actuator.position', [0, 0.12, 0.2, 0.42], [actX, actY, 0, actX, actY - 0.028, 0, actX, actY - 0.028, 0, actX, actY, 0]),
        ])
      : new THREE.AnimationClip('Spray', 0.42, [new THREE.VectorKeyframeTrack('Actuator.position', [0, 0.42], [actX, actY, 0, actX, actY, 0])]);
  const colY = b.parts.collar.position.y;
  const explode = new THREE.AnimationClip('Explode', 1.2, [
    new THREE.VectorKeyframeTrack('Cap.position', [0, 1.2], [capP.x, capP.y, 0, capP.x, capP.y + 0.55, 0]),
    new THREE.VectorKeyframeTrack('Actuator.position', [0, 1.2], [actX, actY, 0, actX, actY + 0.36, 0]),
    new THREE.VectorKeyframeTrack('Collar.position', [0, 1.2], [0, colY, 0, 0, colY + 0.2, 0]),
    new THREE.VectorKeyframeTrack('Liquid.position', [0, 1.2], [0, 0, 0, 0, 0.04, 0]),
  ]);
  const idle = new THREE.AnimationClip('Idle', 1, [new THREE.VectorKeyframeTrack('Cap.position', [0, 1], [capP.x, capP.y, 0, capP.x, capP.y, 0])]);
  return [idle, capLift, spray, explode];
}
