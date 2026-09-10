import { DurableObject } from "cloudflare:workers";
import type { EntityId, WorldSnapshot } from "@gpta/core/world";
import { WorldStore } from "../../src/world-store";

/** Exercise the production store inside real workerd SQLite without simulation alarms. */
export class StoreFixture extends DurableObject {
  private readonly store = new WorldStore(this.ctx.storage);

  /** Restore persisted state after eviction. */
  load() {
    return this.store.load();
  }

  /** Report actual SQL changes to detect unnecessary writes. */
  save(world: WorldSnapshot, receipt?: { id: string; result: unknown }) {
    const before = this.changes();
    this.store.save(world, receipt);
    return this.changes() - before;
  }

  /** Persist a player's identity and world together. */
  async createSession(token: string, playerId: EntityId, world: WorldSnapshot) {
    this.store.createSession(token, playerId, 10000, world);
  }

  /** Read the session after a completed or failed write. */
  authenticate(token: string) {
    return this.store.findSession(token, 0);
  }

  /** Read the action receipt after a completed or failed write. */
  receipt(id: string) {
    return this.store.receipt(id);
  }

  /** Verify that an outer transaction can roll back a completed store call. */
  rollback(world: WorldSnapshot) {
    try {
      this.ctx.storage.transactionSync(() => {
        this.store.save(world, { id: "rolled-back", result: true });
        throw new Error("Deliberate outer transaction failure.");
      });
    } catch (cause) {
      if (cause instanceof Error) return cause.message;
      throw cause;
    }
  }

  private changes(): number {
    return this.ctx.storage.sql.exec<{ count: number }>("SELECT total_changes() AS count").one()
      .count;
  }
}

export default {
  fetch() {
    return new Response("Persistence fixture");
  },
};
