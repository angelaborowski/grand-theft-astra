import { characterProfile } from "@gpta/core/characters";
import type { ConversationTurn } from "@gpta/core/conversations";
import { isActor, type Entity, type EntityId } from "@gpta/core/world";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { actionErrorMessage, conversationSendRejected } from "../../../lib/world-connection";
import {
  conversationPending,
  mergeConversationTurns,
  type ConversationHistory,
} from "../models/conversation-view";
import {
  changeConversationDraft,
  clearAcceptedDraft,
  conversationComposer,
  latestPlayerTurn,
  retryConversationAttempt,
  type ConversationAttempt,
  type ConversationDrafts,
  type ConversationSubmission,
} from "../models/conversation-submission";
import { conversationQuery, conversationQueryKey } from "../queries/conversation-queries";

/** Who the player is talking to: stable identity from the world, not from generated speech. */
export type ConversationCharacter = {
  name: string;
  job: string;
  story: string;
  desire: string;
  talks: number;
};

/** Drafts and unresolved sends survive closing the view; saved turns own reply progress. */
export function useConversation({
  actorId,
  playerId,
  entities,
  connected,
  movementReady,
  available,
  inRange,
  services,
}: {
  actorId: EntityId | null;
  playerId: EntityId;
  entities: Entity[];
  connected: boolean;
  movementReady: boolean;
  available: boolean;
  inRange: boolean;
  services: {
    send: (attempt: ConversationAttempt) => Promise<ConversationTurn>;
    history: (id: EntityId) => Promise<ConversationTurn[]>;
  };
}) {
  const client = useQueryClient();
  const [drafts, setDrafts] = useState<ConversationDrafts>(() => new Map());
  const [submission, setSubmission] = useState<ConversationSubmission>({ status: "idle" });
  const query = useQuery({
    ...conversationQuery(playerId, actorId, services.history, client),
    enabled: connected && actorId !== null,
  });
  const submittedActor = submission.status === "idle" ? null : submission.attempt.actorId;
  const submittedHistory = useQuery({
    ...conversationQuery(playerId, submittedActor, services.history, client),
    enabled: connected && submittedActor !== null && submittedActor !== actorId,
  });
  const submittedTurns = submittedActor === actorId ? query.data : submittedHistory.data;
  const accepted =
    submission.status === "accepted"
      ? submittedTurns?.find((turn) => turn.id === submission.turnId)
      : undefined;
  const pending =
    submission.status === "sending" ||
    (submission.status === "accepted" && (!accepted || conversationPending(accepted)));
  const ownPending =
    query.data?.some((turn) => turn.playerId === playerId && conversationPending(turn)) === true;
  const text = actorId === null ? "" : (drafts.get(actorId) ?? "");
  const actorName =
    entities.find((entity) => entity.id === actorId)?.name ??
    (submission.status !== "idle" && submission.attempt.actorId === actorId
      ? submission.actorName
      : "Conversation");

  async function submit(attempt: ConversationAttempt, recipientName: string) {
    setSubmission({ status: "sending", attempt, actorName: recipientName });
    try {
      const turn = await services.send(attempt);
      client.setQueryData<ConversationTurn[]>(
        conversationQueryKey(playerId, turn.actorId),
        (saved) => mergeConversationTurns(saved, [turn]),
      );
      setSubmission({ status: "accepted", attempt, actorName: recipientName, turnId: turn.id });
      setDrafts((current) => clearAcceptedDraft(current, attempt));
    } catch (error) {
      setSubmission({
        status: conversationSendRejected(error) ? "rejected" : "uncertain",
        attempt,
        actorName: recipientName,
        error: actionErrorMessage(error),
      });
    }
  }
  const actions = {
    changeDraft: (value: string) => {
      if (actorId !== null)
        setDrafts((current) => changeConversationDraft(current, actorId, value));
    },
    send: () => {
      if (
        actorId === null ||
        !connected ||
        !movementReady ||
        !available ||
        !inRange ||
        pending ||
        ownPending ||
        submission.status === "uncertain" ||
        text.trim().length === 0
      )
        return;
      void submit(
        { actorId, message: text.trim(), idempotencyKey: crypto.randomUUID() },
        actorName,
      );
    },
    retry: () => {
      const attempt = retryConversationAttempt(submission, connected);
      if (attempt && submission.status !== "idle") void submit(attempt, submission.actorName);
    },
    reload: () => {
      void query.refetch();
    },
  };
  const turns = (query.data ?? []).map((turn) => ({
    id: turn.id,
    playerName:
      turn.playerId === playerId
        ? "You"
        : (entities.find((entity) => entity.id === turn.playerId)?.name ?? "Another player"),
    message: turn.message,
    response: turn.response,
  }));
  let history: ConversationHistory;
  if (query.status === "pending") history = { status: "pending" };
  else if (query.status === "error")
    history = { status: "failed", error: actionErrorMessage(query.error), turns };
  else history = { status: "ready", turns };
  const speech = latestPlayerTurn(query.data ?? [], playerId);
  const actor = entities.find((entity) => entity.id === actorId);
  let character: ConversationCharacter | null = null;
  if (actor && isActor(actor) && actor.kind !== "player") {
    const profile = characterProfile(actor);
    character = {
      name: actor.name,
      job: actor.job,
      story: profile.story,
      desire: profile.desire,
      talks: (query.data ?? []).filter((turn) => turn.playerId === playerId).length,
    };
  }
  const composer = conversationComposer({
    actorId,
    text,
    connected,
    movementReady,
    available,
    inRange,
    pending: pending || ownPending,
    submission,
  });
  const unresolved = submission.status === "sending" || submission.status === "uncertain";
  return {
    actorName,
    character,
    history,
    composer,
    speech: speech?.response ?? null,
    actions,
    recovery: unresolved ? submission : null,
    canRetry: connected,
  };
}
