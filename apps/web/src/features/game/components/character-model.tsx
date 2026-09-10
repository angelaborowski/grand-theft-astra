import { Html, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CatchBoundary } from "@tanstack/react-router";
import { useEffect, useRef, useState, type RefObject } from "react";
import { AnimationMixer, Vector3, type AnimationAction } from "three";
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
  const [mixer] = useState(() => new AnimationMixer(model));
  const [actions] = useState(() =>
    Object.fromEntries(gltf.animations.map((clip) => [clip.name, mixer.clipAction(clip)])),
  );
  const position = useRef(new Vector3());
  const elapsed = useRef(0);
  useEffect(
    () => () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
    },
    [mixer, model],
  );
  const current = useRef<AnimationAction | null>(null);
  useFrame(({ camera }, delta) => {
    model.getWorldPosition(position.current);
    const distance = camera.position.distanceToSquared(position.current);
    // Keep full-rate nearby poses; distant figures need fewer bone updates, not fewer bodies.
    const interval = distance > 100 * 100 ? 1 / 10 : distance > 40 * 40 ? 1 / 20 : 0;
    elapsed.current += Math.min(delta, 0.1);
    if (elapsed.current < interval) return;
    const step = elapsed.current;
    elapsed.current = 0;
    const speed = motion.current.speed;
    const action = actions[speed > 0.05 ? "Walk" : "Idle"];
    if (!action) return;
    if (current.current !== action) {
      current.current?.fadeOut(0.2);
      action.reset().setEffectiveWeight(1).fadeIn(0.2).play();
      current.current = action;
    }
    action.setEffectiveTimeScale(speed > 0.05 ? Math.min(2.5, Math.max(0.4, speed / 1.4)) : 1);
    mixer.update(step);
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
