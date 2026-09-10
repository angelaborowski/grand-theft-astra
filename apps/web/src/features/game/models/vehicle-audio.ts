import { sceneSpace, MOVEMENT } from "@gpta/core/scene";
import {
  isActor,
  type Entity,
  type EntityId,
  type Player,
  type WorldSnapshot,
} from "@gpta/core/world";

type Vehicle = Extract<Entity, { kind: "vehicle" }>;
type VehicleSample = { readonly vehicle: Vehicle; readonly speed: number };

/** Arrival time measures motion because the world clock updates less often than positions. */
export type VehicleAudioSample = {
  readonly revision: number;
  readonly receivedAt: number;
  readonly vehicles: ReadonlyMap<EntityId, VehicleSample>;
};

export type VehicleAudioEmitter = {
  readonly id: string;
  readonly loop: "car-idle" | "car-drive" | "helicopter";
  readonly position: { readonly x: number; readonly y: number; readonly z: number };
  readonly gain: number;
};

/** Ignore old revisions and reset motion after gaps; rapid updates share one stable sample. */
export function sampleVehicleAudio(
  snapshot: WorldSnapshot,
  previous: VehicleAudioSample | null,
  receivedAt: number,
): VehicleAudioSample {
  const elapsed = previous ? (receivedAt - previous.receivedAt) / 1000 : 0;
  if (previous && (snapshot.revision <= previous.revision || elapsed < 0.08)) return previous;
  const continuous = previous !== null && snapshot.revision > previous.revision && elapsed <= 2;
  const vehicles = new Map<EntityId, VehicleSample>();
  for (const vehicle of snapshot.entities) {
    if (vehicle.kind !== "vehicle") continue;
    const prior = previous?.vehicles.get(vehicle.id);
    let speed = 0;
    if (continuous && prior) {
      const moved = Math.hypot(
        vehicle.position.x - prior.vehicle.position.x,
        vehicle.position.z - prior.vehicle.position.z,
      );
      // Restored positions must not create a sudden engine acceleration.
      if (moved <= MOVEMENT.driveSpeed * elapsed + 1) {
        speed = Math.min(MOVEMENT.driveSpeed, moved / elapsed);
      }
    }
    vehicles.set(vehicle.id, { vehicle, speed });
  }
  return { revision: snapshot.revision, receivedAt, vehicles };
}

/** A driver, not ownership, activates an engine; each nearby car shares two loop voices. */
export function vehicleAudioEmitters(
  snapshot: WorldSnapshot,
  player: Player,
  sample: VehicleAudioSample,
): VehicleAudioEmitter[] {
  const occupied = new Set<EntityId>();
  for (const entity of snapshot.entities) {
    if (isActor(entity) && entity.health > 0 && entity.behavior.type === "driving") {
      occupied.add(entity.behavior.vehicleId);
    }
  }
  const inside = sceneSpace(player.position);
  const nearest = snapshot.entities
    .filter(
      (entity): entity is Vehicle =>
        entity.kind === "vehicle" &&
        occupied.has(entity.id) &&
        sceneSpace(entity.position) === inside,
    )
    .map((vehicle) => ({
      vehicle,
      distance: Math.hypot(
        vehicle.position.x - player.position.x,
        vehicle.elevation - player.elevation,
        vehicle.position.z - player.position.z,
      ),
    }))
    .sort((left, right) => left.distance - right.distance)
    .slice(0, 4);
  const emitters: VehicleAudioEmitter[] = [];
  for (const { vehicle } of nearest) {
    const position = { x: vehicle.position.x, y: vehicle.elevation + 1, z: vehicle.position.z };
    if (vehicle.vehicleType === "helicopter") {
      emitters.push({ id: `${vehicle.id}:helicopter`, loop: "helicopter", position, gain: 0.55 });
      continue;
    }
    const speed = sample.vehicles.get(vehicle.id)?.speed ?? 0;
    const driving = Math.min(1, speed / 8);
    emitters.push(
      { id: `${vehicle.id}:car-idle`, loop: "car-idle", position, gain: (1 - driving) * 0.6 },
      { id: `${vehicle.id}:car-drive`, loop: "car-drive", position, gain: driving * 0.65 },
    );
  }
  return emitters;
}
