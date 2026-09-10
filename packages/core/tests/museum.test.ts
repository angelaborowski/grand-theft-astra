import { expect, it } from "vitest";
import { addPlayer, createInitialWorld, movePlayer } from "../src/simulation";
import { MUSEUM, SCENE_IDS, isInsideMuseum, positionIsWalkable } from "../src/scene";
import { PlayerSchema } from "../src/world";

it("starts newcomers inside and only crosses to the square through the doorway", () => {
  let world = addPlayer(createInitialWorld(1000), SCENE_IDS.player);
  const player = () => PlayerSchema.parse(world.entities.find((e) => e.id === SCENE_IDS.player));
  expect(isInsideMuseum(player().position)).toBe(true);
  expect(movePlayer(world, SCENE_IDS.player, MUSEUM.exit, 500)).toBeNull();
  const money = player().money;
  for (let z = -24.5; z <= -0.5; z += 0.5) {
    const next = movePlayer(world, SCENE_IDS.player, { x: 200, z }, 0.6);
    if (!next) throw new Error(`Rejected museum walk at ${z}`);
    world = next;
  }
  expect(player().position).toEqual(MUSEUM.exit);
  expect(positionIsWalkable(player().position)).toBe(true);
  expect(player().money).toBe(money);
});
