import { MOVEMENT } from "@gpta/core/scene";
import type { Player, Position } from "@gpta/core/world";
import type { CameraControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { RapierRigidBody } from "@react-three/rapier";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { Group } from "three";
import type { PlayerActions } from "../models/player-controls";
import type { Move } from "../models/player-movement";
import { boundedDrivingSpeed } from "../models/driving-prediction";
import { useVehicleInput } from "./use-vehicle-input";

/** Car steering restores rejected movement before resuming the existing distance-budget contract. */
export function useDrivingController({
  actor,
  enabled,
  inputEnabled,
  overview,
  move,
  actions,
}: {
  actor: Player;
  enabled: boolean;
  inputEnabled: boolean;
  overview: boolean;
  move: Move;
  actions: Pick<PlayerActions, "command">;
}) {
  const body = useRef<RapierRigidBody>(null);
  const visual = useRef<Group>(null);
  const camera = useRef<CameraControls>(null);
  const [spawn] = useState(actor.position);
  const generation = useRef(0);
  const sampledPosition = useRef(actor.position);
  const state = useRef({ heading: Math.PI - actor.heading, speed: 0, lastSent: 0, pending: false });
  const stop = () => {
    const rigid = body.current;
    state.current.speed = 0;
    if (!rigid) return;
    rigid.setLinvel({ x: 0, y: rigid.linvel().y, z: 0 }, true);
    rigid.setAngvel({ x: 0, y: 0, z: 0 }, true);
  };
  const input = useVehicleInput(enabled && inputEnabled && !overview, camera, {
    exit: () => {
      void actions.command({ type: "exit_vehicle" }).catch(stop);
    },
    stop,
  });
  const restore = (position: Position) => {
    input.release();
    sampledPosition.current = position;
    body.current?.setTranslation({ ...position, y: 1 }, true);
    stop();
  };
  const restoreAccepted = useEffectEvent(() => restore(actor.position));
  useEffect(() => {
    generation.current += 1;
    return () => {
      generation.current += 1;
    };
  }, [actor.id]);
  useEffect(() => {
    if (!enabled) restoreAccepted();
  }, [enabled]);
  useEffect(() => {
    const controls = camera.current;
    if (!controls) return;
    if (overview) void controls.setLookAt(10, 335, 160, 10, 0, 50, true);
    else {
      const position = body.current?.translation();
      if (position)
        void controls.setLookAt(
          position.x - Math.sin(state.current.heading) * 9,
          position.y + 4,
          position.z - Math.cos(state.current.heading) * 9,
          position.x,
          position.y + 0.5,
          position.z,
          false,
        );
    }
  }, [overview]);
  useFrame(({ clock }, delta) => {
    const rigid = body.current;
    if (!rigid || delta > 0.3) return;
    const current = state.current;
    const keys = input.read();
    const throttle = keys.forward;
    const steering = -keys.right;
    const velocity = rigid.linvel();
    current.speed = velocity.x * Math.sin(current.heading) + velocity.z * Math.cos(current.heading);
    current.speed += throttle * 9 * delta;
    if (!keys.active) current.speed = 0;
    else if (!throttle || keys.brake) current.speed *= Math.exp(-(keys.brake ? 7 : 1.1) * delta);
    current.speed = Math.max(-5, Math.min(MOVEMENT.driveSpeed * 0.92, current.speed));
    current.heading +=
      steering * Math.sign(current.speed) * Math.min(1, Math.abs(current.speed) / 4) * 1.25 * delta;
    const predicted = rigid.translation();
    current.speed = boundedDrivingSpeed(
      current.speed,
      Math.hypot(predicted.x - sampledPosition.current.x, predicted.z - sampledPosition.current.z),
      delta,
    );
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
    const position = rigid.translation();
    if (camera.current && !overview)
      void camera.current.moveTo(position.x, position.y + 0.5, position.z, true);
    if (!enabled || current.pending || clock.elapsedTime - current.lastSent < 0.2) return;
    if (Math.hypot(position.x - actor.position.x, position.z - actor.position.z) < 0.06) return;
    current.lastSent = clock.elapsedTime;
    current.pending = true;
    sampledPosition.current = { x: position.x, z: position.z };
    const submittedGeneration = generation.current;
    void move({ x: position.x, z: position.z })
      .then(
        (result) => {
          if (submittedGeneration !== generation.current) return;
          if (result.status === "corrected") restore(result.position);
        },
        () => {
          if (submittedGeneration === generation.current) restoreAccepted();
        },
      )
      .finally(() => {
        if (submittedGeneration === generation.current) current.pending = false;
      });
  });
  return { body, visual, camera, spawn };
}
