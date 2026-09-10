import { expect, it } from "vitest";
import { applyPlayerAction, type PlayerAction } from "../src/actions";
import { GUESTHOUSE, positionIsWalkable, SCENE_IDS } from "../src/scene";
import { addPlayer, createInitialWorld, migrateWorldSnapshot } from "../src/simulation";
import { isActor, PlayerSchema, playerInventory, type WorldSnapshot } from "../src/world";

const initial = () => addPlayer(createInitialWorld(), SCENE_IDS.player);
const player = (world: WorldSnapshot) =>
  PlayerSchema.parse(world.entities.find((entity) => entity.id === SCENE_IDS.player));
const legacyPlayer = PlayerSchema.omit({ mission: true, reputation: true, shelter: true });

function act(world: WorldSnapshot, action: PlayerAction): WorldSnapshot {
  const target = world.entities.find((entity) => entity.id === action.targetId);
  if (!target) throw new Error("The fixture target is missing.");
  const nearby = {
    ...world,
    entities: world.entities.map((entity) =>
      entity.id === SCENE_IDS.player ? { ...entity, position: target.position } : entity,
    ),
  };
  const result = applyPlayerAction(nearby, SCENE_IDS.player, action, {
    id: `action-${world.revision}`,
    now: 1000,
  });
  expect(result.accepted).toBe(true);
  if (!result.accepted) throw new Error(result.error.message);
  return result.world;
}

it("migrates saved players without resetting money or current progress", () => {
  const current = initial();
  const legacy = {
    ...current,
    version: undefined,
    entities: current.entities.map((entity) =>
      entity.kind === "player" ? { ...legacyPlayer.parse(entity), money: 137 } : entity,
    ),
  };
  const migrated = migrateWorldSnapshot(legacy);
  expect(player(migrated).money).toBe(137);
  expect(player(migrated).mission).toEqual({ stage: "available" });
  const carrying = act(migrated, { type: "accept_mission", targetId: SCENE_IDS.mila });
  expect(player(migrateWorldSnapshot(carrying))).toEqual(player(carrying));
  expect(migrated.population.total).toBe(100);
});

it("grants a direct delivery reward only once", () => {
  const carrying = act(initial(), { type: "accept_mission", targetId: SCENE_IDS.mila });
  const delivered = act(carrying, { type: "deliver_parcel", targetId: SCENE_IDS.lev });
  const repeat = applyPlayerAction(
    delivered,
    SCENE_IDS.player,
    { type: "deliver_parcel", targetId: SCENE_IDS.lev },
    { id: "duplicate", now: 2000 },
  );
  expect(repeat.accepted).toBe(false);
  expect(player(delivered).money).toBe(100);
  expect(playerInventory(player(delivered))).toEqual([]);
});

it("accepts Niko's route without a reputation penalty", () => {
  const carrying = act(initial(), { type: "accept_mission", targetId: SCENE_IDS.mila });
  const delivered = act(carrying, { type: "deliver_parcel", targetId: SCENE_IDS.niko });
  expect(player(delivered)).toMatchObject({
    money: 80,
    reputation: 1,
    mission: { stage: "completed", route: "niko" },
  });
  expect(delivered.incidents).toEqual([]);
});

it("preserves vehicle ownership after the driver exits", () => {
  const driving = act(initial(), { type: "take_vehicle", targetId: SCENE_IDS.vehicle });
  const exited = act(driving, { type: "exit_vehicle", targetId: SCENE_IDS.vehicle });
  expect(player(exited).behavior).toEqual({ type: "idle" });
  expect(exited.entities.find((entity) => entity.id === SCENE_IDS.vehicle)).toMatchObject({
    ownerId: SCENE_IDS.player,
  });
  expect(exited.incidents).toHaveLength(1);
});

it("places all actors on Angela's map and migrates old positions only once", () => {
  const world = initial();
  const legacy = {
    ...world,
    version: 2,
    entities: world.entities.map((entity) =>
      entity.kind === "player"
        ? { ...entity, position: { x: -30, z: -20 }, money: 137, shelter: "rented" }
        : entity,
    ),
  };
  const migrated = migrateWorldSnapshot(legacy);
  expect(
    world.entities
      .filter((entity) => isActor(entity) || entity.kind === "vehicle")
      .every((entity) => positionIsWalkable(entity.position)),
  ).toBe(true);
  expect(player(migrated)).toMatchObject({
    money: 137,
    shelter: "rented",
    position: { x: 0, z: 19 },
  });
  expect(migrateWorldSnapshot(migrated)).toEqual(migrated);
  const indoors = {
    ...world,
    version: 2,
    entities: world.entities.map((entity) =>
      entity.kind === "player" ? { ...entity, position: GUESTHOUSE.spawn } : entity,
    ),
  };
  expect(player(migrateWorldSnapshot(indoors)).position).toEqual(GUESTHOUSE.spawn);
});
