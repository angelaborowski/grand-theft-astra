import { SCENE_IDS } from "@gpta/core/scene";
import { isActor, type Entity, type EntityId, type WorldSnapshot } from "@gpta/core/world";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { Group } from "three";
import { GAME_DEBUG } from "../../../lib/game-debug";
import { CHARACTER_ASSETS, PLAYER_ASSET } from "../models/scene-assets";
import { CharacterModel, type CharacterMotion } from "./character-model";
import { Person, Vehicle } from "./primitive-entities";
import { HelicopterModel } from "./helicopter-model";
import { PickupModel, PracticeTarget } from "./pickup-model";

const namedEntities = new Set<EntityId>(Object.values(SCENE_IDS));

/** Every rendered person has a canonical identity and persistent memory. */
export function WorldEntities({
  snapshot,
  playerId,
  selectedId,
  select,
}: {
  snapshot: WorldSnapshot;
  playerId: EntityId;
  selectedId: EntityId | null;
  select: (id: EntityId) => void;
}) {
  return (
    <>
      {snapshot.entities
        .filter(
          (entity) =>
            entity.id !== playerId &&
            !(isActor(entity) && entity.behavior.type === "driving") &&
            !(entity.kind === "pickup" && entity.claimedBy !== null) &&
            (entity.kind !== "location" ||
              entity.category === "guesthouse" ||
              entity.id === SCENE_IDS.helipad),
        )
        .map((entity) => (
          <WorldEntity
            key={entity.id}
            entity={entity}
            selected={entity.id === selectedId}
            select={select}
          />
        ))}
    </>
  );
}

function WorldEntity({
  entity,
  selected,
  select,
}: {
  entity: Entity;
  selected: boolean;
  select: (id: EntityId) => void;
}) {
  const group = useRef<Group>(null);
  const motion = useRef<CharacterMotion>({ speed: 0 });
  const [initialPosition] = useState(() => entity.position);
  const asset = CHARACTER_ASSETS.get(entity.id) ?? (isActor(entity) ? PLAYER_ASSET : undefined);
  const palette = ["#3f596a", "#6d5148", "#4b6251", "#80624b", "#66536d", "#69747a"];
  const color = !CHARACTER_ASSETS.has(entity.id)
    ? palette[
        Array.from(entity.id).reduce((n, letter) => n + letter.charCodeAt(0), 0) % palette.length
      ]
    : undefined;
  const elevation = isActor(entity) || entity.kind === "vehicle" ? entity.elevation : 0;
  useFrame((_, delta) => {
    if (!group.current || delta <= 0) return;
    const alpha = 1 - Math.exp(-delta * 10);
    const dx = (entity.position.x - group.current.position.x) * alpha;
    const dz = (entity.position.z - group.current.position.z) * alpha;
    group.current.position.x += dx;
    group.current.position.y += (elevation - group.current.position.y) * alpha;
    group.current.position.z += dz;
    const speed = Math.hypot(dx, dz) / delta;
    motion.current.speed += (speed - motion.current.speed) * (1 - Math.exp(-delta * 5));
    if (speed > 0.05 || entity.kind === "player" || entity.kind === "vehicle") {
      const desired =
        entity.kind === "player" || entity.kind === "vehicle"
          ? Math.PI - entity.heading
          : Math.atan2(dx, dz);
      const difference = Math.atan2(
        Math.sin(desired - group.current.rotation.y),
        Math.cos(desired - group.current.rotation.y),
      );
      group.current.rotation.y += Math.max(-delta * 4, Math.min(delta * 4, difference));
    }
  });
  return (
    <group
      ref={group}
      position={[initialPosition.x, elevation, initialPosition.z]}
      userData={{ entityId: entity.id }}
      onClick={(event) => {
        event.stopPropagation();
        if (!document.pointerLockElement) select(entity.id);
      }}
    >
      {asset ? (
        <CharacterModel asset={asset} motion={motion} {...(color ? { color } : {})} />
      ) : (
        <EntityBody entity={entity} />
      )}
      {(selected || (GAME_DEBUG && namedEntities.has(entity.id))) && (
        <Html position={[0, entity.kind === "business" ? 4 : 2.5, 0]} center zIndexRange={[8, 0]}>
          <button className="entity-label" onClick={() => select(entity.id)}>
            {entity.kind === "player" && entity.name === "You" ? "Player" : entity.name}
          </button>
        </Html>
      )}
      {GAME_DEBUG && selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 0]}>
          <ringGeometry args={[1.3, 1.55, 32]} />
          <meshBasicMaterial color="#d5ff78" />
        </mesh>
      )}
    </group>
  );
}

function EntityBody({ entity }: { entity: Entity }) {
  if (entity.kind === "vehicle")
    return entity.vehicleType === "helicopter" ? (
      <HelicopterModel motion={{ mode: "controlled" }} />
    ) : (
      <Vehicle color={entity.color} />
    );
  if (entity.kind === "pickup") return <PickupModel pickup={entity} />;
  if (entity.kind === "target") return <PracticeTarget target={entity} />;
  if (entity.id === SCENE_IDS.helipad)
    return (
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    );
  if (entity.kind === "location")
    return (
      <group>
        <mesh position={[0, 1.7, 0]}>
          <boxGeometry args={[2.5, 3.4, 0.6]} />
          <meshStandardMaterial color="#86967b" />
        </mesh>
        <mesh position={[0, 1.4, 0.32]}>
          <planeGeometry args={[1.5, 2.8]} />
          <meshStandardMaterial color="#544c3e" />
        </mesh>
      </group>
    );
  // Angela's world-detail GLB already contains the book stall at this entity's coordinates.
  if (entity.kind === "business")
    return (
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[4.6, 3, 3]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    );
  return <Person color={entity.kind === "police" ? "#4b71b5" : "#cb9872"} />;
}
