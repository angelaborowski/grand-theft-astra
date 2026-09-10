import { z } from "zod";
import type { ConversationAction, TurnId } from "./conversations";
import {
  GUESTHOUSE,
  MUSEUM,
  museumFloorHeight,
  isInsideGuesthouse,
  MOVEMENT,
  positionIsWalkable,
  PROTECTED_CHARACTER_IDS,
  SCENE_IDS,
  STUNT,
  stuntVehicleId,
} from "./scene";
import {
  distance,
  EntityIdSchema,
  isActor,
  MISSION_TERMS,
  type Actor,
  type EntityId,
  type WorldSnapshot,
} from "./world";

/** Player identity comes from the session, never from these parameters. */
export const PlayerActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("talk"),
    targetId: EntityIdSchema,
    text: z.string().trim().min(1).max(500),
  }),
  z.object({ type: z.literal("visit_museum"), targetId: EntityIdSchema }),
  z.object({ type: z.literal("launch_stunt"), targetId: EntityIdSchema }),
  z.object({ type: z.literal("start_stunt"), targetId: EntityIdSchema }),
  z.object({ type: z.literal("finish_stunt"), targetId: EntityIdSchema }),
  z.object({ type: z.literal("take_vehicle"), targetId: EntityIdSchema }),
  z.object({ type: z.literal("exit_vehicle"), targetId: EntityIdSchema }),
  z.object({ type: z.literal("hit"), targetId: EntityIdSchema }),
  z.object({ type: z.literal("rob"), targetId: EntityIdSchema }),
  z.object({ type: z.literal("enter"), targetId: EntityIdSchema }),
  z.object({ type: z.literal("leave_location"), targetId: EntityIdSchema }),
  z.object({ type: z.literal("ask_for_work"), targetId: EntityIdSchema }),
  z.object({ type: z.literal("accept_mission"), targetId: EntityIdSchema }),
  z.object({ type: z.literal("deliver_parcel"), targetId: EntityIdSchema }),
  z.object({ type: z.literal("rent_bed"), targetId: EntityIdSchema }),
]);
/** An interaction parsed at the WebSocket boundary. */
export type PlayerAction = z.infer<typeof PlayerActionSchema>;
/** Exact model tool names and parameter names follow the v3 contract. */
export const toolSchemas = {
  say: z.object({ to: EntityIdSchema, text: z.string().trim().min(1).max(500) }),
  go_to: z.object({ location_id: EntityIdSchema }),
  report_crime: z.object({ incident_id: z.string().min(1) }),
  dispatch_police: z.object({ report_id: z.string().min(1), unit_id: EntityIdSchema }),
  set_price: z.object({ business_id: EntityIdSchema, amount: z.number().min(1).max(1000) }),
  offer_mission: z.object({ to: EntityIdSchema }),
};
/** Tool arguments stay paired with their tool name. */
export const ToolActionSchema = z.discriminatedUnion("name", [
  z.object({ name: z.literal("say"), arguments: toolSchemas.say }),
  z.object({ name: z.literal("go_to"), arguments: toolSchemas.go_to }),
  z.object({ name: z.literal("report_crime"), arguments: toolSchemas.report_crime }),
  z.object({ name: z.literal("dispatch_police"), arguments: toolSchemas.dispatch_police }),
  z.object({ name: z.literal("set_price"), arguments: toolSchemas.set_price }),
  z.object({ name: z.literal("offer_mission"), arguments: toolSchemas.offer_mission }),
]);
/** A model request is a proposal until the simulation accepts it. */
export type ToolAction = z.infer<typeof ToolActionSchema>;
/** Expected invalid actions travel through the transport's error channel. */
export const ActionErrorSchema = z.object({
  _tag: z.literal("ActionRejected"),
  message: z.string(),
});
/** A safe error payload contains no provider or persistence details. */
export type ActionError = z.infer<typeof ActionErrorSchema>;
/** Acknowledgements describe effects already committed by the server. */
export const ActionReceiptSchema = z.object({
  revision: z.number().int(),
  eventIds: z.array(z.string()),
});
/** The transport sends this receipt after persistence succeeds. */
export type ActionReceipt = z.infer<typeof ActionReceiptSchema>;
/** Rules compute a replacement world without mutating their input. */
export type ActionResult =
  | { accepted: true; world: WorldSnapshot; eventIds: string[] }
  | { accepted: false; error: ActionError };
/** The application owns effect identities and the clock. */
export type ActionContext = { id: string; now: number };

function reject(message: string): ActionResult {
  return { accepted: false, error: { _tag: "ActionRejected", message } };
}

function accept(
  world: WorldSnapshot,
  actorId: EntityId,
  type: string,
  message: string,
  source: "player" | "astra",
  context: ActionContext,
): ActionResult {
  world.revision += 1;
  world.events = [
    ...world.events,
    { id: context.id, time: context.now, actorId, type, message, source },
  ].slice(-100);
  return { accepted: true, world, eventIds: [context.id] };
}

/** Record observed damage through the same incident rules used by player interactions. */
export function recordIncident(
  world: WorldSnapshot,
  actorId: EntityId,
  targetId: EntityId,
  type: "theft" | "assault" | "robbery",
  context: ActionContext,
): void {
  const target = world.entities.find((entity) => entity.id === targetId);
  if (!target) return;
  const witnesses = world.entities.filter(
    (entity) =>
      isActor(entity) &&
      entity.id !== actorId &&
      entity.health > 0 &&
      distance(entity.position, target.position) <= 22,
  );
  world.incidents.push({
    id: context.id,
    actorId,
    targetId,
    type,
    position: { ...target.position },
    witnessIds: witnesses.map((entity) => entity.id),
  });
  world.observations.push(
    ...witnesses.map((entity) => ({
      actorId: entity.id,
      eventId: context.id,
      text: `${entity.name} observed ${type} by ${actorId} at ${target.name}.`,
    })),
  );
  world.observations = world.observations.slice(-200);
}

/** Apply one player interaction; persistence and idempotency belong to the server. */
export function applyPlayerAction(
  current: WorldSnapshot,
  actorId: EntityId,
  action: PlayerAction,
  context: ActionContext,
): ActionResult {
  const world = structuredClone(current);
  const actor = world.entities.find((entity) => entity.id === actorId);
  const target = world.entities.find((entity) => entity.id === action.targetId);
  if (actor?.kind !== "player" || actor.health <= 0) return reject("This player cannot act.");
  if (!target || target.id === actorId) return reject("Choose another entity.");
  if (action.type === "visit_museum") {
    if (target.id !== SCENE_IDS.square) return reject("Choose the museum opening.");
    if (
      actor.behavior.type === "driving" ||
      (actor.stunt?.stage === "running" && actor.stunt.deadline > context.now)
    )
      return reject("Finish your drive before visiting the museum.");
    actor.position = { ...MUSEUM.spawn };
    actor.elevation = museumFloorHeight(MUSEUM.spawn);
    actor.heading = Math.PI;
    actor.grounded = true;
    actor.behavior = { type: "idle" };
    return accept(world, actorId, action.type, "Entered the Historical Museum.", "player", context);
  }
  if (action.type === "launch_stunt") {
    if (target.id !== SCENE_IDS.mila) return reject("Choose Last Flight with Mila.");
    if (actor.stunt?.stage === "completed")
      return reject("Last Flight is complete. Continue exploring the city.");
    if (actor.stunt?.stage === "running" && actor.stunt.deadline > context.now)
      return accept(world, actorId, action.type, "Last Flight resumed.", "player", context);
    actor.position = { ...target.position };
    actor.elevation = 0;
    actor.grounded = true;
    actor.behavior = { type: "idle" };
    const started = applyPlayerAction(
      world,
      actorId,
      { type: "start_stunt", targetId: target.id },
      context,
    );
    if (!started.accepted) return started;
    const driver = started.world.entities.find((entity) => entity.id === actorId);
    const car = started.world.entities.find((entity) => entity.id === stuntVehicleId(actorId));
    if (driver?.kind !== "player" || car?.kind !== "vehicle")
      return reject("Mission car unavailable.");
    const startPosition = [110, 117, 124, 131]
      .map((z) => ({ x: STUNT.checkpoints[0].x, z }))
      .find(
        (position) =>
          positionIsWalkable(position) &&
          !started.world.entities.some(
            (entity) =>
              entity.id !== car.id &&
              entity.kind === "vehicle" &&
              distance(position, entity.position) < 6,
          ),
      );
    if (!startPosition) return reject("The starting lane is occupied. Try again in a moment.");
    car.position = startPosition;
    car.heading = 0;
    driver.heading = car.heading;
    driver.position = { ...car.position };
    driver.elevation = 0;
    driver.grounded = true;
    car.elevation = 0;
    driver.behavior = { type: "driving", vehicleId: car.id };
    return started;
  }
  if (action.type === "leave_location") {
    if (target.id !== SCENE_IDS.guesthouse || !isInsideGuesthouse(actor.position))
      return reject("This player is not inside the guesthouse.");
    actor.position = { ...GUESTHOUSE.entrance };
    actor.behavior = { type: "idle" };
    return accept(
      world,
      actorId,
      action.type,
      `${actor.name} leaves the guesthouse.`,
      "player",
      context,
    );
  }
  if (distance(actor.position, target.position) > MOVEMENT.interactionRange)
    return reject("Move closer to the target.");
  switch (action.type) {
    case "start_stunt": {
      if (target.id !== SCENE_IDS.mila) return reject("Meet Mila to start Last Flight.");
      if (actor.stunt?.stage === "completed") return reject("You already earned this reward.");
      if (actor.stunt?.stage === "running" && actor.stunt.deadline > context.now)
        return reject("The clock is already running.");
      if (actor.behavior.type === "driving") return reject("Park and get out before meeting Mila.");
      const carId = stuntVehicleId(actor.id);
      if (
        world.entities.some(
          (entity) =>
            isActor(entity) &&
            entity.behavior.type === "driving" &&
            entity.behavior.vehicleId === carId,
        )
      )
        return reject("Your mission car has a driver. Wait until it is parked before retrying.");
      const parking = [4, -6, 10, -12]
        .map((x) => ({ x: actor.position.x + x, z: actor.position.z + 4 }))
        .find(
          (position) =>
            positionIsWalkable(position) &&
            !world.entities.some(
              (entity) =>
                entity.kind === "vehicle" &&
                entity.id !== carId &&
                distance(position, entity.position) < 5,
            ),
        );
      if (!parking)
        return reject("There is no clear space for your car. Move a few metres and try again.");
      const car = world.entities.find((entity) => entity.id === carId);
      if (car?.kind === "vehicle") {
        car.position = parking;
        car.ownerId = actor.id;
      } else
        world.entities.push({
          id: carId,
          kind: "vehicle",
          name: "Last Flight · stunt car",
          position: parking,
          ownerId: actor.id,
          color: "#b8202b",
          vehicleType: "car",
          elevation: 0,
          heading: 0,
        });
      actor.stunt = { stage: "running", checkpoint: 0, deadline: context.now + STUNT.duration };
      world.dialogue.push({
        id: context.id,
        time: context.now,
        from: target.id,
        to: actor.id,
        text: "Last Flight. Get in your marked stunt car, follow the amber gates and take both ramps. Brake at the helicopter, get out and hand over the film. Two and a half minutes. Go!",
      });
      world.dialogue = world.dialogue.slice(-100);
      return accept(
        world,
        actorId,
        action.type,
        "Last Flight started. Deliver the film before the helicopter leaves.",
        "player",
        context,
      );
    }
    case "finish_stunt": {
      if (target.id !== SCENE_IDS.helipad || actor.stunt?.stage !== "running")
        return reject("Start Last Flight with Mila first.");
      if (context.now >= actor.stunt.deadline)
        return reject("The flight left. Return to Mila to retry.");
      if (actor.stunt.checkpoint !== STUNT.checkpoints.length)
        return reject("Drive through every route gate in order first.");
      if (actor.behavior.type === "driving") return reject("Park and get out to deliver the film.");
      actor.stunt = { stage: "completed" };
      actor.money += STUNT.reward;
      actor.reputation += 2;
      return accept(
        world,
        actorId,
        action.type,
        `Film delivered. Earned ₽${STUNT.reward} and 2 reputation.`,
        "player",
        context,
      );
    }
    case "ask_for_work": {
      if (target.id !== SCENE_IDS.mila || !isActor(target))
        return reject("Ask Mila about the parcel delivery.");
      if (actor.mission.stage === "carrying" || actor.mission.stage === "completed")
        return reject("This player already accepted Mila's delivery.");
      const text = "I need paid work. Tell me about the parcel delivery and its two options.";
      world.dialogue = [
        ...world.dialogue,
        { id: context.id, time: context.now, from: actorId, to: target.id, text },
      ].slice(-100);
      world.observations = [
        ...world.observations,
        {
          actorId: target.id,
          eventId: context.id,
          text: `${actor.name} asks for paid delivery work.`,
        },
      ].slice(-200);
      return accept(
        world,
        actorId,
        action.type,
        `${actor.name} asks Mila for work.`,
        "player",
        context,
      );
    }
    case "accept_mission": {
      if (target.id !== SCENE_IDS.mila) return reject("Accept the parcel from Mila.");
      if (actor.mission.stage === "carrying" || actor.mission.stage === "completed")
        return reject("This delivery is already accepted or completed.");
      actor.mission = { stage: "carrying" };
      return accept(
        world,
        actorId,
        action.type,
        `${actor.name} takes Mila's parcel. Deliver to Lev for ₽${MISSION_TERMS.directReward}, or give it to Niko for ₽${MISSION_TERMS.nikoReward}.`,
        "player",
        context,
      );
    }
    case "deliver_parcel": {
      if (actor.mission.stage !== "carrying")
        return reject("This player has no parcel to deliver.");
      if (target.id !== SCENE_IDS.lev && target.id !== SCENE_IDS.niko)
        return reject("Deliver the parcel to Lev or Niko.");
      const route = target.id === SCENE_IDS.lev ? "direct" : "niko";
      const reward = route === "direct" ? MISSION_TERMS.directReward : MISSION_TERMS.nikoReward;
      actor.mission = { stage: "completed", route };
      actor.money += reward;
      actor.reputation += 1;
      return accept(
        world,
        actorId,
        action.type,
        `${actor.name} gives the parcel to ${target.name}, earns ₽${reward}, and gains 1 reputation.`,
        "player",
        context,
      );
    }
    case "rent_bed": {
      if (target.id !== SCENE_IDS.irina || !isActor(target) || !isInsideGuesthouse(actor.position))
        return reject("Speak to Irina inside the guesthouse.");
      if (actor.shelter === "rented") return reject("This player already has a bed.");
      if (actor.money < MISSION_TERMS.bedPrice)
        return reject(`A bed costs ₽${MISSION_TERMS.bedPrice}. Complete a delivery to earn money.`);
      actor.money -= MISSION_TERMS.bedPrice;
      target.money += MISSION_TERMS.bedPrice;
      actor.shelter = "rented";
      return accept(
        world,
        actorId,
        action.type,
        `${actor.name} rents a bed from Irina for ₽${MISSION_TERMS.bedPrice}.`,
        "player",
        context,
      );
    }
    case "talk":
      if (!isActor(target)) return reject("This entity cannot talk.");
      world.dialogue = [
        ...world.dialogue,
        { id: context.id, time: context.now, from: actorId, to: target.id, text: action.text },
      ].slice(-100);
      world.observations = [
        ...world.observations,
        { actorId: target.id, eventId: context.id, text: `${actor.name} says: ${action.text}` },
      ].slice(-200);
      return accept(
        world,
        actorId,
        "talk",
        `${actor.name} speaks to ${target.name}.`,
        "player",
        context,
      );
    case "take_vehicle": {
      if (target.kind !== "vehicle") return reject("This entity is not a vehicle.");
      if (target.vehicleType === "helicopter") return reject("Use the helicopter entry control.");
      if (target.id.startsWith("stunt:") && target.ownerId !== actorId)
        return reject("This stunt car is reserved for its driver.");
      if (
        actor.behavior.type === "driving" ||
        world.entities.some(
          (entity) =>
            isActor(entity) &&
            entity.behavior.type === "driving" &&
            entity.behavior.vehicleId === target.id,
        )
      )
        return reject("The vehicle or player already has a driver assignment.");
      const stolen = target.ownerId !== actorId;
      if (stolen) recordIncident(world, actorId, target.id, "theft", context);
      target.ownerId = actorId;
      actor.position = { ...target.position };
      actor.elevation = 0;
      actor.grounded = true;
      actor.behavior = { type: "driving", vehicleId: target.id };
      const message = stolen
        ? `${actor.name} takes ${target.name}. Witnesses can report the theft.`
        : `${actor.name} enters ${target.name}.`;
      return accept(world, actorId, "take_vehicle", message, "player", context);
    }
    case "exit_vehicle": {
      if (target.kind === "vehicle" && target.vehicleType === "helicopter")
        return reject("Use the helicopter exit control.");
      if (
        target.kind !== "vehicle" ||
        actor.behavior.type !== "driving" ||
        actor.behavior.vehicleId !== target.id
      )
        return reject("This player is not driving this vehicle.");
      const position = [
        { x: target.position.x + 2.2, z: target.position.z },
        { x: target.position.x - 2.2, z: target.position.z },
        { x: target.position.x, z: target.position.z + 3 },
        { x: target.position.x, z: target.position.z - 3 },
      ].find(positionIsWalkable);
      if (!position) return reject("Move the vehicle away from the building before exiting.");
      actor.position = position;
      actor.behavior = { type: "idle" };
      return accept(
        world,
        actorId,
        "exit_vehicle",
        `${actor.name} exits ${target.name}.`,
        "player",
        context,
      );
    }
    case "hit":
      if (!isActor(target) || target.health <= 0) return reject("This target cannot be hit.");
      target.health = Math.max(
        PROTECTED_CHARACTER_IDS.includes(target.id) ? 1 : 0,
        target.health - 20,
      );
      recordIncident(world, actorId, target.id, "assault", context);
      return accept(world, actorId, "hit", `${actor.name} hits ${target.name}.`, "player", context);
    case "rob": {
      if (target.kind !== "business" || target.balance === 0)
        return reject("This location has no money to take.");
      const amount = Math.min(100, target.balance);
      target.balance -= amount;
      actor.money += amount;
      recordIncident(world, actorId, target.id, "robbery", context);
      return accept(
        world,
        actorId,
        "rob",
        `${actor.name} takes ₽${amount} from ${target.name}.`,
        "player",
        context,
      );
    }
    case "enter":
      if (target.kind !== "location" && target.kind !== "business")
        return reject("Choose a marked location.");
      if (target.id === SCENE_IDS.guesthouse) {
        if (actor.behavior.type === "driving")
          return reject("Exit the vehicle before entering the guesthouse.");
        actor.position = { ...GUESTHOUSE.spawn };
        actor.behavior = { type: "idle" };
      }
      return accept(
        world,
        actorId,
        "enter",
        `${actor.name} enters ${target.name}.`,
        "player",
        context,
      );
  }
}

/** Limit model tools before inference; execution checks authority again. */
export function permittedTools(actor: Actor): ToolAction["name"][] {
  if (actor.kind === "player" || actor.health <= 0) return [];
  const names: ToolAction["name"][] = ["say", "go_to", "report_crime"];
  if (actor.kind === "person" && actor.role === "dispatcher") names.push("dispatch_police");
  if (actor.kind === "person" && actor.role === "merchant") names.push("set_price");
  if (actor.id === SCENE_IDS.mila) names.push("offer_mission");
  return names;
}

/** Recheck current state when an asynchronous model decision requests an effect. */
export function applyToolAction(
  current: WorldSnapshot,
  actorId: EntityId,
  tool: ToolAction,
  context: ActionContext,
): ActionResult {
  const world = structuredClone(current);
  const actor = world.entities.find((entity) => entity.id === actorId);
  if (!actor || !isActor(actor) || !permittedTools(actor).includes(tool.name))
    return reject("This actor cannot use this tool.");
  switch (tool.name) {
    case "offer_mission": {
      const player = world.entities.find((entity) => entity.id === tool.arguments.to);
      if (actor.id !== SCENE_IDS.mila || player?.kind !== "player")
        return reject("Only Mila can offer the delivery to a player.");
      if (distance(actor.position, player.position) > MOVEMENT.interactionRange)
        return reject("The player moved too far away to receive the offer.");
      if (player.mission.stage !== "available")
        return reject("This delivery is already offered, accepted, or completed.");
      player.mission = { stage: "offered" };
      return accept(
        world,
        actorId,
        tool.name,
        `Mila offers ${player.name} the parcel delivery: Lev pays ₽${MISSION_TERMS.directReward}; Niko pays ₽${MISSION_TERMS.nikoReward}.`,
        "astra",
        context,
      );
    }
    case "say": {
      const target = world.entities.find((entity) => entity.id === tool.arguments.to);
      if (!target || !isActor(target) || distance(actor.position, target.position) > 22)
        return reject("The listener cannot hear this actor.");
      world.dialogue = [
        ...world.dialogue,
        {
          id: context.id,
          time: context.now,
          from: actorId,
          to: target.id,
          text: tool.arguments.text,
        },
      ].slice(-100);
      world.observations = [
        ...world.observations,
        {
          actorId: target.id,
          eventId: context.id,
          text: `${actor.name} says: ${tool.arguments.text}`,
        },
      ].slice(-200);
      return accept(
        world,
        actorId,
        tool.name,
        `${actor.name}: ${tool.arguments.text}`,
        "astra",
        context,
      );
    }
    case "go_to": {
      const location = world.entities.find((entity) => entity.id === tool.arguments.location_id);
      if (!location || (location.kind !== "location" && location.kind !== "business"))
        return reject("Choose a known location.");
      if (isInsideGuesthouse(actor.position) !== isInsideGuesthouse(location.position))
        return reject("This destination is in another space.");
      actor.behavior = { type: "walking", destination: { ...location.position } };
      return accept(
        world,
        actorId,
        tool.name,
        `${actor.name} heads to ${location.name}.`,
        "astra",
        context,
      );
    }
    case "report_crime": {
      const incident = world.incidents.find((entry) => entry.id === tool.arguments.incident_id);
      if (!incident || !incident.witnessIds.includes(actorId))
        return reject("This actor did not observe this incident.");
      if (world.reports.some((report) => report.incidentId === incident.id))
        return reject("This incident already has a report.");
      world.reports.push({
        id: context.id,
        incidentId: incident.id,
        reporterId: actorId,
        status: "open",
      });
      return accept(
        world,
        actorId,
        tool.name,
        `${actor.name} reports ${incident.type} to police.`,
        "astra",
        context,
      );
    }
    case "dispatch_police": {
      const report = world.reports.find((entry) => entry.id === tool.arguments.report_id);
      const unit = world.entities.find((entity) => entity.id === tool.arguments.unit_id);
      const incident = world.incidents.find((entry) => entry.id === report?.incidentId);
      if (!report || report.status !== "open" || !incident)
        return reject("This report is no longer open.");
      if (unit?.kind !== "police" || unit.assignment !== null || unit.health <= 0)
        return reject("This police unit is unavailable.");
      unit.assignment = report.id;
      unit.behavior = { type: "walking", destination: { ...incident.position } };
      report.status = "dispatched";
      return accept(
        world,
        actorId,
        tool.name,
        `${actor.name} dispatches ${unit.name} to the incident.`,
        "astra",
        context,
      );
    }
    case "set_price": {
      const business = world.entities.find((entity) => entity.id === tool.arguments.business_id);
      if (business?.kind !== "business" || business.ownerId !== actorId)
        return reject("This actor does not own this business.");
      business.price = tool.arguments.amount;
      return accept(
        world,
        actorId,
        tool.name,
        `${actor.name} sets ${business.name}'s price to ₽${business.price}.`,
        "astra",
        context,
      );
    }
  }
}

/** Conversation authority belongs to the named character's current role. */
export function permittedConversationTools(actor: Actor): ConversationAction["name"][] {
  if (actor.kind !== "person" || actor.health <= 0) return [];
  if (actor.id === SCENE_IDS.mila && actor.role === "resident")
    return ["offer_delivery", "accept_delivery"];
  if (actor.id === SCENE_IDS.lev && actor.role === "merchant") return ["complete_delivery"];
  if (actor.id === SCENE_IDS.niko && actor.role === "resident") return ["complete_delivery"];
  if (actor.id === SCENE_IDS.irina && actor.role === "merchant") return ["offer_bed", "rent_bed"];
  return [];
}

/**
 * Apply a scoped conversation proposal through the existing game rules.
 * The caller supplies a saved quote and verifies consent comes from a later player turn.
 */
export function applyConversationAction(
  world: WorldSnapshot,
  actorId: EntityId,
  playerId: EntityId,
  tool: ConversationAction,
  context: ActionContext,
  bedOffer: { id: TurnId; amount: number } | null,
): ActionResult {
  const actor = world.entities.find((entity) => entity.id === actorId);
  const player = world.entities.find((entity) => entity.id === playerId);
  if (!actor || !isActor(actor) || !permittedConversationTools(actor).includes(tool.name))
    return reject("This character cannot perform this conversation action.");
  if (player?.kind !== "player" || player.health <= 0) return reject("This player cannot act.");
  if (isInsideGuesthouse(actor.position) !== isInsideGuesthouse(player.position))
    return reject("The character and player are in different spaces.");
  if (distance(actor.position, player.position) > MOVEMENT.interactionRange)
    return reject("Move closer to continue this action.");
  let result: ActionResult;
  switch (tool.name) {
    case "offer_delivery":
      result = applyToolAction(
        world,
        actorId,
        { name: "offer_mission", arguments: { to: playerId } },
        context,
      );
      break;
    case "accept_delivery":
      if (player.mission.stage !== "offered")
        return reject("Mila must offer the delivery before the player accepts it.");
      result = applyPlayerAction(
        world,
        playerId,
        { type: "accept_mission", targetId: actorId },
        context,
      );
      break;
    case "complete_delivery":
      result = applyPlayerAction(
        world,
        playerId,
        { type: "deliver_parcel", targetId: actorId },
        context,
      );
      break;
    case "offer_bed":
      if (!isInsideGuesthouse(actor.position))
        return reject("Speak to Irina inside the guesthouse.");
      if (player.shelter === "rented") return reject("This player already has a bed.");
      return accept(
        structuredClone(world),
        actorId,
        tool.name,
        `Irina offers ${player.name} a bed for ₽${MISSION_TERMS.bedPrice}.`,
        "astra",
        context,
      );
    case "rent_bed":
      if (
        !bedOffer ||
        bedOffer.id !== tool.arguments.offer_id ||
        bedOffer.amount !== MISSION_TERMS.bedPrice
      )
        return reject("Irina must provide a current bed offer before the player accepts it.");
      result = applyPlayerAction(world, playerId, { type: "rent_bed", targetId: actorId }, context);
      break;
  }
  if (!result.accepted) return result;
  return {
    ...result,
    world: {
      ...result.world,
      events: result.world.events.map((event) =>
        event.id === context.id ? { ...event, actorId, type: tool.name, source: "astra" } : event,
      ),
    },
  };
}
