import {
  accrueMovementAllowance,
  clampMovementAllowance,
  movementSpeed,
  movePlayer,
  type MovementAllowance,
} from "@gpta/core/simulation";
import { distance, type EntityId, type Position, type WorldSnapshot } from "@gpta/core/world";

/** One World instance shares movement credit across every socket for a player. */
export class PlayerMovement {
  private readonly allowances = new Map<EntityId, MovementAllowance>();

  /** Reconstructing the World discards previous movement credit. */
  constructor(world: WorldSnapshot, now: number) {
    for (const entity of world.entities) if (entity.kind === "player") this.connect(entity.id, now);
  }

  /** Register a player without refilling credit on a second connection or reconnect. */
  connect(playerId: EntityId, now: number): void {
    if (!this.allowances.has(playerId))
      this.allowances.set(playerId, { availableDistance: 0, updatedAt: now });
  }

  /** Validate the proposed position and charge only accepted travel. */
  move(
    world: WorldSnapshot,
    playerId: EntityId,
    position: Position,
    now: number,
  ): WorldSnapshot | null {
    const player = world.entities.find((entity) => entity.id === playerId);
    if (player?.kind !== "player") return null;
    const allowance = accrueMovementAllowance(
      this.allowance(playerId, now),
      now,
      movementSpeed(player),
    );
    const next = movePlayer(world, playerId, position, allowance.availableDistance);
    this.allowances.set(playerId, {
      ...allowance,
      availableDistance: next
        ? allowance.availableDistance - distance(player.position, position)
        : allowance.availableDistance,
    });
    return next;
  }

  /** Call after an action saves, before replacing World memory with its accepted state. */
  settleTransition(
    previous: WorldSnapshot,
    next: WorldSnapshot,
    playerId: EntityId,
    now: number,
  ): void {
    const before = previous.entities.find((entity) => entity.id === playerId);
    const after = next.entities.find((entity) => entity.id === playerId);
    if (before?.kind !== "player" || after?.kind !== "player") return;
    const previousSpeed = movementSpeed(before);
    const nextSpeed = movementSpeed(after);
    if (previousSpeed === nextSpeed) return;
    const allowance = accrueMovementAllowance(this.allowance(playerId, now), now, previousSpeed);
    this.allowances.set(playerId, clampMovementAllowance(allowance, nextSpeed));
  }

  private allowance(playerId: EntityId, now: number): MovementAllowance {
    return this.allowances.get(playerId) ?? { availableDistance: 0, updatedAt: now };
  }
}
