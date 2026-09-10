import { parseCookie, stringifySetCookie } from "cookie";
import { problem } from "./failure";

export { World } from "./world";
export { Person } from "./person";
export { AstraDecision } from "./astra-decision";
export { AstraConversation } from "./astra-conversation";

async function tokenHash(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Authenticate once at the Worker; World never trusts player IDs from browser messages. */
export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") return Response.json({ status: "ok" });
    const newSession = url.pathname === "/api/session/new";
    if (request.method !== (newSession ? "POST" : "GET"))
      return problem(
        405,
        newSession ? "Use POST for this endpoint." : "Use GET for this endpoint.",
      );
    const origin = request.headers.get("origin");
    if (origin && origin !== url.origin) return problem(403, "Origin is not allowed.");
    if (newSession && !origin) return problem(403, "Origin is required.");
    const world = env.WORLD.getByName(env.WORLD_NAME);
    try {
      const token = parseCookie(request.headers.get("cookie") ?? "").gpta_session;
      const existingHash = token ? await tokenHash(token) : undefined;
      if (url.pathname === "/api/session/current") {
        const playerId = existingHash ? await world.authenticate(existingHash) : undefined;
        return Response.json(playerId ? { playerId } : null, {
          headers: { "cache-control": "no-store" },
        });
      }
      if (url.pathname === "/api/session" || newSession) {
        const sessionToken =
          !newSession && token && existingHash && (await world.authenticate(existingHash))
            ? token
            : crypto.randomUUID();
        const playerId = await world.createSession(await tokenHash(sessionToken));
        return Response.json(
          { playerId },
          {
            headers: {
              "cache-control": "no-store",
              "set-cookie": stringifySetCookie({
                name: "gpta_session",
                value: sessionToken,
                httpOnly: true,
                sameSite: "lax",
                secure: url.protocol === "https:",
                path: "/",
                maxAge: 60 * 60 * 24 * 30,
              }),
            },
          },
        );
      }
      if (url.pathname !== "/api/world") return problem(404, "Endpoint not found.");
      if (request.headers.get("upgrade")?.toLowerCase() !== "websocket")
        return problem(426, "Use a WebSocket connection.");
      if (!origin || origin !== url.origin) return problem(403, "Origin is not allowed.");
      const protocols = request.headers
        .get("sec-websocket-protocol")
        ?.split(",")
        .map((value) => value.trim());
      if (!protocols?.includes("gpta.v1"))
        return problem(400, "Use the gpta.v1 WebSocket protocol.");
      const playerId = existingHash ? await world.authenticate(existingHash) : undefined;
      if (!playerId) return problem(401, "Create a session before connecting.");
      const forwarded = new Request(request);
      forwarded.headers.set("x-gpta-player-id", playerId);
      return await world.fetch(forwarded);
    } catch (cause) {
      console.error({ event: "request_failed", path: url.pathname, cause });
      return problem(500, "The world could not process the request.");
    }
  },
} satisfies ExportedHandler<Env>;
