/** Each asset defines its source file and level before the current screen mix. */
export type AudioAsset = Readonly<{
  path: string;
  gain: number;
  channel: "music" | "world" | "interface";
}>;

/** Cues play once when a current action occurs; missed cues are never queued. */
export const soundCues = {
  "first-start": { path: "/assets/audio/first-start.mp3", gain: 1, channel: "interface" },
  "footstep-1": { path: "/assets/audio/review-v1/footstep-1.mp3", gain: 0.2, channel: "world" },
  "footstep-2": { path: "/assets/audio/review-v1/footstep-2.mp3", gain: 0.2, channel: "world" },
  "footstep-3": { path: "/assets/audio/review-v1/footstep-3.mp3", gain: 0.2, channel: "world" },
  select: { path: "/assets/audio/review-v1/select.mp3", gain: 0.22, channel: "interface" },
  reject: { path: "/assets/audio/review-v1/reject.mp3", gain: 0.24, channel: "interface" },
  reward: { path: "/assets/audio/review-v1/reward.mp3", gain: 0.32, channel: "interface" },
  door: { path: "/assets/audio/review-v1/door.mp3", gain: 0.32, channel: "world" },
  "traffic-horn": {
    path: "/assets/audio/city-review-v1/traffic-horn.mp3",
    gain: 0.24,
    channel: "world",
  },
  "police-radio": {
    path: "/assets/audio/city-review-v1/police-radio.mp3",
    gain: 0.3,
    channel: "world",
  },
} satisfies Record<string, AudioAsset>;

/** Only the replacement menu and clean plaza ambience enter the game mix. */
export const soundLoops = {
  menu: { path: "/assets/audio/menu-review-v2/menu.mp3", gain: 0.7, channel: "music" },
  square: { path: "/assets/audio/plaza-review-v1/plaza-air.mp3", gain: 0.4, channel: "world" },
  guesthouse: { path: "/assets/audio/review-v1/guesthouse.mp3", gain: 0.35, channel: "world" },
  crowd: { path: "/assets/audio/city-review-v1/crowd.mp3", gain: 0.24, channel: "world" },
  "car-idle": { path: "/assets/audio/city-review-v1/car-idle.mp3", gain: 0.32, channel: "world" },
  "car-drive": { path: "/assets/audio/city-review-v1/car-drive.mp3", gain: 0.4, channel: "world" },
  helicopter: { path: "/assets/audio/city-review-v1/helicopter.mp3", gain: 0.38, channel: "world" },
  "police-siren": { path: "/assets/audio/review-v1/police-siren.mp3", gain: 0.3, channel: "world" },
} satisfies Record<string, AudioAsset>;

/** An available action sound. */
export type SoundCue = keyof typeof soundCues;

/** An available continuous sound. */
export type SoundLoop = keyof typeof soundLoops;
