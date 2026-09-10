import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { useGameEntry } from "../features/game/hooks/use-game-entry";
import { useAudioScreen } from "../features/game/hooks/use-audio-screen";
import { GameAudioProvider } from "../features/game/hooks/use-game-audio";
import { LoadingScreen } from "../ui/loading-screen";
import { TitleScreen } from "../ui/title-screen";

const Game = lazy(() => import("../features/game/components/game"));

/** Three.js and Rapier load in the browser, after the HTML shell. */
export function GamePage() {
  return (
    <GameAudioProvider>
      <GameEntry />
    </GameAudioProvider>
  );
}

function GameEntry() {
  const entry = useGameEntry();
  useAudioScreen(entry.started ? null : "title");
  if (!entry.started) return <TitleScreen {...entry} />;
  return (
    <ClientOnly fallback={<Loading />}>
      <Suspense fallback={<Loading />}>
        <Game actions={{ leave: entry.actions.leave }} />
      </Suspense>
    </ClientOnly>
  );
}

function Loading() {
  useAudioScreen("loading");
  return <LoadingScreen state={{ status: "pending", message: "Opening Moscow…" }} />;
}
