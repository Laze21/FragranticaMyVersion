/**
 * Browser-side half of the bottle pipeline. Bundled by scripts/bottles/render.ts with esbuild
 * and executed in headless Chromium (WebGL via SwiftShader).
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { buildBottle, buildClips, cameraFor } from '../../src/lib/bottle/build';
import { setupLights } from '../../src/lib/bottle/stage';
import type { BottleSpec } from '../../src/seed/types';

const FONTS = { sans: 'Archivo', serif: 'Newsreader' };

async function ready() {
  await document.fonts.ready;
  await Promise.all([document.fonts.load('600 34px Archivo'), document.fonts.load('italic 400 60px Newsreader')]);
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

async function renderPoster(spec: BottleSpec, brand: string, name: string, w: number, h: number): Promise<string> {
  await ready();
  const renderer = makeRenderer(w, h);
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  setupLights(scene);
  const built = buildBottle(spec, { brand, name, doc: document, fonts: FONTS });
  built.root.rotation.y = -0.38;
  scene.add(built.root);
  const cam = cameraFor(built, w / h);
  renderer.render(scene, cam);
  const url = renderer.domElement.toDataURL('image/png');
  renderer.dispose();
  pmrem.dispose();
  renderer.domElement.remove();
  return url;
}

async function exportGlb(spec: BottleSpec, brand: string, name: string): Promise<string> {
  await ready();
  const built = buildBottle(spec, { brand, name, doc: document, fonts: FONTS });
  const clips = buildClips(built);
  const scene = new THREE.Scene();
  scene.add(built.root);
  const result = (await new GLTFExporter().parseAsync(scene, { binary: true, animations: clips, maxTextureSize: 512 })) as ArrayBuffer;
  let bin = '';
  const bytes = new Uint8Array(result);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

Object.assign(window, { renderPoster, exportGlb });
