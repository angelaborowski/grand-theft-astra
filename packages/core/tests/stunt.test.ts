import { expect, it } from "vitest";
import { applyPlayerAction } from "../src/actions";
import { SCENE_IDS, STUNT, stuntVehicleId } from "../src/scene";
import {
  addPlayer,
  createInitialWorld,
  migrateWorldSnapshot,
  movePlayer,
  advanceRoutines,
  advanceMovement,
} from "../src/simulation";
import { EntityIdSchema, PlayerSchema, type WorldSnapshot } from "../src/world";
const player = (w: WorldSnapshot) =>
  PlayerSchema.parse(w.entities.find((e) => e.id === SCENE_IDS.player));
function start() {
  const w = addPlayer(createInitialWorld(1000), SCENE_IDS.player);
  const mila = w.entities.find((e) => e.id === SCENE_IDS.mila);
  if (!mila) throw new Error("Missing Mila");
  const near = {
    ...w,
    entities: w.entities.map((e) =>
      e.id === SCENE_IDS.player ? { ...e, position: mila.position } : e,
    ),
  };
  const result = applyPlayerAction(
    near,
    SCENE_IDS.player,
    { type: "start_stunt", targetId: mila.id },
    { id: "start", now: 1000 },
  );
  if (!result.accepted) throw new Error(result.error.message);
  return result.world;
}
it("preserves delivery and stunt state across saved-world migration", () => {
  const w = start();
  expect(player(w).mission.stage).toBe("available");
  expect(player(migrateWorldSnapshot(JSON.parse(JSON.stringify(w))))).toEqual(player(w));
});
it("only advances the next gate while driving; rejects off-route completion and pays once", () => {
  let w = start();
  const gate = STUNT.checkpoints[0];
  w = requiredMove(w, gate);
  expect(player(w).stunt).toMatchObject({ checkpoint: 0 });
  w = {
    ...w,
    entities: w.entities.map((e) =>
      e.id === SCENE_IDS.player
        ? {
            ...e,
            behavior: { type: "driving" as const, vehicleId: stuntVehicleId(SCENE_IDS.player) },
          }
        : e,
    ),
  };
  const wrong = requiredMove(w, STUNT.checkpoints[2]);
  expect(player(wrong).stunt).toMatchObject({ checkpoint: 0 });
  for (const point of STUNT.checkpoints) w = requiredMove(w, point);
  expect(player(w).stunt).toMatchObject({ checkpoint: 4 });
  w = {
    ...w,
    entities: w.entities.map((e) =>
      e.id === SCENE_IDS.player
        ? { ...e, position: STUNT.pickup, behavior: { type: "idle" as const } }
        : e,
    ),
  };
  const finish = () =>
    applyPlayerAction(
      w,
      SCENE_IDS.player,
      { type: "finish_stunt", targetId: SCENE_IDS.helipad },
      { id: "finish", now: 5000 },
    );
  const result = finish();
  expect(result.accepted).toBe(true);
  if (!result.accepted) return;
  w = result.world;
  expect(player(w).money).toBe(270);
  expect(finish().accepted).toBe(false);
});
it("expires by server time, disallows remote start and incomplete handoff", () => {
  const w = start();
  expect(player(advanceRoutines(w, 200000)).stunt?.stage).toBe("failed");
  const remote = {
    ...w,
    entities: w.entities.map((e) =>
      e.id === SCENE_IDS.player ? { ...e, position: STUNT.pickup } : e,
    ),
  };
  expect(
    applyPlayerAction(
      remote,
      SCENE_IDS.player,
      { type: "finish_stunt", targetId: SCENE_IDS.helipad },
      { id: "bad", now: 5000 },
    ).accepted,
  ).toBe(false);
  expect(
    applyPlayerAction(
      remote,
      SCENE_IDS.player,
      { type: "start_stunt", targetId: SCENE_IDS.mila },
      { id: "bad", now: 200000 },
    ).accepted,
  ).toBe(false);
});

function requiredMove(world: WorldSnapshot, position: { x: number; z: number }) {
  const next = movePlayer(world, SCENE_IDS.player, position, 1000);
  if (!next) throw new Error("Fixture movement rejected");
  return next;
}

it("allocates separate mission cars for two players without taking the occupied shared car", () => {
  let world = start();
  const secondId = EntityIdSchema.parse("player-second");
  world = addPlayer(world, secondId);
  world = {
    ...world,
    entities: world.entities.map((entity) =>
      entity.id === secondId ? { ...entity, position: { x: 37, z: 100 } } : entity,
    ),
  };
  const result = applyPlayerAction(
    world,
    secondId,
    { type: "start_stunt", targetId: SCENE_IDS.mila },
    { id: "second", now: 1100 },
  );
  expect(result.accepted).toBe(true);
  if (!result.accepted) return;
  expect(
    result.world.entities.find((entity) => entity.id === stuntVehicleId(secondId)),
  ).toMatchObject({ ownerId: secondId });
  expect(
    result.world.entities.find((entity) => entity.id === stuntVehicleId(SCENE_IDS.player)),
  ).toMatchObject({ ownerId: SCENE_IDS.player });
  expect(result.world.entities.find((entity) => entity.id === SCENE_IDS.vehicle)).toEqual(
    world.entities.find((entity) => entity.id === SCENE_IDS.vehicle),
  );
});
it("bounds pedestrian avoidance even when a driver is almost coincident", () => {
  let world = start();
  world = {
    ...world,
    entities: world.entities.map((entity) =>
      entity.id === SCENE_IDS.player
        ? {
            ...entity,
            position: { x: 37, z: 100.01 },
            behavior: { type: "driving" as const, vehicleId: stuntVehicleId(SCENE_IDS.player) },
          }
        : entity,
    ),
  };
  const next = advanceMovement(world, 0.2);
  const mila = next.entities.find((entity) => entity.id === SCENE_IDS.mila);
  expect(mila).toBeDefined();
  if (mila)
    expect(Math.hypot(mila.position.x - 37, mila.position.z - 100)).toBeLessThanOrEqual(0.601);
});

it("reserves mission cars against another player's takeover", () => {
  let world = start();
  const otherId = EntityIdSchema.parse("player-other");
  world = addPlayer(world, otherId);
  const car = world.entities.find((e) => e.id === stuntVehicleId(SCENE_IDS.player));
  if (!car) throw new Error("Missing allocated car");
  world = {
    ...world,
    entities: world.entities.map((e) => (e.id === otherId ? { ...e, position: car.position } : e)),
  };
  const result = applyPlayerAction(
    world,
    otherId,
    { type: "take_vehicle", targetId: car.id },
    { id: "steal", now: 1200 },
  );
  expect(result.accepted).toBe(false);
});

it("launches from the menu in the owned car without granting progress or resetting an active timer", () => {
  const world = addPlayer(createInitialWorld(1000), SCENE_IDS.player);
  const result = applyPlayerAction(
    world,
    SCENE_IDS.player,
    { type: "launch_stunt", targetId: SCENE_IDS.mila },
    { id: "launch", now: 1000 },
  );
  if (!result.accepted) throw new Error(result.error.message);
  const driver = player(result.world);
  expect(driver.behavior).toEqual({ type: "driving", vehicleId: stuntVehicleId(driver.id) });
  expect(driver.position.x).toBe(STUNT.checkpoints[0].x);
  expect(driver.position.z).toBeGreaterThan(STUNT.checkpoints[0].z);
  expect(driver.money).toBe(player(world).money);
  expect(driver.stunt).toMatchObject({ stage: "running", checkpoint: 0 });
  expect(driver.position).toEqual(
    result.world.entities.find((e) => e.id === stuntVehicleId(driver.id))?.position,
  );
  const resumed = applyPlayerAction(
    result.world,
    driver.id,
    { type: "launch_stunt", targetId: SCENE_IDS.mila },
    { id: "resume", now: 2000 },
  );
  if (!resumed.accepted) throw new Error(resumed.error.message);
  expect(player(resumed.world).stunt).toEqual(driver.stunt);
  expect(resumed.world.entities.length).toBe(result.world.entities.length);
});
