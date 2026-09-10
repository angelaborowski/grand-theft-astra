import { on, once } from "node:events";
import { createTestHarness } from "wrangler";
import WebSocket from "ws";
import { methodTable, ServerMessageSchema, SessionSchema, type Request } from "@gpta/core/protocol";
import type { ConversationTurn } from "@gpta/core/conversations";
import { SCENE_IDS } from "@gpta/core/scene";
import type { WorldSnapshot } from "@gpta/core/world";

async function call(socket: WebSocket, request: Request) {
  const messages = on(socket, "message", { signal: AbortSignal.timeout(10_000) });
  socket.send(JSON.stringify(request));
  for await (const [data] of messages) {
    const message = ServerMessageSchema.parse(JSON.parse(String(data)));
    if ("method" in message || message.id !== request.id) continue;
    if ("error" in message) throw new Error(message.error.message);
    return message.result;
  }
  throw new Error("The live test request received no response.");
}

async function completeTurn(socket: WebSocket, text: string) {
  const id = crypto.randomUUID();
  const messages = on(socket, "message", { signal: AbortSignal.timeout(140_000) });
  const request: Request = {
    jsonrpc: "2.0",
    id,
    method: "conversation.send",
    params: { actorId: SCENE_IDS.mila, message: text, idempotencyKey: crypto.randomUUID() },
  };
  let streamed = false;
  let prefix = "";
  socket.send(JSON.stringify(request));
  for await (const [data] of messages) {
    const message = ServerMessageSchema.parse(JSON.parse(String(data)));
    if (!("method" in message)) {
      if (message.id === id && "error" in message) throw new Error(message.error.message);
      continue;
    }
    if (message.method !== "conversation.update" || message.params.turn.requestId !== id) continue;
    const turn = message.params.turn;
    const response = turn.response;
    if (response.status === "failed" || response.status === "interrupted")
      throw new Error(response.error);
    if (response.status === "streaming") {
      if (!response.text.startsWith(prefix)) throw new Error("The live speech prefix changed.");
      prefix = response.text;
      streamed ||= prefix.length > 0;
    }
    if (response.status === "completed") return { turn, text: response.text, streamed };
  }
  throw new Error("The live conversation did not complete.");
}

/** Run the production conversation path in an isolated world with no background inference. */
export async function createLiveGame(settings: { key: string; model: string }) {
  const server = createTestHarness({
    workers: [
      {
        configPath: new URL("./wrangler.jsonc", import.meta.url),
        secrets: { OPENAI_API_KEY: settings.key },
        vars: {
          WORLD_NAME: `conversation-live-${crypto.randomUUID()}`,
          OPENAI_MODEL: settings.model,
        },
      },
    ],
  });
  const sockets: WebSocket[] = [];
  try {
    const { url } = await server.listen();
    const worker = server.getWorker<Env>();
    let env = await worker.getEnv();
    const world = env.WORLD.getByName(env.WORLD_NAME);
    const response = await worker.fetch("/api/session");
    const session = SessionSchema.parse(await response.json());
    const cookie = response.headers.get("set-cookie")?.split(";")[0];
    if (!cookie) throw new Error("The live test session has no cookie.");
    const snapshot: WorldSnapshot = await world.snapshot();
    const mila = snapshot.entities.find((entity) => entity.id === SCENE_IDS.mila);
    if (!mila) throw new Error("The live test world has no Mila.");
    const sql = await worker.getDurableObjectStorage("WORLD", { name: env.WORLD_NAME });
    const entities = snapshot.entities.map((entity) =>
      entity.id === session.playerId ? { ...entity, position: mila.position } : entity,
    );
    await sql.exec(
      "UPDATE world SET snapshot = ? WHERE id = 1",
      JSON.stringify({ ...snapshot, entities }),
    );
    await server.update((current) => current);
    env = await worker.getEnv();
    const connect = async () => {
      const endpoint = new URL("/api/world", url);
      endpoint.protocol = "ws:";
      const socket = new WebSocket(endpoint, "gpta.v1", {
        headers: { cookie, origin: url.origin },
      });
      sockets.push(socket);
      await once(socket, "open", { signal: AbortSignal.timeout(10_000) });
      return socket;
    };
    let socket = await connect();
    const personName = `${env.WORLD_NAME}:${SCENE_IDS.mila}`;
    return {
      message: (text: string) => completeTurn(socket, text),
      history: async (): Promise<ConversationTurn[]> =>
        methodTable["conversation.history"].result.parse(
          await call(socket, {
            jsonrpc: "2.0",
            id: crypto.randomUUID(),
            method: "conversation.history",
            params: { actorId: SCENE_IDS.mila },
          }),
        ),
      reconnect: async () => {
        const closed = once(socket, "close", { signal: AbortSignal.timeout(10_000) });
        socket.close();
        await closed;
        await server.update((current) => current);
        env = await worker.getEnv();
        socket = await connect();
      },
      rememberedTurns: async () =>
        (await env.PERSON.getByName(personName).encounters(session.playerId)).map(
          (encounter) => encounter.turn_id,
        ),
      close: async () => {
        for (const connection of sockets) connection.terminate();
        await server.close();
      },
    };
  } catch (cause) {
    for (const socket of sockets) socket.terminate();
    await server.close();
    throw cause;
  }
}
