import { sceneSpace } from "@gpta/core/scene";
import { distance, type Entity, type EntityId, type Player } from "@gpta/core/world";

/** The target list preserves interior boundaries without hiding distant people from inspection. */
export function InteractionTarget({
  entity,
  player,
  entities,
  select,
}: {
  entity: Entity;
  player: Player;
  entities: Entity[];
  select: (id: EntityId) => void;
}) {
  return (
    <label className="target-select">
      Select
      <select
        aria-label="Person or place"
        value={entity.id}
        onChange={(event) => {
          const target = entities.find((entry) => entry.id === event.target.value);
          if (target) select(target.id);
        }}
      >
        {entities
          .filter(
            (entry) =>
              entry.id !== player.id && sceneSpace(entry.position) === sceneSpace(player.position),
          )
          .toSorted(
            (a, b) => distance(player.position, a.position) - distance(player.position, b.position),
          )
          .map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name} · {distance(player.position, entry.position).toFixed(0)} m
            </option>
          ))}
      </select>
    </label>
  );
}
