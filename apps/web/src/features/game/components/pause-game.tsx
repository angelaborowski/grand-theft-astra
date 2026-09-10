import type { WorldSnapshot } from "@gpta/core/world";
import { GAME_DEBUG } from "../../../lib/game-debug";
import type { ConnectionState } from "../../../lib/world-connection";
import { ActivityPanel, StatusBar } from "../../../ui/game-panels";
import { activityView, gameTime } from "../models/game-view";

/** Leaving stays unavailable while an owned action lacks a confirmed outcome. */
export function PauseGame({
  snapshot,
  connection,
  pending,
  actions,
}: {
  snapshot: WorldSnapshot;
  connection: ConnectionState;
  pending: boolean;
  actions: { close: () => void; leave: () => void };
}) {
  return (
    <div className="astra-pause-game">
      <div className="astra-pause-rows">
        <button className="astra-pause-row" onClick={actions.close}>
          Resume
        </button>
        <button className="astra-pause-row" disabled={pending} onClick={actions.leave}>
          Main menu
        </button>
      </div>
      <p className="astra-pause-note">Progress saves automatically.</p>
      {pending && (
        <p className="astra-pause-note" role="status">
          Finish your current action before leaving.
        </p>
      )}
      {GAME_DEBUG && (
        <details className="astra-pause-debug">
          <summary>Debug</summary>
          <StatusBar
            connection={connection.status}
            time={gameTime(snapshot.time)}
            population={snapshot.population.total}
            active={snapshot.population.activeIds.length}
          />
          <ActivityPanel {...activityView(snapshot)} />
        </details>
      )}
    </div>
  );
}
