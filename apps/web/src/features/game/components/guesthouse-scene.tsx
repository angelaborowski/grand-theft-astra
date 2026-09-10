import { useState } from "react";
import { Group } from "three";
import { furnishRoom } from "../models/world-polish";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { GUESTHOUSE_COLLIDERS } from "@gpta/core/scene";

/** The small room uses the same coordinates as the server's door and movement rules. */
export function GuesthouseScene() {
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[6, 0.5, 6]} position={[96, -0.5, 0]} />
        {GUESTHOUSE_COLLIDERS.map((box) => (
          <CuboidCollider
            key={box.id}
            args={[box.width / 2, box.height / 2, box.depth / 2]}
            position={[box.x, box.height / 2, box.z]}
          />
        ))}
        <mesh position={[96, -0.15, 0]} receiveShadow>
          <boxGeometry args={[12, 0.3, 12]} />
          <meshStandardMaterial color="#a69377" />
        </mesh>
        {[-6, 6].map((x) => (
          <group key={x}>
            <mesh position={[96 + x, 1.7, 0]}>
              <boxGeometry args={[0.3, 3.4, 12]} />
              <meshStandardMaterial color="#b6ab8e" />
            </mesh>
          </group>
        ))}
        <mesh position={[96, 1.7, -6]}>
          <boxGeometry args={[12, 3.4, 0.3]} />
          <meshStandardMaterial color="#a7af98" />
        </mesh>
      </RigidBody>
      <GuesthouseFurnishings />
    </group>
  );
}

export function GuesthouseFurnishings() {
  const [room] = useState(() => {
    const g = new Group();
    furnishRoom(g);
    return g;
  });
  return <primitive object={room} position={[0, -0.145, 0]} dispose={null} />;
}
