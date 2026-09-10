import { DISTRICT_BOUNDS, MOVEMENT } from "@gpta/core/scene";
import type { Actor, Position } from "@gpta/core/world";
import { CameraControls, CameraControlsImpl, useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { useEffect, useRef, useState } from "react";
import { Group, Vector3 } from "three";
import { useCameraObstacles } from "./use-camera-obstacles";
import { Vehicle } from "./primitive-entities";

/** Arcade steering with physical collisions. Accepted X/Z positions remain server-owned. */
export function DrivingPlayer({
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
  const body = useRef<RapierRigidBody>(null);
  const visual = useRef<Group>(null);
  const camera = useRef<CameraControls>(null);
  const [spawn] = useState(actor.position);
  const orbiting = useRef(false);
  const resumeFollowAt = useRef(0);
  const cameraPosition = useRef(new Vector3());
  const cameraTarget = useRef(new Vector3());
  const followRadius = useRef(Math.hypot(11, 2.5));
  const obstacles = useCameraObstacles();
  useEffect(() => {
    if (!camera.current) return;
    if (overview) {
      const x = (DISTRICT_BOUNDS.minX + DISTRICT_BOUNDS.maxX) / 2;
      const z = (DISTRICT_BOUNDS.minZ + DISTRICT_BOUNDS.maxZ) / 2;
      void camera.current.setLookAt(x, 335, z + 110, x, 0, z, true);
    }
  }, [overview]);
  const [, keys] = useKeyboardControls<
    "forward" | "backward" | "leftward" | "rightward" | "brake"
  >();
  const state = useRef({ heading: Math.PI, speed: 0, lastSent: 0, pending: false });
  const accepted = useRef(actor.position);
  useEffect(() => {
    accepted.current = actor.position;
  }, [actor.position]);
  useFrame(({ clock }, delta) => {
    const rigid = body.current;
    if (!rigid || delta > 0.3) return;
    const current = state.current;
    const focused = document.activeElement;
    const typing =
      focused instanceof HTMLElement &&
      (focused.matches("input,textarea,select") || focused.isContentEditable);
    const active = enabled && !overview && !typing && document.hasFocus();
    const input = keys();
    const throttle = active ? Number(input.forward) - Number(input.backward) : 0;
    const steering = active ? Number(input.leftward) - Number(input.rightward) : 0;
    const braking = !active || input.brake;
    const velocity = rigid.linvel();
    // Read actual speed: a wall cannot store acceleration for a later burst.
    current.speed = velocity.x * Math.sin(current.heading) + velocity.z * Math.cos(current.heading);
    current.speed += throttle * 9 * delta;
    if (!throttle || braking) current.speed *= Math.exp(-(braking ? 7 : 1.1) * delta);
    current.speed = Math.max(-5, Math.min(MOVEMENT.driveSpeed * 0.92, current.speed));
    current.heading +=
      steering * Math.sign(current.speed) * Math.min(1, Math.abs(current.speed) / 4) * 1.25 * delta;
    rigid.setLinvel(
      {
        x: Math.sin(current.heading) * current.speed,
        y: velocity.y,
        z: Math.cos(current.heading) * current.speed,
      },
      true,
    );
    rigid.setRotation(
      { x: 0, y: Math.sin(current.heading / 2), z: 0, w: Math.cos(current.heading / 2) },
      true,
    );
    if (visual.current)
      visual.current.rotation.z = -steering * Math.min(0.04, Math.abs(current.speed) * 0.003);
    const p = rigid.translation();
    if (camera.current && !overview) {
      if (orbiting.current || performance.now() < resumeFollowAt.current) {
        void camera.current.moveTo(p.x, p.y + 0.5, p.z, true);
      } else {
        const horizontal = followRadius.current * Math.cos(Math.atan2(2.5, 11));
        const height = followRadius.current * Math.sin(Math.atan2(2.5, 11));
        void camera.current.setLookAt(
          p.x - Math.sin(current.heading) * (horizontal - 2),
          p.y + 0.7 + height,
          p.z - Math.cos(current.heading) * (horizontal - 2),
          p.x + Math.sin(current.heading) * 2,
          p.y + 0.7,
          p.z + Math.cos(current.heading) * 2,
          true,
        );
      }
    }
    if (!enabled || current.pending || clock.elapsedTime - current.lastSent < 0.2) return;
    if (Math.hypot(p.x - actor.position.x, p.z - actor.position.z) < 0.06) return;
    current.lastSent = clock.elapsedTime;
    current.pending = true;
    void move({ x: p.x, z: p.z })
      .catch(() => {
        if (!body.current) return;
        body.current.setTranslation({ ...accepted.current, y: 1 }, true);
        body.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        current.speed = 0;
      })
      .finally(() => {
        current.pending = false;
      });
  });
  return (
    <>
      <RigidBody
        ref={body}
        position={[spawn.x, 1, spawn.z]}
        colliders={false}
        enabledRotations={[false, false, false]}
        friction={0}
        restitution={0.05}
        ccd
      >
        <CuboidCollider args={[0.95, 0.45, 2.15]} />
        <group ref={visual} position={[0, -0.45, 0]}>
          <Vehicle color="#b8202b" />
        </group>
      </RigidBody>
      <CameraControls
        ref={camera}
        makeDefault
        smoothTime={0.15}
        minDistance={1}
        maxDistance={overview ? 500 : 14}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.1}
        colliderMeshes={overview ? [] : obstacles}
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
