import { isInsideGuesthouse, SCENE_IDS, STUNT, stuntVehicleId } from "@gpta/core/scene";
import type { EntityId, Player, WorldSnapshot } from "@gpta/core/world";
import type { ConnectionState } from "../../../lib/world-connection";
import { ControlHint } from "../../../ui/game-controls";
import { DebugDetails } from "../../../ui/debug-details";
import { missionObjective } from "../models/mission-view";
import { Minimap } from "./minimap";

/** HUD notices follow accepted game state; CSS owns their brief display lifetime. */
export function GameHud({
  snapshot,
  player,
  connection,
  overview,
  destinationId = null,
  quiet = false,
  actions,
}: {
  snapshot: WorldSnapshot;
  player: Player;
  connection: ConnectionState;
  overview: boolean;
  destinationId?: EntityId | null;
  quiet?: boolean;
  actions: { pause: () => void; interact: () => void; overview: () => void; mission: () => void };
}) {
  const inside = isInsideGuesthouse(player.position);
  const mission = missionObjective(player);
  const stunt = player.stunt;
  let objective = mission.title;
  if (stunt?.stage === "running")
    objective = STUNT.checkpoints[stunt.checkpoint]?.label ?? "Deliver the film at the helipad";
  const remaining =
    stunt?.stage === "running"
      ? Math.max(0, Math.ceil((stunt.deadline - snapshot.time) / 1000))
      : null;
  return (
    <div className="astra-hud" data-quiet={quiet}>
      <div className="astra-hud-stats" aria-label="Cash">
        <output key={player.money} className="astra-hud-cash astra-notice">
          ₽{player.money.toLocaleString("en-US")}
        </output>
      </div>
      <p key={objective} className="astra-hud-objective astra-notice" role="status">
        {objective}
      </p>
      {remaining !== null && (
        <output className="astra-hud-timer" aria-label="Time remaining">
          {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
        </output>
      )}
      <div className="astra-hud-map">
        <Minimap snapshot={snapshot} player={player} destinationId={destinationId} />
        <meter
          className="astra-hud-health"
          aria-label="Health"
          min={0}
          max={100}
          value={player.health}
        >
          {player.health}
        </meter>
      </div>
      <p key={String(inside)} className="astra-hud-location astra-notice">
        {inside ? "Irina’s guesthouse" : "Red Square"}
      </p>
      {overview && (
        <button className="astra-overview-return" onClick={actions.overview}>
          <ControlHint keys="ESC">Return</ControlHint>
        </button>
      )}
      {connection.status !== "connected" && (
        <div className="astra-connection-alert" role="alert">
          <p>Connection lost. Reconnecting…</p>
          {connection.status === "disconnected" && <DebugDetails message={connection.message} />}
        </div>
      )}
    </div>
  );
}

/** New sessions track the current real objective without opening an interaction. */
export function initialDestination(player: Player): EntityId | null {
  if (player.stunt?.stage === "running")
    return player.stunt.checkpoint === 4 ? SCENE_IDS.helipad : stuntVehicleId(player.id);
  return player.shelter === "rented" ? null : missionObjective(player).targetId;
}
