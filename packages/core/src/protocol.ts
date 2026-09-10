import { z } from "zod";
import { ActionErrorSchema, ActionReceiptSchema, PlayerActionSchema } from "./actions";
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
  "player.act": {
    params: z.object({ idempotencyKey: z.string().min(1).max(120), action: PlayerActionSchema }),
    result: ActionReceiptSchema,
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
]);
/** A request preserves the relationship between method and parameters. */
export type Request = z.infer<typeof RequestSchema>;
/** Snapshot notifications let a reconnect restore a single complete state. */
export const NotificationSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.literal("world.update"),
  params: z.object({ snapshot: WorldSnapshotSchema }),
});
/** The snapshot payload used by the world's only notification. */
export const WorldUpdateSchema = NotificationSchema;
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
  z.object({ ...requestBase, result: methodTable["actor.inspect"].result }),
  z.object({ ...requestBase, result: methodTable["world.get"].result }),
  z.object({ ...requestBase, result: ActionReceiptSchema }),
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
