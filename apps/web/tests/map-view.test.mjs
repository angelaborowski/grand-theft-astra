import assert from "node:assert/strict";
import test from "node:test";
import {
  mapEdgePosition,
  mapPositionVisible,
  panMap,
  projectMapPosition,
  radarView,
  zoomMap,
} from "../src/features/game/models/map-view.ts";

const player = { position: { x: 39, z: 83 }, heading: 0, behavior: { type: "idle" } };
const bounds = { minX: -42, maxX: 62, minZ: -115, maxZ: 222 };

test("the radar shows 60 meters on foot and 100 while driving", () => {
  assert.equal(radarView(player).span, 60);
  assert.equal(radarView({ ...player, behavior: { type: "driving", vehicleId: "car" } }).span, 100);
});

test("an east-facing player sees an eastern destination straight ahead", () => {
  const view = radarView({ ...player, heading: Math.PI / 2 });
  const point = projectMapPosition({ x: 49, z: 83 }, view);
  assert.ok(Math.abs(point.x - view.width / 2) < 0.001);
  assert.ok(point.y < view.height / 2);
});

test("off-screen destinations stay inside the radar edge", () => {
  const view = radarView(player);
  const point = mapEdgePosition({ x: 1039, z: 1083 }, view);
  assert.equal(point.outside, true);
  assert.ok(point.x <= view.width - 12 && point.y <= view.height - 12);
  assert.equal(point.x - view.width / 2, point.y - view.height / 2);
});

test("nearby points stay unchanged and distant ordinary markers remain hidden", () => {
  const view = radarView(player);
  const point = mapEdgePosition(player.position, view);
  assert.deepEqual(point, { x: 110, y: 70, outside: false });
  assert.equal(mapPositionVisible({ x: 39, z: 201 }, view), false);
});

test("panning uses the current scale and stops at district bounds", () => {
  const view = radarView(player);
  assert.deepEqual(panMap(player.position, 22, 0, view, bounds), { x: 33, z: 83 });
  assert.equal(panMap(player.position, -10000, 0, view, bounds).x, bounds.maxX);
});

test("zoom cannot collapse or infinitely expand the map", () => {
  assert.equal(zoomMap(130, 0.001), 20);
  assert.equal(zoomMap(130, 1000), 400);
});
