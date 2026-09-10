import { PCFShadowMap } from "three";
import type { Actor, EntityId, Position, WorldSnapshot } from "@gpta/core/world";
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

const keyboardMap = [
  { name: "forward", keys: ["KeyW", "ArrowUp"] },
  { name: "backward", keys: ["KeyS", "ArrowDown"] },
  { name: "leftward", keys: ["KeyA", "ArrowLeft"] },
  { name: "rightward", keys: ["KeyD", "ArrowRight"] },
  { name: "run", keys: ["ShiftLeft", "ShiftRight"] },
];

/** The renderer receives accepted world data and sends movement through the connection owner. */
export function GameScene({
  snapshot,
  player,
  enabled,
  overview,
  selectedId,
  actions,
}: {
  snapshot: WorldSnapshot;
  player: Actor;
  enabled: boolean;
  overview: boolean;
  selectedId: EntityId | null;
  actions: {
    move: (position: Position) => Promise<void>;
    select: (id: EntityId) => void;
    ready: (ready: boolean) => void;
  };
}) {
  const inside = isInsideGuesthouse(player.position);
  const visibleWorld = {
    ...snapshot,
    entities: snapshot.entities.filter(
      (entity) =>
        isInsideGuesthouse(entity.position) === inside &&
        (player.behavior.type !== "driving" || entity.id !== player.behavior.vehicleId),
    ),
  };
  return (
    <KeyboardControls map={keyboardMap}>
      <Canvas
        shadows={{ type: PCFShadowMap }}
        dpr={[1, 1.5]}
        camera={{ position: [0, 3.8, 6.5], fov: 58, far: 1600 }}
        gl={{ antialias: true, localClippingEnabled: true, toneMappingExposure: 1.05 }}
      >
        <color attach="background" args={["#bacbd0"]} />
        <fog attach="fog" args={["#bacbd0", 400, 900]} />
        <SceneLighting />
        <SceneEffects />
        <Suspense fallback={null}>
          <Physics timeStep={1 / 60} interpolate>
            {inside ? <GuesthouseScene /> : <CityScene />}
            <WorldEntities
              snapshot={visibleWorld}
              playerId={player.id}
              selectedId={selectedId}
              select={actions.select}
            />
            <Player actor={player} enabled={enabled} overview={overview} move={actions.move} />
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
