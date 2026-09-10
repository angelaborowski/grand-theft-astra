import type { PlayerAction } from "@gpta/core/actions";
import { isInsideGuesthouse, SCENE_IDS } from "@gpta/core/scene";
import { MISSION_TERMS, type Entity, type Player } from "@gpta/core/world";

/** These controls submit explicit player choices; NPC dialogue never grants an effect by itself. */
export function MissionActions({
  player,
  entity,
  enabled,
  act,
}: {
  player: Player;
  entity: Entity;
  enabled: boolean;
  act: (action: PlayerAction) => void;
}) {
  return (
    <>
      {entity.id === SCENE_IDS.mila &&
        player.stunt?.stage !== "running" &&
        player.stunt?.stage !== "completed" && (
          <button
            className="primary-button"
            disabled={!enabled}
            onClick={() => act({ type: "start_stunt", targetId: entity.id })}
          >
            Start Last Flight · ₽250
          </button>
        )}
      {entity.id === SCENE_IDS.helipad && player.stunt?.stage === "running" && (
        <button
          className="primary-button"
          disabled={!enabled || player.behavior.type === "driving" || player.stunt.checkpoint < 4}
          onClick={() => act({ type: "finish_stunt", targetId: entity.id })}
        >
          Hand over film
        </button>
      )}

      {entity.id === SCENE_IDS.mila &&
        (player.mission.stage === "available" || player.mission.stage === "offered") && (
          <>
            <button
              disabled={!enabled}
              onClick={() => act({ type: "ask_for_work", targetId: entity.id })}
            >
              Ask for work
            </button>
            <button
              className="primary-button"
              disabled={!enabled}
              onClick={() => act({ type: "accept_mission", targetId: entity.id })}
            >
              Accept delivery
            </button>
          </>
        )}
      {player.mission.stage === "carrying" &&
        (entity.id === SCENE_IDS.lev || entity.id === SCENE_IDS.niko) && (
          <button
            className="primary-button"
            disabled={!enabled}
            onClick={() => act({ type: "deliver_parcel", targetId: entity.id })}
          >
            Deliver parcel · ₽
            {entity.id === SCENE_IDS.lev ? MISSION_TERMS.directReward : MISSION_TERMS.nikoReward}
          </button>
        )}
      {entity.id === SCENE_IDS.irina && player.shelter === "none" && (
        <button
          className="primary-button"
          disabled={!enabled || player.money < MISSION_TERMS.bedPrice}
          onClick={() => act({ type: "rent_bed", targetId: entity.id })}
        >
          Rent bed · ₽{MISSION_TERMS.bedPrice}
        </button>
      )}
    </>
  );
}

/** Leaving the room does not depend on the selected person or their distance. */
export function LeaveGuesthouse({
  player,
  enabled,
  act,
}: {
  player: Player;
  enabled: boolean;
  act: (action: PlayerAction) => void;
}) {
  if (!isInsideGuesthouse(player.position)) return null;
  return (
    <button
      disabled={!enabled}
      onClick={() => act({ type: "leave_location", targetId: SCENE_IDS.guesthouse })}
    >
      Leave guesthouse
    </button>
  );
}
