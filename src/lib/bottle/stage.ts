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
