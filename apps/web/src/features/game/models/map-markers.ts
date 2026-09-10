import { GUESTHOUSE, isInsideGuesthouse, SCENE_IDS } from "@gpta/core/scene";
import type { Actor, Entity, EntityId, Position, WorldSnapshot } from "@gpta/core/world";

export type MapMarkerKind =
  | "person"
  | "police"
  | "vehicle"
  | "helicopter"
  | "business"
  | "entrance"
  | "landmark"
  | "pickup"
  | "target"
  | "destination";
export type MapMarker = { id: EntityId; name: string; position: Position; kind: MapMarkerKind };

/** Resolve a tracked person through the room entrance while the player remains outside. */
export function mapDestination(
  snapshot: WorldSnapshot,
  player: Actor,
  destinationId: EntityId | null,
): MapMarker | null {
  const entity = snapshot.entities.find((entry) => entry.id === destinationId);
  if (!entity || !mapEntityAvailable(entity)) return null;
  const inside = isInsideGuesthouse(player.position);
  if (isInsideGuesthouse(entity.position) !== inside) {
    return {
      id: entity.id,
      name: inside ? `${entity.name} · exit guesthouse` : `${entity.name} · guesthouse entrance`,
      position: inside ? GUESTHOUSE.spawn : GUESTHOUSE.entrance,
      kind: "destination",
    };
  }
  return { id: entity.id, name: entity.name, position: entity.position, kind: "destination" };
}

/** Map markers identify usable places and objects; ordinary people remain in the world. */
export function mapMarkers(
  snapshot: WorldSnapshot,
  player: Actor,
  destinationId: EntityId | null,
): MapMarker[] {
  const inside = isInsideGuesthouse(player.position);
  const occupied = new Set(
    snapshot.entities.flatMap((entity) => {
      switch (entity.kind) {
        case "player":
        case "person":
        case "police":
          return entity.behavior.type === "driving" ? [entity.behavior.vehicleId] : [];
        default:
          return [];
      }
    }),
  );
  const markers: MapMarker[] = [];
  for (const entity of snapshot.entities) {
    if (entity.id === player.id || entity.id === destinationId || !mapEntityAvailable(entity))
      continue;
    if (inside && entity.id === SCENE_IDS.guesthouse) {
      markers.push({
        id: entity.id,
        name: "Exit guesthouse",
        position: GUESTHOUSE.spawn,
        kind: "entrance",
      });
      continue;
    }
    if (isInsideGuesthouse(entity.position) !== inside) continue;
    const kind = mapMarkerKind(entity);
    if (kind === null || (entity.kind === "vehicle" && occupied.has(entity.id))) continue;
    markers.push({ id: entity.id, name: entity.name, position: entity.position, kind });
  }
  const destination = mapDestination(snapshot, player, destinationId);
  if (destination) markers.push(destination);
  return markers;
}

function mapEntityAvailable(entity: Entity): boolean {
  switch (entity.kind) {
    case "pickup":
      return entity.claimedBy === null;
    case "player":
    case "person":
    case "police":
    case "target":
      return entity.health > 0;
    default:
      return true;
  }
}

function mapMarkerKind(entity: Entity): MapMarkerKind | null {
  switch (entity.kind) {
    case "player":
    case "person":
      return null;
    case "vehicle":
      return entity.vehicleType === "helicopter" ? "helicopter" : "vehicle";
    case "location":
      return entity.category === "guesthouse" ? "entrance" : "landmark";
    default:
      return entity.kind;
  }
}
