import { BUILDINGS, DISTRICT_BOUNDS, GUESTHOUSE, MUSEUM, sceneSpace } from "@gpta/core/scene";
import type { Actor, WorldSnapshot } from "@gpta/core/world";

/** The map uses the same coordinates and footprints as the scene. */
export function Minimap({ snapshot, player }: { snapshot: WorldSnapshot; player: Actor }) {
  const space = sceneSpace(player.position);
  const inside = space !== "square";
  const bounds = space === "museum" ? MUSEUM.bounds : inside ? GUESTHOUSE.bounds : DISTRICT_BOUNDS;
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  return (
    <section className="minimap" aria-label="District minimap">
      <p>
        <span>{space === "museum" ? "MUSEUM" : inside ? "GUESTHOUSE" : "RED SQUARE"}</span>
        <span>N ↑</span>
      </p>
      <svg
        viewBox={`${bounds.minX - 8} ${bounds.minZ - 8} ${width + 16} ${depth + 16}`}
        role="img"
        aria-label={`Player at ${player.position.x.toFixed(0)}, ${player.position.z.toFixed(0)}`}
      >
        <rect x={bounds.minX} y={bounds.minZ} width={width} height={depth} rx="3" fill="#283534" />
        {!inside &&
          BUILDINGS.map((building) => (
            <rect
              key={building.id}
              x={building.x - building.width / 2}
              y={building.z - building.depth / 2}
              width={building.width}
              height={building.depth}
              fill="#59655b"
            />
          ))}
        {snapshot.entities
          .filter(
            (entity) =>
              entity.kind !== "location" &&
              entity.id !== player.id &&
              sceneSpace(entity.position) === space,
          )
          .map((entity) => (
            <circle
              key={entity.id}
              cx={entity.position.x}
              cy={entity.position.z}
              r={entity.kind === "vehicle" ? 2.7 : 1.7}
              fill={entity.kind === "police" ? "#8cafff" : "#adbdad"}
            />
          ))}
        <circle cx={player.position.x} cy={player.position.z} r="9" fill="#d5ff7820" />
        <circle
          cx={player.position.x}
          cy={player.position.z}
          r="3.5"
          fill="#d5ff78"
          stroke="#101517"
          strokeWidth="1.2"
        />
      </svg>
      <p>
        <span>● YOU</span>
        <span>
          {player.position.x.toFixed(0)}, {player.position.z.toFixed(0)}
        </span>
      </p>
    </section>
  );
}
