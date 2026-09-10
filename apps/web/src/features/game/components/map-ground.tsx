import { useId } from "react";
import {
  BUILDINGS,
  DISTRICT_BOUNDS,
  MUSEUM,
  isInsideMuseum,
  GUESTHOUSE,
  GUESTHOUSE_COLLIDERS,
} from "@gpta/core/scene";
import { mapTransform, type MapView } from "../models/map-view";

/** Shared scene footprints remain in meters; the SVG transform controls their visible scale. */
export function MapGround({ view, inside }: { view: MapView; inside: boolean }) {
  const hatchId = useId();
  const museum = isInsideMuseum(view.center);
  const bounds = museum ? MUSEUM.bounds : inside ? GUESTHOUSE.bounds : DISTRICT_BOUNDS;
  const footprints = museum ? [] : inside ? GUESTHOUSE_COLLIDERS : BUILDINGS;
  return (
    <>
      <defs>
        <pattern id={hatchId} width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M0 8 8 0" className="astra-map-hatch" />
        </pattern>
      </defs>
      <rect width={view.width} height={view.height} className="astra-map-outside" />
      <rect width={view.width} height={view.height} fill={`url(#${hatchId})`} />
      <g transform={mapTransform(view)}>
        <rect
          x={bounds.minX}
          y={bounds.minZ}
          width={bounds.maxX - bounds.minX}
          height={bounds.maxZ - bounds.minZ}
          className="astra-map-ground"
        />
        {footprints.map((footprint) => (
          <rect
            key={footprint.id}
            x={footprint.x - footprint.width / 2}
            y={footprint.z - footprint.depth / 2}
            width={footprint.width}
            height={footprint.depth}
            className="astra-map-building"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <rect
          x={bounds.minX}
          y={bounds.minZ}
          width={bounds.maxX - bounds.minX}
          height={bounds.maxZ - bounds.minZ}
          className="astra-map-boundary"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    </>
  );
}
