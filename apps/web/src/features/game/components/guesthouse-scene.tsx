import { GUESTHOUSE } from "@gpta/core/scene";
import { CuboidCollider, RigidBody } from "@react-three/rapier";

/** The small room uses the same coordinates as the server's door and movement rules. */
export function GuesthouseScene() {
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[6, 0.5, 6]} position={[96, -0.5, 0]} />
        <mesh position={[96, -0.15, 0]} receiveShadow>
          <boxGeometry args={[12, 0.3, 12]} />
          <meshStandardMaterial color="#a69377" />
        </mesh>
        {[-6, 6].map((x) => (
          <group key={x}>
            <CuboidCollider args={[0.15, 2, 6]} position={[96 + x, 2, 0]} />
            <mesh position={[96 + x, 1.7, 0]}>
              <boxGeometry args={[0.3, 3.4, 12]} />
              <meshStandardMaterial color="#b6ab8e" />
            </mesh>
          </group>
        ))}
        <CuboidCollider args={[6, 2, 0.15]} position={[96, 2, -6]} />
        <CuboidCollider args={[6, 2, 0.15]} position={[96, 2, 6]} />
        <mesh position={[96, 1.7, -6]}>
          <boxGeometry args={[12, 3.4, 0.3]} />
          <meshStandardMaterial color="#a7af98" />
        </mesh>
      </RigidBody>
      <group position={[GUESTHOUSE.bed.x, 0, GUESTHOUSE.bed.z]}>
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[2.5, 0.5, 3.5]} />
          <meshStandardMaterial color="#665644" />
        </mesh>
        <mesh position={[0, 0.58, 0]}>
          <boxGeometry args={[2.35, 0.25, 3.4]} />
          <meshStandardMaterial color="#e5dfc9" />
        </mesh>
        <mesh position={[0, 0.76, -1.05]}>
          <boxGeometry args={[1.8, 0.18, 0.8]} />
          <meshStandardMaterial color="#f0edde" />
        </mesh>
        <mesh position={[0, 0.75, 0.4]}>
          <boxGeometry args={[2.3, 0.15, 2.3]} />
          <meshStandardMaterial color="#708c77" />
        </mesh>
      </group>
      <mesh position={[92, 1, -4]}>
        <boxGeometry args={[2, 2, 1]} />
        <meshStandardMaterial color="#746148" />
      </mesh>
      <mesh position={[93, 0.02, 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.8, 4]} />
        <meshStandardMaterial color="#88775e" />
      </mesh>
    </group>
  );
}
