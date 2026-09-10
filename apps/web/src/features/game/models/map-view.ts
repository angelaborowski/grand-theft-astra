import { MathUtils, Vector2 } from "three";
import type { Actor, Position } from "@gpta/core/world";

export const RADAR_SIZE = { width: 220, height: 140 } as const;
export const MAP_ZOOM = { initial: 130, minimum: 20, maximum: 400 } as const;
export type MapSize = { width: number; height: number };
export type MapView = MapSize & { center: Position; span: number; heading: number };
export type MapBounds = { minX: number; maxX: number; minZ: number; maxZ: number };

/** The radar's span stays local instead of fitting the whole district. */
export function radarView(player: Actor): MapView {
  return {
    ...RADAR_SIZE,
    center: player.position,
    span: player.behavior.type === "driving" ? 100 : 60,
    heading: player.heading,
  };
}

/** Server heading zero points north; positive heading turns clockwise. */
export function projectMapPosition(position: Position, view: MapView) {
  const offset = new Vector2(position.x - view.center.x, position.z - view.center.z)
    .rotateAround(new Vector2(), -view.heading)
    .multiplyScalar(view.width / view.span);
  return { x: view.width / 2 + offset.x, y: view.height / 2 + offset.y };
}

/** Keep distant destination symbols on the visible edge without changing their direction. */
export function mapEdgePosition(position: Position, view: MapView, inset = 12) {
  const point = projectMapPosition(position, view);
  const dx = point.x - view.width / 2;
  const dy = point.y - view.height / 2;
  const ratio = Math.max(
    1,
    Math.abs(dx) / Math.max(1, view.width / 2 - inset),
    Math.abs(dy) / Math.max(1, view.height / 2 - inset),
  );
  return { x: view.width / 2 + dx / ratio, y: view.height / 2 + dy / ratio, outside: ratio > 1 };
}

export function mapPositionVisible(position: Position, view: MapView, inset = 12): boolean {
  const point = projectMapPosition(position, view);
  return (
    point.x >= inset &&
    point.x <= view.width - inset &&
    point.y >= inset &&
    point.y <= view.height - inset
  );
}

/** SVG owns the geometry transform; markers use the same projection in screen pixels. */
export function mapTransform(view: MapView): string {
  return `translate(${view.width / 2} ${view.height / 2}) rotate(${-MathUtils.radToDeg(view.heading)}) scale(${view.width / view.span}) translate(${-view.center.x} ${-view.center.z})`;
}

export function panMap(
  center: Position,
  dx: number,
  dy: number,
  view: MapView,
  bounds: MapBounds,
): Position {
  const scale = view.span / view.width;
  return {
    x: MathUtils.clamp(center.x - dx * scale, bounds.minX, bounds.maxX),
    z: MathUtils.clamp(center.z - dy * scale, bounds.minZ, bounds.maxZ),
  };
}

export function zoomMap(span: number, factor: number): number {
  return MathUtils.clamp(span * factor, MAP_ZOOM.minimum, MAP_ZOOM.maximum);
}
