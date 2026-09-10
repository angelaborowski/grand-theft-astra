import type { Ref } from "react";
import { BUILDINGS } from "@gpta/core/scene";
import type { Actor, EntityId } from "@gpta/core/world";
import type { usePauseMap } from "../hooks/use-pause-map";
import type { MapMarker } from "../models/map-markers";
import { mapPositionVisible, projectMapPosition, type MapView } from "../models/map-view";
import { MapGround } from "./map-ground";
import { MapSymbol, PlayerMapSymbol } from "./map-symbol";

type Props = {
  ref: Ref<HTMLDivElement>;
  view: MapView;
  inside: boolean;
  player: Actor;
  markers: MapMarker[];
  actions: { track: (id: EntityId | null) => void };
  events: ReturnType<typeof usePauseMap>["events"];
};

export function MapViewport({ ref, view, inside, player, markers, actions, events }: Props) {
  const playerPoint = projectMapPosition(player.position, view);
  return (
    <div
      ref={ref}
      className="astra-map-viewport"
      tabIndex={0}
      role="group"
      aria-label="Pan with arrow keys or drag. Zoom with plus, minus, or scroll. Home centers your position."
      {...events}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${view.width} ${view.height}`}
        aria-hidden="true"
      >
        <MapGround view={view} inside={inside} />
      </svg>
      {!inside &&
        BUILDINGS.filter((building) => mapPositionVisible(building, view, 40)).map((building) => {
          const point = projectMapPosition(building, view);
          return (
            <span
              key={building.id}
              className="astra-map-landmark"
              style={{ left: point.x, top: point.y }}
            >
              {building.name}
            </span>
          );
        })}
      {markers
        .filter((marker) => mapPositionVisible(marker.position, view))
        .map((marker) => {
          const point = projectMapPosition(marker.position, view);
          return (
            <button
              key={marker.id}
              type="button"
              className={`astra-map-marker astra-map-symbol-${marker.kind}`}
              style={{ left: point.x, top: point.y }}
              aria-label={`Track ${marker.name}`}
              aria-pressed={marker.kind === "destination"}
              title={marker.name}
              onClick={() => actions.track(marker.id)}
            >
              <MapSymbol kind={marker.kind} />
              <span className="astra-map-marker-label">{marker.name}</span>
            </button>
          );
        })}
      {mapPositionVisible(player.position, view) && (
        <span
          className="astra-map-symbol"
          style={{ left: playerPoint.x, top: playerPoint.y }}
          title="You"
        >
          <PlayerMapSymbol heading={player.heading} />
        </span>
      )}
      <span className="astra-map-compass">N ↑</span>
      <span className="astra-map-scale">{Math.round(view.span / 5)} m</span>
    </div>
  );
}
