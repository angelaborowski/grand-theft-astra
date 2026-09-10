import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from "react";
import {
  DISTRICT_BOUNDS,
  GUESTHOUSE,
  MUSEUM,
  isInsideMuseum,
  isInsideGuesthouse,
} from "@gpta/core/scene";
import type { Actor, Position } from "@gpta/core/world";
import { MAP_ZOOM, panMap, zoomMap, type MapSize, type MapView } from "../models/map-view";

/** Native pointer capture and ResizeObserver own the map's drag and size lifetimes. */
export function usePauseMap(player: Actor) {
  const surface = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const [size, setSize] = useState<MapSize>({ width: 1000, height: 500 });
  const [camera, setCamera] = useState<{ center: Position; span: number }>(() => ({
    center: player.position,
    span: MAP_ZOOM.initial,
  }));
  const inside = isInsideGuesthouse(player.position);
  const bounds = isInsideMuseum(player.position)
    ? MUSEUM.bounds
    : inside
      ? GUESTHOUSE.bounds
      : DISTRICT_BOUNDS;
  const view: MapView = { ...camera, ...size, heading: 0 };
  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width > 0 && entry.contentRect.height > 0)
        setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const center = () => setCamera((current) => ({ ...current, center: player.position }));
  const zoom = (factor: number) =>
    setCamera((current) => ({ ...current, span: zoomMap(current.span, factor) }));
  const pan = (x: number, y: number) =>
    setCamera((current) => ({
      ...current,
      center: panMap(current.center, x, y, { ...view, ...current }, bounds),
    }));
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target instanceof Element && event.target.closest("button")))
      return;
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    pan(event.clientX - current.x, event.clientY - current.y);
    drag.current = { ...current, x: event.clientX, y: event.clientY };
  };
  const pointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowUp":
        pan(0, 40);
        break;
      case "ArrowDown":
        pan(0, -40);
        break;
      case "ArrowLeft":
        pan(40, 0);
        break;
      case "ArrowRight":
        pan(-40, 0);
        break;
      case "+":
      case "=":
        zoom(0.8);
        break;
      case "-":
        zoom(1.25);
        break;
      case "Home":
        center();
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  };
  const wheel = (event: WheelEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.deltaY !== 0) zoom(event.deltaY > 0 ? 1.1 : 1 / 1.1);
  };
  return {
    surface,
    view,
    inside,
    actions: { center, zoom },
    events: {
      onPointerDown: pointerDown,
      onPointerMove: pointerMove,
      onPointerUp: pointerUp,
      onPointerCancel: pointerUp,
      onLostPointerCapture: () => {
        drag.current = null;
      },
      onKeyDown: keyDown,
      onWheel: wheel,
    },
  };
}
