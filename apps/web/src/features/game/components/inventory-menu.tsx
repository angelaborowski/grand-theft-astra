import type { PlayerCommand } from "@gpta/core/gameplay-v2";
import type { Player } from "@gpta/core/world";
import { useState } from "react";
import { inventoryItems, type InventoryItem } from "../models/inventory-view";
import { InventoryDetails } from "./inventory-details";

/** Equipment actions use the existing command owner and accepted player state. */
export function InventoryMenu({
  player,
  pending,
  connected,
  actions,
}: {
  player: Player;
  pending: boolean;
  connected: boolean;
  actions: { command: ((command: PlayerCommand) => Promise<void>) | undefined };
}) {
  const [selectedId, setSelectedId] = useState<InventoryItem["id"] | null>(null);
  const items = inventoryItems(player);
  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  return (
    <div className="astra-pause-columns">
      <div className="astra-pause-list-column">
        <div className="astra-pause-rows" aria-label="Carried items">
          {items.length === 0 && <p className="astra-pause-empty">Empty</p>}
          {items.map((item) => (
            <button
              key={item.id}
              className="astra-pause-row"
              aria-pressed={selected?.id === item.id}
              onClick={() => setSelectedId(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
        <dl className="astra-pause-summary">
          <div>
            <dt>Reputation</dt>
            <dd>{player.reputation}</dd>
          </div>
          <div>
            <dt>Shelter</dt>
            <dd>{player.shelter === "rented" ? "Bed rented" : "None"}</dd>
          </div>
        </dl>
      </div>
      {selected && (
        <InventoryDetails
          item={selected}
          player={player}
          pending={pending}
          connected={connected}
          actions={actions}
        />
      )}
    </div>
  );
}
