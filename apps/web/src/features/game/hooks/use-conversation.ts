import type { ConversationTurn, TurnId } from "@gpta/core/conversations";
import type { MethodParams } from "@gpta/core/protocol";
import type { Entity, EntityId } from "@gpta/core/world";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { actionErrorMessage, conversationSendRejected } from "../../../lib/world-connection";
import {
  conversationPending,
  mergeConversationTurns,
  type ConversationComposer,
  type ConversationHistory,
} from "../models/conversation-view";
import { conversationQuery, conversationQueryKey } from "../queries/conversation-queries";

type Attempt = MethodParams<"conversation.send">;
type Submission =
  | { status: "idle" }
  | { status: "sending"; attempt: Attempt }
  | { status: "accepted"; attempt: Attempt; turnId: TurnId }
  | { status: "uncertain" | "rejected"; attempt: Attempt; error: string };

/** The accepted turn owns reply progress; transport failures retain one retryable send attempt. */
export function useConversation({
  actorId,
  playerId,
  entities,
  connected,
  available,
  inRange,
  services,
}: {
  actorId: EntityId | null;
  playerId: EntityId;
  entities: Entity[];
  connected: boolean;
  available: boolean;
  inRange: boolean;
  services: {
    send: (attempt: Attempt) => Promise<ConversationTurn>;
    history: (id: EntityId) => Promise<ConversationTurn[]>;
  };
}) {
  const client = useQueryClient();
  const [draft, setDraft] = useState({ actorId, text: "" });
  const [submission, setSubmission] = useState<Submission>({ status: "idle" });
  const query = useQuery({
    ...conversationQuery(playerId, actorId, services.history, client),
    enabled: connected && actorId !== null,
  });
  const submittedActor = submission.status === "idle" ? null : submission.attempt.actorId;
  const submittedHistory = useQuery({
    ...conversationQuery(playerId, submittedActor, services.history, client),
    enabled: connected && submittedActor !== null && submittedActor !== actorId,
  });
  const accepted =
    submission.status === "accepted"
      ? submittedHistory.data?.find((turn) => turn.id === submission.turnId)
      : undefined;
  const pending =
    submission.status === "sending" ||
    (submission.status === "accepted" && (!accepted || conversationPending(accepted)));
  const ownPending =
    query.data?.some((turn) => turn.playerId === playerId && conversationPending(turn)) === true;
  const text = draft.actorId === actorId ? draft.text : "";

  const submit = async (attempt: Attempt) => {
    setSubmission({ status: "sending", attempt });
    try {
      const turn = await services.send(attempt);
      client.setQueryData<ConversationTurn[]>(
        conversationQueryKey(playerId, turn.actorId),
        (saved) => mergeConversationTurns(saved, [turn]),
      );
      setSubmission({ status: "accepted", attempt, turnId: turn.id });
      setDraft((current) =>
        current.actorId === attempt.actorId ? { actorId: current.actorId, text: "" } : current,
      );
    } catch (error) {
      setSubmission({
        status: conversationSendRejected(error) ? "rejected" : "uncertain",
        attempt,
        error: actionErrorMessage(error),
      });
    }
  };
  const actions = {
    changeDraft: (value: string) => setDraft({ actorId, text: value }),
    send: () => {
      if (
        !actorId ||
        !connected ||
        !available ||
        !inRange ||
        pending ||
        ownPending ||
        submission.status === "uncertain" ||
        text.trim().length === 0
      )
        return;
      void submit({ actorId, message: text.trim(), idempotencyKey: crypto.randomUUID() });
    },
    retry: () => {
      if (submission.status !== "uncertain" || !connected || !available) return;
      void submit(submission.attempt);
    },
    reload: () => {
      void query.refetch();
    },
  };
  let history: ConversationHistory;
  if (query.status === "pending") history = { status: "pending" };
  else if (query.status === "error")
    history = { status: "failed", error: actionErrorMessage(query.error) };
  else
    history = {
      status: "ready",
      turns: query.data.map((turn) => ({
        id: turn.id,
        playerName:
          turn.playerId === playerId
            ? "You"
            : (entities.find((entity) => entity.id === turn.playerId)?.name ?? "Another player"),
        message: turn.message,
        response: turn.response,
      })),
    };
  const composer = composerState({
    actorId,
    submittedName:
      entities.find((entity) => entity.id === submittedActor)?.name ?? "the other person",
    text,
    connected,
    available,
    inRange,
    pending: pending || ownPending,
    submission,
  });
  return { history, composer, actions };
}

function composerState({
  actorId,
  submittedName,
  text,
  connected,
  available,
  inRange,
  pending,
  submission,
}: {
  actorId: EntityId | null;
  submittedName: string;
  text: string;
  connected: boolean;
  available: boolean;
  inRange: boolean;
  pending: boolean;
  submission: Submission;
}): ConversationComposer {
  if (!connected)
    return {
      status: "disabled",
      draft: text,
      reason: "Connection lost. Conversations resume after reconnecting.",
    };
  if (!available)
    return {
      status: "disabled",
      draft: text,
      reason: "Astra disabled. Conversations are unavailable.",
    };
  if (
    submission.status !== "idle" &&
    submission.attempt.actorId !== actorId &&
    (pending || submission.status === "uncertain")
  )
    return {
      status: "disabled",
      draft: text,
      reason: `Select ${submittedName} to finish your current conversation.`,
    };
  if (submission.status === "uncertain")
    return {
      status: "uncertain",
      draft: submission.attempt.message,
      error: `${submission.error} Retry checks the same message.`,
    };
  if (!inRange) return { status: "disabled", draft: text, reason: "Move closer to speak." };
  if (submission.status === "sending") return { status: "sending", draft: text };
  if (pending) return { status: "waiting", draft: text };
  if (submission.status === "rejected" && submission.attempt.actorId === actorId)
    return { status: "rejected", draft: text, error: submission.error };
  return { status: "ready", draft: text };
}
