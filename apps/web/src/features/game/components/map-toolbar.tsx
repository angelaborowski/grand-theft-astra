import type { EntityId } from "@gpta/core/world";
import { MAP_ZOOM } from "../models/map-view";

type Props = {
  destinationId: EntityId | null;
  destinationName: string | null;
  span: number;
  actions: {
    track: (id: EntityId | null) => void;
    overview: () => void;
    zoom: (factor: number) => void;
    center: () => void;
  };
};

export function MapToolbar({ destinationId, destinationName, span, actions }: Props) {
  let status = "Select a destination";
  if (destinationId !== null) status = "Destination unavailable";
  if (destinationName !== null) status = destinationName;
  return (
    <div className="astra-map-toolbar">
      <span className="astra-map-status" role="status">
        {status}
      </span>
      <div className="astra-map-actions">
        <button
          type="button"
          className="astra-button"
          onClick={() => actions.zoom(0.8)}
          disabled={span <= MAP_ZOOM.minimum}
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          className="astra-button"
          onClick={() => actions.zoom(1.25)}
          disabled={span >= MAP_ZOOM.maximum}
          aria-label="Zoom out"
        >
          −
        </button>
        <button type="button" className="astra-button" onClick={actions.center}>
          Center
        </button>
        <button
          type="button"
          className="astra-button"
          onClick={() => actions.track(null)}
          disabled={destinationId === null}
        >
          Clear
        </button>
        <button type="button" className="astra-button" onClick={actions.overview}>
          City overview
        </button>
      </div>
    </div>
  );
}
