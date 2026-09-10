import { useGLTF, Html } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useState } from "react";
import { MUSEUM } from "@gpta/core/scene";

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
        <CuboidCollider args={[2, 0.5, 4]} position={[0, -0.5, -3]} />
        <CuboidCollider args={[2, 0.5, 10.3]} position={[0, 0.7, -19.7]} />
        <CuboidCollider
          args={[2, 0.08, Math.hypot(2.4, 1.2) / 2]}
          position={[0, 0.51, -8.2]}
          rotation={[Math.atan(0.5), 0, 0]}
        />
        <CuboidCollider args={[0.15, 4, 16]} position={[-1.9, 4, -15]} />
        <CuboidCollider args={[0.15, 4, 16]} position={[1.9, 4, -15]} />
        <CuboidCollider args={[2, 3, 0.15]} position={[0, 3, -29.6]} />
      </RigidBody>
      <Html position={[0, 2.1, -0.2]} center>
        <span className="route-label">Red Square → Walk through the doorway</span>
      </Html>
    </group>
  );
}
