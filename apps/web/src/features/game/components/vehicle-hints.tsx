import type { Entity, Player } from "@gpta/core/world";

/** Vehicle hints replace nearby interactions while the player drives. */
export function VehicleHints({
  vehicle,
  player,
}: {
  vehicle: Extract<Entity, { kind: "vehicle" }>;
  player: Player;
}) {
  const flying = vehicle.vehicleType === "helicopter";
  const landed = player.grounded && vehicle.elevation <= 0.2;
  return (
    <div className="gameplay-vehicle-hints" aria-label="Vehicle controls">
      <div>
        <span>
          <kbd>W A S D</kbd> {flying ? "Move" : "Drive"}
        </span>
        {flying && (
          <span>
            <kbd>Q E</kbd> Turn
          </span>
        )}
        <span>
          <kbd>Space</kbd> {flying ? "Up" : "Brake"}
        </span>
        {flying && (
          <span>
            <kbd>Shift</kbd> Down
          </span>
        )}
      </div>
      <span>
        {flying && !landed ? (
          <>
            Hold <kbd>Shift</kbd> to land before exiting
          </>
        ) : (
          <>
            Stop, then <kbd>F</kbd> Exit
          </>
        )}
      </span>
    </div>
  );
}
