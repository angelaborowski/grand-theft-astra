import { createPortal, useFrame } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import type { Group, Object3D } from "three";
import type { CharacterMotion } from "../models/character-poses";
import { PistolModel } from "./pickup-model";

/** The pistol follows the existing forearm; ammunition remains in accepted player state. */
export function CharacterWeapon({
  hand,
  motion,
}: {
  hand: Object3D;
  motion: RefObject<CharacterMotion>;
}) {
  const flash = useRef<Group>(null);
  useFrame(() => {
    if (!flash.current) return;
    flash.current.visible =
      motion.current.pose?.action === "fire" && motion.current.pose.actionTime < 0.08;
  });
  return createPortal(
    <group position={[0, 0.23, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <PistolModel />
      <group ref={flash} position={[0, 0.08, 0.31]} visible={false}>
        <mesh>
          <sphereGeometry args={[0.09, 6, 4]} />
          <meshBasicMaterial color="#ffdb82" toneMapped={false} />
        </mesh>
        <pointLight color="#ffca6b" intensity={2} distance={3} />
      </group>
    </group>,
    hand,
  );
}
