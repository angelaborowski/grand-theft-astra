import type { WorldSnapshot } from "@gpta/core/world";
import { WorldFailure } from "./failure";

const collections = [
  "entities",
  "events",
  "incidents",
  "reports",
  "observations",
  "dialogue",
  "relationships",
  "decisions",
] as const;
type Collection = (typeof collections)[number];
const keys = {
  entities: ["id"],
  events: ["id"],
  incidents: ["id"],
  reports: ["id"],
  observations: ["actorId", "eventId"],
  dialogue: ["id"],
  relationships: ["from", "to", "kind"],
  decisions: ["id"],
} satisfies { [Name in Collection]: readonly (keyof WorldSnapshot[Name][number])[] };
type RecordRow = { key: string; value: string; ordinal: number };

/** Each domain record occupies one row; SQLite derives its indexed identity from its JSON fields. */
export class WorldRecords {
  constructor(private readonly sql: SqlStorage) {
    for (const collection of collections) {
      const identity = keys[collection]
        .map((field) => `json_extract(value, '$.${field}')`)
        .join(", ");
      sql.exec(`CREATE TABLE IF NOT EXISTS world_${collection} (
        value TEXT NOT NULL, ordinal INTEGER NOT NULL,
        key TEXT GENERATED ALWAYS AS (json_array(${identity})) VIRTUAL NOT NULL UNIQUE
      )`);
    }
  }

  /** Return records in their original order for parsing by the world storage boundary. */
  read(collection: Collection): unknown[] {
    return this.sql
      .exec<{ value: string }>(`SELECT value FROM world_${collection} ORDER BY ordinal`)
      .toArray()
      .map((row) => JSON.parse(row.value));
  }

  /** The caller's transaction includes every changed record and removed record. */
  save(world: WorldSnapshot): void {
    for (const collection of collections) this.saveCollection(collection, world[collection]);
  }

  private saveCollection(
    collection: Collection,
    records: readonly Record<string, unknown>[],
  ): void {
    // Read committed SQL state so an enclosing transaction rollback cannot leave a stale comparison cache.
    const previous = new Map(
      this.sql
        .exec<RecordRow>(`SELECT key, value, ordinal FROM world_${collection}`)
        .toArray()
        .map((row) => [row.key, row]),
    );
    const seen = new Set<string>();
    for (const [ordinal, record] of records.entries()) {
      const key = JSON.stringify(keys[collection].map((field) => record[field]));
      if (seen.has(key)) throw new WorldFailure(`Duplicate identity in world ${collection}.`);
      seen.add(key);
      const value = JSON.stringify(record);
      const stored = previous.get(key);
      if (stored?.value !== value || stored.ordinal !== ordinal)
        this.sql.exec(
          `INSERT INTO world_${collection} (value, ordinal) VALUES (?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, ordinal = excluded.ordinal`,
          value,
          ordinal,
        );
      previous.delete(key);
    }
    for (const key of previous.keys())
      this.sql.exec(`DELETE FROM world_${collection} WHERE key = ?`, key);
  }
}
