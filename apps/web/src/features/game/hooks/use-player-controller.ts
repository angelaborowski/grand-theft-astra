import { PHYSICS, PISTOL, PUNCH, type PlayerCommand } from "@gpta/core/gameplay-v2";
import { DISTRICT_BOUNDS, MUSEUM, sceneSpace } from "@gpta/core/scene";
import type { Player } from "@gpta/core/world";
import type { CameraControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import type { EcctrlHandle, MovementInput } from "ecctrl";
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { Quaternion, Vector3, type Group, type Object3D } from "three";
import type { CharacterMotion, CharacterPose } from "../models/character-poses";
import type { PlayerActions } from "../models/player-controls";
import { useCharacterInput } from "./use-character-input";

const stoppedInput = {
  forward: false,
  backward: false,
  leftward: false,
  rightward: false,
  run: false,
  jump: false,
  joystick: { x: 0, y: 0 },
} satisfies MovementInput;

/** Ecctrl predicts controls; accepted server state corrects the prediction without awarding effects. */
export function usePlayerController({
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
  const controller = useRef<EcctrlHandle>(null);
  const camera = useRef<CameraControls>(null);
  const visual = useRef<Group>(null);
  const visualCorrection = useRef(new Vector3());
  const visualLocal = useRef(new Vector3());
  const visualRotation = useRef(new Quaternion());
  const cameraTarget = useRef(new Vector3());
  const { world, rapier } = useRapier();
  const [spawn] = useState(() => actor);
  const [postureState, setPostureState] = useState({
    accepted: actor.posture,
    predicted: actor.posture,
  });
  const posture = postureState.predicted;
  if (postureState.accepted !== actor.posture) {
    setPostureState({ accepted: actor.posture, predicted: actor.posture });
  }
  const motion = useRef<CharacterMotion>({ speed: 0 });
  const generation = useRef(0);
  const lastSent = useRef(0);
  const transmission = useRef<"idle" | "active" | "stopping">("idle");
  const halfHeight = useRef(capsuleHalfHeight(actor.posture));
  const jump = useRef(false);
  const lastAttack = useRef(0);
  const gesture = useRef<{ action: CharacterPose["action"]; started: number }>({
    action: "none",
    started: 0,
  });
  const forward = useRef(new Vector3());
  const rotation = useRef(new Quaternion());
  const lastAim = useRef(false);
  const space = sceneSpace(actor.position);
  const inside = space !== "square";
  const cameraDistance = inside ? 3.5 : 6.5;
  const attachCameraColliders = useCallback((meshes: Object3D[]) => {
    const controls = camera.current;
    if (!controls) return () => {};
    controls.colliderMeshes = meshes;
    return () => {
      if (controls.colliderMeshes === meshes) controls.colliderMeshes = [];
    };
  }, []);

  const resizeBody = (next: Player["posture"]) => {
    const nextHeight = capsuleHalfHeight(next);
    const body = controller.current?.body;
    if (body && nextHeight !== halfHeight.current) {
      const position = body.translation();
      body.setTranslation({ ...position, y: position.y + nextHeight - halfHeight.current }, true);
    }
    halfHeight.current = nextHeight;
  };
  const resize = (next: Player["posture"]) => {
    resizeBody(next);
    setPostureState({ accepted: actor.posture, predicted: next });
  };
  const restore = useEffectEvent(() => {
    resizeBody(actor.posture);
    visualCorrection.current.set(0, 0, 0);
    restoreBody(controller.current, actor);
    jump.current = false;
  });
  const command = async (value: PlayerCommand): Promise<boolean> => {
    const currentGeneration = generation.current;
    try {
      await actions.command(value);
      return currentGeneration === generation.current;
    } catch {
      if (currentGeneration !== generation.current) return false;
      restore();
      resize(actor.posture);
      gesture.current = { action: "none", started: 0 };
      return false;
    }
  };
  const canStand = () => {
    const character = controller.current;
    if (!character?.body) return false;
    const position = character.body.translation();
    return (
      world.intersectionWithShape(
        { ...position, y: position.y + PHYSICS.standingHalfHeight - halfHeight.current },
        { x: 0, y: 0, z: 0, w: 1 },
        new rapier.Capsule(PHYSICS.standingHalfHeight, PHYSICS.actorRadius - 0.01),
        rapier.QueryFilterFlags.EXCLUDE_SENSORS,
        undefined,
        undefined,
        character.body,
      ) === null
    );
  };
  const input = useCharacterInput({
    enabled: enabled && inputEnabled && !overview,
    camera,
    actions: {
      jump: () => {
        if (!controller.current?.isOnGround || posture === "crouched") return;
        jump.current = true;
        void command({ type: "jump" });
      },
      crouch: () => {
        if (posture === "standing") resize("crouched");
        else if (canStand()) resize("standing");
        void command({ type: "crouch" });
      },
      primary: (yaw, pitch) => {
        const now = performance.now();
        const armed = actor.equipment.pistol?.equipped === true;
        if (now - lastAttack.current < (armed ? PISTOL.shotIntervalMs : PUNCH.intervalMs)) return;
        lastAttack.current = now;
        void command({ type: "primary", yaw, pitch }).then((accepted) => {
          if (accepted)
            gesture.current = { action: armed ? "fire" : "punch", started: performance.now() };
        });
      },
      reload: () => {
        void command({ type: "reload" });
      },
      interact: actions.interact,
      vehicle: actions.vehicle,
      target: actions.target,
      stop: () => {
        generation.current += 1;
        jump.current = false;
        gesture.current = { action: "none", started: 0 };
        stopController(controller.current);
      },
    },
  });
  useEffect(() => {
    generation.current += 1;
    return () => {
      generation.current += 1;
    };
  }, [actor.id, space]);
  useEffect(() => {
    restore();
  }, [actor.id, enabled, space]);
  useEffect(() => {
    const controls = camera.current;
    if (!controls) return;
    if (overview) {
      const x = (DISTRICT_BOUNDS.minX + DISTRICT_BOUNDS.maxX) / 2;
      const z = (DISTRICT_BOUNDS.minZ + DISTRICT_BOUNDS.maxZ) / 2;
      void controls.setLookAt(x, 335, z + 110, x, 0, z, true);
    } else {
      const position = controller.current?.body?.translation();
      if (position)
        void controls.setLookAt(
          position.x - Math.sin(spawn.heading) * cameraDistance,
          position.y + 1.6,
          position.z + Math.cos(spawn.heading) * cameraDistance,
          position.x,
          position.y + 0.3,
          position.z,
          false,
        );
    }
  }, [overview, cameraDistance, spawn.heading]);

  const previousAccepted = useRef(actor.position);
  useEffect(() => {
    const previous = previousAccepted.current;
    previousAccepted.current = actor.position;
    const distance = Math.hypot(actor.position.x - previous.x, actor.position.z - previous.z);
    const replay =
      space === "museum" &&
      actor.position.x === MUSEUM.spawn.x &&
      actor.position.z === MUSEUM.spawn.z &&
      distance > 0.01;
    if (distance <= 3 && !replay) return;
    generation.current += 1;
    transmission.current = "idle";
    restore();
    const height = actor.elevation + bodyCenter(actor.posture);
    void camera.current?.setLookAt(
      actor.position.x - Math.sin(actor.heading) * cameraDistance,
      height + 1.6,
      actor.position.z + Math.cos(actor.heading) * cameraDistance,
      actor.position.x,
      height + 0.3,
      actor.position.z,
      false,
    );
  }, [actor.position, actor.elevation, actor.heading, actor.posture, space, cameraDistance, input]);

  useFrame(({ clock }, delta) => {
    const character = controller.current;
    if (!character?.body) return;
    resizeBody(posture);
    const keys = input.read();
    forward.current.set(Math.sin(keys.yaw), 0, -Math.cos(keys.yaw));
    character.setForwardDir(forward.current);
    character.setLockForward(keys.aim);
    character.setMovement({
      forward: keys.forward > 0,
      backward: keys.forward < 0,
      leftward: keys.right < 0,
      rightward: keys.right > 0,
      run: keys.run && posture === "standing" && !keys.aim,
      jump: jump.current && posture === "standing" && keys.active,
      joystick: { x: 0, y: 0 },
    });
    jump.current = false;
    if (!keys.active) stopController(character);
    const position = character.body.translation();
    if (position.y < -2) {
      restore();
      return;
    }
    const velocity = character.body.linvel();
    const actionTime = (performance.now() - gesture.current.started) / 1000;
    const reload = actor.combat.reload.type === "reloading";
    const action = reload ? "reload" : actionTime < 0.4 ? gesture.current.action : "none";
    motion.current = {
      speed: Math.hypot(velocity.x, velocity.z),
      pose: {
        posture,
        grounded: character.isOnGround,
        aiming: keys.aim,
        pitch: keys.pitch,
        action,
        actionTime,
      },
    };
    // Blend only the render offset; the collision body accepts corrections immediately.
    visualCorrection.current.multiplyScalar(Math.exp(-18 * delta));
    if (visual.current?.parent) {
      visual.current.parent.getWorldQuaternion(visualRotation.current);
      visualLocal.current
        .copy(visualCorrection.current)
        .applyQuaternion(visualRotation.current.invert());
      visual.current.position.copy(visualLocal.current);
      visual.current.getWorldPosition(cameraTarget.current);
    } else cameraTarget.current.set(position.x, position.y, position.z);
    if (camera.current && !overview) {
      const target = cameraTarget.current;
      void camera.current.moveTo(target.x, target.y + 0.3, target.z, true);
      if (keys.aim !== lastAim.current) {
        lastAim.current = keys.aim;
        void camera.current.dollyTo(keys.aim ? 2.5 : cameraDistance, true);
        void camera.current.setFocalOffset(keys.aim ? 0.5 : 0, 0, 0, true);
      }
    }
    if (keys.active) transmission.current = "active";
    else if (transmission.current === "active") transmission.current = "stopping";
    if (
      !enabled ||
      transmission.current === "idle" ||
      clock.elapsedTime - lastSent.current < 0.05 ||
      delta > 0.3
    )
      return;
    lastSent.current = clock.elapsedTime;
    const submittedGeneration = generation.current;
    const sampled = { x: position.x, z: position.z, elevation: position.y - bodyCenter(posture) };
    void actions
      .control({
        forward: keys.forward,
        right: keys.right,
        cameraYaw: keys.yaw,
        cameraPitch: keys.pitch,
        run: keys.run && posture === "standing" && !keys.aim,
        aim: keys.aim,
        ascend: 0,
        turn: 0,
      })
      .then(
        (result) => {
          if (!result || submittedGeneration !== generation.current) return;
          const accepted = result.player;
          if (!keys.active && !input.read().active) transmission.current = "idle";
          const body = controller.current?.body;
          if (!body) return;
          resize(accepted.posture);
          const error = {
            x: accepted.position.x - sampled.x,
            y: accepted.elevation - sampled.elevation,
            z: accepted.position.z - sampled.z,
          };
          const errorLength = Math.hypot(error.x, error.y, error.z);
          if (errorLength > 2) {
            visualCorrection.current.set(0, 0, 0);
            restoreBody(controller.current, accepted);
          } else if (errorLength > 0.08) {
            visualCorrection.current.sub(new Vector3(error.x, error.y, error.z));
            const current = body.translation();
            body.setTranslation(
              { x: current.x + error.x, y: current.y + error.y, z: current.z + error.z },
              true,
            );
          }
          if (!keys.active) {
            rotation.current.setFromAxisAngle(
              forward.current.set(0, 1, 0),
              Math.PI - accepted.heading,
            );
            body.setRotation(rotation.current, true);
          }
        },
        () => {
          if (submittedGeneration !== generation.current) return;
          transmission.current = "idle";
          stopController(controller.current);
        },
      );
  });

  return { controller, camera, visual, spawn, motion, posture, actions: { attachCameraColliders } };
}

export function capsuleHalfHeight(posture: Player["posture"]): number {
  return posture === "crouched" ? PHYSICS.crouchedHalfHeight : PHYSICS.standingHalfHeight;
}

export function bodyCenter(posture: Player["posture"]): number {
  return capsuleHalfHeight(posture) + PHYSICS.actorRadius + PHYSICS.floatHeight;
}

function stopController(character: EcctrlHandle | null): void {
  if (!character?.body) return;
  character.setMovement(stoppedInput);
  const velocity = character.body.linvel();
  character.body.setLinvel({ x: 0, y: velocity.y, z: 0 }, true);
  character.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
}

function restoreBody(character: EcctrlHandle | null, actor: Player): void {
  if (!character?.body) return;
  character.setMovement(stoppedInput);
  character.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  character.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  character.body.setTranslation(
    { x: actor.position.x, y: actor.elevation + bodyCenter(actor.posture), z: actor.position.z },
    true,
  );
}
