import type { Player } from "@gpta/core/world";

/** Equipment status uses accepted state and stays with time and money. */
export function GameEquipment({ player }: { player: Player }) {
  const pistol = player.equipment.pistol;
  const flying = player.behavior.type === "driving" && player.elevation > 0.2;
  return (
    <div className="gameplay-equipment" aria-label="Equipped item">
      <span>{pistol?.equipped ? `Pistol · ${pistol.loaded} / ${pistol.reserve}` : "Unarmed"}</span>
      {player.combat.reload.type === "reloading" && <span role="status">Reloading…</span>}
      {flying && <span>Altitude {Math.round(player.elevation)} m · Land before exiting</span>}
    </div>
  );
}
