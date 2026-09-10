import { LoadingScreen } from "../../../ui/loading-screen";
import { GAME_DEBUG } from "../../../lib/game-debug";
import { useWorld } from "../hooks/use-world";
import { useAudioScreen } from "../hooks/use-audio-screen";
import { GameSession } from "./game-session";
import "../../../ui/astra-game.css";

/** One connection owns the game session and its loading states. */
export default function Game({ actions }: { actions: { leave: () => void } }) {
  const world = useWorld();
  useAudioScreen(world.status === "ready" ? null : "loading");
  if (world.status === "failed")
    return (
      <LoadingScreen
        state={{
          status: "failed",
          message: GAME_DEBUG ? world.message : "Moscow is unavailable. Try again.",
          actions: { retry: world.retry, label: "Reconnect" },
        }}
      />
    );
  if (world.status === "pending") {
    if (world.connection.status === "disconnected")
      return (
        <LoadingScreen
          state={{
            status: "failed",
            message: GAME_DEBUG ? world.connection.message : "Connection lost. Try again.",
            actions: { retry: () => location.reload(), label: "Reconnect" },
          }}
        />
      );
    return (
      <LoadingScreen
        state={{ status: "pending", message: GAME_DEBUG ? world.stage : "Loading Moscow…" }}
      />
    );
  }
  return <GameSession world={world} actions={actions} />;
}
