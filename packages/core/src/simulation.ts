import { z } from "zod";
import { ambientMovement } from "./ambient-movement";
import { completeReloads } from "./gameplay-v2";
import {
  crowdPosition,
  GUESTHOUSE,
  sceneSpace,
  isInsideGuesthouse,
  museumFloorHeight,
  isInsideMuseum,
  MUSEUM,
  migrateDistrictPosition,
  MOVEMENT,
  positionIsWalkable,
  SCENE_IDS,
  SCENE_POSITIONS,
  STUNT,
  stuntVehicleId,
} from "./scene";
import {
  distance,
  EntityIdSchema,
  isActor,
  EntitySchema,
  PlayerSchema,
  MISSION_TERMS,
  WorldSnapshotSchema,
  type Actor,
  type EntityId,
  type Position,
  type WorldSnapshot,
} from "./world";

const initialActorPose = { elevation: 0, heading: 0, posture: "standing" as const, grounded: true };

const savedWorldSchema = WorldSnapshotSchema.omit({ version: true, entities: true }).extend({
  version: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  entities: z.array(
    z.union([
      EntitySchema,
      PlayerSchema.omit({ mission: true, reputation: true, shelter: true }).transform((player) => ({
        ...player,
        mission: { stage: "available" as const },
        reputation: 0,
        shelter: "none" as const,
      })),
    ]),
  ),
});

/** Upgrade owned saved JSON without resetting sessions, balances, or event history. */
export function migrateWorldSnapshot(input: unknown): WorldSnapshot {
  const saved = savedWorldSchema.parse(input);
  const seed = createInitialWorld(saved.time, saved.ai.status === "ready");
  const migratePosition =
    saved.version === 3 ? (position: Position) => position : migrateDistrictPosition;
  const entities = saved.entities.map((entity) => {
    const definition = seed.entities.find((entry) => entry.id === entity.id);
    const position =
      saved.version !== 3 &&
      definition &&
      (entity.kind === "location" || entity.kind === "business")
        ? definition.position
        : migratePosition(entity.position);
    if (!isActor(entity)) return { ...entity, position };
    const behavior =
      entity.behavior.type === "walking"
        ? { ...entity.behavior, destination: migratePosition(entity.behavior.destination) }
        : entity.behavior;
    if (!definition || !isActor(definition) || entity.kind === "player")
      return { ...entity, position, behavior };
    return {
      ...entity,
      position,
      behavior,
      name: definition.name,
      job: definition.job,
      goal: definition.goal,
    };
  });
  const known = new Set(entities.map((entity) => entity.id));
  entities.push(...seed.entities.filter((entity) => !known.has(entity.id)));
  const activeIds = entities
    .filter((entity) => isActor(entity) && entity.kind !== "player")
    .map((entity) => entity.id);
  const incidents = saved.incidents.map((incident) => ({
    ...incident,
    position: migratePosition(incident.position),
  }));
  return {
    ...saved,
    version: 3,
    entities,
    incidents,
    population: { total: activeIds.length, activeIds },
  };
}

/** The simulation uses Angela's scene coordinates and runs without a model key. */
export function createInitialWorld(now = 0, aiEnabled = false): WorldSnapshot {
  const names = [
    "Alina",
    "Boris",
    "Daria",
    "Elena",
    "Fyodor",
    "Galina",
    "Igor",
    "Kira",
    "Luka",
    "Marina",
    "Oleg",
    "Vera",
  ];
  const residents = [
    {
      surname: "Belov",
      job: "Baker",
      goal: "Find customers for fresh bread and return to the square",
    },
    { surname: "Volkov", job: "Tram driver", goal: "Finish a break and keep the streets clear" },
    { surname: "Sokolov", job: "Student", goal: "Find a quiet place to read near Lev's bookshop" },
    {
      surname: "Morozov",
      job: "Street musician",
      goal: "Find listeners and earn enough for dinner",
    },
    {
      surname: "Petrov",
      job: "Repair worker",
      goal: "Inspect the square and report damaged street fixtures",
    },
    {
      surname: "Orlov",
      job: "Photographer",
      goal: "Find an interesting scene without disturbing residents",
    },
    { surname: "Smirnov", job: "Office clerk", goal: "Buy a book and get home before dark" },
    {
      surname: "Kozlov",
      job: "Market trader",
      goal: "Meet neighbors and hear what they need to buy",
    },
  ]
    .flatMap((resident) =>
      names.map((name) => ({ ...resident, name: `${name} ${resident.surname}` })),
    )
    .slice(0, 92);
  const occupations = [
    ["Antonov", "Police officer", "Patrol the district and respond to reported incidents"],
    ["Blinov", "Chef", "Meet local food suppliers before the dinner service"],
    ["Denisov", "Medic", "Check on residents and keep access routes clear"],
    ["Egorov", "Doctor", "Take a break from the clinic and help neighbors find care"],
    ["Fomin", "Mechanic", "Find drivers who need repairs and return to the workshop"],
    ["Gusev", "Construction worker", "Inspect street repairs and keep the site tidy"],
    ["Ilyin", "Firefighter", "Check emergency access around the square"],
    ["Kalinin", "Shopkeeper", "Welcome customers and restock the neighborhood shop"],
    ["Lebedev", "Florist", "Deliver flowers and meet customers around the square"],
    ["Makarov", "Barista", "Find fresh supplies for the morning coffee service"],
    ["Nikitin", "Delivery worker", "Find the next delivery address in the district"],
    ["Pavlov", "Security guard", "Keep an eye on shop entrances and help visitors"],
    ["Romanov", "Sanitation worker", "Keep the square clean and clear the street bins"],
    ["Stepanov", "Electrician", "Inspect street lights and collect repair supplies"],
    ["Titov", "Baker", "Bring fresh pastries to the neighborhood market"],
    ["Zaitsev", "Photographer", "Photograph everyday life around the square"],
  ] as const;
  residents.push(
    ...occupations.flatMap(([surname, job, goal], index) =>
      names.slice(index % 9, (index % 9) + 4).map((name) => ({
        surname,
        job,
        goal,
        name: `${name} ${surname}`,
      })),
    ),
  );
  const people: Actor[] = residents.map((resident, index) => ({
    ...initialActorPose,
    id: EntityIdSchema.parse(`person-${index}`),
    name: resident.name,
    ...(resident.job === "Police officer"
      ? { kind: "police" as const, assignment: null }
      : { kind: "person" as const, role: "resident" as const }),
    position: crowdPosition(index),
    money: 100,
    health: 100,
    goal: resident.goal,
    job: resident.job,
    behavior: { type: "idle" },
  }));
  const named: Actor[] = [
    {
      ...initialActorPose,
      id: SCENE_IDS.witness,
      name: "Mila · courier",
      kind: "person",
      role: "resident",
      position: SCENE_POSITIONS.mila,
      money: 150,
      health: 100,
      goal: "Find a reliable courier to deliver Lev's sealed parcel; the direct fee is ₽80 and Niko pays ₽60",
      job: "Courier",
      behavior: { type: "idle" },
    },
    {
      id: SCENE_IDS.merchant,
      ...initialActorPose,
      name: "Lev · bookseller",
      kind: "person",
      role: "merchant",
      position: SCENE_POSITIONS.lev,
      money: 300,
      health: 100,
      goal: "Receive Mila's sealed parcel and pay the agreed ₽80 delivery fee",
      job: "Bookseller",
      behavior: { type: "idle" },
    },
    {
      id: SCENE_IDS.niko,
      ...initialActorPose,
      name: "Niko · rival courier",
      kind: "person",
      role: "resident",
      position: SCENE_POSITIONS.niko,
      money: 240,
      health: 100,
      goal: "Offer to finish Mila's delivery for the player and pay them ₽60",
      job: "Courier",
      behavior: { type: "idle" },
    },
    {
      id: SCENE_IDS.irina,
      ...initialActorPose,
      name: "Irina · guesthouse host",
      kind: "person",
      role: "merchant",
      position: GUESTHOUSE.host,
      money: 200,
      health: 100,
      goal: "Rent one guesthouse bed for ₽60 and welcome respectful guests",
      job: "Guesthouse host",
      behavior: { type: "idle" },
    },
    {
      id: SCENE_IDS.sasha,
      ...initialActorPose,
      name: "Sasha · gardener",
      kind: "person",
      role: "resident",
      position: SCENE_POSITIONS.sasha,
      money: 90,
      health: 100,
      goal: "Care for the square and direct a newcomer to Mila for paid work",
      job: "Gardener",
      behavior: { type: "idle" },
    },
    {
      id: SCENE_IDS.alexei,
      ...initialActorPose,
      name: "Alexei · square steward",
      kind: "person",
      role: "resident",
      position: SCENE_POSITIONS.alexei,
      money: 120,
      health: 100,
      goal: "Help newcomers find work, explain guesthouse access, and keep the square peaceful",
      job: "Square steward",
      behavior: { type: "idle" },
    },
    {
      id: SCENE_IDS.dispatcher,
      ...initialActorPose,
      name: "Police dispatcher",
      kind: "person",
      role: "dispatcher",
      position: SCENE_POSITIONS.dispatcher,
      money: 0,
      health: 100,
      goal: "Send police to reported incidents",
      job: "Dispatcher",
      behavior: { type: "idle" },
    },
    {
      id: SCENE_IDS.police,
      ...initialActorPose,
      name: "Officer Pavel",
      kind: "police",
      position: SCENE_POSITIONS.police,
      money: 100,
      health: 100,
      goal: "Respond to reported crime",
      job: "Police officer",
      behavior: { type: "idle" },
      assignment: null,
    },
  ];
  return {
    version: 3,
    revision: 0,
    time: now,
    entities: [
      ...named,
      ...people,
      {
        id: SCENE_IDS.helipad,
        kind: "location",
        name: "Helicopter pickup",
        category: "landmark",
        position: STUNT.pickup,
      },
      {
        id: SCENE_IDS.vehicle,
        kind: "vehicle",
        name: "Blue sedan",
        position: SCENE_POSITIONS.vehicle,
        ownerId: SCENE_IDS.witness,
        color: "#478ed0",
        vehicleType: "car",
        elevation: 0,
        heading: 0,
      },
      {
        id: SCENE_IDS.helicopter,
        kind: "vehicle",
        name: "Square helicopter",
        position: STUNT.pickup,
        ownerId: null,
        color: "#24363b",
        vehicleType: "helicopter",
        elevation: 0,
        heading: 0,
      },
      {
        id: SCENE_IDS.pistolPickup,
        kind: "pickup",
        name: "Pistol",
        position: SCENE_POSITIONS.pistolPickup,
        item: "pistol",
        claimedBy: null,
      },
      {
        id: SCENE_IDS.ammoPickup,
        kind: "pickup",
        name: "Pistol ammunition",
        position: SCENE_POSITIONS.ammoPickup,
        item: "pistol_ammo",
        claimedBy: null,
      },
      {
        id: SCENE_IDS.secondAmmoPickup,
        kind: "pickup",
        name: "Pistol ammunition",
        position: SCENE_POSITIONS.secondAmmoPickup,
        item: "pistol_ammo",
        claimedBy: null,
      },
      {
        id: SCENE_IDS.practiceTarget,
        kind: "target",
        name: "Practice target",
        position: SCENE_POSITIONS.practiceTarget,
        health: 100,
      },
      {
        id: SCENE_IDS.shop,
        kind: "business",
        name: "Square kiosk",
        position: SCENE_POSITIONS.shop,
        ownerId: SCENE_IDS.merchant,
        balance: 500,
        price: 20,
      },
      {
        id: SCENE_IDS.headquarters,
        kind: "location",
        name: "Police post",
        category: "police",
        position: SCENE_POSITIONS.dispatcher,
      },
      {
        id: SCENE_IDS.guesthouse,
        kind: "location",
        name: "Irina's guesthouse",
        category: "guesthouse",
        position: GUESTHOUSE.entrance,
      },
      {
        id: SCENE_IDS.guesthouseBed,
        kind: "location",
        name: "Guesthouse bed",
        category: "landmark",
        position: GUESTHOUSE.bed,
      },
      {
        id: SCENE_IDS.guesthouseDesk,
        kind: "location",
        name: "Guesthouse reception",
        category: "landmark",
        position: GUESTHOUSE.host,
      },
      {
        id: SCENE_IDS.square,
        kind: "location",
        name: "Red Square",
        category: "square",
        position: SCENE_POSITIONS.square,
      },
    ],
    events: [],
    incidents: [],
    reports: [],
    observations: [],
    dialogue: [],
    decisions: [],
    relationships: [{ from: SCENE_IDS.merchant, to: SCENE_IDS.shop, kind: "employed_by" }],
    population: {
      total: named.length + people.length,
      activeIds: [...named, ...people].map((person) => person.id),
    },
    ai: { status: aiEnabled ? "ready" : "disabled", model: "gpt-6-astra" },
  };
}

const DECISION_TIMEOUT_MS = 300_000;
const DECISION_HISTORY = 30;

/** Fail lost decisions, drop the scheduled backlog, and cap history so snapshots stay small. */
export function pruneDecisions(world: WorldSnapshot, now: number): WorldSnapshot {
  const decisions = world.decisions.flatMap((decision) => {
    if (decision.status === "running" && now - decision.createdAt > DECISION_TIMEOUT_MS)
      return [
        {
          ...decision,
          status: "failed" as const,
          summary: `${decision.summary}\nDecision timed out.`,
        },
      ];
    if (decision.status === "pending" && decision.trigger.startsWith("schedule:")) return [];
    return [decision];
  });
  const finished = decisions.filter((d) => d.status === "completed" || d.status === "failed");
  const dropped = new Set(
    finished.slice(0, Math.max(0, finished.length - DECISION_HISTORY)).map((d) => d.id),
  );
  const kept = decisions.filter((d) => !dropped.has(d.id));
  if (
    kept.length === world.decisions.length &&
    kept.every((decision, index) => decision === world.decisions[index])
  )
    return world;
  return { ...world, revision: world.revision + 1, decisions: kept };
}

/** A session owns its player; reconnecting preserves that player's state. */
export function addPlayer(world: WorldSnapshot, playerId: EntityId): WorldSnapshot {
  if (world.entities.some((entity) => entity.id === playerId)) return world;
  return {
    ...world,
    revision: world.revision + 1,
    entities: [
      ...world.entities,
      {
        id: playerId,
        ...initialActorPose,
        kind: "player",
        name: "You",
        position: MUSEUM.spawn,
        elevation: museumFloorHeight(MUSEUM.spawn),
        heading: Math.PI,
        money: MISSION_TERMS.startingMoney,
        health: 100,
        mission: { stage: "available" },
        reputation: 0,
        shelter: "none",
        equipment: { pistol: null },
        combat: { nextAttackAt: 0, reload: { type: "ready" } },
        goal: "Find work and rent a bed",
        job: "Visitor",
        behavior: { type: "idle" },
      },
    ],
  };
}

/** Restore mobile entities after collision changes without changing their lasting gameplay state. */
export function repairWorldPositions(world: WorldSnapshot): WorldSnapshot {
  const positions = new Map<EntityId, Position>();
  const spawn = (position: Position): Position =>
    isInsideGuesthouse(position) ? { ...GUESTHOUSE.spawn } : { ...SCENE_POSITIONS.player };
  for (const entity of world.entities) {
    if (entity.kind === "vehicle" && entity.vehicleType === "helicopter") {
      if (distance(entity.position, STUNT.pickup) > 0 || entity.elevation !== 0)
        positions.set(entity.id, { ...STUNT.pickup });
    } else if (
      (isActor(entity) || entity.kind === "vehicle") &&
      !positionIsWalkable(entity.position)
    )
      positions.set(entity.id, spawn(entity.position));
    else if (
      (isActor(entity) || entity.kind === "vehicle") &&
      (entity.elevation !== museumFloorHeight(entity.position) ||
        (isActor(entity) && !entity.grounded))
    )
      positions.set(entity.id, { ...entity.position });
  }
  for (const actor of world.entities) {
    if (!isActor(actor) || actor.behavior.type !== "driving") continue;
    const vehicleId = actor.behavior.vehicleId;
    const vehicle = world.entities.find((entity) => entity.id === vehicleId);
    if (vehicle?.kind !== "vehicle") continue;
    if (vehicle.vehicleType === "helicopter") {
      if (
        distance(actor.position, STUNT.pickup) > 0 ||
        positions.has(actor.id) ||
        positions.has(vehicle.id)
      ) {
        positions.set(actor.id, { ...STUNT.pickup });
        positions.set(vehicle.id, { ...STUNT.pickup });
      }
      continue;
    }
    if (positions.has(actor.id) || positions.has(vehicle.id)) {
      const position = spawn(actor.position);
      positions.set(actor.id, position);
      positions.set(vehicle.id, position);
    } else if (distance(actor.position, vehicle.position) > 0) {
      positions.set(vehicle.id, { ...actor.position });
    }
  }
  if (positions.size === 0) return world;
  return {
    ...world,
    revision: world.revision + 1,
    entities: world.entities.map((entity) => {
      const position = positions.get(entity.id);
      if (!position || (!isActor(entity) && entity.kind !== "vehicle")) return entity;
      return isActor(entity)
        ? { ...entity, position, elevation: museumFloorHeight(position), grounded: true }
        : { ...entity, position, elevation: 0 };
    }),
  };
}

/** World owns one allowance per player; reconnects cannot replace or refill it. */
export type MovementAllowance = Readonly<{
  availableDistance: number;
  updatedAt: number;
}>;

/** Permitted speed comes from accepted actor state, never from movement packets. */
export function movementSpeed(actor: Actor): number {
  return actor.behavior.type === "driving" ? MOVEMENT.driveSpeed : MOVEMENT.runSpeed;
}

/** Settle elapsed time with the previous speed before clamping a movement mode change. */
export function clampMovementAllowance(
  allowance: MovementAllowance,
  speed: number,
): MovementAllowance {
  return {
    ...allowance,
    availableDistance: Math.min(allowance.availableDistance, speed * 0.5 + 0.2),
  };
}

/** Accumulate elapsed server time once; a clock reversal cannot grant the same distance twice. */
export function accrueMovementAllowance(
  allowance: MovementAllowance,
  now: number,
  speed: number,
): MovementAllowance {
  const updatedAt = Math.max(allowance.updatedAt, now);
  return clampMovementAllowance(
    {
      availableDistance:
        allowance.availableDistance + ((updatedAt - allowance.updatedAt) / 1000) * speed,
      updatedAt,
    },
    speed,
  );
}

/** The server supplies a distance budget from elapsed time; the client cannot choose it. */
export function movePlayer(
  world: WorldSnapshot,
  playerId: EntityId,
  position: Position,
  maxDistance: number,
): WorldSnapshot | null {
  const player = world.entities.find((entity) => entity.id === playerId);
  if (player?.kind !== "player" || !Number.isFinite(position.x) || !Number.isFinite(position.z))
    return null;
  if (distance(player.position, position) > maxDistance || !positionIsWalkable(position))
    return null;
  if (
    isInsideMuseum(player.position) &&
    position.z >= -0.6 &&
    Math.abs(position.x - MUSEUM.originX) < 1
  ) {
    return {
      ...world,
      revision: world.revision + 1,
      entities: world.entities.map((entity) =>
        entity.id === playerId
          ? {
              ...entity,
              position: { ...MUSEUM.exit },
              elevation: 0,
              heading: Math.PI,
              grounded: true,
            }
          : entity,
      ),
    };
  }
  if (sceneSpace(player.position) !== sceneSpace(position)) return null;
  const steps = Math.max(1, Math.ceil(distance(player.position, position) / MOVEMENT.actorRadius));
  for (let step = 1; step < steps; step += 1) {
    const ratio = step / steps;
    if (
      !positionIsWalkable({
        x: player.position.x + (position.x - player.position.x) * ratio,
        z: player.position.z + (position.z - player.position.z) * ratio,
      })
    )
      return null;
  }
  return {
    ...world,
    revision: world.revision + 1,
    entities: world.entities.map((entity) => {
      if (entity.id === playerId) {
        if (entity.kind !== "player") return entity;
        let stunt = entity.stunt;
        if (
          stunt?.stage === "running" &&
          stunt.deadline > world.time &&
          player.behavior.type === "driving" &&
          player.behavior.vehicleId === stuntVehicleId(player.id)
        ) {
          const gate = STUNT.checkpoints[stunt.checkpoint];
          if (gate && distance(position, gate) < 5)
            stunt = { ...stunt, checkpoint: stunt.checkpoint + 1 };
        }
        return { ...entity, position, stunt };
      }
      if (player.behavior.type === "driving" && entity.id === player.behavior.vehicleId)
        return { ...entity, position };
      return entity;
    }),
  };
}

/** Movement stays in memory between periodic position checkpoints. */
export function advanceMovement(world: WorldSnapshot, seconds: number): WorldSnapshot {
  const active = new Set(world.population.activeIds);
  const drivers = world.entities.filter(
    (entity) => isActor(entity) && entity.behavior.type === "driving",
  );
  const entities = world.entities.map((entity) => {
    // A short physical avoidance reflex; it does not invent an Astra decision or a destination.
    if (isActor(entity) && entity.kind !== "player" && entity.health > 0) {
      const nearby = drivers.find(
        (driver) =>
          isActor(driver) &&
          Math.hypot(
            distance(driver.position, entity.position),
            driver.elevation - entity.elevation,
          ) < 5,
      );
      if (nearby) {
        const dx = entity.position.x - nearby.position.x;
        const dz = entity.position.z - nearby.position.z;
        const length = Math.hypot(dx, dz);
        const position = {
          x: entity.position.x + (length < 0.001 ? 1 : dx / length) * seconds * 3,
          z: entity.position.z + (length < 0.001 ? 0 : dz / length) * seconds * 3,
        };
        if (positionIsWalkable(position)) return { ...entity, position };
      }
    }
    if (
      !isActor(entity) ||
      entity.health <= 0 ||
      !active.has(entity.id) ||
      entity.behavior.type !== "walking"
    )
      return entity;
    const destination = entity.behavior.destination;
    const remaining = distance(entity.position, destination);
    if (remaining < 0.2) return { ...entity, behavior: { type: "idle" as const } };
    const ratio = Math.min(1, (seconds * 2.5) / remaining);
    const position = {
      x: entity.position.x + (destination.x - entity.position.x) * ratio,
      z: entity.position.z + (destination.z - entity.position.z) * ratio,
    };
    return positionIsWalkable(position)
      ? { ...entity, position }
      : { ...entity, behavior: { type: "idle" as const } };
  });
  return { ...world, revision: world.revision + 1, entities };
}

/** Astra owns destinations when enabled; offline demos use explicit ambient walks. */
export function advanceRoutines(world: WorldSnapshot, now: number): WorldSnapshot {
  world = completeReloads(world, now);
  world = ambientMovement(world, now);
  const activeIds = world.entities
    .filter((entity) => isActor(entity) && entity.kind !== "player")
    .map((entity) => entity.id);
  return {
    ...world,
    revision: world.revision + 1,
    time: now,
    entities: world.entities.map((entity) =>
      entity.kind === "player" && entity.stunt?.stage === "running" && now >= entity.stunt.deadline
        ? { ...entity, stunt: { stage: "failed" as const } }
        : entity,
    ),
    population: { total: activeIds.length, activeIds },
  };
}
