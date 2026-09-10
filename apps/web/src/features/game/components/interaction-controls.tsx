import type { PlayerAction } from "@gpta/core/actions";
import { SCENE_IDS } from "@gpta/core/scene";
import { isActor, type Entity, type Player } from "@gpta/core/world";
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
      {entity.id === SCENE_IDS.mila &&
        player.stunt?.stage !== "running" &&
        player.stunt?.stage !== "completed" && (
          <button
            className="primary-button"
            disabled={!canAct}
            onClick={() => act({ type: "start_stunt", targetId: entity.id })}
          >
            Start Last Flight · ₽250
          </button>
        )}
      {entity.id === SCENE_IDS.helipad && player.stunt?.stage === "running" && (
        <button
          className="primary-button"
          disabled={!canAct || player.behavior.type === "driving" || player.stunt.checkpoint < 4}
          onClick={() => act({ type: "finish_stunt", targetId: entity.id })}
        >
          Hand over film
        </button>
      )}
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
      {entity.kind === "vehicle" && player.behavior.type !== "driving" && (
        <button
          className="primary-button"
          disabled={!canAct}
          onClick={() => act({ type: "take_vehicle", targetId: entity.id })}
        >
          Take vehicle
        </button>
      )}
      {isActor(entity) && (
        <button disabled={!canAct} onClick={() => act({ type: "hit", targetId: entity.id })}>
          Hit NPC
        </button>
      )}
      {(entity.kind === "business" || entity.kind === "location") && (
        <button disabled={!canAct} onClick={() => act({ type: "enter", targetId: entity.id })}>
          Enter location
        </button>
      )}
      {entity.kind === "business" && (
        <button disabled={!canAct} onClick={() => act({ type: "rob", targetId: entity.id })}>
          Rob location
        </button>
      )}
    </div>
  );
}
