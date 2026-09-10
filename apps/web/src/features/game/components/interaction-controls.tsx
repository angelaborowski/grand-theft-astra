import type { PlayerAction } from "@gpta/core/actions";
import { isActor, type Entity, type Player } from "@gpta/core/world";
import { SCENE_IDS } from "@gpta/core/scene";
import { LeaveGuesthouse } from "./mission-actions";

/** Physical actions remain explicit controls while NPC conversations use free text. */
export function InteractionControls({
  entity,
  player,
  enabled,
  canAct,
  act,
}: {
  entity: Entity;
  player: Player;
  enabled: boolean;
  canAct: boolean;
  act: (action: PlayerAction) => void;
}) {
  return (
    <div className="interaction-buttons">
      <LeaveGuesthouse player={player} enabled={enabled} act={act} />
      {player.behavior.type === "driving" && (
        <button
          className="primary-button"
          disabled={!enabled}
          onClick={() => {
            if (player.behavior.type === "driving")
              act({ type: "exit_vehicle", targetId: player.behavior.vehicleId });
          }}
        >
          Exit vehicle
        </button>
      )}
      {entity.kind === "vehicle" && (
        <button
          className="primary-button"
          disabled={!canAct || player.behavior.type === "driving"}
          onClick={() => act({ type: "take_vehicle", targetId: entity.id })}
        >
          Take vehicle
        </button>
      )}
      {isActor(entity) && (
        <button disabled={!canAct} onClick={() => act({ type: "hit", targetId: entity.id })}>
          Hit
        </button>
      )}
      {entity.id === SCENE_IDS.guesthouse && (
        <button disabled={!canAct} onClick={() => act({ type: "enter", targetId: entity.id })}>
          Enter guesthouse
        </button>
      )}
      {entity.kind === "business" && (
        <button disabled={!canAct} onClick={() => act({ type: "rob", targetId: entity.id })}>
          Rob
        </button>
      )}
    </div>
  );
}
