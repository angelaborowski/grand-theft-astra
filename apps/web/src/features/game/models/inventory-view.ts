import type { Player } from "@gpta/core/world";

/** Stable row identities keep selection when ammunition or mission state changes. */
export type InventoryItem = {
  id: "parcel" | "film" | "pistol" | "ammunition";
  name: string;
  description: string;
};

/** Carried items derive from accepted mission and equipment state. */
export function inventoryItems(player: Player): InventoryItem[] {
  const items: InventoryItem[] = [];
  if (player.mission.stage === "carrying")
    items.push({ id: "parcel", name: "Sealed parcel", description: "Mila’s parcel for Lev." });
  if (player.stunt?.stage === "running")
    items.push({
      id: "film",
      name: "Film canister",
      description: "Deliver the film to the helicopter.",
    });
  if (player.equipment.pistol) {
    items.push({
      id: "pistol",
      name: "Pistol",
      description: "Equip the pistol to use it on foot.",
    });
    items.push({
      id: "ammunition",
      name: "Pistol ammunition",
      description: "Ammunition for your pistol.",
    });
  }
  return items;
}
