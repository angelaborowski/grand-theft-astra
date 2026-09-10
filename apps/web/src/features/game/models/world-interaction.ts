import { PHYSICS, vehicleEntryRange } from "@gpta/core/gameplay-v2";
import { isInsideGuesthouse, sceneSpace, SCENE_IDS } from "@gpta/core/scene";
import { distance, isActor, type Entity, type Player } from "@gpta/core/world";

/** The visible prompt and the invoked action share the same accepted eligibility. */
export function nearbyInteraction(player: Player, entity: Entity | undefined): Entity | null {
  if (
    !entity ||
    player.behavior.type === "driving" ||
    entity.id === player.id ||
    sceneSpace(player.position) !== sceneSpace(entity.position)
  )
    return null;
  if (entity.kind === "target" || entity.kind === "player") return null;
  if (entity.kind === "pickup" && entity.claimedBy !== null) return null;
  if (
    entity.kind === "location" &&
    entity.id !== SCENE_IDS.guesthouse &&
    entity.id !== SCENE_IDS.helipad
  )
    return null;
  if (
    entity.id === SCENE_IDS.helipad &&
    (player.stunt?.stage !== "running" || player.stunt.checkpoint !== 4)
  )
    return null;
  const elevation = isActor(entity) || entity.kind === "vehicle" ? entity.elevation : 0;
  const range =
    entity.kind === "vehicle" ? vehicleEntryRange(entity.vehicleType) : PHYSICS.interactionRange;
  return Math.hypot(distance(player.position, entity.position), player.elevation - elevation) <=
    range
    ? entity
    : null;
}

/** Human-facing verbs describe the action that the displayed key performs. */
export function interactionPrompt(entity: Entity, player: Player) {
  if (entity.kind === "vehicle") return { key: "F", label: "Enter vehicle" };
  if (entity.kind === "pickup") return { key: "E", label: "Pick up" };
  if (entity.kind === "business") return { key: "G", label: "Hold to rob" };
  if (entity.id === SCENE_IDS.helipad) return { key: "E", label: "Hand over film" };
  if (entity.id === SCENE_IDS.guesthouse)
    return { key: "E", label: isInsideGuesthouse(player.position) ? "Leave" : "Enter" };
  return { key: "E", label: "Talk" };
}
