import type { ConversationTurn } from "@gpta/core/conversations";

/** The transcript contains public speech and safe system status only. */
export type ConversationEntry = {
  id: string;
  playerName: string;
  message: string;
  response: ConversationTurn["response"];
};

/** A history request never hides loading or a failed restore behind an empty transcript. */
export type ConversationHistory =
  | { status: "pending" }
  | { status: "failed"; error: string }
  | { status: "ready"; turns: ConversationEntry[] };

/** An uncertain send retains its text and its original attempt until the player retries. */
export type ConversationComposer =
  | { status: "ready" | "sending" | "waiting"; draft: string }
  | { status: "uncertain" | "rejected"; draft: string; error: string }
  | { status: "disabled"; draft: string; reason: string };

/** Older history and replayed notifications cannot replace newer streamed speech. */
export function mergeConversationTurns(
  current: ConversationTurn[] = [],
  incoming: ConversationTurn[],
): ConversationTurn[] {
  const turns = new Map(current.map((turn) => [turn.id, turn]));
  for (const turn of incoming) {
    const saved = turns.get(turn.id);
    if (!saved || turn.revision > saved.revision) turns.set(turn.id, turn);
  }
  return [...turns.values()].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}

/** Queued and partial replies keep the composer busy until the saved turn is terminal. */
export function conversationPending(turn: ConversationTurn): boolean {
  return (
    turn.response.status === "queued" ||
    turn.response.status === "thinking" ||
    turn.response.status === "streaming"
  );
}
