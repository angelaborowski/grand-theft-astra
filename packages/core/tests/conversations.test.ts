import { expect, it } from "vitest";
import {
  applyConversationAction,
  permittedConversationTools,
  type ActionResult,
} from "../src/actions";
import { characterProfile } from "../src/characters";
import {
  ConversationActionSchema,
  TurnIdSchema,
  type ConversationAction,
  type TurnId,
} from "../src/conversations";
import { RequestSchema, ServerMessageSchema } from "../src/protocol";
import { SCENE_IDS } from "../src/scene";
import { addPlayer, createInitialWorld } from "../src/simulation";
import { ActorSchema, PlayerSchema, type EntityId, type WorldSnapshot } from "../src/world";

const offerId = TurnIdSchema.parse("ba8bf4d5-2324-4648-92cf-d66a988e809b");
const initial = () => addPlayer(createInitialWorld(), SCENE_IDS.player);
const player = (world: WorldSnapshot) =>
  PlayerSchema.parse(world.entities.find((entity) => entity.id === SCENE_IDS.player));
const actor = (world: WorldSnapshot, id: EntityId) =>
  ActorSchema.parse(world.entities.find((entity) => entity.id === id));
const context = { id: "conversation-effect", now: 1000 };
const offerDelivery = { name: "offer_delivery", arguments: {} } satisfies ConversationAction;
const acceptDelivery = { name: "accept_delivery", arguments: {} } satisfies ConversationAction;
const completeDelivery = { name: "complete_delivery", arguments: {} } satisfies ConversationAction;
const offerBed = { name: "offer_bed", arguments: {} } satisfies ConversationAction;
const rentBed = { name: "rent_bed", arguments: { offer_id: offerId } } satisfies ConversationAction;
const savedOffer = { id: offerId, amount: 60 };

function beside(world: WorldSnapshot, actorId: EntityId): WorldSnapshot {
  const position = actor(world, actorId).position;
  return {
    ...world,
    entities: world.entities.map((entity) =>
      entity.id === SCENE_IDS.player ? { ...entity, position } : entity,
    ),
  };
}

function apply(world: WorldSnapshot, actorId: EntityId, tool: ConversationAction): ActionResult {
  return applyConversationAction(
    beside(world, actorId),
    actorId,
    SCENE_IDS.player,
    tool,
    { ...context, id: `conversation-${world.revision}` },
    null,
  );
}

function accepted(result: ActionResult): WorldSnapshot {
  if (!result.accepted) throw new Error(result.error.message);
  return result.world;
}

function carrying(): WorldSnapshot {
  const offered = accepted(apply(initial(), SCENE_IDS.mila, offerDelivery));
  return accepted(apply(offered, SCENE_IDS.mila, acceptDelivery));
}

function rent(world: WorldSnapshot, offer: { id: TurnId; amount: number } | null): ActionResult {
  return applyConversationAction(world, SCENE_IDS.irina, SCENE_IDS.player, rentBed, context, offer);
}

it("limits each character to their current conversation authority", () => {
  const world = initial();
  expect(permittedConversationTools(actor(world, SCENE_IDS.mila))).toEqual([
    "offer_delivery",
    "accept_delivery",
  ]);
  expect(apply(world, SCENE_IDS.niko, offerDelivery).accepted).toBe(false);
  expect(apply(world, SCENE_IDS.mila, offerBed).accepted).toBe(false);
  expect(permittedConversationTools({ ...actor(world, SCENE_IDS.irina), health: 0 })).toEqual([]);
});

it("requires an offered delivery before conversational acceptance", () => {
  expect(apply(initial(), SCENE_IDS.mila, acceptDelivery).accepted).toBe(false);
  expect(player(carrying()).mission).toEqual({ stage: "carrying" });
});

it("grants the direct reward once and attributes the effect to Astra", () => {
  const delivered = accepted(apply(carrying(), SCENE_IDS.lev, completeDelivery));
  expect(player(delivered)).toMatchObject({
    money: 100,
    reputation: 1,
    mission: { stage: "completed", route: "direct" },
  });
  expect(delivered.events.at(-1)).toMatchObject({
    actorId: SCENE_IDS.lev,
    type: "complete_delivery",
    source: "astra",
  });
  expect(apply(delivered, SCENE_IDS.lev, completeDelivery).accepted).toBe(false);
  expect(apply(delivered, SCENE_IDS.niko, completeDelivery).accepted).toBe(false);
});

it("preserves Niko's reduced reward without a reputation penalty", () => {
  const delivered = accepted(apply(carrying(), SCENE_IDS.niko, completeDelivery));
  expect(player(delivered)).toMatchObject({
    money: 80,
    reputation: 1,
    mission: { stage: "completed", route: "niko" },
  });
});

it("records a bed offer without charging or assigning shelter", () => {
  const world = initial();
  const offered = accepted(apply(world, SCENE_IDS.irina, offerBed));
  expect(player(offered)).toMatchObject({ money: 20, shelter: "none" });
  expect(actor(offered, SCENE_IDS.irina).money).toBe(actor(world, SCENE_IDS.irina).money);
  expect(offered.events.at(-1)).toMatchObject({ type: "offer_bed", source: "astra" });
});

it.each([
  null,
  { id: offerId, amount: 1 },
  { id: TurnIdSchema.parse("c2f942fa-8fb9-4344-bfc4-fec2fd66c0f4"), amount: 60 },
])("rejects a missing or mismatched bed offer: %j", (offer) => {
  const world = beside(initial(), SCENE_IDS.irina);
  const result = rent(world, offer);
  expect(result.accepted).toBe(false);
  expect(player(world)).toMatchObject({ money: 20, shelter: "none" });
});

it("checks funds even when the saved bed offer is valid", () => {
  const world = beside(initial(), SCENE_IDS.irina);
  const result = rent(world, savedOffer);
  expect(result.accepted).toBe(false);
  expect(player(world).money).toBe(20);
});

it("charges once for a saved bed offer and retains the agreed price", () => {
  const delivered = accepted(apply(carrying(), SCENE_IDS.niko, completeDelivery));
  const world = beside(delivered, SCENE_IDS.irina);
  const rented = accepted(rent(world, savedOffer));
  expect(player(rented)).toMatchObject({ money: 20, shelter: "rented" });
  expect(actor(rented, SCENE_IDS.irina).money).toBe(260);
  expect(rent(rented, savedOffer).accepted).toBe(false);
});

it("rejects stale proximity and a player in another space", () => {
  const world = initial();
  const offer = ConversationActionSchema.parse({ name: "offer_delivery", arguments: {} });
  expect(
    applyConversationAction(world, SCENE_IDS.mila, SCENE_IDS.player, offer, context, null).accepted,
  ).toBe(false);
  const inside = beside(world, SCENE_IDS.irina);
  expect(
    applyConversationAction(inside, SCENE_IDS.mila, SCENE_IDS.player, offer, context, null)
      .accepted,
  ).toBe(false);
});

it("rejects model arguments that choose a player or arbitrary action", () => {
  expect(
    ConversationActionSchema.safeParse({
      name: "accept_delivery",
      arguments: { playerId: "another-player" },
    }).success,
  ).toBe(false);
  expect(ConversationActionSchema.safeParse({ name: "take_vehicle", arguments: {} }).success).toBe(
    false,
  );
});

it("accepts conversation calls and preserves existing world notifications", () => {
  const request = {
    jsonrpc: "2.0",
    id: 1,
    method: "conversation.send",
    params: { actorId: SCENE_IDS.mila, message: "Hello", idempotencyKey: "message-1" },
  };
  expect(RequestSchema.safeParse(request).success).toBe(true);
  expect(
    RequestSchema.safeParse({
      ...request,
      params: { ...request.params, message: "x".repeat(2001) },
    }).success,
  ).toBe(false);
  expect(
    ServerMessageSchema.safeParse({
      jsonrpc: "2.0",
      method: "world.update",
      params: { snapshot: initial() },
    }).success,
  ).toBe(true);
});

it("gives residents stable individual stories without sharing mutable profiles", () => {
  const world = initial();
  const profiles = world.entities
    .filter((entity) => entity.kind === "person" || entity.kind === "police")
    .map((entity) => characterProfile(entity));
  expect(new Set(profiles.map((profile) => profile.story)).size).toBe(100);
  const mila = actor(world, SCENE_IDS.mila);
  const changed = characterProfile(mila);
  changed.traits.push("changed");
  expect(characterProfile(mila).traits).not.toContain("changed");
  expect(characterProfile(mila)).toEqual(characterProfile(mila));
});
