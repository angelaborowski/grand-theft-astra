import { sceneSpace } from "@gpta/core/scene";
import type { Player } from "@gpta/core/world";

/** A controller changes when the player enters a room or a vehicle. */
export function movementContext(player: Player): string {
  const mode = player.behavior.type === "driving" ? player.behavior.vehicleId : "walking";
  return `${sceneSpace(player.position)}:${mode}`;
}
