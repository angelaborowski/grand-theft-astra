import { STUNT } from "@gpta/core/scene";
import type { Player } from "@gpta/core/world";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useRef } from "react";
import { Group } from "three";

/** Fictional movie-set props. The server checks route order, deadline, and handoff. */
export function StuntCourse({ player }: { player: Player }) {
  const rotor = useRef<Group>(null);
  const helicopter = useRef<Group>(null);
  useFrame(({ clock }, delta) => {
    if (rotor.current) rotor.current.rotation.y += delta * 32;
    if (helicopter.current)
      helicopter.current.position.y = 4.5 + Math.sin(clock.elapsedTime * 1.4) * 0.12;
  });
  const next = player.stunt?.stage === "running" ? player.stunt.checkpoint : -1;
  return (
    <>
      {STUNT.ramps.map((ramp) => (
        <group key={ramp.z} position={[ramp.x, 1.15, ramp.z]} rotation={[0.24, 0, 0]}>
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
            <Html position={[0, 4, 0]} center distanceFactor={25}>
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
        <Html position={[0, 1.5, 0]} center distanceFactor={22}>
          <span className="route-label">HELICOPTER PICKUP</span>
        </Html>
        <group ref={helicopter} position={[0, 4.5, 0]}>
          <mesh castShadow scale={[1.5, 1.25, 2.7]}>
            <sphereGeometry args={[1, 24, 16]} />
            <meshStandardMaterial color="#233537" metalness={0.55} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.25, 1.8]} scale={[1.3, 0.85, 1.05]}>
            <sphereGeometry args={[1, 24, 12]} />
            <meshStandardMaterial color="#15282f" metalness={0.4} roughness={0.12} />
          </mesh>
          <mesh position={[0, 0.4, -4]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.18, 0.65, 5, 12]} />
            <meshStandardMaterial color="#233537" />
          </mesh>
          <mesh position={[0, 1.15, -6.2]}>
            <boxGeometry args={[0.15, 1.8, 1.1]} />
            <meshStandardMaterial color="#d4a35a" />
          </mesh>
          <group ref={rotor} position={[0, 1.7, 0]}>
            {[0, Math.PI / 2].map((angle) => (
              <mesh key={angle} rotation={[0, angle, 0]}>
                <boxGeometry args={[11, 0.055, 0.23]} />
                <meshStandardMaterial color="#222827" />
              </mesh>
            ))}
          </group>
          {[-1.3, 1.3].map((x) => (
            <group key={x}>
              <mesh position={[x, -1.5, 0]}>
                <boxGeometry args={[0.13, 0.15, 4.2]} />
                <meshStandardMaterial color="#929d9d" metalness={0.8} roughness={0.3} />
              </mesh>
              <mesh position={[x, -1.1, 0]}>
                <boxGeometry args={[0.12, 0.8, 0.12]} />
                <meshStandardMaterial color="#929d9d" />
              </mesh>
            </group>
          ))}
        </group>
      </group>
    </>
  );
}
