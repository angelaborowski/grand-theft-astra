import type { Actor, EntityId, Position, WorldSnapshot } from "@gpta/core/world";
import { KeyboardControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Suspense, useEffect } from "react";
import { isInsideGuesthouse } from "@gpta/core/scene";
import { CityScene } from "./city-scene";
import { Player } from "./player";
import { WorldEntities } from "./world-entities";
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
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [0, 3.8, 6.5], fov: 58, far: 1600 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#bacbd0"]} />
        <fog attach="fog" args={["#bacbd0", 400, 900]} />
        <ambientLight intensity={0.5} />
        <hemisphereLight args={["#c9e2f5", "#b9a587", 2.1]} />
        <directionalLight
          position={[-65, 110, 30]}
          intensity={2.8}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-250}
          shadow-camera-right={250}
          shadow-camera-top={250}
          shadow-camera-bottom={-250}
          shadow-camera-far={700}
          shadow-normalBias={0.06}
        />
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
