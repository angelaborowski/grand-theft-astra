import type { PlayerCommand, PlayerControl, PlayerControlResult } from "@gpta/core/gameplay-v2";
import type { EntityId } from "@gpta/core/world";

export type PlayerKey =
  | "forward"
  | "backward"
  | "leftward"
  | "rightward"
  | "run"
  | "brake"
  | "turnLeft"
  | "turnRight";

/** The connection owns command acknowledgement and accepted movement results. */
export type PlayerActions = {
  control: (input: PlayerControl) => Promise<PlayerControlResult | null>;
  command: (command: PlayerCommand) => Promise<void>;
  interact: (targetId: EntityId | null) => void;
  vehicle: (targetId: EntityId | null) => void;
  target: (targetId: EntityId | null) => void;
  aim?: (aiming: boolean) => void;
};

/** Drei owns keyboard state; the focus gate reads this same mapping. */
export const PLAYER_KEYBOARD_MAP = [
  { name: "forward", keys: ["KeyW", "ArrowUp"] },
  { name: "backward", keys: ["KeyS", "ArrowDown"] },
  { name: "leftward", keys: ["KeyA", "ArrowLeft"] },
  { name: "rightward", keys: ["KeyD", "ArrowRight"] },
  { name: "run", keys: ["ShiftLeft", "ShiftRight"] },
  { name: "brake", keys: ["Space"] },
  { name: "turnLeft", keys: ["KeyQ"] },
  { name: "turnRight", keys: ["KeyE"] },
] satisfies { name: PlayerKey; keys: string[] }[];

export const DIRECTION_KEYS = ["forward", "backward", "leftward", "rightward"] as const;
