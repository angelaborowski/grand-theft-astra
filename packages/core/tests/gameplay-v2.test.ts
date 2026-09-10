import { expect, it } from "vitest";
import {
  applyGameplayCommand,
  completeReloads,
  HELICOPTER,
  PHYSICS,
  PISTOL,
  PlayerControlSchema,
  type ResolvedGameplayCommand,
} from "../src/gameplay-v2";
import { MOVEMENT, SCENE_IDS, SCENE_POSITIONS, STUNT } from "../src/scene";
import {
  addPlayer,
  createInitialWorld,
  migrateWorldSnapshot,
  repairWorldPositions,
} from "../src/simulation";
import {
  EntityIdSchema,
  PlayerSchema,
  playerInventory,
  type EntityId,
  type Position,
  type WorldSnapshot,
} from "../src/world";

const secondPlayer = EntityIdSchema.parse("player-second");
const initial = () => addPlayer(createInitialWorld(), SCENE_IDS.player);
const player = (world: WorldSnapshot) =>
  PlayerSchema.parse(world.entities.find((entity) => entity.id === SCENE_IDS.player));
const at = (
  world: WorldSnapshot,
  position: Position,
  id: EntityId = SCENE_IDS.player,
): WorldSnapshot => ({
  ...world,
  entities: world.entities.map((entity) => (entity.id === id ? { ...entity, position } : entity)),
});
function apply(world: WorldSnapshot, command: ResolvedGameplayCommand, now = 1000): WorldSnapshot {
  const result = applyGameplayCommand(world, SCENE_IDS.player, command, {
    id: `action-${now}`,
    now,
  });
  if (!result.accepted) throw new Error(result.error.message);
  return result.world;
}
const armed = () =>
  apply(at(initial(), SCENE_POSITIONS.pistolPickup), {
    type: "pickup",
    targetId: SCENE_IDS.pistolPickup,
  });

it("orders shared speed limits from crouch through helicopter", () => {
  const speeds = [
    PHYSICS.crouchSpeed,
    PHYSICS.walkSpeed,
    PHYSICS.runSpeed,
    MOVEMENT.driveSpeed,
    HELICOPTER.maxHorizontalSpeed,
  ];
  expect(
    speeds.every((speed, index) => speed > 0 && (index === 0 || speed > (speeds[index - 1] ?? 0))),
  ).toBe(true);
  expect(HELICOPTER.maxHorizontalSpeed).toBeLessThanOrEqual(20);
  expect(HELICOPTER.maxVerticalSpeed).toBeLessThanOrEqual(5);
  expect(HELICOPTER.maxElevation).toBeLessThanOrEqual(80);
  expect(PHYSICS.crouchedHalfHeight).toBeLessThan(PHYSICS.standingHalfHeight);
});

it("rejects invalid controls before they reach authoritative movement", () => {
  const input = {
    sequence: 1,
    forward: 1,
    right: 0,
    cameraYaw: 0,
    cameraPitch: 0,
    run: false,
    aim: false,
    ascend: 0,
    turn: 0,
  };
  expect(PlayerControlSchema.safeParse(input).success).toBe(true);
  expect(PlayerControlSchema.safeParse({ ...input, forward: 2 }).success).toBe(false);
  expect(PlayerControlSchema.safeParse({ ...input, cameraYaw: Number.NaN }).success).toBe(false);
  expect(PlayerControlSchema.safeParse({ ...input, cameraPitch: Math.PI }).success).toBe(false);
});

it("claims one pickup once and retains the claim after saved-state migration", () => {
  const world = at(addPlayer(armed(), secondPlayer), SCENE_POSITIONS.pistolPickup, secondPlayer);
  const result = applyGameplayCommand(
    world,
    secondPlayer,
    { type: "pickup", targetId: SCENE_IDS.pistolPickup },
    { id: "second", now: 1001 },
  );
  expect(result.accepted).toBe(false);
  const restored = migrateWorldSnapshot(world);
  expect(restored.entities.find((entity) => entity.id === SCENE_IDS.pistolPickup)).toMatchObject({
    claimedBy: SCENE_IDS.player,
  });
  expect(player(restored).equipment.pistol).toEqual({ equipped: true, loaded: 8, reserve: 16 });
  expect(
    PlayerSchema.parse(restored.entities.find((entity) => entity.id === secondPlayer)).equipment
      .pistol,
  ).toBeNull();
});

it("collects ammunition without changing the mission-owned parcel", () => {
  const world = at(armed(), SCENE_POSITIONS.ammoPickup);
  const carrying = {
    ...world,
    entities: world.entities.map((entity) =>
      entity.kind === "player" ? { ...entity, mission: { stage: "carrying" as const } } : entity,
    ),
  };
  const result = apply(carrying, { type: "pickup", targetId: SCENE_IDS.ammoPickup }, 1100);
  expect(player(result).equipment.pistol?.reserve).toBe(32);
  expect(playerInventory(player(result))).toContain("Sealed parcel for Lev");
  expect(player(carrying).equipment.pistol?.reserve).toBe(16);
});

it("spends ammunition on misses and rejects shots before the firing interval", () => {
  const world = apply(armed(), { type: "primary", hitTargetId: null }, 2000);
  const early = applyGameplayCommand(
    world,
    SCENE_IDS.player,
    { type: "primary", hitTargetId: null },
    { id: "early", now: 2299 },
  );
  expect(early.accepted).toBe(false);
  expect(player(world).equipment.pistol?.loaded).toBe(7);
  expect(
    player(apply(world, { type: "primary", hitTargetId: null }, 2300)).equipment.pistol?.loaded,
  ).toBe(6);
});

it("blocks fire during reload and conserves ammunition when reload completes", () => {
  const fired = apply(armed(), { type: "primary", hitTargetId: null }, 2000);
  const world = apply(fired, { type: "reload" }, 2300);
  expect(
    applyGameplayCommand(
      world,
      SCENE_IDS.player,
      { type: "primary", hitTargetId: null },
      { id: "blocked", now: 3299 },
    ).accepted,
  ).toBe(false);
  expect(player(completeReloads(world, 3299)).equipment.pistol?.loaded).toBe(7);
  const pistol = player(completeReloads(world, 3300)).equipment.pistol;
  expect(pistol).toMatchObject({ loaded: PISTOL.magazineSize, reserve: 15 });
  expect((pistol?.loaded ?? 0) + (pistol?.reserve ?? 0)).toBe(23);
});

it("protects the named cast while preserving accepted assault events", () => {
  let world = at(armed(), SCENE_POSITIONS.mila);
  for (let index = 0; index < 5; index++)
    world = apply(world, { type: "primary", hitTargetId: SCENE_IDS.mila }, 2000 + index * 300);
  expect(world.entities.find((entity) => entity.id === SCENE_IDS.mila)).toMatchObject({
    health: 1,
  });
  expect(world.incidents).toHaveLength(5);
  expect(player(world).money).toBe(20);
});

it("damages the practice target without granting a reward", () => {
  let world = armed();
  for (let index = 0; index < 4; index++)
    world = apply(
      world,
      { type: "primary", hitTargetId: SCENE_IDS.practiceTarget },
      2000 + index * 300,
    );
  expect(world.entities.find((entity) => entity.id === SCENE_IDS.practiceTarget)).toMatchObject({
    health: 0,
  });
  expect(world.incidents).toHaveLength(0);
  expect(player(world).money).toBe(20);
});

it("allows one helicopter pilot and rejects a second pilot", () => {
  const occupied = apply(at(initial(), STUNT.pickup), {
    type: "enter_vehicle",
    targetId: SCENE_IDS.helicopter,
  });
  const world = at(addPlayer(occupied, secondPlayer), STUNT.pickup, secondPlayer);
  const result = applyGameplayCommand(
    world,
    secondPlayer,
    { type: "enter_vehicle", targetId: SCENE_IDS.helicopter },
    { id: "second", now: 1001 },
  );
  expect(result.accepted).toBe(false);
  expect(player(world).behavior).toEqual({ type: "driving", vehicleId: SCENE_IDS.helicopter });
  expect(world.entities.find((entity) => entity.id === SCENE_IDS.helicopter)).toMatchObject({
    ownerId: SCENE_IDS.player,
  });
});

it("allows helicopter entry from outside its physical fuselage", () => {
  const world = at(initial(), {
    x: STUNT.pickup.x + HELICOPTER.radius + PHYSICS.actorRadius,
    z: STUNT.pickup.z,
  });
  const entered = apply(world, { type: "enter_vehicle", targetId: SCENE_IDS.helicopter });
  expect(player(entered).behavior).toEqual({ type: "driving", vehicleId: SCENE_IDS.helicopter });
});

it("rejects airborne and fast helicopter exits before accepting a landed exit", () => {
  const world = apply(at(initial(), STUNT.pickup), {
    type: "enter_vehicle",
    targetId: SCENE_IDS.helicopter,
  });
  const exit = {
    type: "exit_vehicle" as const,
    exitPosition: { x: 23, z: -93 },
    grounded: true,
    speed: 0,
  };
  expect(
    applyGameplayCommand(
      world,
      SCENE_IDS.player,
      { ...exit, grounded: false },
      { id: "air", now: 1100 },
    ),
  ).toMatchObject({ accepted: false, error: { message: "Land before exiting." } });
  expect(
    applyGameplayCommand(world, SCENE_IDS.player, { ...exit, speed: 1 }, { id: "fast", now: 1100 })
      .accepted,
  ).toBe(false);
  expect(player(apply(world, exit, 1100))).toMatchObject({
    position: exit.exitPosition,
    behavior: { type: "idle" },
    elevation: 0,
  });
});

it("restores the helicopter and pilot at the pad without resetting progress", () => {
  const occupied = apply(
    at(armed(), STUNT.pickup),
    { type: "enter_vehicle", targetId: SCENE_IDS.helicopter },
    2000,
  );
  const flying = {
    ...occupied,
    entities: occupied.entities.map((entity) =>
      entity.id === SCENE_IDS.player || entity.id === SCENE_IDS.helicopter
        ? { ...entity, position: { x: 25, z: 10 }, elevation: 40 }
        : entity,
    ),
  };
  const restored = repairWorldPositions(migrateWorldSnapshot(flying));
  expect(player(restored)).toMatchObject({
    position: STUNT.pickup,
    elevation: 0,
    equipment: player(occupied).equipment,
    money: player(occupied).money,
    behavior: player(occupied).behavior,
  });
  expect(restored.entities.find((entity) => entity.id === SCENE_IDS.helicopter)).toMatchObject({
    position: STUNT.pickup,
    elevation: 0,
    ownerId: SCENE_IDS.player,
  });
});

it("migrates older actor records without resetting shelter and mission progress", () => {
  const world = armed();
  const legacy = JSON.parse(
    JSON.stringify(world, (key, value: unknown) =>
      [
        "elevation",
        "heading",
        "posture",
        "grounded",
        "equipment",
        "combat",
        "vehicleType",
      ].includes(key)
        ? undefined
        : value,
    ),
  );
  const restored = migrateWorldSnapshot(legacy);
  expect(player(restored)).toMatchObject({
    elevation: 0,
    grounded: true,
    posture: "standing",
    equipment: { pistol: null },
    mission: player(world).mission,
    money: player(world).money,
  });
  expect(restored.events).toEqual(world.events);
});

it("repairs a disagreeing pilot to the pad without moving the parked helicopter", () => {
  const world = apply(at(initial(), STUNT.pickup), {
    type: "enter_vehicle",
    targetId: SCENE_IDS.helicopter,
  });
  const restored = repairWorldPositions(at(world, SCENE_POSITIONS.player));
  expect(player(restored).position).toEqual(STUNT.pickup);
  expect(restored.entities.find((entity) => entity.id === SCENE_IDS.helicopter)?.position).toEqual(
    STUNT.pickup,
  );
});
