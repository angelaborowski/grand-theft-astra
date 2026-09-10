import { SCENE_IDS, STUNT, stuntVehicleId } from "@gpta/core/scene";
import type { EntityId, Player } from "@gpta/core/world";

export function StuntObjective({
  player,
  time,
  select,
}: {
  player: Player;
  time: number;
  select: (id: EntityId) => void;
}) {
  const mission = player.stunt;
  const running = mission?.stage === "running";
  const remaining = running ? Math.max(0, Math.ceil((mission.deadline - time) / 1000)) : 0;
  const title =
    mission?.stage === "completed"
      ? "Film delivered"
      : mission?.stage === "failed"
        ? "Flight missed"
        : running
          ? (player.behavior.type !== "driving" ||
              player.behavior.vehicleId !== stuntVehicleId(player.id)) &&
            mission.checkpoint < 4
            ? "Get in your stunt car"
            : (STUNT.checkpoints[mission.checkpoint]?.label ?? "Park. Get out. Deliver the film.")
          : "Last Flight";
  const description = running
    ? "Follow the amber gates in order. Space brakes. Stop at the helicopter and hand over the film."
    : mission?.stage === "completed"
      ? "₽250 earned · +2 reputation. Your next stop is up to you."
      : mission?.stage === "failed"
        ? "No penalty. Meet Mila to try again."
        : "Mila needs a driver. Two ramps, one film canister, and a helicopter that won't wait.";
  const target = running
    ? mission.checkpoint === 4
      ? SCENE_IDS.helipad
      : stuntVehicleId(player.id)
    : SCENE_IDS.mila;
  return (
    <section className="stunt-objective" aria-label="Last Flight mission">
      <div className="objective-kicker">
        <span>{running ? `LAST FLIGHT · ${mission.checkpoint}/4` : "FIRST JOB"}</span>
        {running && (
          <time className={remaining < 30 ? "urgent" : ""}>
            {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
          </time>
        )}
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      {mission?.stage !== "completed" && (
        <button onClick={() => select(target)}>
          {running ? (mission.checkpoint === 4 ? "Locate pickup" : "Locate car") : "Find Mila"}
        </button>
      )}
    </section>
  );
}
