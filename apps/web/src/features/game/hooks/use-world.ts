import type { PlayerAction } from "@gpta/core/actions";
import type { PlayerCommand } from "@gpta/core/gameplay-v2";
import type { ConversationTurn } from "@gpta/core/conversations";
import type { MethodParams } from "@gpta/core/protocol";
import type { EntityId, Player, WorldSnapshot } from "@gpta/core/world";
import { movementContext } from "../models/player-context";
import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  actionErrorMessage,
  ConnectionError,
  WorldConnection,
  type ConnectionState,
} from "../../../lib/world-connection";
import { sessionQuery, worldQueryKey } from "../queries/world-queries";
import { conversationQueryKey } from "../queries/conversation-queries";
import { mergeConversationTurns } from "../models/conversation-view";
import { PlayerMovement } from "../models/player-movement";

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
  const [movement] = useState(
    () => new PlayerMovement((snapshot) => queryClient.setQueryData(worldQueryKey, snapshot)),
  );
  const movementState = useSyncExternalStore(
    movement.subscribe,
    movement.getSnapshot,
    movement.getSnapshot,
  );
  useEffect(() => {
    if (session.status !== "success") return;
    const url = new URL("/api/world", location.href);
    url.protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const client = new WorldConnection(url.href, {
      snapshot: (snapshot) => {
        const player = snapshot.entities.find(
          (entity): entity is Player =>
            entity.kind === "player" && entity.id === session.data.playerId,
        );
        if (player) movement.observeContext(movementContext(player));
        queryClient.setQueryData(worldQueryKey, snapshot);
      },
      conversation: (turn) =>
        queryClient.setQueryData<ConversationTurn[]>(
          conversationQueryKey(session.data.playerId, turn.actorId),
          (saved) => mergeConversationTurns(saved, [turn]),
        ),
      state: (state) => {
        setConnection(state);
        if (state.status === "connected") {
          const snapshot = queryClient.getQueryData<WorldSnapshot>(worldQueryKey);
          const player = snapshot?.entities.find(
            (entity): entity is Player =>
              entity.kind === "player" && entity.id === session.data.playerId,
          );
          if (player) movement.connect(client, player.id, movementContext(player));
          void queryClient.invalidateQueries({ queryKey: ["conversation"] });
        } else movement.disconnect();
      },
    });
    transport.current = client;
    return () => {
      movement.disconnect();
      client.close();
      transport.current = null;
    };
  }, [session.status, session.data?.playerId, queryClient, movement]);
  const action = useMutation({
    mutationFn: async (input: PlayerAction) => {
      if (!transport.current || connection.status !== "connected")
        throw new ConnectionError("The world is disconnected.");
      const state = movement.getSnapshot();
      if (state.status === "restoring" || state.status === "failed")
        throw new ConnectionError("Restore your position before taking an action.");
      await transport.current.act(input);
    },
  });
  const inspect = useCallback(async (actorId: EntityId) => {
    if (!transport.current) throw new ConnectionError("The world is disconnected.");
    return transport.current.inspect(actorId);
  }, []);
  const command = useMutation({
    mutationFn: async (input: PlayerCommand) => {
      if (!transport.current || connection.status !== "connected")
        throw new ConnectionError("The world is disconnected.");
      const state = movement.getSnapshot();
      if (state.status === "restoring" || state.status === "failed")
        throw new ConnectionError("Restore your position before taking an action.");
      await transport.current.command(input);
    },
  });
  const conversation = useMutation({
    mutationFn: async (params: MethodParams<"conversation.send">) => {
      if (!transport.current) throw new ConnectionError("The world is disconnected.");
      const state = movement.getSnapshot();
      if (state.status === "restoring" || state.status === "failed")
        throw new ConnectionError("Restore your position before taking an action.");
      return transport.current.sendConversation(params);
    },
  });
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
    move: movement.move,
    control: movement.control,
    command,
    movement: {
      state: movementState,
      actions: { move: movement.move, restore: movement.restore },
    },
    action,
    inspect,
    conversation,
    sendConversation: conversation.mutateAsync,
    conversationHistory,
  } as const;
}
