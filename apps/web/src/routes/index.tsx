import { createFileRoute } from "@tanstack/react-router";
import { GamePage } from "../pages/game-page";

/** All world traffic starts after the browser mounts the game. */
export const Route = createFileRoute("/")({
  component: GamePage,
  pendingComponent: () => <div className="loading-screen">Opening Red Square…</div>,
  errorComponent: ({ reset }) => (
    <div className="loading-screen">
      <p>The game could not load.</p>
      <button onClick={reset}>Try again</button>
    </div>
  ),
});
