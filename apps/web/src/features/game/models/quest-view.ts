import { SCENE_IDS, STUNT, stuntVehicleId } from "@gpta/core/scene";
import { MISSION_TERMS, type EntityId, type Player } from "@gpta/core/world";
import { missionObjective } from "./mission-view";

/** Quest rows describe saved progress and target real entities only. */
export type QuestEntry = {
  id: "shelter" | "stunt";
  name: string;
  objective: string;
  description: string;
  targetId: EntityId | null;
  reward: string | null;
};

/** Quest identity survives destination changes; map destinations remain independent. */
export type QuestTracking =
  | { type: "objective" }
  | { type: "quest"; id: QuestEntry["id"] }
  | { type: "entity"; id: EntityId }
  | { type: "none" };

/** Stopping tracking hides the quest until the player explicitly tracks it again. */
export function trackedQuest(player: Player, tracking: QuestTracking): QuestEntry | null {
  if (tracking.type === "none" || tracking.type === "entity") return null;
  const id =
    tracking.type === "quest"
      ? tracking.id
      : player.stunt?.stage === "running"
        ? "stunt"
        : "shelter";
  const quest = playerQuests(player).find((entry) => entry.id === id);
  return quest?.targetId ? quest : null;
}

/** Only offered rewards and missions already present in player state appear here. */
export function playerQuests(player: Player): [QuestEntry, ...QuestEntry[]] {
  const objective = missionObjective(player);
  const deliveryOffered = player.mission.stage === "offered" || player.mission.stage === "carrying";
  const quests: [QuestEntry, ...QuestEntry[]] = [
    {
      id: "shelter",
      name: "Shelter",
      objective: objective.title,
      description: objective.description,
      targetId: player.shelter === "rented" ? null : objective.targetId,
      reward: deliveryOffered
        ? `₽${MISSION_TERMS.directReward} from Lev · ₽${MISSION_TERMS.nikoReward} from Niko`
        : null,
    },
  ];
  if (player.stunt) quests.push(stuntQuest(player.id, player.stunt));
  return quests;
}

function stuntQuest(playerId: EntityId, stunt: NonNullable<Player["stunt"]>): QuestEntry {
  if (stunt.stage === "running") {
    const atPickup = stunt.checkpoint === STUNT.checkpoints.length;
    return {
      id: "stunt",
      name: "Last Flight",
      objective: atPickup
        ? "Deliver the film at the helipad"
        : (STUNT.checkpoints[stunt.checkpoint]?.label ?? "Drive through the gates"),
      description: atPickup
        ? "Park at the helicopter and hand over the film."
        : "Follow the amber gates in order.",
      targetId: atPickup ? SCENE_IDS.helipad : stuntVehicleId(playerId),
      reward: `₽${STUNT.reward}`,
    };
  }
  const completed = stunt.stage === "completed";
  return {
    id: "stunt",
    name: "Last Flight",
    objective: completed ? "Film delivered" : "Flight missed",
    description: completed ? "The film reached the helicopter." : "Talk to Mila to try again.",
    targetId: completed ? null : SCENE_IDS.mila,
    reward: completed ? `₽${STUNT.reward}` : null,
  };
}
