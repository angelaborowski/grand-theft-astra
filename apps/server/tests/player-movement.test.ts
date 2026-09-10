import { expect, it } from "vitest";
import { SCENE_IDS } from "@gpta/core/scene";
import { addPlayer, createInitialWorld } from "@gpta/core/simulation";
import { type Position, type WorldSnapshot } from "@gpta/core/world";
import { PlayerMovement } from "../src/player-movement";

function fixture(position: Position = { x: 0, z: 90 }) {
  const initial = addPlayer(createInitialWorld(), SCENE_IDS.player);
  const world = {
    ...initial,
    entities: initial.entities.map((entity) =>
      entity.id === SCENE_IDS.player ? { ...entity, position } : entity,
    ),
  };
  return { world, movement: new PlayerMovement(world, 0) };
}

function accepted(world: WorldSnapshot | null): WorldSnapshot {
  if (!world) throw new Error("The fixture movement must succeed.");
  return world;
}

function drive(world: WorldSnapshot): WorldSnapshot {
  return {
    ...world,
    entities: world.entities.map((entity) =>
      entity.id === SCENE_IDS.player && entity.kind === "player"
        ? { ...entity, behavior: { type: "driving", vehicleId: SCENE_IDS.vehicle } }
        : entity,
    ),
  };
}

it.each([5, 30])("bounds travel at %i movement packets per second", (rate) => {
  const { movement, world: initial } = fixture();
  let world = initial;
  for (let step = 1; step <= rate; step += 1) {
    const position = { x: 0, z: 90 + (6.99 * step) / rate };
    world = accepted(movement.move(world, SCENE_IDS.player, position, (1000 * step) / rate));
  }
  expect(movement.move(world, SCENE_IDS.player, { x: 0, z: 97.01 }, 1000)).toBeNull();
  expect(world.entities.find((entity) => entity.id === SCENE_IDS.player)?.position.z).toBeCloseTo(
    96.99,
  );
});

it("shares spent credit across a second connection and reconnect", () => {
  const { movement, world } = fixture();
  const next = accepted(movement.move(world, SCENE_IDS.player, { x: 0, z: 91 }, 200));
  movement.connect(SCENE_IDS.player, 200);
  movement.connect(SCENE_IDS.player, 200);
  expect(movement.move(next, SCENE_IDS.player, { x: 0, z: 91.5 }, 200)).toBeNull();
});

it("keeps rejected collision credit and charges only accepted distance", () => {
  const { movement, world } = fixture({ x: 51, z: 78 });
  expect(movement.move(world, SCENE_IDS.player, { x: 53, z: 78 }, 500)).toBeNull();
  const first = accepted(movement.move(world, SCENE_IDS.player, { x: 52, z: 78 }, 500));
  const second = accepted(movement.move(first, SCENE_IDS.player, { x: 52, z: 80 }, 500));
  expect(movement.move(second, SCENE_IDS.player, { x: 52, z: 81 }, 500)).toBeNull();
});

it("resets movement credit when the World reconstructs", () => {
  const { movement, world } = fixture();
  const next = accepted(movement.move(world, SCENE_IDS.player, { x: 0, z: 91 }, 500));
  const restarted = new PlayerMovement(next, 500);
  expect(restarted.move(next, SCENE_IDS.player, { x: 0, z: 92 }, 500)).toBeNull();
  expect(restarted.move(next, SCENE_IDS.player, { x: 0, z: 92 }, 700)).not.toBeNull();
});

it("uses walking speed for credit earned before taking a vehicle", () => {
  const { movement, world } = fixture();
  const driving = drive(world);
  movement.settleTransition(world, driving, SCENE_IDS.player, 500);
  expect(movement.move(driving, SCENE_IDS.player, { x: 0, z: 94 }, 500)).toBeNull();
  expect(movement.move(driving, SCENE_IDS.player, { x: 0, z: 93.5 }, 500)).not.toBeNull();
});

it("settles driving credit and clamps it when leaving a vehicle", () => {
  const { movement, world } = fixture();
  const driving = drive(world);
  movement.settleTransition(world, driving, SCENE_IDS.player, 0);
  movement.settleTransition(driving, world, SCENE_IDS.player, 1000);
  expect(movement.move(world, SCENE_IDS.player, { x: 0, z: 94 }, 1000)).toBeNull();
  expect(movement.move(world, SCENE_IDS.player, { x: 0, z: 93.6 }, 1000)).not.toBeNull();
});

it("does not grant distance when server time moves backwards", () => {
  const { movement, world } = fixture();
  const next = accepted(movement.move(world, SCENE_IDS.player, { x: 0, z: 93.5 }, 500));
  expect(movement.move(next, SCENE_IDS.player, { x: 0, z: 93.6 }, 400)).toBeNull();
  expect(movement.move(next, SCENE_IDS.player, { x: 0, z: 93.6 }, 500)).toBeNull();
  expect(movement.move(next, SCENE_IDS.player, { x: 0, z: 93.6 }, 600)).not.toBeNull();
});

it("does not add a per-packet movement allowance", () => {
  const { movement, world } = fixture();
  for (let packet = 0; packet < 30; packet += 1)
    expect(movement.move(world, SCENE_IDS.player, { x: 0, z: 90.01 }, 0)).toBeNull();
  expect(movement.move(world, SCENE_IDS.player, { x: 0, z: 91.39 }, 200)).not.toBeNull();
});
