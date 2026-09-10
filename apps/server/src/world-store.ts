import {
  EntityIdSchema,
  EntitySchema,
  isActor,
  WorldSnapshotSchema,
  type EntityId,
  type WorldSnapshot,
} from "@gpta/core/world";
import { WorldRecords } from "./world-records";
import { WorldFailure } from "./failure";

type WorldRow = {
  version: number;
  revision: number;
  time: number;
  ai_status: string;
  ai_model: string;
};

/** SQLite commits changed domain records, sessions, and action receipts together. */
export class WorldStore {
  private readonly records: WorldRecords;

  constructor(private readonly storage: DurableObjectStorage) {
    storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS world_state (id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL, revision INTEGER NOT NULL, time REAL NOT NULL, ai_status TEXT NOT NULL, ai_model TEXT NOT NULL)",
    );
    this.records = new WorldRecords(storage.sql);
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
      .exec<WorldRow>(
        "SELECT version, revision, time, ai_status, ai_model FROM world_state WHERE id = 1",
      )
      .toArray()[0];
    if (!row) return undefined;
    const entities = EntitySchema.array().parse(this.records.read("entities"));
    const activeIds = entities
      .filter((entity) => isActor(entity) && entity.kind !== "player")
      .map((entity) => entity.id);
    return WorldSnapshotSchema.parse({
      version: row.version,
      revision: row.revision,
      time: row.time,
      ai: { status: row.ai_status, model: row.ai_model },
      population: { total: activeIds.length, activeIds },
      entities,
      events: this.records.read("events"),
      incidents: this.records.read("incidents"),
      reports: this.records.read("reports"),
      observations: this.records.read("observations"),
      dialogue: this.records.read("dialogue"),
      relationships: this.records.read("relationships"),
      decisions: this.records.read("decisions"),
    });
  }

  /** A receipt and its world effect commit together before either becomes visible. */
  save(world: WorldSnapshot, receipt?: { id: string; result: unknown }): void {
    this.commit(() => {
      this.writeWorld(world);
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
    this.commit(() => {
      this.storage.sql.exec(
        "INSERT INTO sessions (token, player_id, expires) VALUES (?, ?, ?)",
        token,
        playerId,
        expires,
      );
      this.writeWorld(world);
    });
  }

  private writeWorld(world: WorldSnapshot): void {
    this.records.save(world);
    this.storage.sql.exec(
      `INSERT INTO world_state (id, version, revision, time, ai_status, ai_model) VALUES (1, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET version = excluded.version, revision = excluded.revision,
       time = excluded.time, ai_status = excluded.ai_status, ai_model = excluded.ai_model
       WHERE version != excluded.version OR revision != excluded.revision OR time != excluded.time
       OR ai_status != excluded.ai_status OR ai_model != excluded.ai_model`,
      world.version,
      world.revision,
      world.time,
      world.ai.status,
      world.ai.model,
    );
  }

  private commit(write: () => void): void {
    try {
      this.storage.transactionSync(write);
    } catch (cause) {
      throw new WorldFailure("Could not save world records.", cause);
    }
  }
}
