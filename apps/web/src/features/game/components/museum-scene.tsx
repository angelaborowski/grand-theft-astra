import { useGLTF, Html } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useState } from "react";
import { MUSEUM, MUSEUM_COLLIDERS } from "@gpta/core/scene";

/** The entrance corridor opens into the square through the server-validated threshold. */
export function MuseumScene() {
  const gltf = useGLTF("/assets/museum-interior.glb");
  const [scene] = useState(() => gltf.scene.clone(true));
  return (
    <group position={[MUSEUM.originX, 0, 0]}>
      <primitive object={scene} dispose={null} />
      <ambientLight intensity={0.8} color="#f6e6d0" />
      {(
        [
          [-2.7, 6.1, -6],
          [2.7, 6.1, -6],
          [0, 6, -18],
        ] as const
      ).map(([x, y, z], i) => (
        <pointLight key={i} position={[x, y, z]} intensity={60} distance={30} color="#ffd5a0" />
      ))}
      <pointLight position={[0, 5, -1]} intensity={90} distance={18} color="#e5efff" />
      <RigidBody type="fixed" colliders={false}>
        {MUSEUM_COLLIDERS.map((box, index) => (
          <CuboidCollider
            key={index}
            args={[...box.halfExtents]}
            position={[box.position[0] - MUSEUM.originX, box.position[1], box.position[2]]}
            rotation={[box.rotationX, 0, 0]}
          />
        ))}
      </RigidBody>
      <Html position={[0, 2.1, -0.2]} center zIndexRange={[8, 0]}>
        <span className="route-label">Red Square → Walk through the doorway</span>
      </Html>
    </group>
  );
}
