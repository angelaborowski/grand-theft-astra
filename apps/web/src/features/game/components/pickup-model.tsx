import type { Entity } from "@gpta/core/world";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

/** Temporary readable pickup geometry uses the canonical entity's claim state. */
export function PickupModel({ pickup }: { pickup: Extract<Entity, { kind: "pickup" }> }) {
  const display = useRef<Group>(null);
  useFrame(({ clock }, delta) => {
    if (!display.current) return;
    display.current.rotation.y += Math.min(delta, 0.1) * 0.8;
    display.current.position.y = 0.7 + Math.sin(clock.elapsedTime * 2) * 0.08;
  });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[0.4, 0.5, 24]} />
        <meshBasicMaterial color="#edbf66" />
      </mesh>
      <group ref={display} position={[0, 0.7, 0]}>
        {pickup.item === "pistol" ? (
          <PistolModel />
        ) : (
          <mesh castShadow>
            <boxGeometry args={[0.35, 0.2, 0.3]} />
            <meshStandardMaterial color="#74734b" metalness={0.3} roughness={0.55} />
          </mesh>
        )}
      </group>
    </group>
  );
}

/** A simple pistol prop needs no asset request before the first playable pass. */
export function PistolModel() {
  return (
    <group>
      <mesh castShadow position={[0, 0.08, 0.1]}>
        <boxGeometry args={[0.1, 0.12, 0.35]} />
        <meshStandardMaterial color="#34383a" metalness={0.65} roughness={0.35} />
      </mesh>
      <mesh castShadow position={[0, -0.05, -0.02]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.09, 0.22, 0.12]} />
        <meshStandardMaterial color="#252729" roughness={0.9} />
      </mesh>
    </group>
  );
}

/** Target color and tilt expose accepted damage without a new destruction system. */
export function PracticeTarget({ target }: { target: Extract<Entity, { kind: "target" }> }) {
  const hit = target.health < 100;
  return (
    <group>
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[0.12, 1.2, 0.12]} />
        <meshStandardMaterial color="#6e5138" />
      </mesh>
      <group position={[0, 1.4, 0]} rotation={[target.health === 0 ? -Math.PI / 2 : 0, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[1.1, 1.3, 0.12]} />
          <meshStandardMaterial color={hit ? "#8c6745" : "#cfb887"} />
        </mesh>
        <mesh position={[0, 0, 0.07]}>
          <ringGeometry args={[0.16, 0.27, 32]} />
          <meshBasicMaterial color={hit ? "#8d2e27" : "#4b2924"} />
        </mesh>
      </group>
    </group>
  );
}
