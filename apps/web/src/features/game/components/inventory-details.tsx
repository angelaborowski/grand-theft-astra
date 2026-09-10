import type { PlayerCommand } from "@gpta/core/gameplay-v2";
import type { Player } from "@gpta/core/world";
import type { InventoryItem } from "../models/inventory-view";

/** Command failures remain visible through the shared menu notice. */
export function InventoryDetails({
  item,
  player,
  pending,
  connected,
  actions,
}: {
  item: InventoryItem;
  player: Player;
  pending: boolean;
  connected: boolean;
  actions: { command: ((command: PlayerCommand) => Promise<void>) | undefined };
}) {
  const pistol = player.equipment.pistol;
  const weaponItem = item.id === "pistol" || item.id === "ammunition";
  const driving = player.behavior.type === "driving";
  const reloading = player.combat.reload.type === "reloading";
  async function equip() {
    if (!pistol || !actions.command || pending || !connected || driving || reloading) return;
    try {
      await actions.command({ type: "equip", equipped: !pistol.equipped });
    } catch {
      // The command owner retains the failure and displays the menu notice.
      return;
    }
  }
  return (
    <section className="astra-pause-details" aria-label={item.name}>
      <h2>{item.name}</h2>
      <p>{item.description}</p>
      {pistol && weaponItem && (
        <dl className="astra-pause-summary">
          <div>
            <dt>Loaded</dt>
            <dd>{pistol.loaded}</dd>
          </div>
          <div>
            <dt>Reserve</dt>
            <dd>{pistol.reserve}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{pistol.equipped ? "Equipped" : "Holstered"}</dd>
          </div>
        </dl>
      )}
      {pistol && item.id === "pistol" && actions.command && (
        <button
          className="astra-pause-row"
          disabled={pending || !connected || driving || reloading}
          onClick={() => void equip()}
        >
          {pistol.equipped ? "Unequip" : "Equip"}
        </button>
      )}
      {pistol && item.id === "pistol" && driving && (
        <p className="astra-pause-note">Exit the vehicle to equip.</p>
      )}
      {pistol && weaponItem && reloading && <p className="astra-pause-note">Reloading…</p>}
    </section>
  );
}
