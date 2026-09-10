import { DISTRICT_BOUNDS, MOVEMENT, isInsideGuesthouse } from "@gpta/core/scene";
import type { Actor, Position } from "@gpta/core/world";
import { CameraControls, useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Ecctrl, type EcctrlHandle } from "ecctrl";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { PLAYER_ASSET } from "../models/scene-assets";
import { CharacterModel, type CharacterMotion } from "./character-model";
import { Vehicle } from "./primitive-entities";

/** Ecctrl owns character movement; the server accepts or corrects sampled positions. */
export function Player({
  actor,
  enabled,
  overview,
  move,
}: {
  actor: Actor;
  enabled: boolean;
  overview: boolean;
  move: (position: Position) => Promise<void>;
}) {
  const controller = useRef<EcctrlHandle>(null);
  const [spawn] = useState(() => actor.position);
  const camera = useRef<CameraControls>(null);
  const orbiting = useRef(false);
  const [, getKeys] = useKeyboardControls<
    "forward" | "backward" | "leftward" | "rightward" | "run"
  >();
  const movement = useRef({ lastSent: 0, pending: false });
  const motion = useRef<CharacterMotion>({ speed: 0 });
  const driving = actor.behavior.type === "driving";
  const inside = isInsideGuesthouse(actor.position);
  const cameraDistance = inside ? 3.5 : 6.5;
  useEffect(() => {
    if (camera.current)
      void camera.current.setLookAt(spawn.x, 3.8, spawn.z + 6.5, spawn.x, 1.2, spawn.z, false);
  }, [spawn.x, spawn.z]);
  useEffect(() => {
    if (overview && camera.current) {
      const x = (DISTRICT_BOUNDS.minX + DISTRICT_BOUNDS.maxX) / 2;
      const z = (DISTRICT_BOUNDS.minZ + DISTRICT_BOUNDS.maxZ) / 2;
      void camera.current.setLookAt(x, 335, z + 110, x, 0, z, true);
    }
    if (!overview && camera.current && controller.current) {
      const position = controller.current.body.translation();
      void camera.current.setLookAt(
        position.x,
        position.y + 2.6,
        position.z + cameraDistance,
        position.x,
        position.y,
        position.z,
        true,
      );
    }
  }, [overview, cameraDistance]);
  const restorePosition = useEffectEvent(() => {
    controller.current?.body.setTranslation(
      { x: actor.position.x, y: 1.3, z: actor.position.z },
      true,
    );
  });
  useEffect(() => {
    restorePosition();
  }, [driving, enabled, inside]);
  useFrame(({ clock }, delta) => {
    const character = controller.current;
    if (!character) return;
    const typing = document.activeElement instanceof HTMLInputElement;
    const controlsEnabled = enabled && !typing && !overview;
    character.setMovement(
      controlsEnabled
        ? getKeys()
        : { forward: false, backward: false, leftward: false, rightward: false, run: false },
    );
    const position = character.body.translation();
    const velocity = character.body.linvel();
    motion.current.speed = Math.hypot(velocity.x, velocity.z);
    if (camera.current && !overview) {
      void camera.current.moveTo(position.x, position.y, position.z, true);
      if (character.isMoving && getKeys().forward && !orbiting.current) {
        const direction = character.movingDirection;
        void camera.current.setLookAt(
          position.x - direction.x * cameraDistance,
          position.y + 2.6,
          position.z - direction.z * cameraDistance,
          position.x,
          position.y,
          position.z,
          true,
        );
      }
    }
    if (
      !enabled ||
      movement.current.pending ||
      clock.elapsedTime - movement.current.lastSent < 0.2 ||
      delta > 0.3
    )
      return;
    movement.current.lastSent = clock.elapsedTime;
    if (Math.hypot(position.x - actor.position.x, position.z - actor.position.z) < 0.06) return;
    movement.current.pending = true;
    void move({ x: position.x, z: position.z })
      .catch(() => {
        character.body.setTranslation({ x: actor.position.x, y: 1.3, z: actor.position.z }, true);
        character.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      })
      .finally(() => {
        movement.current.pending = false;
      });
  });
  return (
    <>
      <Ecctrl
        ref={controller}
        position={[spawn.x, 1.3, spawn.z]}
        capsuleRadius={MOVEMENT.actorRadius}
        capsuleHalfHeight={0.45}
        floatHeight={0.05}
        maxWalkVel={driving ? MOVEMENT.driveSpeed * 0.85 : MOVEMENT.walkSpeed * 0.8}
        maxRunVel={driving ? MOVEMENT.driveSpeed : MOVEMENT.walkSpeed}
        jumpVel={0}
      >
        <group position={[0, -0.95, 0]}>
          {driving ? (
            <Vehicle color="#d5ff78" />
          ) : (
            <CharacterModel asset={PLAYER_ASSET} motion={motion} color="#d5ff78" />
          )}
        </group>
      </Ecctrl>
      <CameraControls
        ref={camera}
        makeDefault
        minDistance={3}
        maxDistance={500}
        maxPolarAngle={Math.PI / 2.15}
        minPolarAngle={0.2}
        smoothTime={0.6}
        onControlStart={() => {
          orbiting.current = true;
        }}
        onControlEnd={() => {
          orbiting.current = false;
        }}
      />
    </>
  );
}
