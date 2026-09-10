import { expect, it } from "vitest";
import { ambientMovement } from "../src/ambient-movement";
import { createInitialWorld } from "../src/simulation";
import { isActor } from "../src/world";
import { positionIsWalkable } from "../src/scene";

it("leaves Astra-controlled destinations unchanged", () => {
  const world = createInitialWorld(0, true);
  expect(ambientMovement(world, 20000)).toBe(world);
});
it("staggered fallback moves residents without moving quest-givers or duplicating identities", () => {
  const world = createInitialWorld(0, false);
  const next = ambientMovement(world, 20000);
  const walkers = next.entities.filter((e) => isActor(e) && e.behavior.type === "walking");
  expect(walkers.length).toBeGreaterThan(0);
  expect(walkers.length).toBeLessThan(10);
  expect(new Set(next.entities.map((e) => e.id)).size).toBe(world.entities.length);
  for (const e of next.entities) {
    if (!/^person-\d+$/.test(e.id))
      expect(e).toEqual(world.entities.find((old) => old.id === e.id));
    if (isActor(e) && e.behavior.type === "walking")
      expect(positionIsWalkable(e.behavior.destination)).toBe(true);
  }
});
