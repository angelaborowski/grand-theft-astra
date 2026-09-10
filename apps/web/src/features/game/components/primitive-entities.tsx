/** Reused visual body; physics and identity belong to the calling entity. */
export function Person({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.85, 0]} castShadow>
        <capsuleGeometry args={[0.32, 0.85, 3, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 1.65, 0]} castShadow>
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

/** A small reusable car model keeps the architecture spike independent of external assets. */
export function Vehicle({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[2, 0.8, 4.2]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 1.3, -0.2]} castShadow>
        <boxGeometry args={[1.7, 0.75, 2]} />
        <meshStandardMaterial color="#516e76" />
      </mesh>
      {[-1, 1].flatMap((x) =>
        [-1.3, 1.3].map((z) => (
          <mesh key={`${x}:${z}`} position={[x, 0.4, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.44, 0.44, 0.25, 10]} />
            <meshStandardMaterial color="#222d30" />
          </mesh>
        )),
      )}
    </group>
  );
}
