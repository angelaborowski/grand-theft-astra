import { useState } from "react";
import { GameControls, type ControlContext } from "../../../ui/game-controls";
import { useGameAudio } from "../hooks/use-game-audio";
import { SoundControl } from "./sound-control";

const contexts: { id: ControlContext; label: string }[] = [
  { id: "on-foot", label: "On foot" },
  { id: "helicopter", label: "Helicopter" },
  { id: "menus", label: "Menus" },
];

/** Settings contain only controls whose implementation is available in the game. */
export function SettingsMenu({
  initialCategory = "controls",
}: {
  initialCategory?: "controls" | "audio";
}) {
  const [context, setContext] = useState<ControlContext>("on-foot");
  const [category, setCategory] = useState<"controls" | "audio">(initialCategory);
  const { audio } = useGameAudio();
  const showAudio = category === "audio" && audio !== null;
  return (
    <div className="astra-pause-columns">
      <div className="astra-pause-rows" aria-label="Settings category">
        <button
          className="astra-pause-row"
          aria-pressed={!showAudio}
          onClick={() => setCategory("controls")}
        >
          Controls
        </button>
        {audio !== null && (
          <button
            className="astra-pause-row"
            aria-pressed={showAudio}
            onClick={() => setCategory("audio")}
          >
            Audio
          </button>
        )}
      </div>
      {showAudio ? (
        <section className="astra-pause-details astra-pause-audio" aria-label="Audio">
          <SoundControl variant="menu" />
        </section>
      ) : (
        <section className="astra-pause-details astra-pause-control-details" aria-label="Controls">
          <div className="astra-pause-contexts" role="group" aria-label="Control context">
            {contexts.map((entry) => (
              <button
                key={entry.id}
                aria-pressed={context === entry.id}
                onClick={() => setContext(entry.id)}
              >
                {entry.label}
              </button>
            ))}
          </div>
          <GameControls context={context} />
        </section>
      )}
    </div>
  );
}
