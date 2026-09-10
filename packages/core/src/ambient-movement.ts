import { positionIsWalkable } from "./scene";
import { distance, isActor, type WorldSnapshot } from "./world";

/** Explicit local-demo fallback; never competes with Astra or moves quest-givers. */
export function ambientMovement(world: WorldSnapshot, now: number): WorldSnapshot {
  if (world.ai.status !== "disabled") return world;
  const second = Math.floor(now / 1000);
  return {
    ...world,
    entities: world.entities.map((entity) => {
      if (!isActor(entity) || entity.health <= 0 || entity.behavior.type !== "idle") return entity;
      const match = /^person-(\d+)$/.exec(entity.id);
      if (!match) return entity;
      const index = Number(match[1]);
      if ((second + index * 7) % 20 !== 0) return entity;
      if (
        world.entities.some(
          (other) => other.kind === "player" && distance(other.position, entity.position) < 5,
        )
      )
        return entity;
      const angle = index * 2.399963 + Math.floor(second / 20) * 1.618;
      const length = 4 + (index % 5);
      const destination = {
        x: entity.position.x + Math.cos(angle) * length,
        z: entity.position.z + Math.sin(angle) * length,
      };
      // Check the whole short route, not only a destination beyond a thin wall.
      for (let step = 1; step <= 20; step++) {
        const ratio = step / 20;
        if (
          !positionIsWalkable({
            x: entity.position.x + (destination.x - entity.position.x) * ratio,
            z: entity.position.z + (destination.z - entity.position.z) * ratio,
          })
        )
          return entity;
      }
      if (
        world.entities.some(
          (other) =>
            other.id !== entity.id && isActor(other) && distance(other.position, destination) < 1,
        )
      )
        return entity;
      return { ...entity, behavior: { type: "walking" as const, destination } };
    }),
  };
}
