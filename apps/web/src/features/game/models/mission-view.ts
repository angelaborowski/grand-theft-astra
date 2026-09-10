import { SCENE_IDS, isInsideGuesthouse } from "@gpta/core/scene";
import { MISSION_TERMS, type Player } from "@gpta/core/world";

/** Mission copy follows the same progress and reward terms as the simulation. */
export function missionObjective(player: Player) {
  if (player.shelter === "rented")
    return {
      title: "Bed rented",
      description: "Your bed is saved. Explore the square and talk to its people.",
      targetId: isInsideGuesthouse(player.position) ? SCENE_IDS.irina : SCENE_IDS.guesthouse,
      label: "Track",
    };
  if (player.mission.stage === "completed")
    return {
      title: "Find a bed",
      description: `Visit Irina’s guesthouse. Rent a bed for ₽${MISSION_TERMS.bedPrice}.`,
      targetId: isInsideGuesthouse(player.position) ? SCENE_IDS.irina : SCENE_IDS.guesthouse,
      label: "Track",
    };
  if (player.mission.stage === "carrying")
    return {
      title: "Deliver the parcel to Lev",
      description: `Lev pays ₽${MISSION_TERMS.directReward}. Niko offers a shortcut for ₽${MISSION_TERMS.nikoReward}. The choice is yours.`,
      targetId: SCENE_IDS.lev,
      label: "Track",
    };
  return {
    title: "Talk to Mila",
    description: "Mila has a parcel for Lev. Speak to her and accept the delivery.",
    targetId: SCENE_IDS.mila,
    label: "Track",
  };
}
