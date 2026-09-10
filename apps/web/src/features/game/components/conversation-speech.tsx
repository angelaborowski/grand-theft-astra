import type { ConversationTurn } from "@gpta/core/conversations";
import { isActor, type Entity, type EntityId } from "@gpta/core/world";
import { useQuery } from "@tanstack/react-query";
import { conversationQueryKey } from "../queries/conversation-queries";

/** The scene overlay reads the same public turn as the transcript, including unfinished speech. */
export function ConversationSpeech({
  entity,
  playerId,
}: {
  entity: Entity | undefined;
  playerId: EntityId;
}) {
  const actorId = entity && isActor(entity) && entity.kind !== "player" ? entity.id : null;
  const query = useQuery<ConversationTurn[]>({
    queryKey: conversationQueryKey(playerId, actorId),
    enabled: false,
    staleTime: Infinity,
  });
  if (!actorId || !entity || query.status !== "success") return null;
  const turn = query.data.at(-1);
  if (!turn) return null;
  const response = turn.response;
  if (response.status === "failed") return null;
  let text: string;
  if (response.status === "queued") text = "Waiting…";
  else if (response.status === "thinking") text = "Thinking…";
  else text = response.text;
  return (
    <section className="dialogue-panel panel" aria-label={`${entity.name} speaking`}>
      <span className="eyebrow">{entity.name}</span>
      <p>{text}</p>
      {response.status === "interrupted" && <p className="action-error">Reply interrupted.</p>}
    </section>
  );
}
