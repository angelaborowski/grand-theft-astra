import { DISTRICT_BOUNDS, MOVEMENT, MUSEUM, sceneSpace } from "@gpta/core/scene";
import type { Actor, Position } from "@gpta/core/world";
import { CameraControls, CameraControlsImpl, useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { Ecctrl, type EcctrlHandle } from "ecctrl";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { PLAYER_ASSET } from "../models/scene-assets";
import { CharacterModel, type CharacterMotion } from "./character-model";
import { useCameraObstacles } from "./use-camera-obstacles";
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
  const resumeFollowAt = useRef(0);
  const cameraPosition = useRef(new Vector3());
  const cameraTarget = useRef(new Vector3());
  const obstacles = useCameraObstacles();
  const [, getKeys] = useKeyboardControls<
    "forward" | "backward" | "leftward" | "rightward" | "run"
  >();
  const movement = useRef({ lastSent: 0, pending: false });
  const motion = useRef<CharacterMotion>({ speed: 0 });
  const driving = actor.behavior.type === "driving";
  const space = sceneSpace(actor.position);
  const inside = space !== "square";
  const leavingMuseum = Math.hypot(spawn.x - MUSEUM.exit.x, spawn.z - MUSEUM.exit.z) < 1;
  const cameraSign = space === "museum" || leavingMuseum ? -1 : 1;
  const cameraDistance = inside ? 3.5 : 6.5;
  const spawnHeight =
    space === "museum" ? 1.3 + Math.min(1.2, Math.max(0, (-spawn.z - 7) * 0.5)) : 1.3;
  const followRadius = useRef(Math.hypot(6.5, 2.6));
  useEffect(() => {
    if (camera.current)
      void camera.current.setLookAt(
        spawn.x,
        spawnHeight + 2.5,
        spawn.z + 6.5 * cameraSign,
        spawn.x,
        spawnHeight,
        spawn.z,
        false,
      );
  }, [spawn.x, spawn.z, cameraSign, spawnHeight]);
  useEffect(() => {
    if (overview && camera.current) {
      const x = (DISTRICT_BOUNDS.minX + DISTRICT_BOUNDS.maxX) / 2;
      const z = (DISTRICT_BOUNDS.minZ + DISTRICT_BOUNDS.maxZ) / 2;
      void camera.current.setLookAt(x, 335, z + 110, x, 0, z, true);
    }
    if (!overview && camera.current && controller.current?.body) {
      const position = controller.current.body.translation();
      void camera.current.setLookAt(
        position.x,
        position.y + 2.6,
        position.z + cameraDistance * cameraSign,
        position.x,
        position.y,
        position.z,
        true,
      );
    }
  }, [overview, cameraDistance, cameraSign]);
  const restorePosition = useEffectEvent(() => {
    controller.current?.body?.setTranslation(
      {
        x: actor.position.x,
        y:
          space === "museum"
            ? 1.3 + Math.min(1.2, Math.max(0, (-actor.position.z - 7) * 0.5))
            : 1.3,
        z: actor.position.z,
      },
      true,
    );
  });
  useEffect(() => {
    restorePosition();
  }, [driving, enabled, inside]);
  const lastAccepted = useRef(actor.position);
  useEffect(() => {
    const previous = lastAccepted.current;
    lastAccepted.current = actor.position;
    if (Math.hypot(previous.x - actor.position.x, previous.z - actor.position.z) <= 3) return;
    restorePosition();
    controller.current?.body?.setLinvel({ x: 0, y: 0, z: 0 }, true);
    const height =
      space === "museum" ? 1.3 + Math.min(1.2, Math.max(0, (-actor.position.z - 7) * 0.5)) : 1.3;
    void camera.current?.setLookAt(
      actor.position.x,
      height + 2.6,
      actor.position.z + cameraDistance * cameraSign,
      actor.position.x,
      height,
      actor.position.z,
      false,
    );
  }, [actor.position, space, cameraDistance, cameraSign]);
  useFrame(({ clock }, delta) => {
    const character = controller.current;
    if (!character?.body) return;
    const focus = document.activeElement;
    const typing =
      focus instanceof HTMLElement &&
      (focus.matches("input,textarea,select") || focus.isContentEditable);
    const controlsEnabled = enabled && !typing && !overview && document.hasFocus();
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
      if (
        character.isMoving &&
        controlsEnabled &&
        getKeys().forward &&
        !orbiting.current &&
        performance.now() > resumeFollowAt.current
      ) {
        const direction = character.movingDirection;
        const distance = followRadius.current;
        const horizontal = distance * Math.cos(Math.atan2(2.6, cameraDistance));
        const height = distance * Math.sin(Math.atan2(2.6, cameraDistance));
        void camera.current.setLookAt(
          position.x - direction.x * horizontal,
          position.y + height,
          position.z - direction.z * horizontal,
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
        character.body.setTranslation(
          {
            x: actor.position.x,
            y:
              space === "museum"
                ? 1.3 + Math.min(1.2, Math.max(0, (-actor.position.z - 7) * 0.5))
                : 1.3,
            z: actor.position.z,
          },
          true,
        );
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
        position={[spawn.x, spawnHeight, spawn.z]}
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
        minDistance={0.8}
        maxDistance={overview ? 500 : inside ? 5 : 10}
        colliderMeshes={overview || inside ? [] : obstacles}
        mouseButtons={{
          left: CameraControlsImpl.ACTION.ROTATE,
          middle: CameraControlsImpl.ACTION.NONE,
          right: CameraControlsImpl.ACTION.ROTATE,
          wheel: CameraControlsImpl.ACTION.DOLLY,
        }}
        touches={{
          one: CameraControlsImpl.ACTION.TOUCH_ROTATE,
          two: CameraControlsImpl.ACTION.TOUCH_DOLLY_ROTATE,
          three: CameraControlsImpl.ACTION.NONE,
        }}
        maxPolarAngle={Math.PI / 2.15}
        minPolarAngle={0.2}
        smoothTime={0.18}
        onControl={() => {
          if (!overview && camera.current) {
            followRadius.current = camera.current
              .getPosition(cameraPosition.current, true)
              .distanceTo(camera.current.getTarget(cameraTarget.current, true));
          }
          resumeFollowAt.current = performance.now() + 1200;
        }}
        onControlStart={() => {
          orbiting.current = true;
        }}
        onControlEnd={() => {
          orbiting.current = false;
          resumeFollowAt.current = performance.now() + 1200;
        }}
      />
    </>
  );
}
