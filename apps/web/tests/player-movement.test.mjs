import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MovementRestoreError,
  PlayerMovement,
} from "../src/features/game/models/player-movement.ts";

const playerId = "player:test";
const position = { x: 39, z: 83 };
const snapshot = { revision: 1, entities: [{ id: playerId, kind: "player", position }] };
function fixture(transport) {
  const received = [];
  const movement = new PlayerMovement((value) => received.push(value));
  movement.connect(transport, playerId, "district:walking");
  return { movement, received };
}

test("a rejected move restores once without repeating movement", async () => {
  let sends = 0;
  let reads = 0;
  const { movement, received } = fixture({
    move: async () => {
      sends += 1;
      throw new Error("rejected");
    },
    snapshot: async () => {
      reads += 1;
      return snapshot;
    },
  });
  assert.deepEqual(await movement.move({ x: 1000, z: 0 }), { status: "corrected", position });
  assert.deepEqual(
    [sends, reads, received.length, movement.getSnapshot().status],
    [1, 1, 1, "ready"],
  );
});

test("a pending operation suppresses duplicate submissions", async () => {
  const pending = Promise.withResolvers();
  let sends = 0;
  const { movement } = fixture({
    move: () => {
      sends += 1;
      return pending.promise;
    },
  });
  const first = movement.move(position);
  assert.equal(movement.getSnapshot().status, "submitting");
  assert.deepEqual(await movement.move(position), { status: "superseded" });
  pending.resolve();
  assert.deepEqual(await first, { status: "accepted" });
  assert.equal(sends, 1);
});

test("failed restoration blocks movement until an explicit successful read", async () => {
  let available = false;
  let sends = 0;
  const { movement } = fixture({
    move: async () => {
      sends += 1;
      throw new Error("rejected");
    },
    snapshot: async () => {
      if (!available) throw new Error("offline");
      return snapshot;
    },
  });
  await assert.rejects(movement.move(position), MovementRestoreError);
  assert.equal(movement.getSnapshot().status, "failed");
  assert.deepEqual(await movement.move(position), { status: "superseded" });
  available = true;
  await movement.restore();
  assert.deepEqual([sends, movement.getSnapshot().status], [1, "ready"]);
});

test("a reconnect discards the old restoration response", async () => {
  const read = Promise.withResolvers();
  const { movement, received } = fixture({
    move: async () => {
      throw new Error("rejected");
    },
    snapshot: () => read.promise,
  });
  const result = movement.move(position);
  await Promise.resolve();
  movement.disconnect();
  movement.connect(
    { move: async () => {}, snapshot: async () => snapshot },
    playerId,
    "district:walking",
  );
  read.resolve({ ...snapshot, revision: 999 });
  assert.deepEqual(await result, { status: "superseded" });
  assert.equal(received.length, 0);
  assert.equal(movement.getSnapshot().status, "ready");
});

test("a space transition discards an earlier movement rejection", async () => {
  const pending = Promise.withResolvers();
  const { movement } = fixture({ move: () => pending.promise });
  const result = movement.move(position);
  movement.observeContext("guesthouse:walking");
  pending.reject(new Error("old movement"));
  assert.deepEqual(await result, { status: "superseded" });
  assert.equal(movement.getSnapshot().status, "ready");
});
