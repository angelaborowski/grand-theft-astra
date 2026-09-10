import { on, once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { expect, it } from "vitest";
import { createTestHarness, type TestHarness } from "wrangler";
import WebSocket from "ws";
import { type PlayerAction } from "@gpta/core/actions";
import { methodTable, ServerMessageSchema, SessionSchema, type Request } from "@gpta/core/protocol";
import { GUESTHOUSE, SCENE_IDS, STUNT } from "@gpta/core/scene";
import type { PlayerCommand, PlayerControl } from "@gpta/core/gameplay-v2";
import { MISSION_TERMS, type EntityId, type Position, type WorldSnapshot } from "@gpta/core/world";

async function call(socket: WebSocket, request: Request) {
  const messages = on(socket, "message", { signal: AbortSignal.timeout(5000) });
  socket.send(JSON.stringify(request));
  for await (const [data] of messages) {
    const message = ServerMessageSchema.parse(JSON.parse(String(data)));
    if ("method" in message || message.id !== request.id) continue;
    return message;
  }
  throw new Error("The physics request received no response.");
}

async function snapshot(socket: WebSocket) {
  const response = await call(socket, {
    jsonrpc: "2.0",
    id: crypto.randomUUID(),
    method: "world.get",
    params: {},
  });
  if ("error" in response) throw new Error(response.error.message);
  return methodTable["world.get"].result.parse(response.result);
}

function move(socket: WebSocket, position: Position) {
  return call(socket, {
    jsonrpc: "2.0",
    id: crypto.randomUUID(),
    method: "player.move",
    params: { position },
  });
}

async function act(socket: WebSocket, action: PlayerAction, idempotencyKey = crypto.randomUUID()) {
  const response = await call(socket, {
    jsonrpc: "2.0",
    id: crypto.randomUUID(),
    method: "player.act",
    params: { action, idempotencyKey },
  });
  if ("error" in response) throw new Error(response.error.message);
  return methodTable["player.act"].result.parse(response.result);
}

function command(socket: WebSocket, command: PlayerCommand) {
  return call(socket, {
    jsonrpc: "2.0",
    id: crypto.randomUUID(),
    method: "player.command",
    params: { command, idempotencyKey: crypto.randomUUID() },
  });
}

function control(socket: WebSocket, sequence: number) {
  const params: PlayerControl = {
    sequence,
    forward: 1,
    right: 0,
    cameraYaw: 0,
    cameraPitch: 0,
    run: false,
    aim: false,
    ascend: 0,
    turn: 0,
  };
  return call(socket, {
    jsonrpc: "2.0",
    id: crypto.randomUUID(),
    method: "player.control",
    params,
  });
}

function player(world: WorldSnapshot, id: EntityId) {
  const entity = world.entities.find((candidate) => candidate.id === id);
  if (entity?.kind !== "player") throw new Error("The fixture player does not exist.");
  return entity;
}

async function disconnect(socket: WebSocket) {
  if (socket.readyState === WebSocket.CLOSED) return;
  const closed = once(socket, "close");
  socket.close();
  await closed;
}

async function prepare(server: TestHarness) {
  await server.listen();
  const worker = server.getWorker<Env>();
  const sessions = await Promise.all(
    [0, 1].map(async () => {
      const response = await worker.fetch("/api/session");
      const session = SessionSchema.parse(await response.json());
      const cookie = response.headers.get("set-cookie")?.split(";")[0];
      if (!cookie) throw new Error("The physics session has no cookie.");
      return { ...session, cookie };
    }),
  );
  const session = (index = 0) => {
    const found = sessions[index];
    if (!found) throw new Error("The physics session does not exist.");
    return found;
  };
  const place = async (position: Position = GUESTHOUSE.entrance) => {
    const env = await worker.getEnv();
    const sql = await worker.getDurableObjectStorage("WORLD", { name: env.WORLD_NAME });
    await sql.exec(
      "UPDATE world_entities SET value = json_set(value, '$.position', json(?)) WHERE json_extract(value, '$.kind') = 'player'",
      JSON.stringify(position),
    );
    await sql.exec(
      "UPDATE world_entities SET value = json_set(value, '$.position', json(?), '$.behavior', json(?)) WHERE json_extract(value, '$.id') IN (?, ?, ?)",
      JSON.stringify({ x: 56, z: 64 }),
      JSON.stringify({ type: "idle" }),
      SCENE_IDS.mila,
      SCENE_IDS.lev,
      SCENE_IDS.niko,
    );
    await worker.evictDurableObject("WORLD", { name: env.WORLD_NAME });
  };
  await place();
  const sockets: WebSocket[] = [];
  const connect = async (index = 0) => {
    const { url } = await server.listen();
    const endpoint = new URL("/api/world", url);
    endpoint.protocol = "ws:";
    const socket = new WebSocket(endpoint, "gpta.v1", {
      headers: { cookie: session(index).cookie, origin: url.origin },
    });
    sockets.push(socket);
    await once(socket, "open");
    return socket;
  };
  const restart = async () => {
    await Promise.all(sockets.map(disconnect));
    await server.update((options) => options);
  };
  return { session, place, sockets, connect, restart };
}

const test = it.extend<{ game: Awaited<ReturnType<typeof prepare>> }>({
  game: async ({ task }, use) => {
    const server = createTestHarness({
      workers: [{ configPath: "./wrangler.jsonc", secrets: { OPENAI_API_KEY: "" } }],
    });
    try {
      const game = await prepare(server);
      try {
        await use(game);
      } finally {
        for (const socket of game.sockets) socket.terminate();
      }
    } finally {
      if (task.result?.state === "fail") server.debug();
      await server.close();
    }
  },
});

test("broadcasts accepted movement to an independent session", async ({ game }) => {
  const first = await game.connect();
  const second = await game.connect(1);
  const messages = on(second, "message", { signal: AbortSignal.timeout(5000) });
  await delay(200);
  expect(await move(first, { x: 58, z: 65 })).toHaveProperty("result");
  for await (const [data] of messages) {
    const message = ServerMessageSchema.parse(JSON.parse(String(data)));
    if (!("method" in message) || message.method !== "world.update") continue;
    if (player(message.params.snapshot, game.session().playerId).position.z !== 65) continue;
    expect(player(message.params.snapshot, game.session(1).playerId).position).toEqual(
      GUESTHOUSE.entrance,
    );
    expect(message.params.snapshot.ai.status).toBe("disabled");
    break;
  }
});

test("rejects building collisions and movement into another space", async ({ game }) => {
  await game.place({ x: 51, z: 78 });
  const socket = await game.connect();
  await delay(550);
  expect(await move(socket, { x: 53, z: 78 })).toMatchObject({
    error: { data: { _tag: "ActionRejected" } },
  });
  expect(await move(socket, GUESTHOUSE.spawn)).toMatchObject({
    error: { data: { _tag: "ActionRejected" } },
  });
  expect(player(await snapshot(socket), game.session().playerId).position).toEqual({
    x: 51,
    z: 78,
  });
  expect(await move(socket, { x: 52, z: 78 })).toHaveProperty("result");
});

test("shares movement credit between duplicate player sockets", async ({ game }) => {
  const first = await game.connect();
  const duplicate = await game.connect();
  await delay(550);
  expect(await move(first, { x: 58, z: 67.5 })).toHaveProperty("result");
  expect(await move(duplicate, { x: 58, z: 71 })).toMatchObject({
    error: { data: { _tag: "ActionRejected" } },
  });
  expect(player(await snapshot(duplicate), game.session().playerId).position.z).toBe(67.5);
});

test("accepts controls and rejects client poses or a duplicate controlling socket", async ({
  game,
}) => {
  const first = await game.connect();
  const duplicate = await game.connect();
  expect(await control(first, 0)).toHaveProperty("result");
  await delay(100);
  const next = await control(first, 1);
  expect(next).toMatchObject({ result: { sequence: 1, player: { grounded: true } } });
  expect(player(await snapshot(first), game.session().playerId).position.z).toBeLessThan(64);
  expect(await control(duplicate, 0)).toHaveProperty("error");
  expect(await move(first, GUESTHOUSE.entrance)).toHaveProperty("error");
});

test("gives one helicopter seat to one of two independent sessions", async ({ game }) => {
  await game.place({ x: STUNT.pickup.x + 3, z: STUNT.pickup.z });
  const first = await game.connect();
  const second = await game.connect(1);
  expect(
    await command(first, { type: "enter_vehicle", targetId: SCENE_IDS.helicopter }),
  ).toHaveProperty("result");
  expect(
    await command(second, { type: "enter_vehicle", targetId: SCENE_IDS.helicopter }),
  ).toHaveProperty("error");
  expect(player(await snapshot(second), game.session().playerId).behavior).toEqual({
    type: "driving",
    vehicleId: SCENE_IDS.helicopter,
  });
  expect(await command(first, { type: "exit_vehicle" })).toHaveProperty("result");
});

test.for([
  { route: "direct", targetId: SCENE_IDS.lev, reward: MISSION_TERMS.directReward },
  { route: "niko", targetId: SCENE_IDS.niko, reward: MISSION_TERMS.nikoReward },
])("retains the $route delivery and rented bed after runtime reload", async (route, { game }) => {
  const socket = await game.connect();
  await act(socket, { type: "accept_mission", targetId: SCENE_IDS.mila });
  const key = crypto.randomUUID();
  const delivery = { type: "deliver_parcel" as const, targetId: route.targetId };
  expect(await act(socket, delivery, key)).toEqual(await act(socket, delivery, key));
  await act(socket, { type: "enter", targetId: SCENE_IDS.guesthouse });
  expect(await move(socket, GUESTHOUSE.entrance)).toHaveProperty("error");
  await act(socket, { type: "rent_bed", targetId: SCENE_IDS.irina });
  await game.restart();
  const restored = player(await snapshot(await game.connect()), game.session().playerId);
  expect(restored).toMatchObject({
    mission: { stage: "completed", route: route.route },
    shelter: "rented",
    reputation: 1,
  });
  expect(restored.position).toEqual(GUESTHOUSE.spawn);
  expect(restored.money).toBe(MISSION_TERMS.startingMoney + route.reward - MISSION_TERMS.bedPrice);
});
