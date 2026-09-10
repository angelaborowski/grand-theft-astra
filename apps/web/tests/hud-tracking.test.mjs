import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

// Vite resolves the same shared TypeScript modules and JSX as the game.
const server = await createServer({
  configFile: false,
  esbuild: { jsx: "automatic" },
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
  ssr: { noExternal: ["@gpta/core"] },
});
after(() => server.close());
const { trackedQuest } = await server.ssrLoadModule("/src/features/game/models/quest-view.ts");
const { GameHud } = await server.ssrLoadModule("/src/features/game/components/game-hud.tsx");
const { GameplayHud } = await server.ssrLoadModule(
  "/src/features/game/components/gameplay-hud.tsx",
);
const { createInitialWorld, addPlayer } = await server.ssrLoadModule("@gpta/core/simulation");
const { SCENE_IDS, STUNT, stuntVehicleId } = await server.ssrLoadModule("@gpta/core/scene");
const snapshot = addPlayer(createInitialWorld(Date.UTC(2026, 8, 10, 19, 59)), "hud-player");
const player = snapshot.entities.find((entity) => entity.id === "hud-player");
const museumPlayer = { ...player };
player.position = { x: 13, z: -140 };
player.elevation = 0;
const questTracking = { type: "quest", id: "shelter" };
const actions = { pause() {}, interact() {}, overview() {}, mission() {} };
const renderHud = (tracking) => {
  const quest = trackedQuest(player, tracking);
  return renderToStaticMarkup(
    createElement(GameHud, {
      snapshot,
      player,
      connection: { status: "connected" },
      overview: false,
      destinationId: quest?.targetId ?? null,
      quest,
      actions,
    }),
  );
};

test("stopping and restarting tracking removes and restores the quest and destination", () => {
  const tracked = renderHud(questTracking);
  assert.match(tracked, /astra-hud-quest/);
  assert.match(tracked, /astra-map-symbol-destination/);
  const stopped = renderHud({ type: "none" });
  assert.doesNotMatch(stopped, /astra-hud-quest|astra-map-symbol-destination/);
  assert.equal(renderHud(questTracking), tracked);
});

test("a tracked quest follows its next destination and stays stopped after progress", () => {
  assert.equal(trackedQuest(player, questTracking).targetId, SCENE_IDS.mila);
  const carrying = { ...player, mission: { stage: "carrying" } };
  assert.equal(trackedQuest(carrying, questTracking).targetId, SCENE_IDS.lev);
  assert.equal(trackedQuest(carrying, { type: "none" }), null);
});

test("Last Flight tracking follows the vehicle and then the helipad", () => {
  const running = { ...player, stunt: { stage: "running", checkpoint: 0, deadline: 10000 } };
  const tracking = { type: "quest", id: "stunt" };
  assert.equal(trackedQuest(running, tracking).targetId, stuntVehicleId(player.id));
  const delivery = {
    ...running,
    stunt: { ...running.stunt, checkpoint: STUNT.checkpoints.length },
  };
  assert.equal(trackedQuest(delivery, tracking).targetId, SCENE_IDS.helipad);
});

test("a map destination does not implicitly track a quest with the same destination", () => {
  assert.equal(trackedQuest(player, { type: "entity", id: SCENE_IDS.mila }), null);
});

test("the HUD keeps time, money, equipment, health, and location visible", () => {
  const html = renderHud(questTracking);
  assert.match(html, /19:59/);
  assert.match(html, /aria-label="Money"/);
  assert.match(html, /Unarmed/);
  assert.match(html, /aria-label="Health"/);
  assert.match(html, /Red Square/);
  assert.doesNotMatch(html, /astra-notice/);
});

test("gameplay controls render without a click-to-start instruction or status content", () => {
  const html = renderToStaticMarkup(
    createElement(GameplayHud, {
      target: null,
      active: true,
      command: { status: "idle" },
    }),
  );
  assert.match(html, /gameplay-reticle/);
  assert.doesNotMatch(html, /Click|gameplay-equipment|astra-hud-stats/);
});

test("museum opening keeps exit guidance before the outdoor quest", () => {
  const markup = renderToStaticMarkup(
    createElement(GameHud, {
      snapshot,
      player: museumPlayer,
      connection: { status: "connected" },
      overview: false,
      destinationId: null,
      quest: trackedQuest(museumPlayer, questTracking),
      actions,
    }),
  );
  assert.match(markup, /Walk through the hall, down the steps/);
  assert.doesNotMatch(markup, /Talk to Mila|astra-map-symbol-destination/);
});
