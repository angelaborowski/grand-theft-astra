import { on, once } from "node:events";
import { expect, it } from "vitest";
import { createTestHarness, type TestHarness } from "wrangler";
import WebSocket from "ws";
import { methodTable, ServerMessageSchema, SessionSchema, type Request } from "@gpta/core/protocol";
import { SCENE_IDS, stuntVehicleId } from "@gpta/core/scene";
import { EntityIdSchema, type WorldSnapshot } from "@gpta/core/world";

async function call(socket: WebSocket, request: Request) {
  const messages = on(socket, "message", { signal: AbortSignal.timeout(5000) });
  socket.send(JSON.stringify(request));
  for await (const [data] of messages) {
    const message = ServerMessageSchema.parse(JSON.parse(String(data)));
    if ("method" in message || message.id !== request.id) continue;
    if ("error" in message) throw new Error(message.error.message);
    return message.result;
  }
  throw new Error("The test request received no response.");
}

async function submit(socket: WebSocket, message = "Hello, Mila.", key = crypto.randomUUID()) {
  return methodTable["conversation.send"].result.parse(
    await call(socket, {
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method: "conversation.send",
      params: { actorId: SCENE_IDS.mila, message, idempotencyKey: key },
    }),
  );
}

async function history(socket: WebSocket) {
  return methodTable["conversation.history"].result.parse(
    await call(socket, {
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method: "conversation.history",
      params: { actorId: SCENE_IDS.mila },
    }),
  );
}

async function prepare(server: TestHarness) {
  const { url } = await server.listen();
  const worker = server.getWorker<Env>();
  const env = await worker.getEnv();
  const world = env.WORLD.getByName(env.WORLD_NAME);
  const sessions = await Promise.all(
    [0, 1].map(async () => {
      const response = await worker.fetch("/api/session");
      const session = SessionSchema.parse(await response.json());
      const cookie = response.headers.get("set-cookie")?.split(";")[0];
      if (!cookie) throw new Error("The test session has no cookie.");
      return { ...session, cookie };
    }),
  );
  const sql = await worker.getDurableObjectStorage("WORLD", { name: env.WORLD_NAME });
  const reload = async () => {
    await server.update((current) => current);
    const env = await worker.getEnv();
    const world = env.WORLD.getByName(env.WORLD_NAME);
    const sql = await worker.getDurableObjectStorage("WORLD", { name: env.WORLD_NAME });
    return { env, world, sql };
  };
  const runtime = { env, world, sql };
  const sockets: WebSocket[] = [];
  const connect = async (index = 0) => {
    const session = sessions[index];
    if (!session) throw new Error("The test session does not exist.");
    const endpoint = new URL("/api/world", url);
    endpoint.protocol = "ws:";
    const socket = new WebSocket(endpoint, "gpta.v1", {
      headers: { cookie: session.cookie, origin: url.origin },
    });
    sockets.push(socket);
    await once(socket, "open");
    return socket;
  };
  // Use acknowledged game actions: direct SQL edits can race the World's live alarm.
  for (let index = 0; index < sessions.length; index++) {
    const session = sessions[index];
    if (!session) throw new Error("Missing fixture session");
    const socket = await connect(index);
    const act = (type: "launch_stunt" | "exit_vehicle", targetId: string) =>
      call(socket, {
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method: "player.act",
        params: {
          idempotencyKey: crypto.randomUUID(),
          action: { type, targetId: EntityIdSchema.parse(targetId) },
        },
      });
    await act("launch_stunt", SCENE_IDS.mila);
    await act("exit_vehicle", stuntVehicleId(session.playerId));
    for (let step = 0; step < 80; step++) {
      const snapshot: WorldSnapshot = await world.snapshot();
      const player = snapshot.entities.find((entity) => entity.id === session.playerId);
      const mila = snapshot.entities.find((entity) => entity.id === SCENE_IDS.mila);
      if (!player || !mila) throw new Error("Missing fixture actors");
      const dx = mila.position.x - player.position.x,
        dz = mila.position.z - player.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 2) break;
      if (step === 79) throw new Error("Could not walk fixture player to Mila");
      await new Promise((resolve) => setTimeout(resolve, 200));
      await call(socket, {
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method: "player.move",
        params: {
          position: { x: player.position.x + dx / distance, z: player.position.z + dz / distance },
        },
      });
    }
    socket.close();
    await once(socket, "close");
  }
  return { worker, ...runtime, sessions, sockets, connect, reload };
}

const test = it.extend<{ game: Awaited<ReturnType<typeof prepare>> }>({
  game: async ({ onTestFailed }, use) => {
    const server = createTestHarness({
      workers: [{ configPath: "./wrangler.jsonc", secrets: { OPENAI_API_KEY: "" } }],
    });
    onTestFailed(() => server.debug());
    try {
      const game = await prepare(server);
      try {
        await use(game);
      } finally {
        for (const socket of game.sockets) socket.terminate();
      }
    } finally {
      await server.close();
    }
  },
});

test("saves one turn for duplicate submissions with the same player key", async ({ game }) => {
  const socket = await game.connect();
  const key = crypto.randomUUID();
  const first = await submit(socket, "Hello, Mila.", key);
  const repeated = await submit(socket, "Hello, Mila.", key);
  expect(repeated.id).toBe(first.id);
  expect(first.response.status).toBe("failed");
  expect(await game.sql.exec("SELECT COUNT(*) AS count FROM conversation_turns")).toEqual([
    { count: 1 },
  ]);
  expect((await history(socket)).map((turn) => turn.id)).toEqual([first.id]);
});

test("keeps queued player messages attributed and excludes later context", async ({ game }) => {
  const firstSocket = await game.connect();
  const first = await submit(firstSocket, "My first question.");
  firstSocket.close();
  await once(firstSocket, "close");
  const secondSocket = await game.connect(1);
  const second = await submit(secondSocket, "A different player's question.");
  await game.sql.exec(
    "UPDATE conversation_turns SET response = ?",
    JSON.stringify({ status: "queued" }),
  );
  await game.sql.exec(
    "UPDATE conversation_turns SET response = ? WHERE id = ?",
    JSON.stringify({ status: "thinking" }),
    first.id,
  );
  expect((await history(secondSocket)).map((turn) => turn.id)).toEqual([second.id]);
  expect(first.playerId).not.toBe(second.playerId);
  expect((await game.world.conversationContext(first.id)).history).toEqual([]);
});

test("retains completed speech and Person memory after reload", async ({ game }) => {
  const socket = await game.connect();
  const turn = await submit(socket);
  await game.sql.exec(
    "UPDATE conversation_turns SET response = ? WHERE id = ?",
    JSON.stringify({ status: "thinking" }),
    turn.id,
  );
  await game.world.conversationContext(turn.id);
  expect(await game.world.beginConversationSpeech(turn.id)).toBe(true);
  expect(await game.world.appendConversationSpeech(turn.id, 0, "I remember your delivery.")).toBe(
    true,
  );
  await game.world.completeConversation(turn.id);
  const restarted = await game.reload();
  const personName = `${game.env.WORLD_NAME}:${SCENE_IDS.mila}`;
  expect((await history(await game.connect()))[0]?.response).toEqual({
    status: "completed",
    text: "I remember your delivery.",
  });
  expect(await restarted.env.PERSON.getByName(personName).encounters(turn.playerId)).toMatchObject([
    { turn_id: turn.id, reply: "I remember your delivery." },
  ]);
});
