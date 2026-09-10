import { z } from "zod";
import type { ActionContext, ActionResult } from "./actions";
import { recordIncident } from "./actions";
import { isInsideGuesthouse, MOVEMENT, PROTECTED_CHARACTER_IDS } from "./scene";
import {
  distance,
  EntityIdSchema,
  isActor,
  PlayerSchema,
  type EntityId,
  type Position,
  type WorldSnapshot,
} from "./world";

/** Elevation measures the feet above the gameplay floor, in meters. */
export const PHYSICS = {
  walkSpeed: MOVEMENT.walkSpeed,
  runSpeed: MOVEMENT.runSpeed,
  crouchSpeed: MOVEMENT.crouchSpeed,
  actorRadius: MOVEMENT.actorRadius,
  standingHalfHeight: 0.45,
  crouchedHalfHeight: 0.15,
  floatHeight: 0.05,
  jumpSpeed: 7,
  gravity: -20,
  interactionRange: 2,
} as const;
/** One pistol uses a fixed magazine, firing interval, and reload duration. */
export const PISTOL = {
  magazineSize: 8,
  initialReserve: 16,
  shotIntervalMs: 300,
  reloadDurationMs: 1000,
  range: 60,
  damage: 25,
} as const;
/** The unarmed attack uses the same authoritative obstruction query as the pistol. */
export const PUNCH = { range: 1.8, intervalMs: 450, damage: 20 } as const;
/** The arcade helicopter stays inside the district and exits after landing. */
export const HELICOPTER = {
  maxHorizontalSpeed: MOVEMENT.helicopterSpeed,
  maxVerticalSpeed: 5,
  maxElevation: 80,
  radius: 2,
  padRadius: 3,
} as const;
/** Helicopter entry measures two meters from its fuselage collider. */
export function vehicleEntryRange(vehicleType: "car" | "helicopter"): number {
  return PHYSICS.interactionRange + (vehicleType === "helicopter" ? HELICOPTER.radius : 0);
}
const axis = z.number().finite().min(-1).max(1);
const yaw = z.number().finite();
const pitch = z
  .number()
  .finite()
  .min(-Math.PI / 2)
  .max(Math.PI / 2);
/** The server derives movement from controls; packets never supply a player pose. */
export const PlayerControlSchema = z.object({
  sequence: z.number().int().nonnegative(),
  forward: axis,
  right: axis,
  cameraYaw: yaw,
  cameraPitch: pitch,
  run: z.boolean(),
  aim: z.boolean(),
  ascend: axis,
  turn: axis,
});
/** Positive axes mean forward, right, up, and clockwise turn. */
export type PlayerControl = z.infer<typeof PlayerControlSchema>;
/** Commands describe one press and use an application-owned idempotency key. */
export const PlayerCommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("jump") }),
  z.object({ type: z.literal("crouch") }),
  z.object({ type: z.literal("primary"), yaw, pitch }),
  z.object({ type: z.literal("equip"), equipped: z.boolean() }),
  z.object({ type: z.literal("reload") }),
  z.object({ type: z.literal("pickup"), targetId: EntityIdSchema }),
  z.object({ type: z.literal("enter_vehicle"), targetId: EntityIdSchema }),
  z.object({ type: z.literal("exit_vehicle") }),
]);
/** Physical commands and lasting commands share one transport method. */
export type PlayerCommand = z.infer<typeof PlayerCommandSchema>;
/** The accepted player state lets prediction reconcile without a second request. */
export const PlayerControlResultSchema = z.object({
  sequence: z.number().int().nonnegative(),
  revision: z.number().int().nonnegative(),
  player: PlayerSchema,
});
/** The result acknowledges controls already accepted by the movement owner. */
export type PlayerControlResult = z.infer<typeof PlayerControlResultSchema>;
/** Only the server can supply obstruction results and a clear exit position. */
export type ResolvedGameplayCommand =
  | Extract<PlayerCommand, { type: "equip" | "reload" | "pickup" | "enter_vehicle" }>
  | { type: "primary"; hitTargetId: EntityId | null }
  | { type: "exit_vehicle"; exitPosition: Position; grounded: boolean; speed: number };

/** These characters must remain available for the shelter mission. */
export function isProtectedCharacter(id: EntityId): boolean {
  return PROTECTED_CHARACTER_IDS.includes(id);
}

/** Complete reloads from elapsed server time without changing the total ammunition. */
export function completeReloads(world: WorldSnapshot, now: number): WorldSnapshot {
  let changed = false;
  const entities = world.entities.map((entity) => {
    if (
      entity.kind !== "player" ||
      entity.combat.reload.type !== "reloading" ||
      entity.combat.reload.completesAt > now
    )
      return entity;
    changed = true;
    const pistol = entity.equipment.pistol;
    const transfer = pistol ? Math.min(PISTOL.magazineSize - pistol.loaded, pistol.reserve) : 0;
    return {
      ...entity,
      equipment: {
        pistol: pistol
          ? { ...pistol, loaded: pistol.loaded + transfer, reserve: pistol.reserve - transfer }
          : null,
      },
      combat: { ...entity.combat, reload: { type: "ready" as const } },
    };
  });
  return changed ? { ...world, revision: world.revision + 1, entities } : world;
}

/** Apply lasting rules after server collision queries; the caller saves effects and receipts together. */
export function applyGameplayCommand(
  current: WorldSnapshot,
  playerId: EntityId,
  command: ResolvedGameplayCommand,
  context: ActionContext,
): ActionResult {
  const world = structuredClone(completeReloads(current, context.now));
  const player = world.entities.find((entity) => entity.id === playerId);
  if (player?.kind !== "player" || player.health <= 0) return reject("This player cannot act.");
  if (player.behavior.type === "driving" && command.type !== "exit_vehicle")
    return reject("Exit the vehicle before using this action.");
  let message: string;
  switch (command.type) {
    case "equip": {
      const pistol = player.equipment.pistol;
      if (!pistol) return reject("Collect a pistol first.");
      if (player.combat.reload.type === "reloading")
        return reject("Wait for the reload to finish.");
      pistol.equipped = command.equipped;
      message = command.equipped ? "Pistol equipped." : "Pistol holstered.";
      break;
    }
    case "reload": {
      const pistol = player.equipment.pistol;
      if (!pistol?.equipped) return reject("Equip the pistol first.");
      if (player.combat.reload.type === "reloading")
        return reject("The pistol is already reloading.");
      if (pistol.loaded === PISTOL.magazineSize || pistol.reserve === 0)
        return reject("No ammunition can be reloaded.");
      player.combat.reload = {
        type: "reloading",
        completesAt: context.now + PISTOL.reloadDurationMs,
      };
      message = "Reloading pistol.";
      break;
    }
    case "primary": {
      if (context.now < player.combat.nextAttackAt) return reject("Wait before attacking again.");
      if (player.combat.reload.type === "reloading")
        return reject("Wait for the reload to finish.");
      const pistol = player.equipment.pistol;
      const armed = pistol?.equipped === true;
      if (armed && pistol.loaded === 0) return reject("Reload the pistol.");
      const target =
        command.hitTargetId === null
          ? undefined
          : world.entities.find((entity) => entity.id === command.hitTargetId);
      if (target && (target.id === playerId || (!isActor(target) && target.kind !== "target")))
        return reject("This target cannot take damage.");
      const range = armed ? PISTOL.range : PUNCH.range;
      if (
        target &&
        (isInsideGuesthouse(target.position) !== isInsideGuesthouse(player.position) ||
          Math.hypot(
            distance(player.position, target.position),
            (isActor(target) ? target.elevation : 0) - player.elevation,
          ) > range)
      )
        return reject("The target is out of range.");
      if (armed) pistol.loaded -= 1;
      player.combat.nextAttackAt = context.now + (armed ? PISTOL.shotIntervalMs : PUNCH.intervalMs);
      if (target && (isActor(target) || target.kind === "target")) {
        target.health = Math.max(
          isProtectedCharacter(target.id) ? 1 : 0,
          target.health - (armed ? PISTOL.damage : PUNCH.damage),
        );
        if (isActor(target)) recordIncident(world, playerId, target.id, "assault", context);
      }
      message = `${armed ? "Pistol fired" : "Punch thrown"}${target ? ` at ${target.name}` : ""}.`;
      break;
    }
    case "pickup": {
      const pickup = world.entities.find((entity) => entity.id === command.targetId);
      if (pickup?.kind !== "pickup" || pickup.claimedBy !== null)
        return reject("This pickup is no longer available.");
      if (!nearby(player.position, player.elevation, pickup.position))
        return reject("Move closer to collect this pickup.");
      if (pickup.item === "pistol") {
        if (player.equipment.pistol) return reject("You already own a pistol.");
        player.equipment.pistol = {
          equipped: true,
          loaded: PISTOL.magazineSize,
          reserve: PISTOL.initialReserve,
        };
      } else {
        if (!player.equipment.pistol) return reject("Collect a pistol first.");
        if (player.equipment.pistol.reserve > 999 - PISTOL.initialReserve)
          return reject("Your ammunition inventory is full.");
        player.equipment.pistol.reserve += PISTOL.initialReserve;
      }
      pickup.claimedBy = playerId;
      message = `${pickup.name} collected.`;
      break;
    }
    case "enter_vehicle": {
      const vehicle = world.entities.find((entity) => entity.id === command.targetId);
      if (vehicle?.kind !== "vehicle") return reject("This entity is not a vehicle.");
      if (
        !nearby(
          player.position,
          player.elevation - vehicle.elevation,
          vehicle.position,
          vehicleEntryRange(vehicle.vehicleType),
        )
      )
        return reject("Move closer to enter the vehicle.");
      if (vehicle.id.startsWith("stunt:") && vehicle.ownerId !== playerId)
        return reject("This stunt car is reserved for its driver.");
      if (
        world.entities.some(
          (entity) =>
            isActor(entity) &&
            entity.behavior.type === "driving" &&
            entity.behavior.vehicleId === vehicle.id,
        )
      )
        return reject("This vehicle already has a driver.");
      if (vehicle.vehicleType === "helicopter" && vehicle.elevation > 0.2)
        return reject("Wait for the helicopter to land.");
      vehicle.ownerId = playerId;
      player.position = { ...vehicle.position };
      player.elevation = vehicle.elevation;
      player.heading = vehicle.heading;
      player.posture = "standing";
      player.behavior = { type: "driving", vehicleId: vehicle.id };
      message = `${player.name} enters ${vehicle.name}.`;
      break;
    }
    case "exit_vehicle": {
      if (player.behavior.type !== "driving") return reject("This player is not driving.");
      const vehicleId = player.behavior.vehicleId;
      const vehicle = world.entities.find((entity) => entity.id === vehicleId);
      if (vehicle?.kind !== "vehicle") return reject("This vehicle is unavailable.");
      if (
        vehicle.vehicleType === "helicopter" &&
        (!command.grounded || command.speed >= 1 || vehicle.elevation > 0.2)
      )
        return reject("Land before exiting.");
      if (
        !Number.isFinite(command.exitPosition.x) ||
        !Number.isFinite(command.exitPosition.z) ||
        isInsideGuesthouse(command.exitPosition) !== isInsideGuesthouse(vehicle.position) ||
        distance(command.exitPosition, vehicle.position) > HELICOPTER.radius + 2
      )
        return reject("There is no safe place to exit.");
      player.position = { ...command.exitPosition };
      player.elevation = 0;
      player.grounded = true;
      player.behavior = { type: "idle" };
      message = `${player.name} exits ${vehicle.name}.`;
      break;
    }
  }
  world.revision += 1;
  world.events = [
    ...world.events,
    {
      id: context.id,
      time: context.now,
      actorId: playerId,
      type: command.type === "primary" ? "attack" : command.type,
      message,
      source: "player" as const,
    },
  ].slice(-100);
  return { accepted: true, world, eventIds: [context.id] };
}

function nearby(
  position: Position,
  elevation: number,
  target: Position,
  range: number = PHYSICS.interactionRange,
): boolean {
  return (
    isInsideGuesthouse(position) === isInsideGuesthouse(target) &&
    Math.hypot(distance(position, target), elevation) <= range
  );
}

function reject(message: string): ActionResult {
  return { accepted: false, error: { _tag: "ActionRejected", message } };
}
