/**
 * Three-dimensional ornaments: bows, neck rings, metal bands, emblems, rubber treads, cords,
 * flower clusters, pull pins. Each is small and deliberately simple; the silhouette is what
 * makes a bottle recognisable, not the thread count of its ribbon.
 */
import * as THREE from 'three';
import type { BuiltCap } from './caps';
import { hardMaterial, metalMaterial } from './materials';
import { extrudeRing, ringAt, type BodyMesh } from './shapes';
import { CM, type Decor } from './spec';

export interface DecorContext {
  doc?: Document;
  fonts?: { sans: string; serif: string };
  body: BodyMesh;
  cap: BuiltCap | null;
}

function frontZAt(body: BodyMesh, y: number): number {
  const ring = ringAt(body, y);
  if (!ring) return body.dims.hz;
  return ring.reduce((m, p) => Math.max(m, Math.abs(p.x) < body.dims.hx * 0.25 ? p.z : -Infinity), -Infinity);
}

export function buildDecor(items: Decor[], ctx: DecorContext): { body: THREE.Object3D[]; cap: THREE.Object3D[] } {
  const out = { body: [] as THREE.Object3D[], cap: [] as THREE.Object3D[] };
  const { dims } = ctx.body;
  for (const it of items) {
    switch (it.kind) {
      case 'band':
      case 'rings':
      case 'tread': {
        const count = it.kind === 'rings' ? it.count : 1;
        const h = it.kind === 'rings' ? (it.thickness ?? 0.25) * CM : it.height * CM;
        const gap = it.kind === 'rings' ? (it.spacing ?? 0.12) * CM : 0;
        const outset = it.kind === 'tread' ? 0.03 : it.kind === 'rings' ? (it.thickness ?? 0.25) * CM * 0.5 : 0.006 - (it.inset ?? 0) * CM;
        const mat =
          it.kind === 'tread' ? hardMaterial('rubber', it.color, ctx.doc) : it.material === 'black' || it.material === 'white' || it.material === 'rubber' ? hardMaterial(it.material, undefined, ctx.doc) : metalMaterial(it.material, 'Band');
        const yc = it.y * dims.topY;
        for (let i = 0; i < count; i++) {
          const y0 = yc - ((count - 1) * (h + gap)) / 2 + i * (h + gap) - h / 2;
          const ring = ringAt(ctx.body, Math.min(dims.topY - 1e-4, Math.max(1e-4, y0 + h / 2)));
          if (!ring) continue;
          const mesh = new THREE.Mesh(extrudeRing(ring, y0, y0 + h, outset, outset + 0.004, it.kind !== 'tread'), mat);
          mesh.name = `Decor:${it.kind}`;
          out.body.push(mesh);
          if (it.kind === 'tread') {
            const grooves = it.grooves ?? 4;
            for (let g = 0; g < grooves; g++) {
              const gy = y0 + (h * (g + 0.5)) / grooves;
              const groove = new THREE.Mesh(extrudeRing(ring, gy - 0.002, gy + 0.002, outset + 0.001, 0.006, false), new THREE.MeshStandardMaterial({ color: '#0a0a0a', roughness: 1 }));
              out.body.push(groove);
            }
          }
        }
        break;
      }
      case 'bow': {
        const width = (it.width ?? 2.2) * CM;
        const mat = hardMaterial('satin', it.color, ctx.doc);
        (mat as THREE.MeshPhysicalMaterial).roughness = it.material === 'grosgrain' ? 0.7 : 0.4;
        const g = new THREE.Group();
        g.name = 'Decor:bow';
        const loopR = width * 0.2;
        const tube = width * 0.055;
        for (const side of [-1, 1]) {
          const loop = new THREE.Mesh(new THREE.TorusGeometry(loopR, tube, 10, 36), mat);
          loop.scale.set(1.25, 0.72, 0.5);
          loop.position.x = side * loopR * 1.15;
          loop.rotation.y = side * 0.25;
          g.add(loop);
          const tail = new THREE.Mesh(new THREE.BoxGeometry(tube * 2.2, width * 0.5, tube * 0.8), mat);
          tail.position.set(side * width * 0.1, -width * 0.26, 0);
          tail.rotation.z = side * 0.28;
          g.add(tail);
        }
        const knot = new THREE.Mesh(new THREE.BoxGeometry(tube * 2.4, tube * 2.1, tube * 1.6), mat);
        g.add(knot);
        const y = it.y * dims.topY;
        g.position.set(0, y, frontZAt(ctx.body, Math.min(y, dims.h - 1e-3)) + tube * 0.9);
        out.body.push(g);
        break;
      }
      case 'emblem': {
        const size = it.size * CM;
        let shape: THREE.Shape;
        if (it.shape === 'disc') {
          shape = new THREE.Shape();
          shape.absarc(0, 0, size / 2, 0, Math.PI * 2, false);
        } else if (it.shape === 'oval') {
          shape = new THREE.Shape();
          shape.absellipse(0, 0, size / 2, size * 0.35, 0, Math.PI * 2, false, 0);
        } else if (it.shape === 'shield') {
          shape = new THREE.Shape();
          const s = size / 2;
          shape.moveTo(-s, s * 0.9);
          shape.lineTo(s, s * 0.9);
          shape.lineTo(s, -s * 0.1);
          shape.quadraticCurveTo(s, -s * 0.8, 0, -s * 1.05);
          shape.quadraticCurveTo(-s, -s * 0.8, -s, -s * 0.1);
          shape.closePath();
        } else {
          shape = new THREE.Shape();
          const s = size / 2;
          shape.moveTo(-s, -s);
          shape.lineTo(s, -s);
          shape.lineTo(s, s);
          shape.lineTo(-s, s);
          shape.closePath();
        }
        const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.001, bevelSegments: 2, curveSegments: 32 });
        const mat = it.material === 'black' || it.material === 'white' ? hardMaterial(it.material, it.color, ctx.doc) : metalMaterial(it.material, 'Emblem');
        const mesh = new THREE.Mesh(geo, mat);
        mesh.name = 'Decor:emblem';
        if (it.face === 'cap-top' && ctx.cap) {
          mesh.rotation.x = -Math.PI / 2;
          mesh.position.y = ctx.cap.topY + 0.0005;
          out.cap.push(mesh);
        } else {
          const y = it.y * dims.h;
          mesh.position.set(0, y, frontZAt(ctx.body, y) + 0.0005);
          out.body.push(mesh);
        }
        if (it.text && ctx.doc) {
          const c = ctx.doc.createElement('canvas');
          c.width = c.height = 256;
          const c2 = c.getContext('2d')!;
          c2.fillStyle = it.color ?? (it.material === 'gold' ? '#5a4420' : '#2a2a2a');
          c2.textAlign = 'center';
          c2.textBaseline = 'middle';
          c2.font = `600 ${it.text.length > 2 ? 54 : 120}px ${ctx.fonts?.sans ?? 'sans-serif'}`;
          c2.fillText(it.text, 128, 132, 220);
          const tex = new THREE.CanvasTexture(c);
          tex.colorSpace = THREE.SRGBColorSpace;
          const label = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.9, size * 0.9), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }));
          label.renderOrder = 6;
          label.position.copy(mesh.position);
          label.rotation.copy(mesh.rotation);
          if (it.face === 'cap-top' && ctx.cap) {
            label.position.y += 0.0045;
            out.cap.push(label);
          } else {
            label.position.z += 0.0045;
            out.body.push(label);
          }
        }
        break;
      }
      case 'cord': {
        const turns = it.turns ?? 2;
        const y = it.y * dims.topY;
        const ring = ringAt(ctx.body, y);
        const r = ring ? ring.reduce((m, p) => Math.max(m, Math.hypot(p.x, p.z)), 0) : dims.neckR;
        for (let i = 0; i < turns; i++) {
          const t = new THREE.Mesh(new THREE.TorusGeometry(r + 0.004, 0.0035, 8, 64), hardMaterial('satin', it.color, ctx.doc));
          t.rotation.x = Math.PI / 2;
          t.position.y = y + (i - (turns - 1) / 2) * 0.008;
          t.name = 'Decor:cord';
          out.body.push(t);
        }
        break;
      }
      case 'flowers': {
        if (!ctx.cap) break;
        const petalMat = hardMaterial('white', it.color, ctx.doc);
        const centerMat = hardMaterial('lacquer', it.centerColor, ctx.doc);
        const size = it.size * CM;
        let seed = 3;
        const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
        const R = ctx.cap.width / 2;
        for (let i = 0; i < it.count; i++) {
          const f = new THREE.Group();
          const a = (i / it.count) * Math.PI * 2 + rnd() * 0.6;
          const rr = i === 0 ? 0 : R * (0.35 + rnd() * 0.45);
          f.position.set(Math.cos(a) * rr, ctx.cap.topY + size * 0.35, Math.sin(a) * rr);
          f.rotation.set((rnd() - 0.5) * 0.6, rnd() * Math.PI, (rnd() - 0.5) * 0.6);
          const petals = 5 + (i % 2);
          for (let p = 0; p < petals; p++) {
            const petal = new THREE.Mesh(new THREE.SphereGeometry(size * 0.3, 16, 12), petalMat);
            petal.scale.set(1, 0.42, 1.7);
            const pa = (p / petals) * Math.PI * 2;
            petal.position.set(Math.cos(pa) * size * 0.42, 0, Math.sin(pa) * size * 0.42);
            petal.rotation.y = -pa + Math.PI / 2;
            f.add(petal);
          }
          const center = new THREE.Mesh(new THREE.SphereGeometry(size * 0.22, 16, 12), centerMat);
          center.scale.y = 0.7;
          center.position.y = size * 0.08;
          f.add(center);
          f.name = 'Decor:flower';
          out.cap.push(f);
        }
        break;
      }
      case 'pin': {
        if (!ctx.cap) break;
        const size = it.size * CM;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(size * 0.5, size * 0.07, 12, 40), metalMaterial(it.material, 'Pin'));
        ring.position.set(ctx.cap.width / 2 + size * 0.45, it.y * ctx.cap.height, 0);
        ring.rotation.y = Math.PI / 2;
        ring.name = 'Decor:pin';
        out.cap.push(ring);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.06, size * 0.06, size * 0.5, 12), metalMaterial(it.material, 'Pin'));
        stem.rotation.z = Math.PI / 2;
        stem.position.set(ctx.cap.width / 2 - size * 0.1, it.y * ctx.cap.height, 0);
        out.cap.push(stem);
        break;
      }
    }
  }
  return out;
}
