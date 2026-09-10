import { z } from "zod";
import { EntityIdSchema } from "./world";

/** A turn identity also identifies a saved offer made during that turn. */
export const TurnIdSchema = z.uuid().brand<"TurnId">();
/** The server assigns this identity before conversation work starts. */
export type TurnId = z.infer<typeof TurnIdSchema>;

/** Each state carries only the text or error available at that stage. */
export const ConversationResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("queued") }),
  z.object({ status: z.literal("thinking") }),
  z.object({ status: z.literal("streaming"), text: z.string() }),
  z.object({ status: z.literal("completed"), text: z.string() }),
  z.object({ status: z.literal("interrupted"), text: z.string(), error: z.string() }),
  z.object({ status: z.literal("failed"), error: z.string() }),
]);
/** A turn retains the player's message and the latest saved response. */
export const ConversationTurnSchema = z.object({
  id: TurnIdSchema,
  actorId: EntityIdSchema,
  playerId: EntityIdSchema,
  requestId: z.union([z.string(), z.number()]),
  message: z.string().trim().min(1).max(2000),
  createdAt: z.number(),
  revision: z.number().int().nonnegative(),
  response: ConversationResponseSchema,
});
/** Revisions let clients discard an older update after reconnecting. */
export type ConversationTurn = z.infer<typeof ConversationTurnSchema>;

/** The server supplies both participants; model arguments cannot choose a player. */
export const conversationToolSchemas = {
  offer_delivery: z.strictObject({}),
  accept_delivery: z.strictObject({}),
  complete_delivery: z.strictObject({}),
  offer_bed: z.strictObject({}),
  rent_bed: z.strictObject({ offer_id: TurnIdSchema }),
};
/** Conversation tools expose only the actions that a player's reply can authorize. */
export const ConversationActionSchema = z.discriminatedUnion("name", [
  z.object({
    name: z.literal("offer_delivery"),
    arguments: conversationToolSchemas.offer_delivery,
  }),
  z.object({
    name: z.literal("accept_delivery"),
    arguments: conversationToolSchemas.accept_delivery,
  }),
  z.object({
    name: z.literal("complete_delivery"),
    arguments: conversationToolSchemas.complete_delivery,
  }),
  z.object({ name: z.literal("offer_bed"), arguments: conversationToolSchemas.offer_bed }),
  z.object({ name: z.literal("rent_bed"), arguments: conversationToolSchemas.rent_bed }),
]);
/** A proposal remains subject to current world state and a saved offer. */
export type ConversationAction = z.infer<typeof ConversationActionSchema>;
