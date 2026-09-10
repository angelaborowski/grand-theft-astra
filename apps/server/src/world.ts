import { DurableObject } from "cloudflare:workers";
import { z } from "zod";
import {
  ActionReceiptSchema,
  applyPlayerAction,
  applyToolAction,
  permittedTools,
  type ToolAction,
} from "@gpta/core/actions";
import { RequestSchema, type Request as WorldRequest } from "@gpta/core/protocol";
import { MOVEMENT, isInsideGuesthouse } from "@gpta/core/scene";
import {
  addPlayer,
  advanceMovement,
  advanceRoutines,
  createInitialWorld,
  movePlayer,
} from "@gpta/core/simulation";
import {
  EntityIdSchema,
  distance,
  isActor,
  type Decision,
  type EntityId,
  type WorldSnapshot,
} from "@gpta/core/world";
import { WorldStore } from "./world-store";
import { WorldFailure, problem } from "./failure";
import type { Person } from "./person";

const attachmentSchema = z.object({
  playerId: EntityIdSchema,
  window: z.number(),
  messages: z.number(),
  lastMove: z.number(),
});
const toolResultSchema = z.discriminatedUnion("accepted", [
  z.object({ accepted: z.literal(true), revision: z.number(), eventIds: z.array(z.string()) }),
  z.object({
    accepted: z.literal(false),
    error: z.object({ _tag: z.literal("ActionRejected"), message: z.string() }),
  }),
]);

/** One world owns accepted effects; browsers and Workflows can only request actions. */
export class World extends DurableObject<Env> {
  private readonly store: WorldStore;
  private world: WorldSnapshot;
  private movementTimer: ReturnType<typeof setInterval> | undefined;
  private peopleInitialized = false;
  private nextWorkflowInspection = 0;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.store = new WorldStore(ctx.storage);
    this.world = this.store.load() ?? createInitialWorld(Date.now(), Boolean(env.OPENAI_API_KEY));
    this.world = {
      ...this.world,
      ai: { status: env.OPENAI_API_KEY ? "ready" : "disabled", model: env.OPENAI_MODEL },
    };
    ctx.blockConcurrencyWhile(async () => {
      this.store.save(this.world);
      if ((await ctx.storage.getAlarm()) === null) await ctx.storage.setAlarm(Date.now() + 1000);
    });
  }

  /** Resolve a Worker-verified cookie hash without accepting a caller-supplied identity. */
  authenticate(token: string): EntityId | undefined {
    return this.store.findSession(token, Date.now());
  }

  /** Session creation persists its player before returning the identity. */
  createSession(token: string): EntityId {
    const existing = this.authenticate(token);
    if (existing) return existing;
    const playerId = EntityIdSchema.parse(`player:${crypto.randomUUID()}`);
    const next = addPlayer(this.world, playerId);
    this.store.createSession(token, playerId, Date.now() + 30 * 86400000, next);
    this.world = next;
    return playerId;
  }

  /** Read canonical state for tools and integration checks. */
  snapshot(): WorldSnapshot {
    return this.world;
  }

  /** Only the Worker calls this upgrade route after session and origin checks. */
  override fetch(request: Request): Response {
    const identity = EntityIdSchema.safeParse(request.headers.get("x-gpta-player-id"));
    if (
      !identity.success ||
      !this.world.entities.some((entity) => entity.id === identity.data && entity.kind === "player")
    )
      return problem(401, "Session not found.");
    if (this.ctx.getWebSockets().length >= 20) return problem(429, "This world is full.");
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    pair[1].serializeAttachment({
      playerId: identity.data,
      window: Date.now(),
      messages: 0,
      lastMove: Date.now(),
    });
    this.startMovement();
    return new Response(null, {
      status: 101,
      webSocket: pair[0],
      headers: { "sec-websocket-protocol": "gpta.v1" },
    });
  }

  /** Parse untrusted frames once; an accepted mutation is saved before its response. */
  override async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== "string" || message.length > 8192) {
      socket.close(1009, "Message is too large.");
      return;
    }
    let request: WorldRequest;
    try {
      const parsed = RequestSchema.safeParse(JSON.parse(message));
      if (!parsed.success) {
        this.sendError(socket, null, -32600, "Invalid request.");
        return;
      }
      request = parsed.data;
    } catch {
      this.sendError(socket, null, -32700, "Invalid JSON.");
      return;
    }
    try {
      const attachment = attachmentSchema.parse(socket.deserializeAttachment());
      const now = Date.now();
      const messages = now - attachment.window > 1000 ? 1 : attachment.messages + 1;
      socket.serializeAttachment({
        ...attachment,
        window: messages === 1 ? now : attachment.window,
        messages,
      });
      if (messages > 30) {
        this.sendError(socket, request.id, -32000, "Input rate exceeded.");
        return;
      }
      if (request.method === "world.get") {
        socket.send(JSON.stringify({ jsonrpc: "2.0", id: request.id, result: this.world }));
        return;
      }
      if (request.method === "actor.inspect") {
        const actor = this.world.entities.find((entity) => entity.id === request.params.actorId);
        if (!actor || !isActor(actor) || actor.kind === "player") {
          this.sendError(socket, request.id, -32000, "Choose a simulated person.");
          return;
        }
        const result = await this.person(actor.id).inspect();
        socket.send(JSON.stringify({ jsonrpc: "2.0", id: request.id, result }));
        return;
      }
      if (request.method === "player.move") {
        const player = this.world.entities.find((entity) => entity.id === attachment.playerId);
        const speed =
          player && isActor(player) && player.behavior.type === "driving"
            ? MOVEMENT.driveSpeed
            : MOVEMENT.walkSpeed;
        const maxDistance = Math.min(0.5, (now - attachment.lastMove) / 1000) * speed + 0.2;
        const result = movePlayer(
          this.world,
          attachment.playerId,
          request.params.position,
          maxDistance,
        );
        socket.serializeAttachment({
          ...attachment,
          window: messages === 1 ? now : attachment.window,
          messages,
          lastMove: now,
        });
        if (!result) {
          this.sendError(socket, request.id, -32000, "Movement exceeds speed or collision limits.");
          return;
        }
        this.world = result;
        socket.send(
          JSON.stringify({
            jsonrpc: "2.0",
            id: request.id,
            result: { revision: this.world.revision, eventIds: [] },
          }),
        );
        return;
      }
      const key = `${attachment.playerId}:${request.params.idempotencyKey}`;
      const previous = this.store.receipt(key);
      if (previous) {
        socket.send(
          JSON.stringify({
            jsonrpc: "2.0",
            id: request.id,
            result: ActionReceiptSchema.parse(previous),
          }),
        );
        return;
      }
      const result = applyPlayerAction(this.world, attachment.playerId, request.params.action, {
        id: crypto.randomUUID(),
        now,
      });
      if (!result.accepted) {
        this.sendError(socket, request.id, -32000, result.error.message);
        return;
      }
      const receipt = { revision: result.world.revision, eventIds: result.eventIds };
      this.store.save(result.world, { id: key, result: receipt });
      this.world = result.world;
      socket.send(JSON.stringify({ jsonrpc: "2.0", id: request.id, result: receipt }));
      this.broadcast();
      await this.scheduleDecisions();
    } catch (cause) {
      console.error({ event: "world_input_failed", cause });
      this.sendError(socket, request.id, -32000, "The world could not process this action.");
    }
  }

  /** Close the connection and checkpoint; city routines still run through alarms. */
  override webSocketClose(socket: WebSocket, code: number): void {
    socket.close(code === 1005 || code === 1006 ? 1000 : code, "Connection closed.");
    this.store.save(this.world);
    if (
      this.ctx.getWebSockets().filter((connection) => connection.readyState === WebSocket.OPEN)
        .length === 0
    )
      this.stopMovement();
  }

  /** Transport errors end only the affected connection. */
  override webSocketError(socket: WebSocket): void {
    socket.close(1011, "Connection failed.");
    this.store.save(this.world);
  }

  /** One-second alarms keep routines alive even with no connected browser. */
  override async alarm(): Promise<void> {
    const moving =
      this.ctx.getWebSockets().length === 0 ? advanceMovement(this.world, 1) : this.world;
    const next = advanceRoutines(moving, Date.now());
    this.store.save(next);
    this.world = next;
    await this.ctx.storage.setAlarm(Date.now() + 1000);
    this.broadcast();
    this.startMovement();
    try {
      await this.scheduleDecisions();
    } catch (cause) {
      console.error({ event: "decision_schedule_failed", cause });
    }
  }

  private startMovement(): void {
    if (this.movementTimer || this.ctx.getWebSockets().length === 0) return;
    this.movementTimer = setInterval(() => {
      this.world = advanceMovement(this.world, 0.2);
      this.broadcast();
    }, 200);
  }

  private stopMovement(): void {
    if (this.movementTimer) clearInterval(this.movementTimer);
    this.movementTimer = undefined;
  }

  private broadcast(): void {
    const message = JSON.stringify({
      jsonrpc: "2.0",
      method: "world.update",
      params: { snapshot: this.world },
    });
    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.send(message);
      } catch {
        socket.close(1011, "Connection failed.");
      }
    }
  }

  private sendError(
    socket: WebSocket,
    id: string | number | null,
    code: number,
    message: string,
  ): void {
    socket.send(
      JSON.stringify({
        jsonrpc: "2.0",
        id,
        error: { code, message, data: { _tag: "ActionRejected", message } },
      }),
    );
  }

  private async scheduleDecisions(): Promise<void> {
    if (!this.env.OPENAI_API_KEY) return;
    if (!this.peopleInitialized) {
      const people = this.world.entities.filter(
        (entity) => isActor(entity) && entity.kind !== "player",
      );
      await Promise.all(
        people.map((person, index) =>
          this.person(person.id).initialize(this.env.WORLD_NAME, person.id, index),
        ),
      );
      this.peopleInitialized = true;
    }
    const wake = async (actorId: EntityId, trigger: string): Promise<void> => {
      const key = `wake:${trigger}`;
      if (this.store.receipt(key)) return;
      await this.person(actorId).wake(trigger);
      this.store.save(this.world, { id: key, result: true });
    };
    for (const incident of this.world.incidents) {
      const witness = incident.witnessIds[0];
      if (witness) await wake(witness, `incident:${incident.id}`);
    }
    const dispatcher = this.world.entities.find(
      (entity) => entity.kind === "person" && entity.role === "dispatcher",
    );
    if (dispatcher)
      for (const report of this.world.reports)
        if (report.status === "open") await wake(dispatcher.id, `report:${report.id}`);
    for (const dialogue of this.world.dialogue.slice(-12)) {
      const speaker = this.world.entities.find((entity) => entity.id === dialogue.from);
      const recipient = this.world.entities.find((entity) => entity.id === dialogue.to);
      if (speaker?.kind === "player" && recipient && isActor(recipient))
        await wake(recipient.id, `dialogue:${dialogue.id}`);
    }
    if (Date.now() >= this.nextWorkflowInspection) {
      this.nextWorkflowInspection = Date.now() + 30000;
      for (const decision of this.world.decisions.filter((item) => item.status === "running")) {
        const instance = await this.env.DECISIONS.get(decision.id);
        const status = await instance.status();
        if (
          status.status === "errored" ||
          status.status === "terminated" ||
          status.status === "complete"
        ) {
          await this.completeDecision(
            decision.id,
            "failed",
            `Workflow ${status.status} before its completion was recorded.`,
          );
        }
      }
    }
    const running = this.world.decisions.filter((decision) => decision.status === "running");
    const pending = this.world.decisions
      .filter((decision) => decision.status === "pending")
      .sort((left, right) => {
        const priority = (decision: Decision) =>
          Date.now() - decision.createdAt > 60000 || !decision.trigger.startsWith("schedule:")
            ? 0
            : 1;
        return priority(left) - priority(right) || left.createdAt - right.createdAt;
      });
    const selected = pending.slice(0, Math.max(0, 2 - running.length));
    for (const decision of selected)
      this.updateDecision(decision.id, "running", "Starting Workflow.");
    const requests = [...running, ...selected]
      .filter((decision) => !this.store.receipt(`workflow:${decision.id}`))
      .map((decision) => ({
        id: decision.id,
        params: { worldName: this.env.WORLD_NAME, decisionId: decision.id },
      }));
    // createBatch skips existing IDs, so a crash after creation cannot start another decision.
    if (requests.length > 0) {
      await this.env.DECISIONS.createBatch(requests);
      for (const request of requests)
        this.store.save(this.world, { id: `workflow:${request.id}`, result: true });
    }
  }

  private person(actorId: EntityId) {
    return this.env.PERSON.getByName(`${this.env.WORLD_NAME}:${actorId}`);
  }

  /** Person alarms enqueue at most one decision per actor; insertion order provides fair service. */
  enqueueDecision(actorId: EntityId, trigger: string): "queued" | "busy" | "disabled" {
    if (!this.env.OPENAI_API_KEY) return "disabled";
    if (
      this.world.decisions.some(
        (decision) => decision.actorId === actorId && decision.trigger === trigger,
      )
    )
      return "queued";
    if (
      this.world.decisions.some(
        (decision) =>
          decision.actorId === actorId &&
          (decision.status === "pending" || decision.status === "running"),
      )
    )
      return "busy";
    const actor = this.world.entities.find((entity) => entity.id === actorId);
    if (!actor || !isActor(actor) || actor.kind === "player" || actor.health <= 0)
      return "disabled";
    const decision: Decision = {
      id: crypto.randomUUID(),
      actorId,
      trigger,
      status: "pending",
      summary: "Waiting for Astra.",
      createdAt: Date.now(),
    };
    const next = {
      ...this.world,
      revision: this.world.revision + 1,
      decisions: [...this.world.decisions, decision],
    };
    this.store.save(next);
    this.world = next;
    this.broadcast();
    return "queued";
  }

  /** Workflow context exposes only facts known to this actor and its permitted tools. */
  async decisionContext(decisionId: string) {
    const decision = this.world.decisions.find((item) => item.id === decisionId);
    if (!decision) throw new WorldFailure("Decision does not exist.");
    const actor = this.world.entities.find((entity) => entity.id === decision.actorId);
    if (!actor || !isActor(actor)) throw new WorldFailure("Decision actor does not exist.");
    const dispatcher = actor.kind === "person" && actor.role === "dispatcher";
    const memory: ReturnType<Person["memory"]> = await this.person(actor.id).memory();
    const context = {
      actor,
      trigger: decision.trigger,
      tools: permittedTools(actor),
      memory,
      observations: this.world.observations.filter((item) => item.actorId === actor.id).slice(-12),
      incidents: this.world.incidents.filter(
        (item) =>
          item.witnessIds.includes(actor.id) ||
          (dispatcher && this.world.reports.some((report) => report.incidentId === item.id)),
      ),
      reports: dispatcher ? this.world.reports : [],
      entities: this.world.entities.filter(
        (entity) =>
          isInsideGuesthouse(entity.position) === isInsideGuesthouse(actor.position) &&
          (entity.kind === "location" ||
            entity.kind === "business" ||
            entity.kind === "police" ||
            distance(entity.position, actor.position) < 22),
      ),
      conversation: this.world.dialogue
        .filter((item) => item.from === actor.id || item.to === actor.id)
        .slice(-10),
    };
    this.updateDecision(decisionId, "running", `Context: ${JSON.stringify(context)}`);
    return context;
  }

  /** Tool effects and receipts commit together; retries return the actual first result. */
  executeTool(decisionId: string, callId: string, tool: ToolAction) {
    const key = `tool:${decisionId}:${callId}`;
    const previous = this.store.receipt(key);
    if (previous) return toolResultSchema.parse(previous);
    const decision = this.world.decisions.find((item) => item.id === decisionId);
    if (!decision || decision.status !== "running")
      return {
        accepted: false as const,
        error: { _tag: "ActionRejected" as const, message: "Decision is not active." },
      };
    const result = applyToolAction(this.world, decision.actorId, tool, {
      id: key,
      now: Date.now(),
    });
    const receipt = result.accepted
      ? { accepted: true as const, revision: result.world.revision, eventIds: result.eventIds }
      : result;
    const next = result.accepted ? result.world : this.world;
    this.store.save(next, { id: key, result: receipt });
    this.world = next;
    this.updateDecision(
      decisionId,
      "running",
      `${tool.name} ${JSON.stringify(tool.arguments)} → ${JSON.stringify(receipt)}`,
    );
    return receipt;
  }

  /** Workflow completion is durable before the Workflow acknowledges its final step. */
  async completeDecision(
    decisionId: string,
    status: "completed" | "failed",
    summary: string,
  ): Promise<void> {
    const decision = this.world.decisions.find((item) => item.id === decisionId);
    if (!decision) return;
    const memory = [
      ...decision.summary.split("\n").filter((line) => !line.startsWith("Context:")),
      summary,
    ].join("\n");
    await this.person(decision.actorId).remember(decisionId, memory);
    this.updateDecision(decisionId, status, summary);
  }

  private updateDecision(id: string, status: Decision["status"], summary: string): void {
    const current = this.world.decisions.find((decision) => decision.id === id);
    if (!current || current.status === "completed" || current.status === "failed") return;
    const next = {
      ...this.world,
      revision: this.world.revision + 1,
      decisions: this.world.decisions.map((decision) =>
        decision.id === id
          ? { ...decision, status, summary: `${decision.summary}\n${summary}`.slice(-5000) }
          : decision,
      ),
    };
    this.store.save(next);
    this.world = next;
    this.broadcast();
  }
}
