import { HELICOPTER } from "@gpta/core/gameplay-v2";
import { CONTACT_TOLERANCE, DISTRICT_BOUNDS } from "@gpta/core/scene";
import type { Player } from "@gpta/core/world";
import type { CameraControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useBeforePhysicsStep, useRapier, type RapierRigidBody } from "@react-three/rapier";
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import type { Object3D } from "three";
import type { PlayerActions } from "../models/player-controls";
import { useVehicleInput } from "./use-vehicle-input";

const bodyCenter = 0.75 + CONTACT_TOLERANCE;
const step = 1 / 60;

/** Rapier predicts the server's constant-speed flight and resolves the same cylinder against scene colliders. */
export function useHelicopterController({
  actor,
  enabled,
  inputEnabled,
  overview,
  actions,
}: {
  actor: Player;
  enabled: boolean;
  inputEnabled: boolean;
  overview: boolean;
  actions: PlayerActions;
}) {
  const { world, rapier } = useRapier();
  const body = useRef<RapierRigidBody>(null);
  const camera = useRef<CameraControls>(null);
  const [spawn] = useState(actor);
  const controller = useRef<ReturnType<typeof world.createCharacterController> | null>(null);
  const heading = useRef(actor.heading);
  const sequence = useRef(0);
  const lastSent = useRef(0);
  const generation = useRef(0);
  const pending = useRef(false);
  const transmission = useRef<"idle" | "active" | "stopping">("idle");
  const stop = () => {
    if (transmission.current === "active") transmission.current = "stopping";
    const rigid = body.current;
    if (!rigid) return;
    rigid.setNextKinematicTranslation(rigid.translation());
    rigid.setLinvel({ x: 0, y: 0, z: 0 }, true);
  };
  const input = useVehicleInput(enabled && inputEnabled && !overview, camera, {
    exit: () => {
      void actions.command({ type: "exit_vehicle" }).catch(stop);
    },
    stop,
  });
  const restore = useEffectEvent(() => {
    if (!body.current) return;
    heading.current = actor.heading;
    const position = { x: actor.position.x, y: actor.elevation + bodyCenter, z: actor.position.z };
    body.current.setTranslation(position, true);
    body.current.setNextKinematicTranslation(position);
    stop();
  });
  useEffect(() => {
    const movement = world.createCharacterController(CONTACT_TOLERANCE);
    movement.setSlideEnabled(true);
    movement.setApplyImpulsesToDynamicBodies(false);
    controller.current = movement;
    generation.current += 1;
    pending.current = false;
    return () => {
      generation.current += 1;
      controller.current = null;
      world.removeCharacterController(movement);
    };
  }, [world]);
  useEffect(() => {
    restore();
  }, [enabled, actor.id]);
  const attachCameraColliders = useCallback((meshes: Object3D[]) => {
    const controls = camera.current;
    if (!controls) return () => {};
    controls.colliderMeshes = meshes;
    return () => {
      if (controls.colliderMeshes === meshes) controls.colliderMeshes = [];
    };
  }, []);
  useEffect(() => {
    const controls = camera.current;
    if (!controls) return;
    if (overview) void controls.setLookAt(10, 335, 160, 10, 0, 50, true);
    else {
      const position = body.current?.translation();
      if (position)
        void controls.setLookAt(
          position.x - Math.sin(heading.current) * 12,
          position.y + 5,
          position.z + Math.cos(heading.current) * 12,
          position.x,
          position.y + 0.8,
          position.z,
          false,
        );
    }
  }, [overview]);
  useBeforePhysicsStep(() => {
    const rigid = body.current;
    const movement = controller.current;
    if (!rigid || !movement) return;
    const keys = input.read();
    const position = rigid.translation();
    heading.current += keys.turn * step * 1.4;
    const length = Math.max(1, Math.hypot(keys.forward, keys.right));
    const forward = keys.forward / length;
    const right = keys.right / length;
    const elevation = Math.max(0, position.y - bodyCenter);
    const vertical = Math.min(
      HELICOPTER.maxElevation - elevation,
      keys.ascend * HELICOPTER.maxVerticalSpeed * step,
    );
    movement.computeColliderMovement(
      rigid.collider(0),
      {
        x:
          (Math.sin(heading.current) * forward + Math.cos(heading.current) * right) *
          HELICOPTER.maxHorizontalSpeed *
          step,
        y: vertical - (elevation < 0.02 && vertical <= 0 ? 0.01 : 0),
        z:
          (-Math.cos(heading.current) * forward + Math.sin(heading.current) * right) *
          HELICOPTER.maxHorizontalSpeed *
          step,
      },
      rapier.QueryFilterFlags.EXCLUDE_SENSORS | rapier.QueryFilterFlags.EXCLUDE_DYNAMIC,
    );
    const delta = movement.computedMovement();
    rigid.setNextKinematicTranslation({
      x: Math.max(
        DISTRICT_BOUNDS.minX + HELICOPTER.radius,
        Math.min(DISTRICT_BOUNDS.maxX - HELICOPTER.radius, position.x + delta.x),
      ),
      y: Math.max(bodyCenter, Math.min(HELICOPTER.maxElevation + bodyCenter, position.y + delta.y)),
      z: Math.max(
        DISTRICT_BOUNDS.minZ + HELICOPTER.radius,
        Math.min(DISTRICT_BOUNDS.maxZ - HELICOPTER.radius, position.z + delta.z),
      ),
    });
    const rotation = Math.PI - heading.current;
    rigid.setNextKinematicRotation({
      x: 0,
      y: Math.sin(rotation / 2),
      z: 0,
      w: Math.cos(rotation / 2),
    });
  });
  useFrame(({ clock }) => {
    const rigid = body.current;
    if (!rigid) return;
    const position = rigid.translation();
    if (camera.current && !overview)
      void camera.current.moveTo(position.x, position.y + 0.8, position.z, true);
    const keys = input.read();
    if (keys.active) transmission.current = "active";
    else if (transmission.current === "active") transmission.current = "stopping";
    if (
      !enabled ||
      pending.current ||
      transmission.current === "idle" ||
      clock.elapsedTime - lastSent.current < 0.05
    )
      return;
    lastSent.current = clock.elapsedTime;
    pending.current = true;
    const submitted = {
      generation: generation.current,
      sequence: sequence.current++,
      position,
      heading: heading.current,
    };
    void actions
      .control({
        sequence: submitted.sequence,
        forward: keys.forward,
        right: keys.right,
        cameraYaw: heading.current,
        cameraPitch: 0,
        run: false,
        aim: false,
        ascend: keys.ascend,
        turn: keys.turn,
      })
      .then(
        (result) => {
          const current = body.current;
          if (submitted.generation !== generation.current) return;
          if (!keys.active && transmission.current === "stopping") transmission.current = "idle";
          if (!result || !current || result.sequence !== submitted.sequence) return;
          const accepted = result.player;
          const error = {
            x: accepted.position.x - submitted.position.x,
            y: accepted.elevation + bodyCenter - submitted.position.y,
            z: accepted.position.z - submitted.position.z,
          };
          const large = Math.hypot(error.x, error.y, error.z) > 3;
          if (large) input.release();
          const currentPosition = current.translation();
          const corrected = large
            ? { x: accepted.position.x, y: accepted.elevation + bodyCenter, z: accepted.position.z }
            : {
                x: currentPosition.x + error.x,
                y: currentPosition.y + error.y,
                z: currentPosition.z + error.z,
              };
          current.setTranslation(corrected, true);
          current.setNextKinematicTranslation(corrected);
          heading.current += accepted.heading - submitted.heading;
        },
        () => {
          if (submitted.generation === generation.current) {
            input.release();
            stop();
            transmission.current = "idle";
          }
        },
      )
      .finally(() => {
        if (submitted.generation === generation.current) pending.current = false;
      });
  });
  return { body, camera, spawn, bodyCenter, attachCameraColliders };
}
