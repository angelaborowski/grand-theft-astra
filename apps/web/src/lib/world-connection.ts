import { methodTable, PROTOCOL, PublicErrorSchema, ServerMessageSchema } from "@gpta/core/protocol";
import type { PlayerAction } from "@gpta/core/actions";
import type { MethodResult } from "@gpta/core/protocol";
import type { EntityId, Position, WorldSnapshot } from "@gpta/core/world";
import { JSONRPCClient, JSONRPCErrorException } from "json-rpc-2.0";
import ReconnectingWebSocket from "reconnecting-websocket";

/** Transport failure is separate from an action rejected by world rules. */
export class ConnectionError extends Error {
  readonly _tag = "ConnectionError";
  constructor(message: string) {
    super(message);
    this.name = "ConnectionError";
  }
}

/** Connection readiness requires a restored snapshot, not only an open socket. */
export type ConnectionState =
  | { status: "connecting" }
  | { status: "connected" }
  | { status: "disconnected"; message: string };
type Handlers = {
  snapshot: (snapshot: WorldSnapshot) => void;
  state: (state: ConnectionState) => void;
};

/** The libraries own reconnection and request correlation; this adapter owns schema validation. */
export class WorldConnection {
  private readonly socket: ReconnectingWebSocket;
  private readonly rpc: JSONRPCClient;
  private disposed = false;

  constructor(
    url: string,
    private readonly handlers: Handlers,
  ) {
    this.socket = new ReconnectingWebSocket(url, PROTOCOL, {
      maxEnqueuedMessages: 0,
      minReconnectionDelay: 500,
      maxReconnectionDelay: 5000,
    });
    this.rpc = new JSONRPCClient((request: unknown) => {
      if (this.socket.readyState !== WebSocket.OPEN)
        throw new ConnectionError("The world is disconnected.");
      this.socket.send(JSON.stringify(request));
    });
    this.socket.addEventListener("open", this.open);
    this.socket.addEventListener("message", this.receive);
    this.socket.addEventListener("close", this.disconnected);
    this.socket.addEventListener("error", this.disconnected);
  }

  private readonly open = () => {
    this.handlers.state({ status: "connecting" });
    void this.snapshot()
      .then((snapshot) => {
        if (this.disposed) return;
        this.handlers.snapshot(snapshot);
        this.handlers.state({ status: "connected" });
      })
      .catch(() => {
        if (!this.disposed)
          this.handlers.state({
            status: "disconnected",
            message: "The world snapshot could not load. Reconnect to try again.",
          });
      });
  };

  private readonly receive = (event: MessageEvent) => {
    try {
      const data: unknown = JSON.parse(String(event.data));
      const message = ServerMessageSchema.parse(data);
      if ("method" in message) this.handlers.snapshot(message.params.snapshot);
      else this.rpc.receive(message);
    } catch {
      this.handlers.state({
        status: "disconnected",
        message: "The server sent an invalid world update. Reload after updating both apps.",
      });
      this.socket.close(1002, "Invalid world message");
    }
  };

  private readonly disconnected = () => {
    this.rpc.rejectAllPendingRequests("The world disconnected.");
    this.handlers.state({
      status: "disconnected",
      message: "Connection lost. Actions are paused while the game reconnects.",
    });
  };

  /** Read a full snapshot after a connection opens. */
  async snapshot(): Promise<WorldSnapshot> {
    const result: unknown = await this.rpc.timeout(10000).request("world.get", {});
    return methodTable["world.get"].result.parse(result);
  }

  /** Read the selected person's actual Durable Object memory through the existing socket. */
  async inspect(actorId: EntityId): Promise<MethodResult<"actor.inspect">> {
    const result: unknown = await this.rpc.timeout(10000).request("actor.inspect", { actorId });
    return methodTable["actor.inspect"].result.parse(result);
  }

  /** Movement completes when the World accepts the sampled position. */
  async move(position: Position): Promise<void> {
    const result: unknown = await this.rpc.timeout(5000).request("player.move", { position });
    methodTable["player.move"].result.parse(result);
  }

  /** Each user action receives one stable idempotency key for this attempt. */
  async act(action: PlayerAction): Promise<void> {
    const result: unknown = await this.rpc
      .timeout(15000)
      .request("player.act", { idempotencyKey: crypto.randomUUID(), action });
    methodTable["player.act"].result.parse(result);
  }

  /** Release subscriptions before closing, including during React effect replay. */
  close(): void {
    this.disposed = true;
    this.socket.removeEventListener("open", this.open);
    this.socket.removeEventListener("message", this.receive);
    this.socket.removeEventListener("close", this.disconnected);
    this.socket.removeEventListener("error", this.disconnected);
    this.socket.close();
    this.rpc.rejectAllPendingRequests("The connection closed.");
  }
}

/** Only validated public error messages appear in the game. */
export function actionErrorMessage(error: unknown): string {
  if (error instanceof JSONRPCErrorException) {
    const payload = PublicErrorSchema.safeParse(error.data);
    if (payload.success) return payload.data.message;
  }
  if (error instanceof ConnectionError) return error.message;
  return "The action could not complete. Check the connection and try again.";
}
