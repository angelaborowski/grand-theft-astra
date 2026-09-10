import { EntityIdSchema, type EntityId, type WorldSnapshot } from "@gpta/core/world";
import { migrateWorldSnapshot } from "@gpta/core/simulation";

/** SQLite owns durable snapshots, sessions, and action deduplication in one transaction. */
export class WorldStore {
  constructor(private readonly storage: DurableObjectStorage) {
    storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS world (id INTEGER PRIMARY KEY CHECK (id = 1), snapshot TEXT NOT NULL)",
    );
    storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS receipts (id TEXT PRIMARY KEY, result TEXT NOT NULL)",
    );
    storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, player_id TEXT NOT NULL, expires INTEGER NOT NULL)",
    );
  }

  /** Restore a checkpoint, including lasting actions and completed decisions. */
  load(): WorldSnapshot | undefined {
    const row = this.storage.sql
      .exec<{ snapshot: string }>("SELECT snapshot FROM world WHERE id = 1")
      .toArray()[0];
    return row ? migrateWorldSnapshot(JSON.parse(row.snapshot)) : undefined;
  }

  /** A receipt and its world effect commit together before either becomes visible. */
  save(world: WorldSnapshot, receipt?: { id: string; result: unknown }): void {
    this.storage.transactionSync(() => {
      this.storage.sql.exec(
        "INSERT INTO world (id, snapshot) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET snapshot = excluded.snapshot",
        JSON.stringify(world),
      );
      if (receipt)
        this.storage.sql.exec(
          "INSERT INTO receipts (id, result) VALUES (?, ?) ON CONFLICT(id) DO NOTHING",
          receipt.id,
          JSON.stringify(receipt.result),
        );
    });
  }

  /** An action key always returns its original result across reconnects and restarts. */
  receipt(id: string): unknown | undefined {
    const row = this.storage.sql
      .exec<{ result: string }>("SELECT result FROM receipts WHERE id = ?", id)
      .toArray()[0];
    return row ? JSON.parse(row.result) : undefined;
  }

  /** Session tokens are hashes; the browser keeps the original opaque cookie. */
  findSession(token: string, now: number): EntityId | undefined {
    const row = this.storage.sql
      .exec<{ player_id: string }>(
        "SELECT player_id FROM sessions WHERE token = ? AND expires > ?",
        token,
        now,
      )
      .toArray()[0];
    return row ? EntityIdSchema.parse(row.player_id) : undefined;
  }

  /** Persist a new identity and its session as one local transaction. */
  createSession(token: string, playerId: EntityId, expires: number, world: WorldSnapshot): void {
    this.storage.transactionSync(() => {
      this.storage.sql.exec(
        "INSERT INTO sessions (token, player_id, expires) VALUES (?, ?, ?)",
        token,
        playerId,
        expires,
      );
      this.save(world);
    });
  }
}
