import type { Entity, Player } from "@gpta/core/world";
import { actionErrorMessage } from "../../../lib/world-connection";
import type { ReadyWorld } from "./game-session";
import { useSyncExternalStore } from "react";
import "../../../ui/gameplay.css";

/** Accepted equipment and the visible nearby target drive gameplay prompts. */
export function GameplayHud({
  player,
  target,
  active,
  command,
}: {
  player: Player;
  target: Entity | null;
  active: boolean;
  command: ReadyWorld["command"];
}) {
  const captured = useSyncExternalStore(subscribePointer, pointerCaptured, () => false);
  if (!active) return null;
  const pistol = player.equipment.pistol;
  const flying = player.behavior.type === "driving" && player.elevation > 0.2;
  return (
    <div className="gameplay-hud">
      <span className="gameplay-reticle" aria-hidden="true">
        +
      </span>
      <div className="gameplay-equipment" aria-label="Equipped item">
        {pistol?.equipped ? (
          <span>
            Pistol · {pistol.loaded} / {pistol.reserve}
          </span>
        ) : (
          <span>Unarmed</span>
        )}
        {player.combat.reload.type === "reloading" && <span role="status">Reloading…</span>}
        {flying && <span>Altitude {Math.round(player.elevation)} m · Land before exiting</span>}
      </div>
      <div className="gameplay-prompt" role="status">
        {!captured && <span>Click to look around with the mouse</span>}
        {target && (
          <span>
            <kbd>{target.kind === "vehicle" ? "F" : "E"}</kbd> {targetAction(target)} ·{" "}
            {target.name}
          </span>
        )}
        <CommandFeedback command={command} />
      </div>
    </div>
  );
}

function pointerCaptured(): boolean {
  return document.pointerLockElement !== null;
}

function subscribePointer(changed: () => void): () => void {
  document.addEventListener("pointerlockchange", changed);
  return () => document.removeEventListener("pointerlockchange", changed);
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
