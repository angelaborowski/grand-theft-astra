import { DurableObject } from "cloudflare:workers";
import type { EntityId } from "@gpta/core/world";

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
  /** Repeated world startup never resets this person's saved clock or memory. */
  async initialize(worldName: string, actorId: EntityId, index: number): Promise<void> {
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
