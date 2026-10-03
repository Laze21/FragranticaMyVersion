import * as THREE from 'three';

/** Lighting shared by poster renders and the live viewer: a soft studio with one key light. */
export function setupLights(scene: THREE.Scene) {
  const key = new THREE.DirectionalLight(0xfff6ea, 1.6);
  key.position.set(-1.6, 2.4, 2.2);
  const rim = new THREE.DirectionalLight(0xe8f0ff, 0.9);
  rim.position.set(2, 1.4, -1.8);
  const fill = new THREE.HemisphereLight(0xf6f2ea, 0x8a8279, 0.55);
  scene.add(key, rim, fill);
}

/**
 * Reflection environment: a product-photography studio rather than a room. Two tall strip
 * softboxes and an overhead box over a soft grey gradient give glass the long vertical
 * highlights bottles have in real pack shots, with no hard-edged furniture to mirror.
 */
export function studioEnvironment(): THREE.Scene {
  const env = new THREE.Scene();
  const sky = new THREE.SphereGeometry(10, 48, 24);
  const pos = sky.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const top = new THREE.Color('#d9d6d0');
  const bottom = new THREE.Color('#5d5852');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) / 10 + 1) / 2;
    c.copy(bottom).lerp(top, Math.pow(t, 0.8));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  sky.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  env.add(new THREE.Mesh(sky, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const box = (w: number, h: number, intensity: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(intensity, intensity, intensity) }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  box(1.4, 7, 4.5, -5.5, 1, 3.5); // key strip, front left
  box(1.0, 7, 2.6, 6, 1, 1.5); // fill strip, right
  box(5, 5, 2.2, 0, 8, 0); // overhead
  box(2.2, 6, 1.4, 1.5, 1, -7); // back light, for rim
  return env;
}
