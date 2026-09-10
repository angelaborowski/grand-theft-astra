import type { PlayerCommand } from "@gpta/core/gameplay-v2";
import type { EntityId, Player, WorldSnapshot } from "@gpta/core/world";
import type { ConnectionState } from "../../../lib/world-connection";
import type { PauseTab } from "../models/menu-state";
import { InventoryMenu } from "./inventory-menu";
import { MissionPanel } from "./mission-panel";
import { PauseGame } from "./pause-game";
import { PauseMap } from "./pause-map";
import { SettingsMenu } from "./settings-menu";

/** Tabs use accepted world state; destination tracking never opens a conversation. */
export function PauseContent({
  tab,
  snapshot,
  player,
  connection,
  pending,
  destinationId,
  actions,
}: {
  tab: PauseTab;
  snapshot: WorldSnapshot;
  player: Player;
  connection: ConnectionState;
  pending: boolean;
  destinationId: EntityId | null;
  actions: {
    close: () => void;
    track: ((id: EntityId | null) => void) | undefined;
    overview: () => void;
    leave: () => void;
    command?: (command: PlayerCommand) => Promise<void>;
  };
}) {
  if (tab === "map")
    return (
      <PauseMap
        snapshot={snapshot}
        player={player}
        destinationId={destinationId}
        actions={{ track: actions.track ?? (() => {}), overview: actions.overview }}
      />
    );
  if (tab === "mission")
    return (
      <MissionPanel
        player={player}
        snapshot={snapshot}
        destinationId={destinationId}
        actions={{ track: actions.track }}
      />
    );
  if (tab === "inventory")
    return (
      <InventoryMenu
        player={player}
        pending={pending}
        connected={connection.status === "connected"}
        actions={{ command: actions.command }}
      />
    );
  if (tab === "settings") return <SettingsMenu />;
  return (
    <PauseGame
      snapshot={snapshot}
      connection={connection}
      pending={pending}
      actions={{ close: actions.close, leave: actions.leave }}
    />
  );
}
