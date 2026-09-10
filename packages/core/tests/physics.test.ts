import { expect, it } from "vitest";
import {
  GUESTHOUSE,
  GUESTHOUSE_FURNITURE,
  MOVEMENT,
  positionIsWalkable,
  SCENE_IDS,
  SCENE_POSITIONS,
} from "../src/scene";
import {
  accrueMovementAllowance,
  addPlayer,
  clampMovementAllowance,
  createInitialWorld,
  movePlayer,
  repairWorldPositions,
  type MovementAllowance,
} from "../src/simulation";
import { PlayerSchema, type Position, type WorldSnapshot } from "../src/world";

const initial = () => addPlayer(createInitialWorld(), SCENE_IDS.player);
const player = (world: WorldSnapshot) =>
  PlayerSchema.parse(world.entities.find((entity) => entity.id === SCENE_IDS.player));
const completedProgress = {
  money: 137,
  shelter: "rented",
  reputation: 3,
  mission: { stage: "completed", route: "direct" },
} as const;

function at(position: Position): WorldSnapshot {
  const world = initial();
  return {
    ...world,
    entities: world.entities.map((entity) =>
      entity.id === SCENE_IDS.player ? { ...entity, position } : entity,
    ),
  };
}

function travel(packets: number): number {
  let allowance: MovementAllowance = { availableDistance: 0, updatedAt: 0 };
  let travelled = 0;
  for (let packet = 1; packet <= packets; packet += 1) {
    allowance = accrueMovementAllowance(allowance, (packet * 1000) / packets, MOVEMENT.walkSpeed);
    travelled += allowance.availableDistance;
    allowance = { ...allowance, availableDistance: 0 };
  }
  return travelled;
}

it("permits a capsule beside a box corner without permitting overlap", () => {
  expect(positionIsWalkable({ x: 59.33, z: 80.73 })).toBe(true);
  expect(positionIsWalkable({ x: 59.3, z: 80.7 })).toBe(false);
  expect(positionIsWalkable({ x: 59.445, z: 78 })).toBe(true);
  expect(positionIsWalkable({ x: 59.435, z: 78 })).toBe(false);
});

it("uses the guesthouse inner wall faces and blocks its furniture", () => {
  expect(positionIsWalkable({ x: 90.6, z: 0 })).toBe(true);
  expect(positionIsWalkable({ x: 90.55, z: 0 })).toBe(false);
  expect(positionIsWalkable(GUESTHOUSE.spawn)).toBe(true);
  for (const box of GUESTHOUSE_FURNITURE) expect(positionIsWalkable(box)).toBe(false);
});

it("rejects a path through a building despite valid endpoints", () => {
  const world = at({ x: 50, z: 78 });
  expect(positionIsWalkable({ x: 61, z: 78 })).toBe(true);
  expect(movePlayer(world, SCENE_IDS.player, { x: 61, z: 78 }, 11)).toBeNull();
  expect(movePlayer(world, SCENE_IDS.player, GUESTHOUSE.spawn, 1000)).toBeNull();
});

it("repairs a saved actor without changing progress or static targets", () => {
  const world = at(GUESTHOUSE.bed);
  const progress = { ...player(world), ...completedProgress };
  world.entities = world.entities.map((entity) => (entity.id === progress.id ? progress : entity));
  const repaired = repairWorldPositions(world);
  expect(player(repaired)).toEqual({ ...progress, position: GUESTHOUSE.spawn });
  expect(
    repaired.entities.find((entity) => entity.id === SCENE_IDS.guesthouseBed)?.position,
  ).toEqual(GUESTHOUSE.bed);
  expect(repaired.events).toBe(world.events);
  expect(repairWorldPositions(repaired)).toBe(repaired);
});

it.each([
  { position: { x: 56, z: 78 }, spawn: SCENE_POSITIONS.player },
  { position: GUESTHOUSE.bed, spawn: GUESTHOUSE.spawn },
])("repairs an occupied vehicle and its driver in their current space", ({ position, spawn }) => {
  const world = at(position);
  world.entities = world.entities.map((entity) =>
    entity.id === SCENE_IDS.player
      ? { ...player(world), behavior: { type: "driving", vehicleId: SCENE_IDS.vehicle } }
      : entity,
  );
  const repaired = repairWorldPositions(world);
  expect(player(repaired).position).toEqual(spawn);
  expect(repaired.entities.find((entity) => entity.id === SCENE_IDS.vehicle)?.position).toEqual(
    spawn,
  );
  expect(player(repaired).behavior).toEqual({ type: "driving", vehicleId: SCENE_IDS.vehicle });
});

it("grants the same travel distance at five and thirty packets per second", () => {
  expect(travel(5)).toBeCloseTo(MOVEMENT.walkSpeed);
  expect(travel(30)).toBeCloseTo(MOVEMENT.walkSpeed);
});

it("caps idle credit and does not accrue time twice after a clock reversal", () => {
  const allowance = accrueMovementAllowance({ availableDistance: 0, updatedAt: 1000 }, 900, 7);
  expect(allowance).toEqual({ availableDistance: 0, updatedAt: 1000 });
  expect(accrueMovementAllowance(allowance, 1100, 7).availableDistance).toBeCloseTo(0.7);
  expect(accrueMovementAllowance(allowance, 11000, 7).availableDistance).toBe(3.7);
});

it("clamps driving credit without granting credit on a speed change", () => {
  const driving = { availableDistance: 8.2, updatedAt: 1000 };
  expect(clampMovementAllowance(driving, 7)).toEqual({ availableDistance: 3.7, updatedAt: 1000 });
  const walking = { availableDistance: 1, updatedAt: 1000 };
  expect(clampMovementAllowance(walking, 16)).toEqual(walking);
});
