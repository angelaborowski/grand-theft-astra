import { sceneSpace } from "@gpta/core/scene";
import { FlagPennantIcon } from "@phosphor-icons/react";
import type { EntityId, Player, WorldSnapshot } from "@gpta/core/world";
import type { ConnectionState } from "../../../lib/world-connection";
import { ControlHint } from "../../../ui/game-controls";
import { DebugDetails } from "../../../ui/debug-details";
import { gameTime } from "../models/game-view";
import type { QuestEntry } from "../models/quest-view";
import { Minimap } from "./minimap";
import { GameEquipment } from "./game-equipment";

/** Status stays visible; the tracked quest shares the map destination. */
export function GameHud({
  snapshot,
  player,
  connection,
  overview,
  destinationId = null,
  quiet = false,
  pending = false,
  quest,
  actions,
}: {
  snapshot: WorldSnapshot;
  player: Player;
  connection: ConnectionState;
  overview: boolean;
  destinationId?: EntityId | null;
  quiet?: boolean;
  pending?: boolean;
  quest: QuestEntry | null;
  actions: {
    pause: () => void;
    interact: () => void;
    overview: () => void;
    mission: () => void;
    launch?: () => void;
    museum?: () => void;
  };
}) {
  const space = sceneSpace(player.position);
  const inside = space !== "square";
  const stunt = player.stunt;
  const remaining =
    stunt?.stage === "running"
      ? Math.max(0, Math.ceil((stunt.deadline - snapshot.time) / 1000))
      : null;
  return (
    <div className="astra-hud" data-quiet={quiet}>
      {!quiet && !overview && (
        <div className="astra-opening-actions">
          {space === "square" &&
            player.behavior.type !== "driving" &&
            stunt?.stage !== "completed" &&
            stunt?.stage !== "running" &&
            actions.launch && (
              <button disabled={pending} onClick={actions.launch}>
                Play first mission
              </button>
            )}
          {space !== "guesthouse" &&
            player.behavior.type !== "driving" &&
            stunt?.stage !== "running" &&
            actions.museum && (
              <button disabled={pending} onClick={actions.museum}>
                {space === "museum" ? "Restart museum walk" : "Museum opening"}
              </button>
            )}
        </div>
      )}
      <div className="astra-hud-stats" aria-label="Player status">
        <time className="astra-hud-clock" aria-label="Game time">
          {gameTime(snapshot.time).slice(0, 5)}
        </time>
        <output className="astra-hud-cash" aria-label="Money">
          ₽{player.money.toLocaleString("en-US")}
        </output>
        <GameEquipment player={player} />
        {space === "museum" ? (
          <div className="astra-hud-quest" role="status">
            <span className="astra-hud-quest-name">Museum opening</span>
            <p className="astra-hud-objective">
              Walk through the hall, down the steps, and out into Red Square.
            </p>
          </div>
        ) : (
          quest && (
            <div className="astra-hud-quest" role="status">
              <span className="astra-hud-quest-name">
                <FlagPennantIcon size={18} weight="fill" aria-hidden="true" />
                <span>Quest · {quest.name}</span>
              </span>
              <p className="astra-hud-objective">{quest.objective}</p>
            </div>
          )
        )}
        {remaining !== null && (
          <output className="astra-hud-timer" aria-label="Time remaining">
            {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
          </output>
        )}
      </div>
      <div className="astra-hud-map">
        <Minimap snapshot={snapshot} player={player} destinationId={destinationId} />
        <div className="astra-hud-vitals">
          <span className="astra-hud-health-label">
            Health <strong>{player.health}</strong>
          </span>
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
      </div>
      <p className="astra-hud-location">
        {space === "museum" ? "Historical Museum" : inside ? "Irina’s guesthouse" : "Red Square"}
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
