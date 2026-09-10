import { expect, it } from "vitest";
import { ambientMovement } from "../src/ambient-movement";
import { addPlayer, createInitialWorld } from "../src/simulation";
import { EntityIdSchema, isActor } from "../src/world";
import { positionIsWalkable, SCENE_IDS } from "../src/scene";

function walkers(world: ReturnType<typeof createInitialWorld>, seconds: number[]) {
  const ids = new Set<string>();
  for (const second of seconds)
    for (const e of ambientMovement(world, second * 1000).entities)
      if (isActor(e) && e.behavior.type === "walking") ids.add(e.id);
  return ids;
}

it("moves the crowd and the named cast over one walk period while Astra is enabled", () => {
  const world = createInitialWorld(0, true);
  const moved = walkers(
    world,
    Array.from({ length: 12 }, (_, i) => 100 + i),
  );
  expect(moved.size).toBeGreaterThan(50);
  expect(moved.has(SCENE_IDS.mila)).toBe(true);
  expect([...moved].some((id) => /^person-\d+$/.test(id))).toBe(true);
});
it("keeps walks on walkable ground, never moves players, and stands still beside a player", () => {
  const world = createInitialWorld(0, false);
  const mila = world.entities.find((e) => e.id === SCENE_IDS.mila);
  if (!mila) throw new Error("no Mila");
  const withPlayer = addPlayer(world, EntityIdSchema.parse("player-1"));
  for (const entity of withPlayer.entities)
    if (entity.kind === "player") entity.position = mila.position;
  for (let second = 0; second < 12; second++) {
    const next = ambientMovement(withPlayer, second * 1000);
    expect(new Set(next.entities.map((e) => e.id)).size).toBe(withPlayer.entities.length);
    for (const e of next.entities) {
      if (e.kind === "player") expect(e.behavior.type).toBe("idle");
      if (e.id === SCENE_IDS.mila && isActor(e)) expect(e.behavior.type).toBe("idle");
      if (isActor(e) && e.behavior.type === "walking")
        expect(positionIsWalkable(e.behavior.destination)).toBe(true);
    }
  }
});
