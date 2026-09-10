import type { MovementControl } from "../models/player-movement";
import { DebugDetails } from "../../../ui/debug-details";

/** A failed position read keeps its recovery action visible while movement stays disabled. */
export function MovementStatus({ state, actions }: MovementControl) {
  if (state.status === "ready" || state.status === "submitting") return null;
  if (state.status === "restoring")
    return (
      <p className="astra-connection-alert" role="status">
        Restoring your position…
      </p>
    );
  async function restore() {
    try {
      await actions.restore();
    } catch {
      // The movement owner retains the failure message and disabled state.
      return;
    }
  }
  return (
    <div className="astra-connection-alert" role="alert">
      <p>Your position could not load.</p>
      <button onClick={() => void restore()}>Try again</button>
      <DebugDetails message={state.message} />
    </div>
  );
}
