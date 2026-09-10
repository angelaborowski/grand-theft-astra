import { z } from "zod";
import {
  ConversationTurnSchema,
  TurnIdSchema,
  type ConversationTurn,
  type TurnId,
} from "@gpta/core/conversations";
import { EntityIdSchema, type EntityId } from "@gpta/core/world";

type TurnRow = {
  id: string;
  actor_id: string;
  player_id: string;
  request_id: string;
  message: string;
  created_at: number;
  revision: number;
  response: string;
};
const listenerSchema = z.array(EntityIdSchema);

/** Conversation history survives activity-feed trimming and stores each published reply before delivery. */
export class ConversationStore {
  constructor(private readonly storage: DurableObjectStorage) {
    storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS conversation_turns (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, player_id TEXT NOT NULL, request_id TEXT NOT NULL, message TEXT NOT NULL, created_at INTEGER NOT NULL, revision INTEGER NOT NULL, response TEXT NOT NULL, submission_key TEXT NOT NULL UNIQUE, listeners TEXT NOT NULL, started_at INTEGER, completed_at INTEGER, workflow_started INTEGER NOT NULL DEFAULT 0)",
    );
    storage.sql.exec(
      "CREATE INDEX IF NOT EXISTS conversation_actor_history ON conversation_turns(actor_id, created_at)",
    );
    storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS conversation_offers (player_id TEXT PRIMARY KEY, turn_id TEXT NOT NULL, amount INTEGER NOT NULL)",
    );
    storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS conversation_tools (id TEXT PRIMARY KEY, turn_id TEXT NOT NULL, description TEXT NOT NULL)",
    );
  }

  get(id: TurnId): ConversationTurn | undefined {
    return this.rows("SELECT * FROM conversation_turns WHERE id = ?", id)[0];
  }

  submitted(key: string): ConversationTurn | undefined {
    return this.rows("SELECT * FROM conversation_turns WHERE submission_key = ?", key)[0];
  }

  insert(turn: ConversationTurn, key: string, listeners: EntityId[]): void {
    this.storage.sql.exec(
      "INSERT INTO conversation_turns (id, actor_id, player_id, request_id, message, created_at, revision, response, submission_key, listeners) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      turn.id,
      turn.actorId,
      turn.playerId,
      JSON.stringify(turn.requestId),
      turn.message,
      turn.createdAt,
      turn.revision,
      JSON.stringify(turn.response),
      key,
      JSON.stringify(listeners),
    );
  }

  update(turn: ConversationTurn, response: ConversationTurn["response"]): ConversationTurn {
    const next = { ...turn, revision: turn.revision + 1, response };
    this.storage.sql.exec(
      "UPDATE conversation_turns SET revision = ?, response = ?, started_at = CASE WHEN ? = 'thinking' THEN ? ELSE started_at END, completed_at = CASE WHEN ? = 'completed' THEN ? ELSE completed_at END WHERE id = ?",
      next.revision,
      JSON.stringify(response),
      response.status,
      Date.now(),
      response.status,
      Date.now(),
      turn.id,
    );
    return next;
  }

  history(actorId: EntityId, playerId: EntityId): ConversationTurn[] {
    return this.rows(
      "SELECT * FROM conversation_turns WHERE actor_id = ? AND (player_id = ? OR EXISTS (SELECT 1 FROM json_each(listeners) WHERE value = ?)) ORDER BY created_at DESC, rowid DESC LIMIT 40",
      actorId,
      playerId,
      playerId,
    ).reverse();
  }

  priorHistory(turn: ConversationTurn): ConversationTurn[] {
    return this.rows(
      "SELECT * FROM conversation_turns WHERE actor_id = ? AND rowid < (SELECT rowid FROM conversation_turns WHERE id = ?) AND json_extract(response, '$.status') IN ('completed', 'interrupted') ORDER BY rowid DESC LIMIT 12",
      turn.actorId,
      turn.id,
    ).reverse();
  }

  active(): ConversationTurn[] {
    return this.rows(
      "SELECT * FROM conversation_turns WHERE json_extract(response, '$.status') IN ('thinking', 'streaming') ORDER BY created_at, rowid",
    );
  }

  queued(): ConversationTurn[] {
    return this.rows(
      "SELECT * FROM conversation_turns WHERE json_extract(response, '$.status') = 'queued' ORDER BY created_at, rowid",
    );
  }

  expired(now: number): ConversationTurn[] {
    return this.rows(
      "SELECT * FROM conversation_turns WHERE json_extract(response, '$.status') IN ('thinking', 'streaming') AND started_at < ?",
      now - 150_000,
    );
  }

  listeners(id: TurnId): EntityId[] {
    const row = this.storage.sql
      .exec<{ listeners: string }>("SELECT listeners FROM conversation_turns WHERE id = ?", id)
      .toArray()[0];
    return row ? listenerSchema.parse(JSON.parse(row.listeners)) : [];
  }

  retainListeners(id: TurnId, listeners: EntityId[]): void {
    this.storage.sql.exec(
      "UPDATE conversation_turns SET listeners = ? WHERE id = ?",
      JSON.stringify(listeners),
      id,
    );
  }

  needsWorkflow(id: TurnId): boolean {
    return (
      this.storage.sql
        .exec<{ workflow_started: number }>(
          "SELECT workflow_started FROM conversation_turns WHERE id = ?",
          id,
        )
        .toArray()[0]?.workflow_started === 0
    );
  }

  workflowStarted(id: TurnId): void {
    this.storage.sql.exec("UPDATE conversation_turns SET workflow_started = 1 WHERE id = ?", id);
  }

  offer(turn: ConversationTurn): { id: TurnId; amount: number } | null {
    const row = this.storage.sql
      .exec<{ turn_id: string; amount: number }>(
        "SELECT offer.turn_id, offer.amount FROM conversation_offers offer JOIN conversation_turns reply ON reply.id = offer.turn_id WHERE offer.player_id = ? AND reply.completed_at < ?",
        turn.playerId,
        turn.createdAt,
      )
      .toArray()[0];
    return row ? { id: TurnIdSchema.parse(row.turn_id), amount: row.amount } : null;
  }

  saveOffer(playerId: EntityId, turnId: TurnId, amount: number): void {
    this.storage.sql.exec(
      "INSERT INTO conversation_offers (player_id, turn_id, amount) VALUES (?, ?, ?) ON CONFLICT(player_id) DO UPDATE SET turn_id = excluded.turn_id, amount = excluded.amount",
      playerId,
      turnId,
      amount,
    );
  }

  recordTool(id: string, turnId: TurnId, description: string): void {
    this.storage.sql.exec(
      "INSERT INTO conversation_tools (id, turn_id, description) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING",
      id,
      turnId,
      description,
    );
  }

  toolHistory(turnId: TurnId): string[] {
    return this.storage.sql
      .exec<{ description: string }>(
        "SELECT description FROM conversation_tools WHERE turn_id = ? ORDER BY rowid",
        turnId,
      )
      .toArray()
      .map((row) => row.description);
  }

  private rows(query: string, ...bindings: SqlStorageValue[]): ConversationTurn[] {
    return this.storage.sql
      .exec<TurnRow>(query, ...bindings)
      .toArray()
      .map((row) =>
        ConversationTurnSchema.parse({
          id: row.id,
          actorId: row.actor_id,
          playerId: row.player_id,
          requestId: JSON.parse(row.request_id),
          message: row.message,
          createdAt: row.created_at,
          revision: row.revision,
          response: JSON.parse(row.response),
        }),
      );
  }
}
