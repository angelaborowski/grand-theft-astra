import { DurableObject } from "cloudflare:workers";
import type { EntityId } from "@gpta/core/world";
import type { CharacterProfile } from "@gpta/core/characters";
import type { TurnId } from "@gpta/core/conversations";
import { WorldFailure } from "./failure";

type Encounter = {
  turnId: TurnId;
  playerId: EntityId;
  message: string;
  reply: string;
  actions: string[];
  time: number;
};

type PersonState = {
  worldName: string;
  actorId: EntityId;
  intervalMs: number;
  sequence: number;
  pendingTrigger: string | null;
  memory: { decisionId: string; summary: string; updatedAt: number }[];
};

/** Each person owns its decision clock and memory; World owns physical facts and action effects. */
export class Person extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS encounters (turn_id TEXT PRIMARY KEY, player_id TEXT NOT NULL, message TEXT NOT NULL, reply TEXT NOT NULL, actions TEXT NOT NULL, time INTEGER NOT NULL)",
    );
  }

  /** Repeated world startup never resets this person's saved clock or memory. */
  async initialize(
    worldName: string,
    actorId: EntityId,
    index: number,
    profile: CharacterProfile,
  ): Promise<void> {
    if (!this.ctx.storage.kv.get<CharacterProfile>("profile"))
      this.ctx.storage.kv.put("profile", profile);
    const existing = this.ctx.storage.kv.get<PersonState>("person");
    if (existing) {
      if ((await this.ctx.storage.getAlarm()) === null)
        await this.ctx.storage.setAlarm(Date.now() + existing.intervalMs);
      return;
    }
    const nextDecisionAt = Date.now() + 1000 + index * 3000;
    this.ctx.storage.kv.put("person", {
      worldName,
      actorId,
      intervalMs: 60000 + (index % 5) * 60000,
      sequence: 0,
      pendingTrigger: null,
      memory: [],
    } satisfies PersonState);
    await this.ctx.storage.setAlarm(nextDecisionAt);
  }

  /** Events interrupt the normal schedule; recent world observations retain merged event details. */
  async wake(trigger: string): Promise<void> {
    const state = this.ctx.storage.kv.get<PersonState>("person");
    if (!state) return;
    this.ctx.storage.kv.put("person", { ...state, pendingTrigger: trigger });
    await this.ctx.storage.setAlarm(Date.now() + 1);
  }

  /** Native alarms request decisions while browsers are disconnected. */
  override async alarm(): Promise<void> {
    const state = this.ctx.storage.kv.get<PersonState>("person");
    if (!state) return;
    const world = this.env.WORLD.getByName(state.worldName);
    const trigger = state.pendingTrigger ?? `schedule:${state.actorId}:${state.sequence}`;
    const result = await world.enqueueDecision(state.actorId, trigger);
    const current = this.ctx.storage.kv.get<PersonState>("person");
    if (!current) return;
    if (result === "busy") {
      await this.ctx.storage.setAlarm(Date.now() + 5000);
      return;
    }
    const pendingTrigger =
      current.pendingTrigger !== state.pendingTrigger ? current.pendingTrigger : null;
    const nextDecisionAt = pendingTrigger ? Date.now() + 1 : Date.now() + current.intervalMs;
    this.ctx.storage.kv.put("person", {
      ...current,
      sequence: current.sequence + 1,
      pendingTrigger,
    });
    await this.ctx.storage.setAlarm(nextDecisionAt);
  }

  /** Context reads this person's own persisted decision memory. */
  memory() {
    return this.ctx.storage.kv.get<PersonState>("person")?.memory ?? [];
  }

  /** The saved story stays stable across requests and contains no physical world state. */
  profile(): CharacterProfile {
    const profile = this.ctx.storage.kv.get<CharacterProfile>("profile");
    if (!profile) throw new WorldFailure("The character's story is not initialized.");
    return profile;
  }

  /** Conversation records retain their original speakers and executed action results. */
  rememberEncounter(encounter: Encounter): void {
    this.ctx.storage.sql.exec(
      "INSERT INTO encounters (turn_id, player_id, message, reply, actions, time) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(turn_id) DO NOTHING",
      encounter.turnId,
      encounter.playerId,
      encounter.message,
      encounter.reply,
      JSON.stringify(encounter.actions),
      encounter.time,
    );
  }

  /** Only the current player's encounters enter their next conversation context. */
  encounters(playerId: EntityId) {
    return this.ctx.storage.sql
      .exec<{
        turn_id: string;
        message: string;
        reply: string;
        actions: string;
        time: number;
      }>(
        "SELECT turn_id, message, reply, actions, time FROM encounters WHERE player_id = ? ORDER BY time DESC, rowid DESC LIMIT 12",
        playerId,
      )
      .toArray()
      .reverse();
  }

  /** The inspector reads actual per-person memory and scheduling state. */
  async inspect() {
    const state = this.ctx.storage.kv.get<PersonState>("person");
    const nextDecisionAt = await this.ctx.storage.getAlarm();
    return {
      memory: state?.memory ?? [],
      nextDecisionAt: nextDecisionAt ?? 0,
      sequence: state?.sequence ?? 0,
      pendingTrigger: state?.pendingTrigger ?? null,
    };
  }

  /** Memory records actual executed tool results, with decision identity for retry safety. */
  remember(decisionId: string, summary: string): void {
    const state = this.ctx.storage.kv.get<PersonState>("person");
    if (!state || state.memory.some((item) => item.decisionId === decisionId)) return;
    const memory = [
      ...state.memory,
      { decisionId, summary: summary.slice(-2000), updatedAt: Date.now() },
    ].slice(-8);
    this.ctx.storage.kv.put("person", { ...state, memory });
  }
}
