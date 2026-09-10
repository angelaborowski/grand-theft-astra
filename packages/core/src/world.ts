import { z } from "zod";

/** Stable IDs also connect scene objects to simulation entities. */
export const EntityIdSchema = z.string().min(1).max(100).brand<"EntityId">();
/** An identity parsed at a boundary or declared by the scene. */
export type EntityId = z.infer<typeof EntityIdSchema>;
/** World coordinates use meters on the ground plane. */
export const PositionSchema = z.object({ x: z.number().finite(), z: z.number().finite() });
/** A position in the shared ground plane. */
export type Position = z.infer<typeof PositionSchema>;

const behaviorSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("idle") }),
  z.object({ type: z.literal("walking"), destination: PositionSchema }),
  z.object({ type: z.literal("driving"), vehicleId: EntityIdSchema }),
]);
const base = { id: EntityIdSchema, name: z.string(), position: PositionSchema };
const actor = {
  ...base,
  money: z.number().nonnegative(),
  health: z.number().min(0).max(100),
  goal: z.string(),
  job: z.string(),
  behavior: behaviorSchema,
};

/** The mission state owns the parcel; completed delivery cannot grant another reward. */
export const MissionSchema = z.discriminatedUnion("stage", [
  z.object({ stage: z.literal("available") }),
  z.object({ stage: z.literal("offered") }),
  z.object({ stage: z.literal("carrying") }),
  z.object({ stage: z.literal("completed"), route: z.enum(["direct", "niko"]) }),
]);
/** Mission terms belong to game rules, never to generated dialogue. */
export const MISSION_TERMS = {
  startingMoney: 20,
  directReward: 80,
  nikoReward: 60,
  bedPrice: 60,
} as const;
/** A player's lasting progress survives sessions and server restarts. */
export const PlayerSchema = z.object({
  ...actor,
  kind: z.literal("player"),
  mission: MissionSchema,
  stunt: z
    .discriminatedUnion("stage", [
      z.object({
        stage: z.literal("running"),
        checkpoint: z.number().int().min(0).max(4),
        deadline: z.number(),
      }),
      z.object({ stage: z.literal("failed") }),
      z.object({ stage: z.literal("completed") }),
    ])
    .optional(),
  reputation: z.number().int(),
  shelter: z.enum(["none", "rented"]),
});
/** Only players own mission progress and accommodation. */
export type Player = z.infer<typeof PlayerSchema>;

/** Actors share movement and economy rules; institutions grant explicit authority. */
export const ActorSchema = z.discriminatedUnion("kind", [
  PlayerSchema,
  z.object({
    ...actor,
    kind: z.literal("person"),
    role: z.enum(["resident", "merchant", "dispatcher"]),
  }),
  z.object({ ...actor, kind: z.literal("police"), assignment: z.string().nullable() }),
]);
/** An individual who can act in the simulation. */
export type Actor = z.infer<typeof ActorSchema>;
/** Every visible interactive object has one canonical entity. */
export const EntitySchema = z.union([
  ActorSchema,
  z.object({
    ...base,
    kind: z.literal("vehicle"),
    ownerId: EntityIdSchema.nullable(),
    color: z.string(),
  }),
  z.object({
    ...base,
    kind: z.literal("business"),
    ownerId: EntityIdSchema,
    balance: z.number().nonnegative(),
    price: z.number().nonnegative(),
  }),
  z.object({
    ...base,
    kind: z.literal("location"),
    category: z.enum(["landmark", "police", "square", "guesthouse"]),
  }),
]);
/** The complete entity union shared by storage and rendering. */
export type Entity = z.infer<typeof EntitySchema>;
/** Activity describes accepted effects, including deterministic routines. */
export const WorldEventSchema = z.object({
  id: z.string(),
  time: z.number(),
  source: z.enum(["player", "simulation", "astra"]),
  type: z.string(),
  actorId: EntityIdSchema,
  message: z.string(),
});
/** An accepted event in the activity inspector. */
export type WorldEvent = z.infer<typeof WorldEventSchema>;
/** A decision record remains visible when provider execution fails. */
export const DecisionSchema = z.object({
  id: z.string(),
  actorId: EntityIdSchema,
  trigger: z.string(),
  status: z.enum(["pending", "running", "completed", "failed"]),
  summary: z.string(),
  createdAt: z.number(),
});
/** A persisted asynchronous decision. */
export type Decision = z.infer<typeof DecisionSchema>;
/** One snapshot restores all public simulation state after reconnect. */
export const WorldSnapshotSchema = z.object({
  version: z.literal(3),
  revision: z.number().int().nonnegative(),
  time: z.number().nonnegative(),
  entities: z.array(EntitySchema),
  events: z.array(WorldEventSchema),
  incidents: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["theft", "assault", "robbery"]),
      actorId: EntityIdSchema,
      targetId: EntityIdSchema,
      position: PositionSchema,
      witnessIds: z.array(EntityIdSchema),
    }),
  ),
  reports: z.array(
    z.object({
      id: z.string(),
      incidentId: z.string(),
      reporterId: EntityIdSchema,
      status: z.enum(["open", "dispatched"]),
    }),
  ),
  observations: z.array(
    z.object({ actorId: EntityIdSchema, eventId: z.string(), text: z.string() }),
  ),
  dialogue: z.array(
    z.object({
      id: z.string(),
      time: z.number(),
      from: EntityIdSchema,
      to: EntityIdSchema,
      text: z.string(),
    }),
  ),
  relationships: z.array(
    z.object({ from: EntityIdSchema, to: EntityIdSchema, kind: z.enum(["employed_by", "knows"]) }),
  ),
  decisions: z.array(DecisionSchema),
  population: z.object({ total: z.number().int().positive(), activeIds: z.array(EntityIdSchema) }),
  ai: z.object({ status: z.enum(["disabled", "ready"]), model: z.string() }),
});
/** Canonical state, owned by the World Durable Object. */
export type WorldSnapshot = z.infer<typeof WorldSnapshotSchema>;
/** Narrow an entity before using actor-only state. */
export function isActor(entity: Entity): entity is Actor {
  return entity.kind === "player" || entity.kind === "person" || entity.kind === "police";
}

/** Measure the distance used by movement and interaction rules. */
export function distance(a: Position, b: Position): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/** Inventory derives from mission state so the parcel cannot disagree with delivery progress. */
export function playerInventory(player: Player): string[] {
  return [
    ...(player.mission.stage === "carrying" ? ["Sealed parcel for Lev"] : []),
    ...(player.stunt?.stage === "running" ? ["Film canister"] : []),
  ];
}
