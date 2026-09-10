import { SessionSchema } from "@gpta/core/protocol";
import { queryOptions } from "@tanstack/react-query";
import { ConnectionError } from "../../../lib/world-connection";

/** The HttpOnly session cookie supplies player identity to the WebSocket handshake. */
export const sessionQuery = queryOptions({
  queryKey: ["session"],
  queryFn: async () => {
    const response = await fetch("/api/session");
    if (!response.ok)
      throw new ConnectionError(
        "The simulation server is unavailable. Start both apps with pnpm dev.",
      );
    const value: unknown = await response.json();
    return SessionSchema.parse(value);
  },
  staleTime: Infinity,
});

/** The WebSocket writes snapshots to this cache; no second transport polls world state. */
export const worldQueryKey = ["world"] as const;

/** Checking Continue never creates a player or replaces its cookie. */
export async function savedSession() {
  const response = await fetch("/api/session/current");
  if (!response.ok) throw new ConnectionError("Your saved game could not load. Try again.");
  const value: unknown = await response.json();
  return SessionSchema.nullable().parse(value);
}

export const savedSessionQuery = queryOptions({
  queryKey: ["saved-session"],
  queryFn: savedSession,
  retry: false,
});

/** The server creates the new player before the game opens. */
export async function newSession() {
  const response = await fetch("/api/session/new", { method: "POST" });
  if (!response.ok) throw new ConnectionError("The new game could not start. Try again.");
  const value: unknown = await response.json();
  return SessionSchema.parse(value);
}
