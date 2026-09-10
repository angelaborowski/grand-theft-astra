import { STUNT } from "@gpta/core/scene";
import type { Player } from "@gpta/core/world";
import { Html } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { HelicopterModel } from "./helicopter-model";

/** Fictional movie-set props. The server checks route order, deadline, and handoff. */
export function StuntCourse({
  player,
  helicopterVisible = true,
}: {
  player: Player;
  helicopterVisible?: boolean;
}) {
  const next = player.stunt?.stage === "running" ? player.stunt.checkpoint : -1;
  return (
    <>
      {STUNT.ramps.map((ramp) => (
        <group key={ramp.z} position={[ramp.x, 1.0, ramp.z]} rotation={[0.24, 0, 0]}>
          <RigidBody type="fixed" colliders={false}>
            <CuboidCollider args={[4, 0.13, 5]} />
            <mesh receiveShadow castShadow>
              <boxGeometry args={[8, 0.26, 10]} />
              <meshStandardMaterial color="#42494c" roughness={0.8} />
            </mesh>
          </RigidBody>
          {[-3.7, 3.7].map((x) => (
            <mesh key={x} position={[x, 0.15, 0]}>
              <boxGeometry args={[0.18, 0.04, 10]} />
              <meshStandardMaterial color="#e9ac45" />
            </mesh>
          ))}
        </group>
      ))}
      {STUNT.checkpoints.map((gate, index) => (
        <group key={gate.z} position={[gate.x, 0, gate.z]}>
          {[-5, 5].map((x) => (
            <mesh key={x} position={[x, 1.2, 0]}>
              <cylinderGeometry args={[0.12, 0.18, 2.4, 8]} />
              <meshStandardMaterial
                color={index === next ? "#ffd07a" : "#6f767a"}
                emissive={index === next ? "#a55e12" : "#000000"}
              />
            </mesh>
          ))}
          {index === next && (
            <Html position={[0, 4, 0]} center distanceFactor={25} zIndexRange={[8, 0]}>
              <span className="route-label">
                {index + 1} / 4 · {gate.label}
              </span>
            </Html>
          )}
        </group>
      ))}
      <group position={[STUNT.pickup.x, 0, STUNT.pickup.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]}>
          <ringGeometry args={[6.4, 6.7, 48]} />
          <meshBasicMaterial color="#f1c479" />
        </mesh>
        <Html position={[0, 1.5, 0]} center distanceFactor={22} zIndexRange={[8, 0]}>
          <span className="route-label">HELICOPTER PICKUP</span>
        </Html>
        {helicopterVisible && (
          <HelicopterModel
            motion={{
              mode: "departure",
              departing: player.stunt?.stage === "completed" || player.stunt?.stage === "failed",
            }}
          />
        )}
      </group>
    </>
  );
}
