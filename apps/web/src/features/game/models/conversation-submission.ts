import type { ConversationTurn, TurnId } from "@gpta/core/conversations";
import type { MethodParams } from "@gpta/core/protocol";
import type { EntityId } from "@gpta/core/world";
import type { ConversationComposer } from "./conversation-view";

export const CONVERSATION_MESSAGE_LIMIT = 2000;
export type ConversationAttempt = MethodParams<"conversation.send">;
export type ConversationDrafts = ReadonlyMap<EntityId, string>;
export type ConversationSubmission =
  | { status: "idle" }
  | { status: "sending"; attempt: ConversationAttempt; actorName: string }
  | { status: "accepted"; attempt: ConversationAttempt; actorName: string; turnId: TurnId }
  | {
      status: "uncertain" | "rejected";
      attempt: ConversationAttempt;
      actorName: string;
      error: string;
    };

/** An acknowledgement clears only the draft that produced that exact message. */
export function clearAcceptedDraft(
  drafts: ConversationDrafts,
  attempt: ConversationAttempt,
): ConversationDrafts {
  if (drafts.get(attempt.actorId)?.trim() !== attempt.message) return drafts;
  const next = new Map(drafts);
  next.delete(attempt.actorId);
  return next;
}

/** Each person keeps a separate draft while the game session remains mounted. */
export function changeConversationDraft(
  drafts: ConversationDrafts,
  actorId: EntityId,
  text: string,
): ConversationDrafts {
  const next = new Map(drafts);
  next.set(actorId, text.slice(0, CONVERSATION_MESSAGE_LIMIT));
  return next;
}

/** Retry repeats the original attempt even when its recipient has left range. */
export function retryConversationAttempt(
  submission: ConversationSubmission,
  connected: boolean,
): ConversationAttempt | null {
  if (submission.status !== "uncertain" || !connected) return null;
  return submission.attempt;
}

/** Only the local player's saved turn can supply active conversation subtitles. */
export function latestPlayerTurn(
  turns: ConversationTurn[],
  playerId: EntityId,
): ConversationTurn | null {
  return turns.findLast((turn) => turn.playerId === playerId) ?? null;
}

export function conversationComposer({
  actorId,
  text,
  connected,
  movementReady,
  available,
  inRange,
  pending,
  submission,
}: {
  actorId: EntityId | null;
  text: string;
  connected: boolean;
  movementReady: boolean;
  available: boolean;
  inRange: boolean;
  pending: boolean;
  submission: ConversationSubmission;
}): ConversationComposer {
  if (submission.status === "uncertain" && submission.attempt.actorId === actorId)
    return {
      status: "uncertain",
      draft: submission.attempt.message,
      error: "Message not confirmed. Retry checks the same message.",
    };
  if (!connected)
    return { status: "disabled", draft: text, reason: "Connection lost. Reconnecting…" };
  if (
    submission.status !== "idle" &&
    submission.attempt.actorId !== actorId &&
    (pending || submission.status === "uncertain")
  )
    return {
      status: "disabled",
      draft: text,
      reason: `Finish your message to ${submission.actorName}.`,
    };
  if (!available || actorId === null)
    return { status: "disabled", draft: text, reason: "Conversation unavailable." };
  if (!movementReady) return { status: "disabled", draft: text, reason: "Movement unavailable." };
  if (!inRange) return { status: "disabled", draft: text, reason: "Move closer." };
  if (submission.status === "sending") return { status: "sending", draft: text };
  if (pending) return { status: "waiting", draft: text };
  if (submission.status === "rejected" && submission.attempt.actorId === actorId)
    return { status: "rejected", draft: text, error: submission.error };
  return { status: "ready", draft: text };
}
