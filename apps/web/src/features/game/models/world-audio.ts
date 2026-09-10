import { sceneSpace } from "@gpta/core/scene";
import { distance, type EntityId, type Player, type WorldSnapshot } from "@gpta/core/world";
import type { SoundCue } from "./audio-catalog";

/**
 * Select sounds from accepted state changes for this player.
 * Callers clear the baseline on reconnect or visibility resume to suppress historical sounds.
 */
export function selectAudioCues(
  previous: WorldSnapshot | null,
  current: WorldSnapshot,
  playerId: EntityId,
): SoundCue[] {
  if (!previous || current.revision <= previous.revision) return [];
  const before = previous.entities.find((entity) => entity.id === playerId);
  const player = current.entities.find((entity) => entity.id === playerId);
  if (before?.kind !== "player" || player?.kind !== "player") return [];
  const cues: SoundCue[] = [];
  if (
    (before.mission.stage !== "completed" && player.mission.stage === "completed") ||
    (before.stunt?.stage !== "completed" && player.stunt?.stage === "completed") ||
    (before.shelter !== "rented" && player.shelter === "rented")
  )
    cues.push("reward");
  if (sceneSpace(before.position) !== sceneSpace(player.position)) cues.push("door");
  if (hasNearbyDispatch(previous, current, player)) cues.push("police-radio");
  return cues;
}

function hasNearbyDispatch(
  previous: WorldSnapshot,
  current: WorldSnapshot,
  player: Player,
): boolean {
  return current.reports.some((report) => {
    if (
      report.status !== "dispatched" ||
      previous.reports.some((entry) => entry.id === report.id && entry.status === "dispatched")
    )
      return false;
    return current.entities.some(
      (entity) =>
        entity.kind === "police" &&
        entity.assignment === report.id &&
        entity.health > 0 &&
        sceneSpace(entity.position) === sceneSpace(player.position) &&
        distance(entity.position, player.position) <= 35,
    );
  });
}

/** Nearby living people contribute a distance fade within their current space, capped at 0.18. */
export function nearbyCrowdGain(snapshot: WorldSnapshot, player: Player): number {
  const inside = sceneSpace(player.position);
  let gain = 0;
  for (const entity of snapshot.entities) {
    if (entity.kind !== "person" || entity.health <= 0 || sceneSpace(entity.position) !== inside)
      continue;
    gain += Math.max(0, 1 - distance(entity.position, player.position) / 25) * 0.06;
  }
  return Math.min(0.18, gain);
}
