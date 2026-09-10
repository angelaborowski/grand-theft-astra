import { z } from "zod";
import { ActionErrorSchema, ActionReceiptSchema, PlayerActionSchema } from "./actions";
import { ConversationTurnSchema } from "./conversations";
import { PlayerCommandSchema, PlayerControlResultSchema, PlayerControlSchema } from "./gameplay-v2";
import { EntityIdSchema, PositionSchema, WorldSnapshotSchema } from "./world";

/** The WebSocket handshake owns protocol version negotiation. */
export const PROTOCOL = "gpta.v1";
/** Session identity is assigned by the server's HttpOnly cookie. */
export const SessionSchema = z.object({ playerId: EntityIdSchema });
/** Personal memory comes from the selected person's Durable Object. */
export const ActorMemorySchema = z.object({
  memory: z.array(z.object({ decisionId: z.string(), summary: z.string(), updatedAt: z.number() })),
  nextDecisionAt: z.number(),
  sequence: z.number().int().nonnegative(),
  pendingTrigger: z.string().nullable(),
});
/** Parameters and success values have one authoritative method definition. */
export const methodTable = {
  "world.get": { params: z.object({}), result: WorldSnapshotSchema },
  "actor.inspect": { params: z.object({ actorId: EntityIdSchema }), result: ActorMemorySchema },
  "player.move": { params: z.object({ position: PositionSchema }), result: ActionReceiptSchema },
  "player.control": { params: PlayerControlSchema, result: PlayerControlResultSchema },
  "player.command": {
    params: z.object({ idempotencyKey: z.string().min(1).max(120), command: PlayerCommandSchema }),
    result: ActionReceiptSchema,
  },
  "player.act": {
    params: z.object({ idempotencyKey: z.string().min(1).max(120), action: PlayerActionSchema }),
    result: ActionReceiptSchema,
  },
  "conversation.send": {
    params: z.object({
      actorId: EntityIdSchema,
      message: z.string().trim().min(1).max(2000),
      idempotencyKey: z.string().min(1).max(120),
    }),
    result: ConversationTurnSchema,
  },
  "conversation.history": {
    params: z.object({ actorId: EntityIdSchema }),
    result: z.array(ConversationTurnSchema),
  },
};
const requestBase = { jsonrpc: z.literal("2.0"), id: z.union([z.string(), z.number()]) };
/** Parse incoming calls before dispatch; payloads derive from the method table. */
export const RequestSchema = z.discriminatedUnion("method", [
  z.object({
    ...requestBase,
    method: z.literal("actor.inspect"),
    params: methodTable["actor.inspect"].params,
  }),
  z.object({
    ...requestBase,
    method: z.literal("world.get"),
    params: methodTable["world.get"].params,
  }),
  z.object({
    ...requestBase,
    method: z.literal("player.move"),
    params: methodTable["player.move"].params,
  }),
  z.object({
    ...requestBase,
    method: z.literal("player.act"),
    params: methodTable["player.act"].params,
  }),
  z.object({
    ...requestBase,
    method: z.literal("player.control"),
    params: methodTable["player.control"].params,
  }),
  z.object({
    ...requestBase,
    method: z.literal("player.command"),
    params: methodTable["player.command"].params,
  }),
  z.object({
    ...requestBase,
    method: z.literal("conversation.send"),
    params: methodTable["conversation.send"].params,
  }),
  z.object({
    ...requestBase,
    method: z.literal("conversation.history"),
    params: methodTable["conversation.history"].params,
  }),
]);
/** A request preserves the relationship between method and parameters. */
export type Request = z.infer<typeof RequestSchema>;
/** Snapshot notifications let a reconnect restore a single complete state. */
export const WorldUpdateSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.literal("world.update"),
  params: z.object({ snapshot: WorldSnapshotSchema }),
});
/** Conversation updates carry a complete turn so reconnects need no missing text chunks. */
export const ConversationUpdateSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.literal("conversation.update"),
  params: z.object({ turn: ConversationTurnSchema }),
});
/** Every notification has a named, fully typed payload. */
export const NotificationSchema = z.discriminatedUnion("method", [
  WorldUpdateSchema,
  ConversationUpdateSchema,
]);
/** Unknown infrastructure failures collapse into a safe public error. */
export const PublicErrorSchema = z.discriminatedUnion("_tag", [
  ActionErrorSchema,
  z.object({ _tag: z.literal("RequestFailure"), message: z.string() }),
  z.object({ _tag: z.literal("WorldFailure"), message: z.string() }),
]);
/** Domain errors use JSON-RPC's failure channel and a typed data payload. */
export const ErrorResponseSchema = z.object({
  ...requestBase,
  id: requestBase.id.nullable(),
  error: z.object({ code: z.number(), message: z.string(), data: PublicErrorSchema }),
});
/** Known success payloads stay fully described at the transport boundary. */
export const ResponseSchema = z.union([
  z.object({ ...requestBase, result: methodTable["player.control"].result }),
  z.object({ ...requestBase, result: methodTable["actor.inspect"].result }),
  z.object({ ...requestBase, result: methodTable["world.get"].result }),
  z.object({ ...requestBase, result: ActionReceiptSchema }),
  z.object({ ...requestBase, result: methodTable["conversation.send"].result }),
  z.object({ ...requestBase, result: methodTable["conversation.history"].result }),
  ErrorResponseSchema,
]);
/** Parse every server message before notifying the UI or resolving a request. */
export const ServerMessageSchema = z.union([ResponseSchema, NotificationSchema]);
/** A typed caller uses the method table while its adapter owns correlation. */
export type MethodParams<Name extends keyof typeof methodTable> = z.infer<
  (typeof methodTable)[Name]["params"]
>;
/** A method's success type comes from its result schema. */
export type MethodResult<Name extends keyof typeof methodTable> = z.infer<
  (typeof methodTable)[Name]["result"]
>;
