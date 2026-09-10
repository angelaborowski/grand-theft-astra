import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { liveConfiguration } from "./configuration";
import { createLiveGame } from "./game";

const configuration = liveConfiguration();
describe.skipIf(configuration.status === "disabled")("live NPC conversation", () => {
  let game: Awaited<ReturnType<typeof createLiveGame>>;
  let first: Awaited<ReturnType<typeof game.message>>;

  beforeAll(async () => {
    if (configuration.status === "enabled") game = await createLiveGame(configuration);
  });
  afterAll(async () => {
    if (game) await game.close();
  });

  it("streams a reply through the Worker, WebSocket, and real Astra Workflow", async () => {
    first = await game.message(
      "Hello, Mila. My favorite color is cobalt blue. Please remember that detail about me.",
    );
    expect(first.streamed).toBe(true);
    expect(first.text.trim().length).toBeGreaterThan(0);
    expect(await game.history()).toContainEqual(first.turn);
    expect(await game.rememberedTurns()).toContain(first.turn.id);
  });

  it("restores history and remembers details after reconnect and runtime reload", async () => {
    await game.reconnect();
    expect(await game.history()).toContainEqual(first.turn);
    expect(await game.rememberedTurns()).toContain(first.turn.id);
    const reply = await game.message("What favorite color did I tell you earlier?");
    expect(reply.streamed).toBe(true);
    expect(reply.text.toLowerCase()).toContain("cobalt");
    expect((await game.history()).map((turn) => turn.id)).toEqual([first.turn.id, reply.turn.id]);
  });
});
