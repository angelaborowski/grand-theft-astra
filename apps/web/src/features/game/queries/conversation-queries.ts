import type { ConversationTurn } from "@gpta/core/conversations";
import type { EntityId } from "@gpta/core/world";
import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { mergeConversationTurns } from "../models/conversation-view";

/** Player identity scopes overheard speech and personal history in the browser cache. */
export const conversationQueryKey = (playerId: EntityId, actorId: EntityId | null) =>
  ["conversation", playerId, actorId] as const;

/** Merge the final history read with notifications received while that read was pending. */
export function conversationQuery(
  playerId: EntityId,
  actorId: EntityId | null,
  history: (id: EntityId) => Promise<ConversationTurn[]>,
  client: QueryClient,
) {
  const queryKey = conversationQueryKey(playerId, actorId);
  return queryOptions({
    queryKey,
    queryFn: async () => {
      if (actorId === null) return [];
      const turns = await history(actorId);
      return mergeConversationTurns(client.getQueryData<ConversationTurn[]>(queryKey), turns);
    },
    staleTime: 0,
  });
}
