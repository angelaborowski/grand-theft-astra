import { AudioControl } from "../../../ui/audio-control";
import { useGameAudio } from "../hooks/use-game-audio";

/** The same preference controls title and game sound. */
export function SoundControl({ variant = "button" }: { variant?: "menu" | "button" }) {
  const { muted, status, toggle } = useGameAudio();
  return (
    <AudioControl
      muted={muted}
      locked={!status.unlocked}
      unavailable={status.status === "unavailable"}
      message={status.message}
      variant={variant}
      actions={{ toggle }}
    />
  );
}
