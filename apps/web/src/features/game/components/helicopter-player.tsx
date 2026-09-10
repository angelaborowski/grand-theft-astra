import { HELICOPTER } from "@gpta/core/gameplay-v2";
import { BUILDINGS } from "@gpta/core/scene";
import type { Player } from "@gpta/core/world";
import { CameraControls, CameraControlsImpl } from "@react-three/drei";
import { CylinderCollider, RigidBody } from "@react-three/rapier";
import { useHelicopterController } from "../hooks/use-helicopter-controller";
import type { PlayerActions } from "../models/player-controls";
import { HelicopterModel } from "./helicopter-model";
import { SceneCameraColliders } from "./scene-camera-colliders";

/** Flight predicts shared controls; the server owns height, collision acceptance, and the pilot seat. */
export function HelicopterPlayer(props: {
  actor: Player;
  enabled: boolean;
  inputEnabled: boolean;
  overview: boolean;
  actions: PlayerActions;
}) {
  const { body, camera, spawn, bodyCenter, attachCameraColliders } = useHelicopterController(props);
  return (
    <>
      <RigidBody
        ref={body}
        type="kinematicPosition"
        colliders={false}
        position={[spawn.position.x, spawn.elevation + bodyCenter, spawn.position.z]}
        rotation={[0, Math.PI - spawn.heading, 0]}
      >
        <CylinderCollider args={[0.75, HELICOPTER.radius]} />
        <group position={[0, -bodyCenter, 0]} userData={{ localCharacter: true }}>
          <HelicopterModel motion={{ mode: "controlled" }} />
        </group>
      </RigidBody>
      <CameraControls
        ref={camera}
        makeDefault
        enabled={props.enabled && props.inputEnabled && !props.overview}
        minDistance={5}
        maxDistance={500}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI - 0.2}
        smoothTime={0.18}
        mouseButtons={{
          left: CameraControlsImpl.ACTION.ROTATE,
          right: CameraControlsImpl.ACTION.ROTATE,
          middle: CameraControlsImpl.ACTION.NONE,
          wheel: CameraControlsImpl.ACTION.DOLLY,
        }}
      />
      <SceneCameraColliders
        attach={attachCameraColliders}
        boxes={BUILDINGS}
        disabled={props.overview}
      />
    </>
  );
}
