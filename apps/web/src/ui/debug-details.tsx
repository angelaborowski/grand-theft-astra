import { GAME_DEBUG } from "../lib/game-debug";

/** Keep technical failure details available without adding them to player messages. */
export function DebugDetails({ message }: { message: string }) {
  if (!GAME_DEBUG) return null;
  return (
    <details className="entity-inspector astra-debug">
      <summary>Debug details</summary>
      <pre>{message}</pre>
    </details>
  );
}
