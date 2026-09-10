import { PCFShadowMap } from "three";
import type { Player as PlayerState, EntityId, WorldSnapshot } from "@gpta/core/world";
import { PHYSICS } from "@gpta/core/gameplay-v2";
import { KeyboardControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Suspense, useEffect } from "react";
import { isInsideGuesthouse } from "@gpta/core/scene";
import { CityScene } from "./city-scene";
import { Player } from "./player";
import { WorldEntities } from "./world-entities";
import { SceneEffects } from "./scene-effects";
import { SceneLighting } from "./scene-lighting";
import { GuesthouseScene } from "./guesthouse-scene";
import type { Move } from "../models/player-movement";
import { PLAYER_KEYBOARD_MAP, type PlayerActions } from "../models/player-controls";
import { DrivingPlayer } from "./driving-player";
import { StuntCourse } from "./stunt-course";
import { FrameMeter } from "./frame-meter";
import { WorldAudio } from "./world-audio";
import { HelicopterPlayer } from "./helicopter-player";

/** The renderer receives accepted world data and sends movement through the connection owner. */
export function GameScene({
  snapshot,
  player,
  enabled,
  inputEnabled,
  overview,
  selectedId,
  actions,
}: {
  snapshot: WorldSnapshot;
  player: PlayerState;
  enabled: boolean;
  inputEnabled: boolean;
  overview: boolean;
  selectedId: EntityId | null;
  actions: PlayerActions & {
    move: Move;
    select: (id: EntityId) => void;
    ready: (ready: boolean) => void;
  };
}) {
  const inside = isInsideGuesthouse(player.position);
  const behavior = player.behavior;
  const vehicle =
    behavior.type === "driving"
      ? snapshot.entities.find(
          (entity) => entity.id === behavior.vehicleId && entity.kind === "vehicle",
        )
      : undefined;
  const flying = vehicle?.kind === "vehicle" && vehicle.vehicleType === "helicopter";
  const visibleWorld = {
    ...snapshot,
    entities: snapshot.entities.filter(
      (entity) =>
        isInsideGuesthouse(entity.position) === inside &&
        (player.behavior.type !== "driving" || entity.id !== player.behavior.vehicleId),
    ),
  };
  return (
    <KeyboardControls map={PLAYER_KEYBOARD_MAP}>
      <Canvas
        shadows={{ type: PCFShadowMap }}
        dpr={[1, 1.5]}
        camera={{ position: [0, 3.8, 6.5], fov: 58, near: 0.3, far: 1600 }}
        gl={{ antialias: true, localClippingEnabled: true, toneMappingExposure: 0.9 }}
      >
        <color attach="background" args={["#bacbd0"]} />
        <fog attach="fog" args={["#bacbd0", 400, 900]} />
        <SceneLighting />
        <SceneEffects />
        <FrameMeter />
        <WorldAudio snapshot={snapshot} player={player} enabled={enabled} />
        <Suspense fallback={null}>
          <Physics timeStep={1 / 60} gravity={[0, PHYSICS.gravity, 0]} interpolate>
            {inside ? <GuesthouseScene /> : <CityScene />}
            <WorldEntities
              snapshot={visibleWorld}
              playerId={player.id}
              selectedId={selectedId}
              select={(id) => {
                if (inputEnabled) actions.select(id);
              }}
            />
            {!inside && (
              <StuntCourse
                player={player}
                helicopterVisible={
                  !snapshot.entities.some(
                    (entity) => entity.kind === "vehicle" && entity.vehicleType === "helicopter",
                  )
                }
              />
            )}
            {flying && (
              <HelicopterPlayer
                actor={player}
                enabled={enabled}
                inputEnabled={inputEnabled}
                overview={overview}
                actions={actions}
              />
            )}
            {player.behavior.type === "driving" && !flying && (
              <DrivingPlayer
                actor={player}
                enabled={enabled}
                inputEnabled={inputEnabled}
                overview={overview}
                move={actions.move}
                actions={actions}
              />
            )}
            {player.behavior.type !== "driving" && (
              <Player
                actor={player}
                enabled={enabled}
                inputEnabled={inputEnabled}
                overview={overview}
                actions={actions}
              />
            )}
            <SceneReady ready={actions.ready} />
          </Physics>
        </Suspense>
      </Canvas>
    </KeyboardControls>
  );
}

function SceneReady({ ready }: { ready: (ready: boolean) => void }) {
  useEffect(() => {
    ready(true);
  }, [ready]);
  return null;
}
