/**
 * Caps and stoppers. Most caps are small loft bodies (the same generator as the glass), which
 * keeps block caps matching the bottle's plan and gives fluted or faceted caps for free.
 */
import * as THREE from 'three';
import { hardMaterial, metalMaterial, surfaceTexture } from './materials';
import { buildBodyMesh, buildLoft, extrudeRing, type BodyDims } from './shapes';
import { CM, type Body, type Cap, type LoftBody, type SilhouetteBody } from './spec';

export interface BuiltCap {
  /** Origin at the cap's base, on the bottle axis. */
  group: THREE.Group;
  height: number; // world
  width: number; // world, widest
  depth: number;
  /** y of the group's origin in bottle space */
  baseY: number;
  /** y of the top surface, relative to the group origin */
  topY: number;
  kind: Cap['kind'];
}

export interface CapContext {
  doc?: Document;
  body: Body;
  dims: BodyDims;
}

function planFor(cap: Cap, body: Body): Pick<LoftBody, 'plan' | 'cornerRadius' | 'chamfer' | 'sides' | 'planPoints'> {
  if (cap.plan === 'follow-body' && body.kind === 'loft') {
    return { plan: body.plan, cornerRadius: cap.cornerRadius ?? body.cornerRadius, chamfer: body.chamfer, sides: body.sides, planPoints: body.planPoints };
  }
  if (cap.plan === 'rect' || (cap.plan === undefined && (cap.kind === 'block' || cap.kind === 'lid'))) return { plan: 'rect', cornerRadius: cap.cornerRadius ?? 0.14 };
  return { plan: 'round' };
}

export function buildCap(cap: Cap, ctx: CapContext): BuiltCap {
  const { dims, body, doc } = ctx;
  const w = cap.width * CM;
  const d = (cap.depth ?? cap.width) * CM;
  const h = cap.height * CM;
  const group = new THREE.Group();
  group.name = 'Cap';
  const material = hardMaterial(cap.material, cap.color, doc, cap.texture);
  const stopper = cap.kind.startsWith('stopper');

  // Where the cap sits.
  let baseY: number;
  if (stopper) baseY = dims.topY;
  else if (cap.kind === 'lid') baseY = dims.h;
  else if (cap.overlap !== undefined) baseY = dims.topY - cap.overlap * CM;
  else baseY = dims.h + 0.004;

  let topY = h;
  let mesh: THREE.Mesh | null = null;
  const plan = planFor(cap, body);
  const cm = (v: number) => v / CM; // world -> cm for loft bodies

  switch (cap.kind) {
    case 'cylinder':
    case 'block':
    case 'lid':
    case 'disc':
    case 'ring-pull':
    case 'flower': {
      const loft: LoftBody = {
        kind: 'loft',
        width: cm(w),
        depth: cm(cap.kind === 'cylinder' || cap.kind === 'disc' || cap.kind === 'ring-pull' || cap.kind === 'flower' ? w : d),
        height: cm(h),
        ...plan,
        profile: 'straight',
        shoulder: 'square',
        shoulderSize: 0.03,
        edgeRadius: cap.kind === 'disc' ? Math.min(cap.height * 0.45, 0.25) : Math.min(0.1, cap.height * 0.2),
        baseRadius: Math.min(0.06, cap.height * 0.12),
        neck: { radius: 0.02, height: 0 },
        neckShape: plan.plan === 'round' ? 'round' : 'plan',
        ribs: cap.flutes ? { count: cap.flutes.count, depth: cap.flutes.depth, orientation: 'vertical', profile: 'round' } : undefined,
      };
      mesh = new THREE.Mesh(buildLoft(loft, { noNeck: true }).geometry, material);
      break;
    }
    case 'dome': {
      const loft: LoftBody = { kind: 'loft', width: cm(w), depth: cm(w), height: cm(h), plan: 'round', profile: 'straight', shoulder: 'dome', shoulderSize: 0.62, baseRadius: 0.04, neck: { radius: 0.03, height: 0 } };
      mesh = new THREE.Mesh(buildLoft(loft, { noNeck: true }).geometry, material);
      break;
    }
    case 'cone': {
      const loft: LoftBody = { kind: 'loft', width: cm(w), depth: cm(w), height: cm(h), plan: 'round', profile: 'tapered', profileAmount: 1, shoulder: 'round', shoulderSize: 0.2, baseRadius: 0.04, neck: { radius: 0.03, height: 0 } };
      mesh = new THREE.Mesh(buildLoft(loft, { noNeck: true }).geometry, material);
      break;
    }
    case 'crown': {
      const loft: LoftBody = { kind: 'loft', width: cm(w), depth: cm(w), height: cm(h), plan: 'polygon', sides: cap.facets ?? 8, profile: 'flared', profileAmount: 0.6, shoulder: 'flat', shoulderSize: 0.03, edgeRadius: 0.03, neck: { radius: 0.03, height: 0 }, neckShape: 'plan', flat: true };
      mesh = new THREE.Mesh(buildLoft(loft, { noNeck: true }).geometry, material);
      break;
    }
    case 'sphere':
    case 'stopper-ball': {
      const r = w / 2;
      const g = new THREE.SphereGeometry(r, 48, 32);
      g.translate(0, r * 0.94, 0);
      mesh = new THREE.Mesh(g, material);
      topY = r * 1.94;
      break;
    }
    case 'stopper-faceted': {
      // Emerald cut: an octagon that widens from the neck, then bevels to a smaller flat top.
      const loft: LoftBody = {
        kind: 'loft',
        width: cm(w),
        depth: cm(d),
        height: cm(h),
        plan: 'polygon',
        sides: cap.facets ?? 8,
        profile: 'custom',
        profilePoints: [
          [0, 0.62],
          [0.3, 1],
          [1, 1],
        ],
        shoulder: 'sloped',
        shoulderSize: 0.3,
        neck: { radius: cm(Math.min(w, d)) * 0.3, height: 0 },
        neckShape: 'plan',
        baseRadius: 0.01,
        flat: true,
      };
      mesh = new THREE.Mesh(buildLoft(loft, { noNeck: true }).geometry, material);
      break;
    }
    case 'stopper-crystal': {
      const loft: LoftBody = { kind: 'loft', width: cm(w), depth: cm(d), height: cm(h), plan: 'rect', cornerRadius: cap.cornerRadius ?? 0.5, profile: 'flared', profileAmount: 0.25, shoulder: 'dome', shoulderSize: 0.45, edgeRadius: 0.15, baseRadius: 0.05, neck: { radius: 0.05, height: 0 } };
      mesh = new THREE.Mesh(buildLoft(loft, { noNeck: true }).geometry, material);
      break;
    }
    case 'stopper-fan': {
      // A fan: narrow stem opening into a half-disc with scalloped edge.
      const pts: Array<[number, number]> = [[0.42, 0], [0.58, 0], [0.6, 0.22]];
      const n = 11;
      for (let i = 0; i <= n; i++) {
        const a = Math.PI * (i / n);
        const r = 0.5 + (i % 2 ? 0.0 : -0.03);
        pts.push([0.5 + Math.cos(-a) * r, 0.22 + Math.sin(a) * (0.78 * (r / 0.5))]);
      }
      pts.push([0.4, 0.22]);
      const sil: SilhouetteBody = { kind: 'silhouette', width: cm(w), height: cm(h), depth: cm(d), points: pts, smooth: true, edgeRadius: Math.min(0.12, cap.depth ? cap.depth * 0.3 : 0.12), sideTaper: 0.5 };
      mesh = new THREE.Mesh(buildBodyMesh(sil).geometry, material);
      break;
    }
  }
  if (mesh) {
    mesh.name = 'CapMesh';
    if (stopper || cap.material.startsWith('glass')) {
      mesh.material = material;
      (mesh.material as THREE.Material).transparent = true;
      mesh.renderOrder = 4;
    }
    group.add(mesh);
  }

  // Hidden plug for stoppers.
  if (stopper) {
    const plug = new THREE.Mesh(new THREE.CylinderGeometry(dims.neckR * 0.85, dims.neckR * 0.8, dims.neckH * 0.9, 32), material);
    plug.position.y = -dims.neckH * 0.45;
    plug.name = 'Plug';
    group.add(plug);
  }

  // Ring pull: a metal ring standing on the cap.
  if (cap.kind === 'ring-pull') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(w * 0.26, w * 0.035, 16, 48), metalMaterial('silver'));
    ring.position.set(0, h + w * 0.26 - w * 0.03, 0);
    ring.name = 'RingPull';
    group.add(ring);
    topY = h + w * 0.52;
  }

  // Band at the base of the cap.
  if (cap.band) {
    const bh = cap.band.height * CM;
    const outlineLoft: LoftBody = { kind: 'loft', width: cm(w) * 1.02, depth: cm(d) * 1.02, height: 1, ...plan, profile: 'straight', shoulder: 'flat', neck: { radius: 0.02, height: 0 } };
    const ringPts = buildLoft(outlineLoft, { noNeck: true }).rings[2]?.pts ?? [];
    if (ringPts.length) {
      const band = new THREE.Mesh(extrudeRing(ringPts, 0.0005, bh, 0.003, 0.01, false), hardMaterial(cap.band.material, undefined, doc));
      band.name = 'CapBand';
      group.add(band);
    }
  }

  // Top plate.
  if (cap.topPlate) {
    const ph = 0.006;
    const loft: LoftBody = { kind: 'loft', width: cm(w) * 0.96, depth: cm(d) * 0.96, height: cm(ph), ...plan, profile: 'straight', shoulder: 'flat', shoulderSize: 0.1, edgeRadius: 0.005, baseRadius: 0.004, neck: { radius: 0.02, height: 0 }, neckShape: 'plan' };
    const plate = new THREE.Mesh(buildLoft(loft, { noNeck: true }).geometry, metalMaterial(cap.topPlate.material, 'CapPlate'));
    (plate.material as THREE.MeshStandardMaterial).roughness = 0.3;
    if (doc) {
      const t = surfaceTexture(doc, 'flutes-fine');
      (plate.material as THREE.MeshStandardMaterial).bumpMap = t.bump;
      (plate.material as THREE.MeshStandardMaterial).bumpScale = 0.0015;
    }
    plate.position.y = h - 0.002;
    plate.name = 'CapPlate';
    group.add(plate);
    topY = h + ph;
  }

  group.position.y = baseY;
  group.userData.capTop = topY;
  return { group, height: topY, width: Math.max(w, d), depth: d, baseY, topY, kind: cap.kind };
}
