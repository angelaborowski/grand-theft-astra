import { useEffect, useEffectEvent } from "react";
import { MOVEMENT, SCENE_IDS } from "@gpta/core/scene";
import { distance, isActor, type EntityId } from "@gpta/core/world";
import { useConversation } from "../hooks/use-conversation";
import type { ReadyWorld } from "./game-session";
import { InteractionPanel } from "./interaction-panel";
import { ConversationRecovery } from "./conversation-recovery";
import { actionErrorMessage } from "../../../lib/world-connection";

/** Keep mounted so closing a view cannot discard a draft or an unresolved send. */
export function GameInteraction({
  active,
  world,
  actorId,
  actions,
}: {
  active: boolean;
  world: ReadyWorld;
  actorId: EntityId | null;
  actions: {
    close: () => void;
    recover: (actorId: EntityId) => void;
    recovery: (active: boolean) => void;
  };
}) {
  const { snapshot, player, connection } = world;
  const person = snapshot.entities.find(
    (entity) => entity.id === actorId && isActor(entity) && entity.kind !== "player",
  );
  const connected = connection.status === "connected";
  const movementReady =
    world.movement.state.status === "ready" || world.movement.state.status === "submitting";
  const conversation = useConversation({
    actorId,
    playerId: player.id,
    entities: snapshot.entities,
    connected,
    movementReady,
    available: snapshot.ai.status === "ready" && person !== undefined,
    inRange:
      person !== undefined &&
      distance(player.position, person.position) <= MOVEMENT.interactionRange,
    services: { send: world.sendConversation, history: world.conversationHistory },
  });
  const notice = !active && conversation.recovery !== null;
  const mission =
    person?.id === SCENE_IDS.mila &&
    player.stunt?.stage !== "running" &&
    player.stunt?.stage !== "completed"
      ? {
          enabled:
            connected &&
            movementReady &&
            player.behavior.type !== "driving" &&
            distance(player.position, person.position) <= MOVEMENT.interactionRange &&
            world.action.status !== "pending" &&
            world.command.status !== "pending",
          start: () => world.action.mutate({ type: "start_stunt", targetId: SCENE_IDS.mila }),
        }
      : null;
  const reportRecovery = useEffectEvent(actions.recovery);
  useEffect(() => {
    if (!notice) reportRecovery(false);
    return () => reportRecovery(false);
  }, [notice]);
  if (active)
    return (
      <>
        <InteractionPanel
          conversation={conversation}
          {...(mission ? { mission } : {})}
          actions={{ close: actions.close, recover: actions.recover }}
        />
        {world.action.status === "error" && (
          <div className="astra-conversation-recovery" role="alert">
            {actionErrorMessage(world.action.error)}
          </div>
        )}
      </>
    );
  if (conversation.recovery === null) return null;
  return (
    <ConversationRecovery
      submission={conversation.recovery}
      actions={{ open: actions.recover, focus: actions.recovery }}
    />
  );
}
