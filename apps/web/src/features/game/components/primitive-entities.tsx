import { VehicleModel } from "./vehicle-model";

/** Reused visual body; physics and identity belong to the calling entity. */
export function Person({ color, castShadow = true }: { color: string; castShadow?: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.85, 0]} castShadow={castShadow}>
        <capsuleGeometry args={[0.32, 0.85, 3, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 1.65, 0]} castShadow={castShadow}>
        <sphereGeometry args={[0.27, 8, 8]} />
        <meshStandardMaterial color="#d3b796" />
      </mesh>
      {[-0.2, 0.2].map((x) => (
        <mesh key={x} position={[x, 0.24, 0]}>
          <boxGeometry args={[0.22, 0.48, 0.25]} />
          <meshStandardMaterial color="#333b3e" />
        </mesh>
      ))}
    </group>
  );
}

/** Reuses the canonical entity's existing transform and color. */
export function Vehicle({ color }: { color: string }) {
  return <VehicleModel color={color} />;
}
