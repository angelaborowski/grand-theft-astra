import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
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
  const [started, setStarted] = useState(false);
  useAudioScreen(started ? null : "title");
  if (!started) return <TitleScreen actions={{ start: () => setStarted(true) }} />;
  return (
    <ClientOnly fallback={<Loading />}>
      <Suspense fallback={<Loading />}>
        <Game actions={{ leave: () => setStarted(false) }} />
      </Suspense>
    </ClientOnly>
  );
}

function Loading() {
  useAudioScreen("loading");
  return <LoadingScreen state={{ status: "pending", message: "Opening Moscow…" }} />;
}
