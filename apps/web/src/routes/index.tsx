import { createFileRoute } from "@tanstack/react-router";
import { GamePage } from "../pages/game-page";
import { LoadingScreen } from "../ui/loading-screen";

/** All world traffic starts after the browser mounts the game. */
export const Route = createFileRoute("/")({
  component: GamePage,
  pendingComponent: () => (
    <LoadingScreen state={{ status: "pending", message: "Opening Moscow…" }} />
  ),
  errorComponent: () => (
    <LoadingScreen
      state={{
        status: "failed",
        message: "The game could not load.",
        actions: { retry: () => location.reload(), label: "Try again" },
      }}
    />
  ),
});
