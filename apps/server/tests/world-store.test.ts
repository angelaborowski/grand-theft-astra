import { expect, it } from "vitest";
import { createTestHarness } from "wrangler";
import { addPlayer, createInitialWorld } from "@gpta/core/simulation";
import { SCENE_IDS } from "@gpta/core/scene";
import { EntityIdSchema, type WorldSnapshot } from "@gpta/core/world";
import type { StoreFixture } from "./fixtures/world-store-worker";

type FixtureEnv = { STORE: DurableObjectNamespace<StoreFixture> };
const playerId = EntityIdSchema.parse("player:persistence-test");
function savedWorld(): WorldSnapshot {
  const world = addPlayer(createInitialWorld(0, false), playerId);
  return {
    ...world,
    events: [
      {
        id: "event-1",
        time: 0,
        source: "player",
        type: "talk",
        actorId: playerId,
        message: "Hello",
      },
    ],
    observations: [
      { actorId: SCENE_IDS.mila, eventId: "event-1", text: "A visitor arrived" },
      { actorId: SCENE_IDS.lev, eventId: "event-1", text: "A visitor arrived" },
    ],
    dialogue: [{ id: "dialogue-1", time: 0, from: playerId, to: SCENE_IDS.mila, text: "Hello" }],
    incidents: [
      {
        id: "incident-1",
        type: "theft",
        actorId: playerId,
        targetId: SCENE_IDS.mila,
        position: { x: 1, z: 2 },
        witnessIds: [SCENE_IDS.lev],
      },
    ],
    reports: [
      { id: "report-1", incidentId: "incident-1", reporterId: SCENE_IDS.lev, status: "open" },
    ],
    decisions: [
      {
        id: "decision-1",
        actorId: SCENE_IDS.mila,
        trigger: "event-1",
        status: "completed",
        summary: "Remembered",
        createdAt: 0,
      },
    ],
  };
}

async function prepare() {
  const server = createTestHarness({
    workers: [
      {
        config: {
          name: "world-store-test",
          main: "./tests/fixtures/world-store-worker.ts",
          compatibility_date: "2026-09-10",
          durable_objects: { bindings: [{ name: "STORE", class_name: "StoreFixture" }] },
          migrations: [{ tag: "v1", new_sqlite_classes: ["StoreFixture"] }],
        },
      },
    ],
  });
  await server.listen();
  const worker = server.getWorker<FixtureEnv>();
  const store = (await worker.getEnv()).STORE.getByName("test");
  return { server, worker, store };
}
const test = it.extend<{ fixture: Awaited<ReturnType<typeof prepare>> }>({
  fixture: async ({ onTestFailed }, use) => {
    const fixture = await prepare();
    onTestFailed(() => fixture.server.debug());
    try {
      await use(fixture);
    } finally {
      await fixture.server.close();
    }
  },
});

test("restores every collection, session, and receipt after runtime reload", async ({
  fixture,
}) => {
  const world = savedWorld();
  await fixture.store.createSession("session", playerId, world);
  await fixture.store.save(world, { id: "action", result: { accepted: true } });
  await fixture.server.update((options) => options);
  const restored = (await fixture.worker.getEnv()).STORE.getByName("test");
  expect(await restored.load()).toEqual(world);
  expect(await restored.authenticate("session")).toBe(playerId);
  expect(await restored.receipt("action")).toEqual({ accepted: true });
});

test("saves more than 2 MB of history as individual records", async ({ fixture }) => {
  const world = savedWorld();
  world.dialogue = Array.from({ length: 800 }, (_, index) => ({
    id: `dialogue-${index}`,
    time: index,
    from: playerId,
    to: SCENE_IDS.mila,
    text: "я🙂".repeat(600),
  }));
  expect(new TextEncoder().encode(JSON.stringify(world)).byteLength).toBeGreaterThan(
    2 * 1024 * 1024,
  );
  await fixture.store.createSession("large-session", playerId, world);
  await fixture.server.update((options) => options);
  const restored = (await fixture.worker.getEnv()).STORE.getByName("test");
  expect(await restored.load()).toEqual(world);
  expect(await restored.authenticate("large-session")).toBe(playerId);
});

test("writes no unchanged rows and only updates the changed entity", async ({ fixture }) => {
  const world = savedWorld();
  await fixture.store.save(world);
  expect(await fixture.store.save(structuredClone(world))).toBe(0);
  const changed = {
    ...world,
    entities: world.entities.map((entity) =>
      entity.id === playerId ? { ...entity, money: 120 } : entity,
    ),
  };
  expect(await fixture.store.save(changed)).toBe(1);
  expect(await fixture.store.load()).toEqual(changed);
});

test("removes pruned records and retains composite identities and order", async ({ fixture }) => {
  const world = savedWorld();
  await fixture.store.save(world);
  const changed = {
    ...world,
    entities: [...world.entities].reverse(),
    events: [],
    dialogue: [],
    observations: world.observations.slice(1),
  };
  await fixture.store.save(changed);
  expect(await fixture.store.load()).toMatchObject({
    events: [],
    dialogue: [],
    observations: changed.observations,
    entities: changed.entities,
  });
});

test("rolls back session creation when a record write fails", async ({ fixture }) => {
  const world = savedWorld();
  await fixture.store.save(world);
  const sql = await fixture.worker.getDurableObjectStorage("STORE", { name: "test" });
  await sql.exec(
    "CREATE TRIGGER reject_dialogue BEFORE INSERT ON world_dialogue BEGIN SELECT RAISE(ABORT, 'Injected write failure'); END",
  );
  const broken = {
    ...world,
    time: 100,
    dialogue: [
      {
        id: "large",
        time: 0,
        from: playerId,
        to: SCENE_IDS.mila,
        text: "This write must fail",
      },
    ],
  };
  await expect(fixture.store.createSession("failed-session", playerId, broken)).rejects.toThrow();
  expect(await fixture.store.load()).toEqual(world);
  expect(await fixture.store.authenticate("failed-session")).toBeUndefined();
});

test("rolls back an outer transaction and permits a correct repeated save", async ({ fixture }) => {
  const world = savedWorld();
  await fixture.store.save(world);
  const changed = { ...world, time: 100, events: [] };
  expect(await fixture.store.rollback(changed)).toBe("Deliberate outer transaction failure.");
  expect(await fixture.store.load()).toEqual(world);
  expect(await fixture.store.receipt("rolled-back")).toBeUndefined();
  await fixture.store.save(changed, { id: "retry", result: true });
  expect(await fixture.store.load()).toEqual(changed);
  expect(await fixture.store.receipt("retry")).toBe(true);
});
