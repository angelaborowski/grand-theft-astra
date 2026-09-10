import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

// Vite resolves the shared package's extensionless TypeScript imports without changing game code.
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
  ssr: { noExternal: ["@gpta/core"] },
});
after(() => server.close());
const { selectAudioCues, nearbyCrowdGain } = await server.ssrLoadModule(
  "/src/features/game/models/world-audio.ts",
);
const { EntityIdSchema, PlayerSchema, EntitySchema, WorldSnapshotSchema } =
  await server.ssrLoadModule("@gpta/core/world");
const { GUESTHOUSE } = await server.ssrLoadModule("@gpta/core/scene");
const { sampleVehicleAudio, vehicleAudioEmitters } = await server.ssrLoadModule(
  "/src/features/game/models/vehicle-audio.ts",
);
const playerId = EntityIdSchema.parse("player-audio");
const player = (fields = {}) =>
  PlayerSchema.parse({
    id: playerId,
    kind: "player",
    name: "Player",
    position: { x: 0, z: 0 },
    health: 100,
    money: 20,
    goal: "Find shelter",
    job: "New arrival",
    behavior: { type: "idle" },
    mission: { stage: "carrying" },
    reputation: 0,
    shelter: "none",
    ...fields,
  });
const person = (fields = {}) =>
  EntitySchema.parse({
    ...player(),
    id: "person-audio",
    kind: "person",
    role: "resident",
    ...fields,
  });
const vehicle = (fields = {}) =>
  EntitySchema.parse({
    id: "vehicle-audio",
    kind: "vehicle",
    name: "Car",
    position: { x: 0, z: 0 },
    ownerId: playerId,
    color: "#ff0000",
    ...fields,
  });
const world = (entities = [player()], fields = {}) =>
  WorldSnapshotSchema.parse({
    version: 3,
    revision: 1,
    time: 100,
    entities,
    events: [],
    incidents: [],
    reports: [],
    observations: [],
    dialogue: [],
    relationships: [],
    decisions: [],
    population: { total: 1, activeIds: [] },
    ai: { status: "disabled", model: "gpt-6-astra" },
    ...fields,
  });
const completed = (fields = {}) =>
  player({ mission: { stage: "completed", route: "direct" }, ...fields });
const dispatchedReport = {
  id: "report-audio",
  incidentId: "incident-audio",
  reporterId: "person-audio",
  status: "dispatched",
};

test("initial and reset baselines never replay saved progress", () => {
  const restored = world([completed({ shelter: "rented", position: GUESTHOUSE.spawn })]);
  assert.deepEqual(selectAudioCues(null, restored, playerId), []);
});

test("duplicate and older revisions cannot repeat rewards", () => {
  const before = world();
  for (const revision of [before.revision, before.revision - 1])
    assert.deepEqual(selectAudioCues(before, world([completed()], { revision }), playerId), []);
  const accepted = world([completed()], { revision: 2 });
  assert.deepEqual(selectAudioCues(accepted, world([completed()], { revision: 3 }), playerId), []);
});

test("accepted direct and NPC conversation deliveries produce the player's reward", () => {
  for (const [actorId, type, source] of [
    [playerId, "deliver_parcel", "player"],
    ["person-merchant", "complete_delivery", "astra"],
  ]) {
    const events = [{ id: "delivery", time: 100, actorId, type, source, message: "Delivered" }];
    assert.deepEqual(
      selectAudioCues(world(), world([completed()], { revision: 2, events }), playerId),
      ["reward"],
    );
  }
});

test("another player's delivery does not produce a local reward", () => {
  const before = world([player(), player({ id: "player-friend" })]);
  const current = world([player(), completed({ id: "player-friend" })], { revision: 2 });
  assert.deepEqual(selectAudioCues(before, current, playerId), []);
});

test("a newly observed player establishes a silent baseline", () => {
  assert.deepEqual(selectAudioCues(world([]), world([completed()], { revision: 2 }), playerId), []);
});

test("renting shelter and completing the stunt each produce a reward", () => {
  for (const result of [{ shelter: "rented" }, { stunt: { stage: "completed" } }])
    assert.deepEqual(selectAudioCues(world(), world([player(result)], { revision: 2 }), playerId), [
      "reward",
    ]);
});

test("accepted guesthouse entry and exit produce a door sound", () => {
  const outside = world();
  const inside = world([player({ position: GUESTHOUSE.spawn })], { revision: 2 });
  assert.deepEqual(selectAudioCues(outside, inside, playerId), ["door"]);
  assert.deepEqual(selectAudioCues(inside, world([player()], { revision: 3 }), playerId), ["door"]);
});

test("accepted movement within the guesthouse does not produce a door sound", () => {
  const before = world([player({ position: GUESTHOUSE.spawn })]);
  const current = world([player({ position: GUESTHOUSE.host })], { revision: 2 });
  assert.deepEqual(selectAudioCues(before, current, playerId), []);
});

test("a fresh nearby dispatch produces one radio cue without repeating", () => {
  const unit = person({ id: "police-audio", kind: "police", assignment: "report-audio" });
  const current = world([player(), unit], { revision: 2, reports: [dispatchedReport] });
  assert.deepEqual(selectAudioCues(world(), current, playerId), ["police-radio"]);
  assert.deepEqual(selectAudioCues(current, { ...current, revision: 3 }, playerId), []);
});

test("distant police and police in another space do not produce radio cues", () => {
  for (const position of [{ x: 36, z: 0 }, GUESTHOUSE.spawn]) {
    const unit = person({ kind: "police", assignment: "report-audio", position });
    const current = world([player(), unit], { revision: 2, reports: [dispatchedReport] });
    assert.deepEqual(selectAudioCues(world(), current, playerId), []);
  }
});

test("crowd gain ignores dead people, distant people, and other entity kinds", () => {
  const snapshot = world([
    player(),
    person({ health: 0 }),
    person({ position: { x: 25, z: 0 } }),
    person({ kind: "police", assignment: null }),
  ]);
  assert.equal(nearbyCrowdGain(snapshot, player()), 0);
});

test("crowd gain fades with distance and never exceeds its cap", () => {
  assert.equal(nearbyCrowdGain(world([person({ position: { x: 12.5, z: 0 } })]), player()), 0.03);
  const crowd = Array.from({ length: 10 }, (_, index) => person({ id: `crowd-${index}` }));
  assert.equal(nearbyCrowdGain(world(crowd), player()), 0.18);
});

test("crowd gain cannot cross the guesthouse boundary", () => {
  const listener = player({ position: GUESTHOUSE.spawn });
  assert.equal(nearbyCrowdGain(world([person({ position: { x: 89, z: 3 } })]), listener), 0);
  assert.equal(nearbyCrowdGain(world([person({ position: GUESTHOUSE.spawn })]), listener), 0.06);
});

test("vehicle ownership alone does not start engine sounds", () => {
  const current = world([player(), vehicle()]);
  assert.deepEqual(
    vehicleAudioEmitters(current, player(), sampleVehicleAudio(current, null, 0)),
    [],
  );
});

test("an occupied car exposes its idle and driving sounds", () => {
  const driver = player({ behavior: { type: "driving", vehicleId: "vehicle-audio" } });
  const current = world([driver, vehicle()]);
  const emitters = vehicleAudioEmitters(current, driver, sampleVehicleAudio(current, null, 0));
  assert.deepEqual(
    emitters.map((entry) => entry.loop),
    ["car-idle", "car-drive"],
  );
});

test("older and duplicate vehicle snapshots preserve the last sample", () => {
  const current = world([vehicle()], { revision: 2 });
  const sample = sampleVehicleAudio(current, null, 0);
  for (const revision of [1, 2])
    assert.equal(sampleVehicleAudio({ ...current, revision }, sample, 100), sample);
});

test("vehicle speed resets after a long gap or a position correction", () => {
  const before = sampleVehicleAudio(world([vehicle()]), null, 0);
  const moved = world([vehicle({ position: { x: 1, z: 0 } })], { revision: 2 });
  const corrected = world([vehicle({ position: { x: 100, z: 0 } })], { revision: 2 });
  assert.ok(sampleVehicleAudio(moved, before, 100).vehicles.get("vehicle-audio").speed > 0);
  assert.equal(sampleVehicleAudio(moved, before, 2500).vehicles.get("vehicle-audio").speed, 0);
  assert.equal(sampleVehicleAudio(corrected, before, 100).vehicles.get("vehicle-audio").speed, 0);
});

test("only the nearest four occupied vehicles receive engine sounds", () => {
  const cars = [5, 1, 4, 3, 2].map((x) => vehicle({ id: `car-${x}`, position: { x, z: 0 } }));
  const drivers = cars.map((car) =>
    person({
      id: `driver-${car.id}`,
      behavior: { type: "driving", vehicleId: car.id },
    }),
  );
  const current = world([player(), ...cars, ...drivers]);
  const emitters = vehicleAudioEmitters(current, player(), sampleVehicleAudio(current, null, 0));
  assert.equal(emitters.length, 8);
  assert.deepEqual(new Set(emitters.map((entry) => entry.position.x)), new Set([1, 2, 3, 4]));
});
