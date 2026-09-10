import { PCFShadowMap } from "three";
import type { Player as PlayerState, EntityId, WorldSnapshot } from "@gpta/core/world";
import { PHYSICS } from "@gpta/core/gameplay-v2";
import { KeyboardControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Suspense, useEffect } from "react";
import { sceneSpace } from "@gpta/core/scene";
import { CityScene } from "./city-scene";
import { Player } from "./player";
import { WorldEntities } from "./world-entities";
import { SceneEffects } from "./scene-effects";
import { Snowfall } from "./snowfall";
import { SceneLighting } from "./scene-lighting";
import { MuseumScene } from "./museum-scene";
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
  const space = sceneSpace(player.position);
  const inside = space !== "square";
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
        sceneSpace(entity.position) === space &&
        (player.behavior.type !== "driving" || entity.id !== player.behavior.vehicleId),
    ),
  };
  return (
    <KeyboardControls map={PLAYER_KEYBOARD_MAP}>
      <Canvas
        shadows={{ type: PCFShadowMap }}
        dpr={1}
        camera={{ position: [0, 3.8, 6.5], fov: 58, near: 0.3, far: 1600 }}
        gl={{ antialias: true, localClippingEnabled: true, toneMappingExposure: 0.9 }}
      >
        <color attach="background" args={["#d4dfe8"]} />
        {!inside && <fog attach="fog" args={["#d4dfe8", 260, 1000]} />}
        {space !== "museum" && <SceneLighting />}
        {!inside && <Snowfall />}
        {inside && <SceneEffects />}
        <FrameMeter />
        <WorldAudio snapshot={snapshot} player={player} enabled={enabled} />
        <Suspense fallback={null}>
          <Physics timeStep={1 / 60} gravity={[0, PHYSICS.gravity, 0]} interpolate>
            {space === "museum" ? <MuseumScene /> : inside ? <GuesthouseScene /> : <CityScene />}
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
                key={`${player.behavior.vehicleId}:${player.stunt?.stage === "running" ? player.stunt.deadline : "free-drive"}`}
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
                key={space}
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
