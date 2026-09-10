import { Html, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CatchBoundary } from "@tanstack/react-router";
import { useEffect, useRef, useState, type RefObject } from "react";
import { AnimationMixer, Group, Mesh, Vector3, type AnimationAction } from "three";
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
  const actions = useRef<Record<string, AnimationAction>>({});
  const position = useRef(new Vector3());
  const elapsed = useRef(0);
  const detailed = useRef<Group>(null);
  const distant = useRef<Group>(null);
  const simplified = useRef(false);
  const shadowMeshes = useRef<Mesh[]>([]);
  const shadowing = useRef(true);
  const current = useRef<AnimationAction | null>(null);
  useEffect(() => {
    model.traverse((object) => {
      if (object instanceof Mesh) shadowMeshes.current.push(object);
    });
    actions.current = Object.fromEntries(
      gltf.animations.map((clip) => [clip.name, mixer.clipAction(clip)]),
    );
    return () => {
      shadowMeshes.current = [];
      current.current = null;
      actions.current = {};
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
    };
  }, [gltf.animations, mixer, model]);
  useFrame(({ camera }, delta) => {
    model.getWorldPosition(position.current);
    const distance = camera.position.distanceToSquared(position.current);
    if (distance > 60 * 60) simplified.current = true;
    else if (distance < 50 * 50) simplified.current = false;
    const castShadow = distance < 35 * 35;
    if (shadowing.current !== castShadow) {
      setCharacterShadows(shadowMeshes.current, castShadow);
      shadowing.current = castShadow;
    }
    if (detailed.current) detailed.current.visible = !simplified.current;
    if (distant.current) distant.current.visible = simplified.current;
    if (simplified.current) return;
    // Keep full-rate nearby poses; distant figures need fewer bone updates, not fewer bodies.
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
  });
  return (
    <group>
      <group ref={detailed}>
        <primitive object={model} dispose={null} />
      </group>
      <group ref={distant} visible={false}>
        <Person color={color ?? "#626b72"} castShadow={false} />
      </group>
    </group>
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

/** Shadow flags belong to mutable Three.js objects, not React state. */
function setCharacterShadows(meshes: Mesh[], enabled: boolean) {
  for (const mesh of meshes) mesh.castShadow = enabled;
}
