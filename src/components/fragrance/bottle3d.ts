/**
 * Live 3D bottle. Loaded with dynamic import() only on the fragrance page, only for fragrances
 * that have a model, only on capable devices, and only after the page is idle. Three.js never
 * reaches any other page's bundle.
 *
 * Rendering is on-demand (no idle render loop): frames are drawn while the user drags, while
 * an animation plays, or while the bottle eases back to rest. Battery matters.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { applyFresnel, cameraFor, FRAMING } from '@/lib/bottle/build';
import { setupLights, studioEnvironment } from '@/lib/bottle/stage';

export interface ViewerController {
  explore(): Promise<{ x: number; y: number } | null>;
  /** Turn by a number of degrees through the same spring a drag settles with. */
  turn(deg: number): void;
  /** Back to the framed pose the poster shows. */
  home(): void;
  /** The canvas, for focus handling in the stage. */
  canvas: HTMLCanvasElement;
  dispose(): void;
}

export interface ViewerOptions {
  modelUrl: string;
  /** For the canvas's accessible name: "{name} bottle, turnable". */
  name: string;
  animations: { spray: string | null; open: string | null };
  onReady: () => void;
  onError: (e: unknown) => void;
  /** The first real drag: the stage fades its "Drag to turn" hint. */
  onDrag?: () => void;
  /** Keyboard focus on the canvas: the stage reads "Arrow keys turn it". */
  onFocus?: (focused: boolean) => void;
  /** Enter or Space on the canvas plays the explore gesture; the stage owns the gesture. */
  onExplore?: () => void;
}

const REST_YAW = FRAMING.yaw;

export async function mountViewer(container: HTMLElement, opts: ViewerOptions): Promise<ViewerController> {
  const width = () => container.clientWidth;
  const height = () => container.clientHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width(), height());
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  // A focusable region: the keyboard turns it the way a drag does, so nobody loses the object.
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', `${opts.name} bottle, turnable`);
  renderer.domElement.tabIndex = 0;
  renderer.domElement.style.touchAction = 'pan-y';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(studioEnvironment(), 0, 0.1, 100).texture;
  setupLights(scene);

  let gltf;
  try {
    gltf = await new GLTFLoader().loadAsync(opts.modelUrl);
  } catch (e) {
    renderer.dispose();
    renderer.domElement.remove();
    opts.onError(e);
    throw e;
  }
  const root = gltf.scene.getObjectByName('Bottle') ?? gltf.scene;
  // Restore what glTF can't carry: back-face glass, draw order, fresnel shading.
  const ORDER: Record<string, number> = { Shadow: 0, GlassBack: 1, Liquid: 2, GlassFront: 3, Label: 5 };
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = mesh.material as THREE.MeshPhysicalMaterial;
    if (mesh.name in ORDER) mesh.renderOrder = ORDER[mesh.name];
    if (mat.name === 'GlassBack') {
      mat.side = THREE.BackSide;
      mat.depthWrite = false;
      applyFresnel(mat, 0.6);
    } else if (mat.name === 'Glass') {
      mat.depthWrite = false;
      applyFresnel(mat, mat.roughness > 0.3 ? 0.8 : 0.9, mat.roughness > 0.3 ? 0.05 : 0.35);
    } else if (mat.name === 'Liquid') {
      mat.depthWrite = false;
      // Pale juices are drawn unlit (see liquidMaterial); glTF can't carry that flag.
      if (mat.emissive && mat.emissive.getHex() !== 0) mat.toneMapped = false;
      const [edgeAlpha, edgeDarken] = (mat.userData.fresnel as [number, number] | undefined) ?? [0.96, 0.42];
      applyFresnel(mat, edgeAlpha, edgeDarken);
    } else if (mat.name === 'Label' || mat.name === 'Shadow') {
      mat.depthWrite = false;
    }
  });
  const pivot = new THREE.Group();
  pivot.add(root);
  scene.add(pivot);
  pivot.rotation.y = REST_YAW;

  const framing = {
    height: Number(root.userData.framingHeight) || new THREE.Box3().setFromObject(root).max.y,
    width: Number(root.userData.framingWidth) || 0.6,
  };
  let camera = cameraFor(framing, width() / height());

  const mixer = new THREE.AnimationMixer(root);
  const clip = (name: string | null) => (name ? gltf.animations.find((a) => a.name === name) ?? null : null);
  const nozzle = root.getObjectByName('Nozzle');
  const capNode = root.getObjectByName('Cap');

  // --- mist inside the canvas (the DOM overlay takes over once it leaves the bottle) ---
  const MIST = 90;
  const mistGeo = new THREE.BufferGeometry();
  const mistPos = new Float32Array(MIST * 3);
  const mistVel = new Float32Array(MIST * 3);
  mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
  const mistMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.012, transparent: true, opacity: 0, depthWrite: false });
  const mist = new THREE.Points(mistGeo, mistMat);
  mist.frustumCulled = false;
  root.add(mist);
  let mistAge = -1;

  // --- render scheduling ---
  let raf = 0;
  let last = performance.now();
  let activeUntil = 0;
  let yawVel = 0;
  let dragging = false;
  let dragged = false;
  let lastInteraction = performance.now();
  // Where a keyboard step or "home" is heading; null while the yaw is free (drag inertia, drift).
  let yawTarget: number | null = null;
  const targetEnv = { y: 0 };
  scene.environmentRotation.y = 0;
  // Smallest signed turn from the current yaw to a goal.
  const toward = (goal: number) => Math.atan2(Math.sin(goal - pivot.rotation.y), Math.cos(goal - pivot.rotation.y));

  const kick = (ms = 400) => {
    activeUntil = Math.max(activeUntil, performance.now() + ms);
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    mixer.update(dt);
    if (!dragging) {
      if (yawTarget !== null) {
        // A keyboard step or "home": the same spring a flick settles with, aimed at a pose.
        const diff = toward(yawTarget);
        pivot.rotation.y += diff * 0.14;
        if (Math.abs(diff) < 0.0015) {
          pivot.rotation.y = yawTarget;
          yawTarget = null;
        } else activeUntil = Math.max(activeUntil, now + 100);
      } else {
        pivot.rotation.y += yawVel;
        yawVel *= 0.92;
        // After a pause, drift back to the resting angle the poster shows, over about 1.6s.
        if (now - lastInteraction > 3500 && Math.abs(yawVel) < 0.0005) {
          const diff = toward(REST_YAW);
          pivot.rotation.y += diff * 0.035;
          if (Math.abs(diff) > 0.002) activeUntil = Math.max(activeUntil, now + 100);
        }
      }
    }
    // The pitch spring only runs while the pointer is up; a drag owns the pitch.
    if (!dragging) pivot.rotation.x += (0 - pivot.rotation.x) * 0.12;
    scene.environmentRotation.y += (targetEnv.y - scene.environmentRotation.y) * 0.1;
    if (mistAge >= 0) {
      mistAge += dt;
      for (let i = 0; i < MIST; i++) {
        mistPos[i * 3] += mistVel[i * 3] * dt;
        mistPos[i * 3 + 1] += mistVel[i * 3 + 1] * dt;
        mistPos[i * 3 + 2] += mistVel[i * 3 + 2] * dt;
        mistVel[i * 3 + 1] += 0.09 * dt; // volatile: it rises
      }
      mistGeo.attributes.position.needsUpdate = true;
      mistMat.opacity = Math.max(0, 0.75 - mistAge * 0.65);
      if (mistAge > 1.2) mistAge = -1;
    }
    renderer.render(scene, camera);
    if (now < activeUntil || dragging || Math.abs(yawVel) > 0.0004) raf = requestAnimationFrame(frame);
    else raf = 0;
  }

  // --- input ---
  let lastX = 0;
  let lastY = 0;
  const el = renderer.domElement;
  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'touch' && e.isPrimary === false) return;
    dragging = true;
    yawTarget = null;
    lastX = e.clientX;
    lastY = e.clientY;
    el.setPointerCapture(e.pointerId);
    lastInteraction = performance.now();
    kick();
  };
  const onMove = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    targetEnv.y = ((e.clientX - r.left) / r.width - 0.5) * 0.5; // reflections follow the pointer, gently
    if (dragging) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      yawVel = dx * 0.0085;
      pivot.rotation.y += yawVel;
      pivot.rotation.x = THREE.MathUtils.clamp(pivot.rotation.x + dy * 0.002, -0.12, 0.12);
      lastInteraction = performance.now();
      if (!dragged && Math.abs(dx) + Math.abs(dy) > 2) {
        dragged = true;
        opts.onDrag?.();
      }
    }
    kick(250);
  };
  const onUp = () => {
    dragging = false;
    lastInteraction = performance.now();
    kick(4500);
  };
  const turn = (deg: number) => {
    yawVel = 0;
    const from = yawTarget ?? pivot.rotation.y;
    yawTarget = from + (deg * Math.PI) / 180;
    lastInteraction = performance.now();
    kick(900);
  };
  const home = () => {
    yawVel = 0;
    yawTarget = REST_YAW;
    lastInteraction = performance.now();
    kick(900);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') turn(-15);
    else if (e.key === 'ArrowRight') turn(15);
    else if (e.key === 'Home') home();
    else if (e.key === 'Enter' || e.key === ' ') opts.onExplore?.();
    else return;
    e.preventDefault();
  };
  const onFocus = () => opts.onFocus?.(true);
  const onBlur = () => opts.onFocus?.(false);
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  el.addEventListener('keydown', onKey);
  el.addEventListener('focus', onFocus);
  el.addEventListener('blur', onBlur);

  const ro = new ResizeObserver(() => {
    renderer.setSize(width(), height());
    camera = cameraFor(framing, width() / height());
    kick(50);
  });
  ro.observe(container);

  renderer.render(scene, camera);
  opts.onReady();

  const play = (name: string | null, timeScale = 1) =>
    new Promise<void>((resolve) => {
      const c = clip(name);
      if (!c) return resolve();
      const action = mixer.clipAction(c);
      action.reset();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.timeScale = timeScale;
      if (timeScale < 0) action.time = c.duration;
      action.play();
      kick(c.duration * 1000 + 120);
      setTimeout(resolve, (c.duration * 1000) / Math.abs(timeScale));
    });

  const toScreen = (obj: THREE.Object3D) => {
    const v = new THREE.Vector3();
    obj.getWorldPosition(v);
    v.project(camera);
    const r = el.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  };

  let busy = false;
  return {
    async explore() {
      if (busy) return null;
      busy = true;
      lastInteraction = performance.now() + 4000;
      yawTarget = null;
      yawVel = 0;
      // Turn the nozzle toward the viewer, lift the cap, press.
      const start = pivot.rotation.y;
      const goal = 0.05;
      const t0 = performance.now();
      await new Promise<void>((res) => {
        const step = () => {
          const t = Math.min(1, (performance.now() - t0) / 520);
          const e = 1 - Math.pow(1 - t, 3);
          pivot.rotation.y = start + (Math.atan2(Math.sin(goal - start), Math.cos(goal - start))) * e;
          kick(60);
          if (t < 1) requestAnimationFrame(step);
          else res();
        };
        step();
      });
      await play(opts.animations.open);
      const spray = play(opts.animations.spray);
      await new Promise((r) => setTimeout(r, 120));
      if (nozzle) {
        const n = new THREE.Vector3();
        nozzle.getWorldPosition(n);
        root.worldToLocal(n);
        for (let i = 0; i < MIST; i++) {
          mistPos.set([n.x, n.y, n.z], i * 3);
          mistVel.set([(Math.random() - 0.3) * 0.08, (Math.random() - 0.4) * 0.12, 0.4 + Math.random() * 0.5], i * 3);
        }
        mistAge = 0;
      }
      const origin = nozzle ? toScreen(nozzle) : null;
      // Hand the nozzle point over while the canvas mist is still in the air, so the page mist
      // continues the same puff instead of starting a second one.
      void spray.then(() => {
        // Cap clicks back on after the mist has gone: the lid returns, the bottle dips for two frames.
        setTimeout(() => {
          void play(opts.animations.open, -1.6).then(() => {
            // The click: a two-frame dip of the whole bottle and the cap compressing a hair as it seats.
            pivot.position.y = -0.004;
            if (capNode) capNode.scale.y = 0.97;
            kick(80);
            setTimeout(() => {
              pivot.position.y = 0;
              if (capNode) capNode.scale.y = 1;
              kick(60);
            }, 70);
            busy = false;
            // Hold face-on while the reader looks at the Trail: the drift home starts 12s on, or
            // at the next interaction, and takes about 1.6s.
            lastInteraction = performance.now() + 8500;
            kick(200);
          });
        }, 1600);
      });
      return origin;
    },
    turn,
    home,
    canvas: el,
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('keydown', onKey);
      el.removeEventListener('focus', onFocus);
      el.removeEventListener('blur', onBlur);
      mixer.stopAllAction();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | undefined;
        mat?.dispose?.();
      });
      pmrem.dispose();
      renderer.dispose();
      el.remove();
    },
  };
}
