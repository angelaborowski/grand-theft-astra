import { z } from "zod";
import {
  ActionErrorSchema,
  ActionReceiptSchema,
  applyConversationAction,
  permittedConversationTools,
} from "@gpta/core/actions";
import { characterProfile } from "@gpta/core/characters";
import {
  TurnIdSchema,
  type ConversationAction,
  type ConversationTurn,
  type TurnId,
} from "@gpta/core/conversations";
import { isInsideGuesthouse, MOVEMENT } from "@gpta/core/scene";
import {
  distance,
  isActor,
  MISSION_TERMS,
  type EntityId,
  type WorldSnapshot,
} from "@gpta/core/world";
import { ConversationStore } from "./conversation-store";
import { WorldFailure } from "./failure";
import type { Person } from "./person";
import type { WorldStore } from "./world-store";

const toolReceiptSchema = z.discriminatedUnion("accepted", [
  ActionReceiptSchema.extend({ accepted: z.literal(true) }),
  z.object({ accepted: z.literal(false), error: ActionErrorSchema }),
]);
type Dependencies = {
  storage: DurableObjectStorage;
  worldStore: WorldStore;
  worldName: string;
  enabled: boolean;
  workflows: Env["CONVERSATIONS"];
  read: () => WorldSnapshot;
  accept: (world: WorldSnapshot) => void;
  broadcast: () => void;
  person: (actorId: EntityId) => DurableObjectStub<Person>;
  listeners: (actorId: EntityId) => EntityId[];
  publish: (turn: ConversationTurn, listeners: EntityId[]) => void;
};

/** Owns durable turn ordering, bounded execution, action authority, and saved public speech. */
export class Conversations {
  private readonly store: ConversationStore;

  constructor(private readonly deps: Dependencies) {
    this.store = new ConversationStore(deps.storage);
  }

  send(
    playerId: EntityId,
    requestId: string | number,
    input: { actorId: EntityId; message: string; idempotencyKey: string },
  ) {
    const key = `${playerId}:${input.idempotencyKey}`;
    const previous = this.store.submitted(key);
    if (previous) return { accepted: true as const, turn: previous };
    if (!this.canTalk(input.actorId, playerId))
      return { accepted: false as const, message: "Move closer to this person to talk." };
    const outstanding = [...this.store.active(), ...this.store.queued()];
    if (outstanding.filter((turn) => turn.playerId === playerId).length >= 3)
      return {
        accepted: false as const,
        message: "Wait for a reply before sending more messages.",
      };
    const turn: ConversationTurn = {
      id: TurnIdSchema.parse(crypto.randomUUID()),
      actorId: input.actorId,
      playerId,
      requestId,
      message: input.message,
      createdAt: Date.now(),
      revision: 0,
      response: this.deps.enabled
        ? { status: "queued" }
        : {
            status: "failed",
            error: "Astra is unavailable. Conversations need a configured provider.",
          },
    };
    const listeners = this.deps.listeners(input.actorId);
    this.store.insert(turn, key, listeners);
    this.deps.publish(turn, listeners);
    return { accepted: true as const, turn };
  }

  history(actorId: EntityId, playerId: EntityId): ConversationTurn[] {
    return this.store.history(actorId, playerId);
  }

  busyActors(): Set<EntityId> {
    return new Set([...this.store.active(), ...this.store.queued()].map((turn) => turn.actorId));
  }

  activeCount(): number {
    return this.store.active().length;
  }

  /** Player conversations never wait for background decisions; a queued turn cannot outlive its player's patience. */
  async schedule(): Promise<void> {
    for (const turn of this.store.expired(Date.now()))
      this.fail(turn.id, "The conversation timed out. Send a message to try again.");
    for (const turn of this.store.queuedExpired(Date.now()))
      this.fail(turn.id, "The conversation could not start. Send your message again.");
    if (!this.deps.enabled) return;
    const active = this.store.active();
    const occupied = new Set(active.map((turn) => turn.actorId));
    let capacity = Math.max(0, 2 - active.length);
    for (const turn of this.store.queued()) {
      if (capacity === 0) break;
      if (occupied.has(turn.actorId)) continue;
      if (!this.canTalk(turn.actorId, turn.playerId)) {
        this.fail(turn.id, "The conversation ended because you moved away.");
        continue;
      }
      occupied.add(turn.actorId);
      capacity -= 1;
      this.update(turn, { status: "thinking" });
      const world = this.deps.read();
      const paused = {
        ...world,
        revision: world.revision + 1,
        entities: world.entities.map((entity) =>
          entity.id === turn.actorId && isActor(entity)
            ? { ...entity, behavior: { type: "idle" as const } }
            : entity,
        ),
      };
      this.deps.worldStore.save(paused);
      this.deps.accept(paused);
    }
    const requests = this.store.active().filter((turn) => this.store.needsWorkflow(turn.id));
    if (requests.length === 0) return;
    await this.deps.workflows.createBatch(
      requests.map((turn) => ({
        id: `conversation-${turn.id}`,
        params: { worldName: this.deps.worldName, turnId: turn.id },
      })),
    );
    for (const turn of requests) this.store.workflowStarted(turn.id);
  }

  async context(turnId: TurnId) {
    const turn = this.store.get(turnId);
    if (!turn || turn.response.status !== "thinking")
      throw new WorldFailure("Conversation is no longer waiting for a response.");
    const world = this.deps.read();
    const actor = world.entities.find((entity) => entity.id === turn.actorId);
    const participant = world.entities.find((entity) => entity.id === turn.playerId);
    if (!actor || !isActor(actor) || actor.kind === "player" || participant?.kind !== "player")
      throw new WorldFailure("Conversation participants are unavailable.");
    const person = this.deps.person(actor.id);
    await person.initialize(this.deps.worldName, actor.id, 0, characterProfile(actor));
    const profile: ReturnType<Person["profile"]> = await person.profile();
    const memory: ReturnType<Person["encounters"]> = await person.encounters(turn.playerId);
    return {
      turn,
      profile,
      actor,
      participant: { id: participant.id, name: participant.name },
      memory,
      history: this.store
        .priorHistory(turn)
        .filter(
          (entry) =>
            entry.playerId === participant.id ||
            this.store.listeners(entry.id).includes(participant.id),
        ),
      tools: permittedConversationTools(actor),
      bedOffer: this.store.offer(turn),
      facts: {
        time: world.time,
        mission: participant.mission,
        shelter: participant.shelter,
        terms: MISSION_TERMS,
        observations: world.observations.filter((entry) => entry.actorId === actor.id).slice(-12),
        places: world.entities
          .filter((entity) => entity.kind === "location" || entity.kind === "business")
          .map((entity) => ({ id: entity.id, name: entity.name, position: entity.position })),
      },
    };
  }

  execute(turnId: TurnId, callId: string, tool: ConversationAction) {
    const key = `conversation:${turnId}:${callId}`;
    const previous = this.deps.worldStore.receipt(key);
    if (previous) return toolReceiptSchema.parse(previous);
    const turn = this.store.get(turnId);
    if (!turn || turn.response.status !== "thinking")
      return this.reject("This conversation can no longer perform actions.");
    const offer = this.store.offer(turn);
    if (tool.name === "rent_bed" && !offer)
      return this.reject("Offer the room first, then wait for the player's explicit acceptance.");
    const result = applyConversationAction(
      this.deps.read(),
      turn.actorId,
      turn.playerId,
      tool,
      { id: key, now: Date.now() },
      offer,
    );
    const receipt = result.accepted
      ? { accepted: true as const, revision: result.world.revision, eventIds: result.eventIds }
      : result;
    const next = result.accepted ? result.world : this.deps.read();
    this.deps.storage.transactionSync(() => {
      this.deps.worldStore.save(next, { id: key, result: receipt });
      if (result.accepted && tool.name === "offer_bed")
        this.store.saveOffer(turn.playerId, turnId, MISSION_TERMS.bedPrice);
      this.store.recordTool(key, turnId, `${tool.name}: ${JSON.stringify(receipt)}`);
    });
    this.deps.accept(next);
    this.deps.broadcast();
    return receipt;
  }

  beginSpeech(turnId: TurnId): boolean {
    const turn = this.store.get(turnId);
    if (!turn) return false;
    if (turn.response.status === "streaming") {
      this.fail(turnId, "The reply was interrupted. Send a message to continue.");
      return false;
    }
    if (turn.response.status !== "thinking") return false;
    if (!this.retainListeners(turn)) {
      this.fail(turnId, "The conversation ended because nobody remained to hear it.");
      return false;
    }
    if (!this.canTalk(turn.actorId, turn.playerId)) {
      this.fail(turnId, "The conversation ended because you moved away.");
      return false;
    }
    this.update(turn, { status: "streaming", text: "" });
    return true;
  }

  append(turnId: TurnId, offset: number, text: string): boolean {
    const turn = this.store.get(turnId);
    if (!turn || turn.response.status !== "streaming") return false;
    if (!this.retainListeners(turn)) {
      this.fail(turnId, "The conversation ended because nobody remained to hear it.");
      return false;
    }
    if (!this.canTalk(turn.actorId, turn.playerId)) {
      this.fail(turnId, "The conversation ended because you moved away.");
      return false;
    }
    if (offset < turn.response.text.length)
      return turn.response.text.slice(offset, offset + text.length) === text;
    if (offset !== turn.response.text.length || offset + text.length > 6000) return false;
    this.update(turn, { status: "streaming", text: turn.response.text + text });
    return true;
  }

  async complete(turnId: TurnId): Promise<void> {
    const turn = this.store.get(turnId);
    if (!turn || turn.response.status !== "streaming") return;
    if (turn.response.text.trim().length === 0) {
      this.fail(turnId, "Astra did not produce a spoken reply. Send a message to try again.");
      return;
    }
    await this.deps.person(turn.actorId).rememberEncounter({
      turnId,
      playerId: turn.playerId,
      message: turn.message,
      reply: turn.response.text,
      actions: this.store.toolHistory(turnId),
      time: turn.createdAt,
    });
    const current = this.store.get(turnId);
    if (current?.response.status === "streaming")
      this.update(current, { status: "completed", text: current.response.text });
  }

  fail(turnId: TurnId, message: string): void {
    const turn = this.store.get(turnId);
    if (!turn) return;
    if (turn.response.status === "streaming") {
      this.update(turn, { status: "interrupted", text: turn.response.text, error: message });
      return;
    }
    if (turn.response.status === "queued" || turn.response.status === "thinking")
      this.update(turn, { status: "failed", error: message });
  }

  private canTalk(actorId: EntityId, playerId: EntityId): boolean {
    const world = this.deps.read();
    const actor = world.entities.find((entity) => entity.id === actorId);
    const player = world.entities.find((entity) => entity.id === playerId);
    return Boolean(
      actor &&
      isActor(actor) &&
      actor.kind !== "player" &&
      actor.health > 0 &&
      player?.kind === "player" &&
      player.health > 0 &&
      isInsideGuesthouse(actor.position) === isInsideGuesthouse(player.position) &&
      distance(actor.position, player.position) <= MOVEMENT.interactionRange,
    );
  }

  private update(turn: ConversationTurn, response: ConversationTurn["response"]): void {
    const next = this.store.update(turn, response);
    this.deps.publish(next, this.store.listeners(turn.id));
  }

  private retainListeners(turn: ConversationTurn): boolean {
    const nearby = this.deps.listeners(turn.actorId);
    const listeners = this.store.listeners(turn.id).filter((id) => nearby.includes(id));
    this.store.retainListeners(turn.id, listeners);
    return listeners.length > 0;
  }

  private reject(message: string) {
    return { accepted: false as const, error: { _tag: "ActionRejected" as const, message } };
  }
}
