import { crowdPosition, GUESTHOUSE, positionIsWalkable, SCENE_IDS, SCENE_POSITIONS } from "./scene";
import { distance, isActor, type Actor, type Position, type WorldSnapshot } from "./world";

const WALK_PERIOD_SECONDS = 12;
const HOME_RADIUS = 14;
const PLAYER_KEEP_STILL = 8;

const namedHomes: ReadonlyMap<string, Position> = new Map<string, Position>([
  [SCENE_IDS.mila, SCENE_POSITIONS.mila],
  [SCENE_IDS.lev, SCENE_POSITIONS.lev],
  [SCENE_IDS.niko, SCENE_POSITIONS.niko],
  [SCENE_IDS.irina, GUESTHOUSE.host],
  [SCENE_IDS.sasha, SCENE_POSITIONS.sasha],
  [SCENE_IDS.alexei, SCENE_POSITIONS.alexei],
  [SCENE_IDS.dispatcher, SCENE_POSITIONS.dispatcher],
  [SCENE_IDS.police, SCENE_POSITIONS.police],
]);

/** Each person walks around a home spot, so quest-givers stay where the map marker says. */
function home(actor: Actor): Position | undefined {
  const named = namedHomes.get(actor.id);
  if (named) return named;
  const match = /^person-(\d+)$/.exec(actor.id);
  return match ? crowdPosition(Number(match[1])) : undefined;
}

function seed(id: string): number {
  let value = 0;
  for (const character of id) value = (value * 31 + character.charCodeAt(0)) % 100_003;
  return value;
}

/** Routine walks for every person; a person near a player stands still so talk stays in range. */
export function ambientMovement(world: WorldSnapshot, now: number): WorldSnapshot {
  const second = Math.floor(now / 1000);
  return {
    ...world,
    entities: world.entities.map((entity) => {
      if (
        !isActor(entity) ||
        entity.kind === "player" ||
        entity.health <= 0 ||
        entity.behavior.type !== "idle"
      )
        return entity;
      const anchor = home(entity);
      if (!anchor) return entity;
      const index = seed(entity.id);
      if ((second + index) % WALK_PERIOD_SECONDS !== 0) return entity;
      if (
        world.entities.some(
          (other) =>
            other.kind === "player" &&
            distance(other.position, entity.position) < PLAYER_KEEP_STILL,
        )
      )
        return entity;
      const wander = index * 2.399963 + Math.floor(second / WALK_PERIOD_SECONDS) * 1.618;
      const length = 5 + (index % 8);
      // Beyond the home radius the walk heads home; otherwise it wanders.
      const angle =
        distance(entity.position, anchor) > HOME_RADIUS
          ? Math.atan2(anchor.z - entity.position.z, anchor.x - entity.position.x)
          : wander;
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
