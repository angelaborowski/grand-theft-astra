import { BUILDINGS, GUESTHOUSE_COLLIDERS, sceneSpace } from "@gpta/core/scene";
import { PHYSICS } from "@gpta/core/gameplay-v2";
import type { Player as PlayerState } from "@gpta/core/world";
import { CameraControls, CameraControlsImpl } from "@react-three/drei";
import { Ecctrl } from "ecctrl";
import { bodyCenter, capsuleHalfHeight, usePlayerController } from "../hooks/use-player-controller";
import type { PlayerActions } from "../models/player-controls";
import { PLAYER_ASSET } from "../models/scene-assets";
import { CharacterModel } from "./character-model";
import { SceneCameraColliders } from "./scene-camera-colliders";
import { PlayerAudio } from "./player-audio";

/** The character predicts controls while the server owns its physical state and actions. */
export function Player({
  actor,
  enabled,
  inputEnabled,
  overview,
  actions,
}: {
  actor: PlayerState;
  enabled: boolean;
  inputEnabled: boolean;
  overview: boolean;
  actions: PlayerActions;
}) {
  const {
    controller,
    camera,
    visual,
    spawn,
    motion,
    posture,
    actions: controllerActions,
  } = usePlayerController({
    actor,
    enabled,
    inputEnabled,
    overview,
    actions,
  });
  const space = sceneSpace(actor.position);
  const inside = space !== "square";
  return (
    <>
      <PlayerAudio motion={motion} enabled={enabled && inputEnabled && !overview} />
      <Ecctrl
        ref={controller}
        position={[spawn.position.x, spawn.elevation + bodyCenter(spawn.posture), spawn.position.z]}
        rotation={[0, Math.PI - spawn.heading, 0]}
        capsuleRadius={PHYSICS.actorRadius}
        capsuleHalfHeight={capsuleHalfHeight(posture)}
        rayOriginOffest={-capsuleHalfHeight(posture)}
        floatHeight={PHYSICS.floatHeight}
        maxWalkVel={posture === "crouched" ? PHYSICS.crouchSpeed : PHYSICS.walkSpeed}
        maxRunVel={PHYSICS.runSpeed}
        useCustomForward
        enableToggleRun={false}
        jumpVel={PHYSICS.jumpSpeed}
        jumpDuration={1 / 60}
        fallingGravityScale={1}
        rayHitForgiveness={0.03}
      >
        <group ref={visual}>
          <group position={[0, -bodyCenter(posture), 0]} userData={{ localCharacter: true }}>
            <CharacterModel
              asset={PLAYER_ASSET}
              motion={motion}
              color="#d5ff78"
              armed={actor.equipment.pistol?.equipped === true}
            />
          </group>
        </group>
      </Ecctrl>
      <CameraControls
        ref={camera}
        enabled={enabled && inputEnabled}
        makeDefault
        minDistance={1.5}
        maxDistance={overview ? 500 : inside ? 5 : 10}
        maxPolarAngle={Math.PI / 2.05}
        minPolarAngle={0.2}
        smoothTime={0.18}
        mouseButtons={{
          left: CameraControlsImpl.ACTION.ROTATE,
          right: CameraControlsImpl.ACTION.ROTATE,
          middle: CameraControlsImpl.ACTION.NONE,
          wheel: CameraControlsImpl.ACTION.DOLLY,
        }}
      />
      <SceneCameraColliders
        attach={controllerActions.attachCameraColliders}
        boxes={space === "museum" ? [] : inside ? GUESTHOUSE_COLLIDERS : BUILDINGS}
        disabled={overview}
      />
    </>
  );
}
