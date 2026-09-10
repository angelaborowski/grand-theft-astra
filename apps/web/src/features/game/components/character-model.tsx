import { Html, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CatchBoundary } from "@tanstack/react-router";
import { useEffect, useRef, useState, type RefObject } from "react";
import { AnimationMixer, Vector3, type AnimationAction } from "three";
import {
  applyCharacterPose,
  createCharacterPoseRig,
  type CharacterMotion,
} from "../models/character-poses";
import { cloneCharacter } from "../models/scene-assets";
import { Person } from "./primitive-entities";
import { CharacterWeapon } from "./character-weapon";

/** Displayed movement selects animation; the animation never changes authoritative position. */
export type { CharacterMotion } from "../models/character-poses";

/** Missing character assets retain a visible body and an explicit asset warning. */
export function CharacterModel({
  asset,
  motion,
  color,
  armed = false,
}: {
  asset: string;
  motion: RefObject<CharacterMotion>;
  color?: string;
  armed?: boolean;
}) {
  return (
    <CatchBoundary getResetKey={() => asset} errorComponent={CharacterAssetFailure}>
      <AnimatedCharacter asset={asset} motion={motion} color={color} armed={armed} />
    </CatchBoundary>
  );
}

function AnimatedCharacter({
  asset,
  motion,
  color,
  armed,
}: {
  asset: string;
  motion: RefObject<CharacterMotion>;
  color: string | undefined;
  armed: boolean;
}) {
  const gltf = useGLTF(asset);
  const [model] = useState(() => cloneCharacter(gltf.scene, color));
  const [mixer] = useState(() => new AnimationMixer(model));
  const [rig] = useState(() => createCharacterPoseRig(model));
  const hand = model.getObjectByName("forearmR");
  const actions = useRef<Record<string, AnimationAction>>({});
  const position = useRef(new Vector3());
  const elapsed = useRef(0);
  const current = useRef<AnimationAction | null>(null);
  useEffect(() => {
    actions.current = Object.fromEntries(
      gltf.animations.map((clip) => [clip.name, mixer.clipAction(clip)]),
    );
    return () => {
      current.current = null;
      actions.current = {};
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
    };
  }, [gltf.animations, mixer, model]);
  useFrame(({ camera, clock }, delta) => {
    model.getWorldPosition(position.current);
    const distance = camera.position.distanceToSquared(position.current);
    // Distant figures keep their bodies while the mixer updates fewer times.
    const interval = distance > 100 * 100 ? 1 / 10 : distance > 40 * 40 ? 1 / 20 : 0;
    elapsed.current += Math.min(delta, 0.1);
    if (elapsed.current < interval) return;
    const step = elapsed.current;
    elapsed.current = 0;
    const speed = motion.current.speed;
    const action = actions.current[speed > 0.05 ? "Walk" : "Idle"];
    if (!action) return;
    if (current.current !== action) {
      current.current?.fadeOut(0.2);
      action.reset().setEffectiveWeight(1).fadeIn(0.2).play();
      current.current = action;
    }
    action.setEffectiveTimeScale(speed > 0.05 ? Math.min(2.5, Math.max(0.4, speed / 1.4)) : 1);
    mixer.update(step);
    applyCharacterPose(rig, motion.current, clock.elapsedTime);
  });
  return (
    <>
      <primitive object={model} dispose={null} />
      {armed && hand && <CharacterWeapon hand={hand} motion={motion} />}
    </>
  );
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
