import type { EntityId, Player, WorldSnapshot } from "@gpta/core/world";
import type { PlayerCommand } from "@gpta/core/gameplay-v2";
import type { ReactNode } from "react";
import type { ConnectionState } from "../../../lib/world-connection";
import { ControlHint } from "../../../ui/game-controls";
import { GameDialog } from "../../../ui/game-dialog";
import type { PauseTab } from "../models/menu-state";
import { PauseContent } from "./pause-content";
import { PauseTabs } from "./pause-tabs";

/** The menu stops local input while the shared city continues. */
export function PauseMenu({
  tab,
  snapshot,
  player,
  connection,
  pending,
  destinationId = null,
  notice,
  actions,
}: {
  tab: PauseTab;
  snapshot: WorldSnapshot;
  player: Player;
  connection: ConnectionState;
  pending: boolean;
  destinationId?: EntityId | null;
  notice?: ReactNode;
  actions: {
    close: () => void;
    tab: (tab: PauseTab) => void;
    select?: (id: EntityId) => void;
    track?: (id: EntityId | null) => void;
    overview: () => void;
    leave: () => void;
    command?: (command: PlayerCommand) => Promise<void>;
  };
}) {
  const activeTab = tab === "activity" ? "game" : tab;
  return (
    <GameDialog
      title="Grand Theft Astra menu"
      className="astra-pause"
      actions={{ close: actions.close }}
    >
      <header className="astra-pause-header">
        <h1>Grand Theft Astra</h1>
        <div className="astra-pause-player">
          <span>{player.name}</span>
          <span>₽{player.money}</span>
        </div>
      </header>
      <PauseTabs tab={activeTab} select={actions.tab} />
      <section
        className="astra-pause-body"
        data-tab={activeTab}
        id={`menu-page-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`menu-tab-${activeTab}`}
        tabIndex={0}
      >
        <PauseContent
          tab={activeTab}
          snapshot={snapshot}
          player={player}
          connection={connection}
          pending={pending}
          destinationId={destinationId}
          actions={{
            close: actions.close,
            track: actions.track,
            overview: actions.overview,
            leave: actions.leave,
            ...(actions.command ? { command: actions.command } : {}),
          }}
        />
      </section>
      <footer className="astra-pause-bottom">
        {notice && <div className="astra-pause-notice">{notice}</div>}
        <span>World continues</span>
        <button onClick={actions.close}>
          <ControlHint keys="ESC">Resume</ControlHint>
        </button>
      </footer>
    </GameDialog>
  );
}
