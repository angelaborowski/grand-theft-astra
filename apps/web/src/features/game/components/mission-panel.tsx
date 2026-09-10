import { MISSION_TERMS, playerInventory, type EntityId, type Player } from "@gpta/core/world";
import { SCENE_IDS, isInsideGuesthouse } from "@gpta/core/scene";

/** Mission copy derives from persisted progress and the same reward terms as the simulation. */
export function MissionPanel({
  player,
  select,
}: {
  player: Player;
  select: (id: EntityId) => void;
}) {
  const objective = missionObjective(player);
  const inventory = playerInventory(player);
  return (
    <section className="mission-panel panel" aria-label="Current mission">
      <span className="eyebrow">YOUR FIRST DAY</span>
      <h2>{objective.title}</h2>
      <p>{objective.description}</p>
      <button className="primary-button" onClick={() => select(objective.targetId)}>
        {objective.label}
      </button>
      <dl className="player-progress">
        <div>
          <dt>Cash</dt>
          <dd>₽{player.money}</dd>
        </div>
        <div>
          <dt>Reputation</dt>
          <dd>{player.reputation}</dd>
        </div>
        <div>
          <dt>Shelter</dt>
          <dd>{player.shelter === "rented" ? "Bed rented" : "None"}</dd>
        </div>
      </dl>
      <p className="inventory-line">
        Inventory: {inventory.length === 0 ? "Empty" : inventory.join(", ")}
      </p>
    </section>
  );
}

function missionObjective(player: Player) {
  if (player.shelter === "rented")
    return {
      title: "You have a place to sleep.",
      description: "Your bed is saved. Explore the square and talk to its people.",
      targetId: SCENE_IDS.irina,
      label: "Find Irina",
    };
  if (player.mission.stage === "completed")
    return {
      title: "Find a bed for tonight.",
      description: `Visit Irina’s guesthouse. Rent a bed for ₽${MISSION_TERMS.bedPrice}.`,
      targetId: isInsideGuesthouse(player.position) ? SCENE_IDS.irina : SCENE_IDS.guesthouse,
      label: "Find the guesthouse",
    };
  if (player.mission.stage === "carrying")
    return {
      title: "Deliver Mila’s parcel.",
      description: `Lev pays ₽${MISSION_TERMS.directReward}. Niko offers a shortcut for ₽${MISSION_TERMS.nikoReward}. The choice is yours.`,
      targetId: SCENE_IDS.lev,
      label: "Find Lev",
    };
  return {
    title: "Meet Mila. Find work.",
    description: "Mila has a parcel for Lev. Speak to her and accept the delivery.",
    targetId: SCENE_IDS.mila,
    label: "Find Mila",
  };
}
