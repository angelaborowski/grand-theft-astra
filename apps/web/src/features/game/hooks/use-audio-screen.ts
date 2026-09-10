import { useEffect } from "react";
import { useGameAudio } from "./use-game-audio";

/** Loading screens share the menu cue without delaying rendering. */
export function useAudioScreen(screen: "title" | "loading" | null) {
  const { audio } = useGameAudio();
  useEffect(() => {
    if (screen) audio?.setMix({ screen, space: "square", conversation: false, connected: false });
  }, [audio, screen]);
}
