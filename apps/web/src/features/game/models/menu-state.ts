/** Only one menu owns keyboard input at a time. */
export type PauseTab = "map" | "mission" | "inventory" | "settings" | "game" | "activity";
/** The open menu determines which controls receive input. */
export type GameMenu =
  | { view: "closed" }
  | { view: "pause"; tab: PauseTab }
  | { view: "interaction" };

export const PAUSE_TABS: { id: PauseTab; label: string }[] = [
  { id: "map", label: "Map" },
  { id: "mission", label: "Quests" },
  { id: "inventory", label: "Inventory" },
  { id: "settings", label: "Settings" },
  { id: "game", label: "Game" },
];
