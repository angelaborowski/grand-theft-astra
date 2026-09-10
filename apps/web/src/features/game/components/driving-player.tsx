import type { Player } from "@gpta/core/world";
import { CameraControls, CameraControlsImpl } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useDrivingController } from "../hooks/use-driving-controller";
import type { PlayerActions } from "../models/player-controls";
import type { Move } from "../models/player-movement";
import { Vehicle } from "./primitive-entities";

/** Arcade car steering preserves the existing Last Flight movement contract. */
export function DrivingPlayer(props: {
  actor: Player;
  enabled: boolean;
  inputEnabled: boolean;
  overview: boolean;
  move: Move;
  actions: Pick<PlayerActions, "command">;
}) {
  const { body, visual, camera, spawn } = useDrivingController(props);
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
        <group ref={visual} position={[0, -0.45, 0]} userData={{ localCharacter: true }}>
          <Vehicle color="#b8202b" />
        </group>
      </RigidBody>
      <CameraControls
        ref={camera}
        enabled={props.enabled && props.inputEnabled && !props.overview}
        makeDefault
        smoothTime={0.15}
        minDistance={5}
        maxDistance={500}
        mouseButtons={{
          left: CameraControlsImpl.ACTION.ROTATE,
          right: CameraControlsImpl.ACTION.ROTATE,
          middle: CameraControlsImpl.ACTION.NONE,
          wheel: CameraControlsImpl.ACTION.DOLLY,
        }}
      />
    </>
  );
}
