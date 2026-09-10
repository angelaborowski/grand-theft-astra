import { isInsideGuesthouse } from "@gpta/core/scene";
import type { Actor, EntityId, WorldSnapshot } from "@gpta/core/world";
import { mapMarkers } from "../models/map-markers";
import {
  mapEdgePosition,
  mapPositionVisible,
  projectMapPosition,
  radarView,
} from "../models/map-view";
import { MapGround } from "./map-ground";
import { MapSymbol, PlayerMapSymbol } from "./map-symbol";
import "../../../ui/astra-map.css";

/** A local radar shares world geometry with the pause map and never selects a person. */
export function Minimap({
  snapshot,
  player,
  destinationId = null,
}: {
  snapshot: WorldSnapshot;
  player: Actor;
  destinationId?: EntityId | null;
}) {
  const view = radarView(player);
  const markers = mapMarkers(snapshot, player, destinationId);
  const north = mapEdgePosition({ x: player.position.x, z: player.position.z - 1000 }, view, 9);
  return (
    <div
      className="astra-radar"
      role="img"
      aria-label="Local radar. Your heading points up. Hatched areas lie outside the playable district."
    >
      <svg viewBox={`0 0 ${view.width} ${view.height}`} aria-hidden="true">
        <MapGround view={view} inside={isInsideGuesthouse(player.position)} />
      </svg>
      {markers
        .filter(
          (marker) => marker.kind === "destination" || mapPositionVisible(marker.position, view),
        )
        .map((marker) => {
          const point =
            marker.kind === "destination"
              ? mapEdgePosition(marker.position, view)
              : projectMapPosition(marker.position, view);
          return (
            <span
              key={marker.id}
              className={`astra-map-symbol astra-map-symbol-${marker.kind}`}
              style={{ left: point.x, top: point.y }}
              title={marker.name}
            >
              <MapSymbol kind={marker.kind} />
            </span>
          );
        })}
      <span className="astra-map-symbol" style={{ left: view.width / 2, top: view.height / 2 }}>
        <PlayerMapSymbol heading={0} />
      </span>
      <span className="astra-map-north" style={{ left: north.x, top: north.y }}>
        N
      </span>
    </div>
  );
}
