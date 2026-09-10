import type { Entity, Player } from "@gpta/core/world";
import { VehicleHints } from "./vehicle-hints";
import { actionErrorMessage } from "../../../lib/world-connection";
import type { ReadyWorld } from "./game-session";
import { useGameAudio } from "../hooks/use-game-audio";
import "../../../ui/gameplay.css";

/** Controls stay at the screen center, independent of the status area. */
export function GameplayHud({
  target,
  active,
  command,
  player,
  vehicle,
}: {
  target: Entity | null;
  active: boolean;
  command: ReadyWorld["command"];
  player: Player;
  vehicle: Extract<Entity, { kind: "vehicle" }> | null;
}) {
  const { subtitle } = useGameAudio();
  if (!active) return null;
  return (
    <div className="gameplay-hud">
      <span className="gameplay-reticle" aria-hidden="true">
        +
      </span>
      <div className="gameplay-prompt" role="status">
        {vehicle && <VehicleHints vehicle={vehicle} player={player} />}
        {!vehicle && target && (
          <span>
            <kbd>{target.kind === "vehicle" ? "F" : "E"}</kbd> {targetAction(target)} ·{" "}
            {target.name}
          </span>
        )}
        <CommandFeedback command={command} />
      </div>
      {subtitle && (
        <p className="gameplay-subtitle" role="status">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/** A rejected action remains visible without repeating its possible effects. */
export function CommandFeedback({ command }: { command: ReadyWorld["command"] }) {
  if (command.status !== "error") return null;
  return <p role="alert">{actionErrorMessage(command.error)}</p>;
}

function targetAction(target: Entity): string {
  if (target.kind === "pickup") return "Collect";
  if (target.kind === "vehicle") return "Enter";
  if (target.kind === "location") return "Use";
  if (target.kind === "target") return "Inspect";
  return "Interact";
}
