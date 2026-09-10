// Ported from public/world-polish.js; original Blender-derived dimensions preserved.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
const material = (color: string, roughness = 0.8) =>
  new THREE.MeshStandardMaterial({ color, roughness });
export function furnishRoom(room: THREE.Group) {
  // Replace the oversized placeholder bed and desk, keeping the saved room envelope/door.
  const old = [...room.children];
  for (const i of [6, 7, 8, 9]) {
    const item = old[i];
    if (item) room.remove(item);
  }
  const oak = material("#70543a"),
    linen = material("#dfd5bd"),
    blanket = material("#68746b"),
    brass = new THREE.MeshStandardMaterial({ color: "#8a734a", metalness: 0.6, roughness: 0.4 }),
    wall = material("#c3baa5");
  const groups = new Map<THREE.Material, THREE.BufferGeometry[]>();
  function block(
    w: number,
    h: number,
    d: number,
    m: THREE.Material,
    x: number,
    y: number,
    z: number,
    r = 0.015,
  ) {
    const width = w * 0.6,
      depth = d * 0.6;
    const g = new RoundedBoxGeometry(width, h, depth, 1, Math.min(r, width / 4, h / 4, depth / 4));
    g.translate(96 + (x - 84) * 0.6, y, (z - 80) * 0.6 + (z < 70.5 ? 0.08 : 0));
    if (!groups.has(m)) groups.set(m, []);
    groups.get(m)?.push(g);
  }
  for (let x = 75; x < 94; x += 0.38) block(0.37, 0.025, 19.5, oak, x, 0.145, 80, 0.004);
  for (const x of [74.75, 93.25]) block(0.12, 0.2, 19.5, oak, x, 0.23, 80);
  for (const z of [70.2, 89.7]) block(18.5, 0.2, 0.12, oak, 84, 0.23, z);
  block(2, 0.25, 2.55, oak, 89, 0.4, 75);
  block(2.02, 0.24, 2.5, linen, 89, 0.63, 75);
  block(2.03, 0.08, 1.65, blanket, 89, 0.8, 75.42, 0.035);
  block(2.1, 1.1, 0.14, oak, 89, 0.65, 73.68);
  for (const x of [88.5, 89.5]) block(0.75, 0.17, 0.46, linen, x, 0.83, 74.16, 0.075);
  for (const x of [88.15, 89.85])
    for (const z of [73.95, 76.05]) block(0.1, 0.35, 0.1, oak, x, 0.26, z);
  block(0.65, 0.65, 0.55, oak, 87.35, 0.47, 74.2);
  block(0.59, 0.2, 0.05, wall, 87.35, 0.61, 74.49);
  block(0.1, 0.035, 0.045, brass, 87.35, 0.61, 74.53);
  block(1.7, 0.09, 0.8, oak, 77.2, 0.91, 75);
  for (const x of [76.5, 77.9])
    for (const z of [74.7, 75.3]) block(0.07, 0.76, 0.07, oak, x, 0.49, z);
  block(0.53, 0.1, 0.55, blanket, 77.2, 0.54, 76.2);
  block(0.53, 0.6, 0.09, oak, 77.2, 0.9, 76.43);
  for (const x of [77, 77.4]) for (const z of [76, 76.4]) block(0.05, 0.4, 0.05, oak, x, 0.33, z);
  // Panel mouldings and a framed picture on the back wall.
  for (const x of [77, 80, 83, 86, 89, 92]) {
    for (const xx of [x - 0.85, x + 0.85]) block(0.04, 1.8, 0.035, oak, xx, 1.6, 70.17);
    for (const yy of [0.7, 2.5]) block(1.74, 0.04, 0.035, oak, x, yy, 70.17);
  }
  block(1.5, 1.1, 0.1, oak, 83, 2.1, 70.24);
  block(1.36, 0.96, 0.02, blanket, 83, 2.1, 70.31);
  block(2.2, 0.025, 3.2, blanket, 85.5, 0.17, 79);
  for (let i = 0; i < 12; i++) block(2.15, 0.008, 0.015, linen, 85.5, 0.19, 77.5 + i * 0.26, 0.001);
  block(2.2, 2.1, 0.08, oak, 93.28, 2, 80);
  block(2.0, 1.9, 0.025, wall, 93.22, 2, 80);
  for (const [m, gs] of groups) {
    const mesh = new THREE.Mesh(mergeGeometries(gs), m);
    mesh.castShadow = mesh.receiveShadow = true;
    room.add(mesh);
    gs.forEach((g) => g.dispose());
  }
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.22, 24), material("#e2cda8"));
  lamp.scale.set(0.6, 1, 0.6);
  lamp.position.set(98.01, 1.12, -3.48);
  room.add(lamp);
  const light = new THREE.PointLight("#ffcc87", 3, 7, 2);
  light.position.set(98.01, 1.2, -3.48);
  room.add(light);
}
export function museumDetail(model: THREE.Object3D) {
  const group = new THREE.Group(),
    byMaterial = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const stone = material("#b59d7d"),
    glass = new THREE.MeshStandardMaterial({ color: "#293a42", metalness: 0.3, roughness: 0.3 });
  function b(w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) {
    const g = new RoundedBoxGeometry(w, h, d, 1, 0.035);
    g.translate(x, y, z);
    if (!byMaterial.has(m)) byMaterial.set(m, []);
    byMaterial.get(m)?.push(g);
  }
  // Reference-informed window rhythm on the square-facing museum elevation, not a measured facade.
  const ray = new THREE.Raycaster();
  if (model) model.updateMatrixWorld(true);
  function front(x: number, y: number) {
    if (!model) return -143.15;
    ray.set(new THREE.Vector3(x, y, -120), new THREE.Vector3(0, 0, -1));
    const hit = ray.intersectObject(model, true).find((h) => h.distance < 70);
    return hit ? hit.point.z + 0.08 : null;
  }
  for (let x = -8; x <= 40; x += 4) {
    for (const y of [4.3, 10.2, 16.2]) {
      const z = front(x, y);
      if (z === null) continue;
      const left = front(x - 0.85, y),
        right = front(x + 0.85, y);
      if (left === null || right === null || Math.abs(left - z) > 1 || Math.abs(right - z) > 1)
        continue;
      b(1.2, 2.7, 0.09, glass, x, y, z);
      for (const xx of [x - 0.74, x + 0.74]) b(0.2, 3, 0.35, stone, xx, y, z + 0.2);
      for (const yy of [y - 1.5, y + 1.5]) b(1.7, 0.2, 0.4, stone, x, yy, z + 0.23);
      b(0.07, 2.65, 0.12, stone, x, y, z + 0.15);
    }
  }
  for (const [m, gs] of byMaterial) {
    const mesh = new THREE.Mesh(mergeGeometries(gs), m);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    gs.forEach((g) => g.dispose());
  }
  group.name = "Museum facade study";
  return group;
}
export function extendGum(original: THREE.Object3D) {
  const group = new THREE.Group();
  group.name = "GUM extended facade study";
  for (const offset of [-180, -120, -60, 60]) {
    const c = original.clone(true);
    c.position.z += offset;
    c.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const clone = (m: THREE.Material) => {
          const result = m.clone();
          result.clippingPlanes = [
            new THREE.Plane(new THREE.Vector3(0, 0, 1), 116),
            new THREE.Plane(new THREE.Vector3(0, 0, -1), 151),
          ];
          return result;
        };
        o.material = Array.isArray(o.material) ? o.material.map(clone) : clone(o.material);
      }
    });
    group.add(c);
  }
  return group;
}
