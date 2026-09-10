import type { PlayerAction } from "@gpta/core/actions";
import type { ConversationTurn } from "@gpta/core/conversations";
import type { MethodParams } from "@gpta/core/protocol";
import type { EntityId, Player, Position, WorldSnapshot } from "@gpta/core/world";
import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  actionErrorMessage,
  ConnectionError,
  WorldConnection,
  type ConnectionState,
} from "../../../lib/world-connection";
import { sessionQuery, worldQueryKey } from "../queries/world-queries";
import { conversationQueryKey } from "../queries/conversation-queries";
import { mergeConversationTurns } from "../models/conversation-view";

/** The hook exposes one screen state and owns the lifetime of its only WebSocket. */
export function useWorld() {
  const queryClient = useQueryClient();
  const session = useQuery(sessionQuery);
  const world = useQuery<WorldSnapshot>({
    queryKey: worldQueryKey,
    queryFn: skipToken,
    enabled: false,
    staleTime: Infinity,
  });
  const [connection, setConnection] = useState<ConnectionState>({ status: "connecting" });
  const transport = useRef<WorldConnection | null>(null);
  useEffect(() => {
    if (session.status !== "success") return;
    const url = new URL("/api/world", location.href);
    url.protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const client = new WorldConnection(url.href, {
      snapshot: (snapshot) => queryClient.setQueryData(worldQueryKey, snapshot),
      conversation: (turn) =>
        queryClient.setQueryData<ConversationTurn[]>(
          conversationQueryKey(session.data.playerId, turn.actorId),
          (saved) => mergeConversationTurns(saved, [turn]),
        ),
      state: (state) => {
        setConnection(state);
        if (state.status === "connected")
          void queryClient.invalidateQueries({ queryKey: ["conversation"] });
      },
    });
    transport.current = client;
    return () => {
      client.close();
      transport.current = null;
    };
  }, [session.status, session.data?.playerId, queryClient]);
  const move = useCallback(async (position: Position) => {
    if (!transport.current) throw new ConnectionError("The world is disconnected.");
    await transport.current.move(position);
  }, []);
  const action = useMutation({
    mutationFn: async (input: PlayerAction) => {
      if (!transport.current || connection.status !== "connected")
        throw new ConnectionError("The world is disconnected.");
      await transport.current.act(input);
    },
  });
  const inspect = useCallback(async (actorId: EntityId) => {
    if (!transport.current) throw new ConnectionError("The world is disconnected.");
    return transport.current.inspect(actorId);
  }, []);
  const sendConversation = useCallback(async (params: MethodParams<"conversation.send">) => {
    if (!transport.current) throw new ConnectionError("The world is disconnected.");
    return transport.current.sendConversation(params);
  }, []);
  const conversationHistory = useCallback(async (actorId: EntityId) => {
    if (!transport.current) throw new ConnectionError("The world is disconnected.");
    return transport.current.conversationHistory(actorId);
  }, []);
  if (session.status === "error")
    return {
      status: "failed",
      message: actionErrorMessage(session.error),
      retry: () => {
        void session.refetch();
      },
    } as const;
  if (session.status === "pending")
    return { status: "pending", stage: "Loading your player…", connection } as const;
  if (world.status === "pending")
    return { status: "pending", stage: "Restoring the city…", connection } as const;
  if (world.status === "error")
    return {
      status: "failed",
      message: "The world snapshot is unavailable.",
      retry: () => location.reload(),
    } as const;
  const player = world.data.entities.find(
    (entity): entity is Player => entity.id === session.data.playerId && entity.kind === "player",
  );
  if (!player)
    return {
      status: "failed",
      message: "The world does not contain this player.",
      retry: () => location.reload(),
    } as const;
  return {
    status: "ready",
    snapshot: world.data,
    player,
    connection,
    move,
    action,
    inspect,
    sendConversation,
    conversationHistory,
  } as const;
}
