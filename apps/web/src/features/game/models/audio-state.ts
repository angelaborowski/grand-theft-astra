/** The page supplies its current screen and accepted player space. */
export type AudioView =
  | { readonly screen: "title" | "loading" }
  | { readonly screen: "playing" | "paused"; readonly space: "square" | "guesthouse" };

/** Volumes use the browser's gain scale from zero to one. */
export type AudioPreferences = Readonly<{ muted: boolean; music: number; effects: number }>;

/** The UI supplies these facts; audio does not derive game or connection state. */
export type AudioMix = Readonly<{
  screen: "title" | "loading" | "playing" | "paused";
  space: "square" | "guesthouse";
  conversation: boolean;
  connected: boolean;
}>;

/** Loading failure remains visible while successfully loaded sounds keep working. */
export type AudioStatus =
  | { readonly status: "locked"; readonly message: string; readonly unlocked: false }
  | { readonly status: "loading"; readonly message: string; readonly unlocked: boolean }
  | { readonly status: "ready"; readonly message: string; readonly unlocked: true }
  | { readonly status: "unavailable"; readonly message: string; readonly unlocked: boolean };

/** Defaults leave room for dialogue and simultaneous world sounds. */
export const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = {
  muted: false,
  music: 0.22,
  effects: 0.5,
};
