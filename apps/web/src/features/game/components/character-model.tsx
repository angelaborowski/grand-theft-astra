import { Html, useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CatchBoundary } from "@tanstack/react-router";
import { useRef, useState, type RefObject } from "react";
import type { AnimationAction } from "three";
import { cloneCharacter } from "../models/scene-assets";
import { Person } from "./primitive-entities";

/** Displayed movement selects animation; the animation never changes authoritative position. */
export type CharacterMotion = { speed: number };

/** Missing character assets retain a visible body and an explicit asset warning. */
export function CharacterModel({
  asset,
  motion,
  color,
}: {
  asset: string;
  motion: RefObject<CharacterMotion>;
  color?: string;
}) {
  return (
    <CatchBoundary getResetKey={() => asset} errorComponent={CharacterAssetFailure}>
      <AnimatedCharacter asset={asset} motion={motion} color={color} />
    </CatchBoundary>
  );
}

function AnimatedCharacter({
  asset,
  motion,
  color,
}: {
  asset: string;
  motion: RefObject<CharacterMotion>;
  color: string | undefined;
}) {
  const gltf = useGLTF(asset);
  const [model] = useState(() => cloneCharacter(gltf.scene, color));
  const { actions } = useAnimations(gltf.animations, model);
  const current = useRef<AnimationAction | null>(null);
  useFrame(() => {
    const speed = motion.current.speed;
    const action = actions[speed > 0.05 ? "Walk" : "Idle"];
    if (!action) return;
    if (current.current !== action) {
      current.current?.fadeOut(0.2);
      action.reset().setEffectiveWeight(1).fadeIn(0.2).play();
      current.current = action;
    }
    action.setEffectiveTimeScale(speed > 0.05 ? Math.min(2.5, Math.max(0.4, speed / 1.4)) : 1);
  });
  return <primitive object={model} dispose={null} />;
}

function CharacterAssetFailure() {
  return (
    <group>
      <Person color="#b99362" />
      <Html position={[0, 2.1, 0]} center distanceFactor={12}>
        <span className="entity-label" role="status">
          Character asset unavailable
        </span>
      </Html>
    </group>
  );
}
