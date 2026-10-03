/**
 * Browser-side half of the bottle pipeline. Bundled by scripts/bottles/render.ts with esbuild
 * and executed in headless Chromium (WebGL via SwiftShader).
 *
 * renderPoster  one composite image (cards, share images)
 * renderLayers  the same frame split into shadow / body / cap, plus where the nozzle and the cap
 *               sit in the frame, so the 2D stage can lift the cap and spray from the right spot
 * exportGlb     a baked model with animation clips, for the optional live 3D view
 */
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { buildBottle, buildClips, cameraFor, FRAMING, type BuiltBottle } from '../../src/lib/bottle/build';
import { setupLights, studioEnvironment } from '../../src/lib/bottle/stage';
import type { BottleSpec } from '../../src/seed/types';

const FONTS = { sans: 'Archivo', serif: 'Newsreader' };

async function ready() {
  await document.fonts.ready;
  await Promise.all([
    document.fonts.load('300 34px Archivo'),
    document.fonts.load('600 34px Archivo'),
    document.fonts.load('italic 400 60px Newsreader'),
    document.fonts.load('400 60px Newsreader'),
  ]);
}

function makeRenderer(w: number, h: number) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  return renderer;
}

interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  pmrem: THREE.PMREMGenerator;
  built: BuiltBottle;
  camera: THREE.PerspectiveCamera;
  dispose: () => void;
}

async function stage(spec: BottleSpec, w: number, h: number): Promise<Stage> {
  await ready();
  const renderer = makeRenderer(w, h);
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(studioEnvironment(), 0, 0.1, 100, { size: 512 }).texture;
  setupLights(scene);
  const built = buildBottle(spec, { doc: document, fonts: FONTS });
  built.root.rotation.y = FRAMING.yaw + (spec.pose?.yaw ?? 0);
  scene.add(built.root);
  const camera = cameraFor(built, w / h);
  return {
    renderer,
    scene,
    pmrem,
    built,
    camera,
    dispose: () => {
      renderer.dispose();
      pmrem.dispose();
      renderer.domElement.remove();
    },
  };
}

async function renderPoster(spec: BottleSpec, _brand: string, _name: string, w: number, h: number): Promise<string> {
  const s = await stage(spec, w, h);
  s.renderer.render(s.scene, s.camera);
  const url = s.renderer.domElement.toDataURL('image/png');
  s.dispose();
  return url;
}

/** Fraction of the frame (0,0 top-left) for a world point. */
function toFrame(p: THREE.Vector3, camera: THREE.Camera): { x: number; y: number } {
  const v = p.clone().project(camera);
  return { x: (v.x + 1) / 2, y: (1 - v.y) / 2 };
}

export interface Layers {
  shadow: string;
  body: string;
  cap: string;
  nozzle: { x: number; y: number };
  cap_box: { x: number; y: number; w: number; h: number };
}

async function renderLayers(spec: BottleSpec, w: number, h: number): Promise<Layers> {
  const s = await stage(spec, w, h);
  const { built, renderer, scene, camera } = s;
  const capGroup = built.parts.cap;
  const shadow = built.root.getObjectByName('Shadow');
  const inCap = new Set<THREE.Object3D>();
  capGroup.traverse((o) => inCap.add(o));

  const show = (which: 'shadow' | 'body' | 'cap') => {
    built.root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh && !(o as THREE.Points).isPoints) return;
      const isShadow = o === shadow;
      const isCap = inCap.has(o);
      o.visible = which === 'shadow' ? isShadow : which === 'cap' ? isCap : !isShadow && !isCap;
    });
  };
  const snap = () => {
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL('image/png');
  };
  show('shadow');
  const shadowUrl = snap();
  show('body');
  const bodyUrl = snap();
  show('cap');
  const capUrl = snap();

  built.root.updateWorldMatrix(true, true);
  const nozzleWorld = new THREE.Vector3();
  built.parts.nozzle.getWorldPosition(nozzleWorld);
  const nozzle = toFrame(nozzleWorld, camera);
  const box = new THREE.Box3().setFromObject(capGroup);
  const corners = [
    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
    new THREE.Vector3(box.max.x, box.min.y, box.min.z),
    new THREE.Vector3(box.min.x, box.max.y, box.min.z),
    new THREE.Vector3(box.max.x, box.max.y, box.min.z),
    new THREE.Vector3(box.min.x, box.min.y, box.max.z),
    new THREE.Vector3(box.max.x, box.min.y, box.max.z),
    new THREE.Vector3(box.min.x, box.max.y, box.max.z),
    new THREE.Vector3(box.max.x, box.max.y, box.max.z),
  ].map((c) => toFrame(c, camera));
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const cap_box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  s.dispose();
  return { shadow: shadowUrl, body: bodyUrl, cap: capUrl, nozzle, cap_box };
}

async function exportGlb(spec: BottleSpec, _brand?: string, _name?: string): Promise<string> {
  await ready();
  const built = buildBottle(spec, { doc: document, fonts: FONTS });
  const clips = buildClips(built);
  const scene = new THREE.Scene();
  scene.add(built.root);
  const result = (await new GLTFExporter().parseAsync(scene, { binary: true, animations: clips, maxTextureSize: 512 })) as ArrayBuffer;
  let bin = '';
  const bytes = new Uint8Array(result);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

Object.assign(window, { renderPoster, renderLayers, exportGlb });
