import {
  distance,
  isActor,
  type Actor,
  type Entity,
  type EntityId,
  type WorldSnapshot,
} from "@gpta/core/world";
import type { ActivityItem, DecisionItem } from "../../../ui/game-panels";
import { sceneSpace } from "@gpta/core/scene";

/** Show a stable game clock using UTC, independent of the browser locale. */
export function gameTime(time: number): string {
  return new Date(time).toISOString().slice(11, 19);
}

/** The selected entity remains inspectable at any distance; otherwise choose the nearest interaction. */
export function selectedEntity(
  snapshot: WorldSnapshot,
  player: Actor,
  selectedId: EntityId | null,
): Entity | undefined {
  const selected = snapshot.entities.find((entity) => entity.id === selectedId);
  const inside = sceneSpace(player.position);
  if (selected && sceneSpace(selected.position) === inside) return selected;
  return snapshot.entities
    .filter(
      (entity) =>
        entity.id !== player.id &&
        entity.kind !== "location" &&
        sceneSpace(entity.position) === inside,
    )
    .toSorted(
      (a, b) => distance(player.position, a.position) - distance(player.position, b.position),
    )[0];
}

/** Map persisted events into plain labels while retaining tool names. */
export function activityView(snapshot: WorldSnapshot): {
  events: ActivityItem[];
  decisions: DecisionItem[];
  mode: string;
} {
  const name = (id: EntityId) => snapshot.entities.find((entity) => entity.id === id)?.name ?? id;
  return {
    events: snapshot.events.toReversed().map((event) => ({
      id: event.id,
      time: gameTime(event.time),
      title: event.type.replaceAll("_", " "),
      detail: event.message,
      source: event.source,
    })),
    decisions: snapshot.decisions.toReversed().map((decision) => ({
      id: decision.id,
      actor: name(decision.actorId),
      status: decision.status === "running" ? "pending" : decision.status,
      detail: decision.summary,
    })),
    mode:
      snapshot.ai.status === "ready"
        ? `Astra · ${snapshot.ai.model}`
        : "Astra disabled · simulation only",
  };
}

/** Entity state supplies the inspection summary without another model of the same facts. */
export function entityDescription(entity: Entity): string {
  if (isActor(entity)) return `${entity.job} · ${entity.goal}`;
  if (entity.kind === "vehicle")
    return entity.ownerId === null ? "Unowned vehicle" : `Owned by ${entity.ownerId}`;
  if (entity.kind === "business") return `Price ₽${entity.price} · Balance ₽${entity.balance}`;
  return "Marked location · visit to create an activity event";
}
