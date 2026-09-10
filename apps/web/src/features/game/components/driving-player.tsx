import { MOVEMENT } from "@gpta/core/scene";
import type { Actor, Position } from "@gpta/core/world";
import { CameraControls, useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { useEffect, useRef, useState } from "react";
import { Group } from "three";
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
    if (camera.current) {
      if (overview) void camera.current.setLookAt(10, 335, 160, 10, 0, 50, true);
      else
        void camera.current.setLookAt(
          p.x - Math.sin(current.heading) * 9,
          p.y + 4,
          p.z - Math.cos(current.heading) * 9,
          p.x + Math.sin(current.heading) * 3,
          p.y + 0.5,
          p.z + Math.cos(current.heading) * 3,
          true,
        );
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
        minDistance={5}
        maxDistance={500}
      />
    </>
  );
}
