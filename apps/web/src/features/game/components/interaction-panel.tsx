import type { PlayerAction } from "@gpta/core/actions";
import type { MethodParams, MethodResult } from "@gpta/core/protocol";
import { MOVEMENT } from "@gpta/core/scene";
import {
  distance,
  isActor,
  type Player,
  type Entity,
  type EntityId,
  type WorldSnapshot,
} from "@gpta/core/world";
import { entityDescription } from "../models/game-view";
import { useConversation } from "../hooks/use-conversation";
import { ActorMemory } from "./actor-memory";
import { ConversationPanel } from "./conversation-panel";
import { InteractionControls } from "./interaction-controls";
import { InteractionTarget } from "./interaction-target";

/** Actions stay disabled until the connection and authoritative distance permit them. */
export function InteractionPanel({
  entity,
  player,
  snapshot,
  enabled,
  result,
  actions,
}: {
  entity: Entity | undefined;
  player: Player;
  snapshot: WorldSnapshot;
  enabled: boolean;
  result: { status: "idle" | "pending" | "success" } | { status: "error"; message: string };
  actions: {
    act: (action: PlayerAction) => void;
    select: (id: EntityId) => void;
    inspect: (id: EntityId) => Promise<MethodResult<"actor.inspect">>;
    sendConversation: (
      input: MethodParams<"conversation.send">,
    ) => Promise<MethodResult<"conversation.send">>;
    conversationHistory: (id: EntityId) => Promise<MethodResult<"conversation.history">>;
  };
}) {
  const meters = entity ? distance(player.position, entity.position) : Infinity;
  const actorId = entity && isActor(entity) && entity.kind !== "player" ? entity.id : null;
  const conversation = useConversation({
    actorId,
    playerId: player.id,
    entities: snapshot.entities,
    connected: enabled,
    available: snapshot.ai.status === "ready",
    inRange: meters <= MOVEMENT.interactionRange,
    services: { send: actions.sendConversation, history: actions.conversationHistory },
  });
  if (!entity)
    return (
      <section className="interaction-panel panel">
        <p className="empty-copy">Walk toward a person, vehicle, or shop.</p>
      </section>
    );
  const canAct = enabled && meters <= MOVEMENT.interactionRange && result.status !== "pending";
  let description = entityDescription(entity);
  if (entity.kind === "vehicle")
    description = entity.ownerId === player.id ? "Your car" : "Parked vehicle";
  return (
    <section className="interaction-panel panel" aria-label="Entity interaction">
      <div className="interaction-heading">
        <div>
          <span className="eyebrow">{entity.kind}</span>
          <strong>{entity.name}</strong>
        </div>
        <span>{meters.toFixed(1)} m</span>
      </div>
      <p className="interaction-goal">{description}</p>
      <details className="target-picker">
        <summary>Choose another target</summary>
        <InteractionTarget
          entity={entity}
          player={player}
          entities={snapshot.entities}
          select={actions.select}
        />
      </details>
      {(meters <= MOVEMENT.interactionRange || player.behavior.type === "driving") && (
        <InteractionControls
          entity={entity}
          player={player}
          enabled={enabled && result.status !== "pending"}
          canAct={canAct}
          act={actions.act}
        />
      )}
      {actorId !== null && <ConversationPanel actorName={entity.name} {...conversation} />}
      {meters > MOVEMENT.interactionRange && (
        <p className="interaction-goal">Move within {MOVEMENT.interactionRange} m to interact.</p>
      )}
      {result.status === "error" && (
        <p role="alert" className="action-error">
          {result.message}
        </p>
      )}
      {result.status === "success" && (
        <p role="status" className="action-result">
          Done.
        </p>
      )}
      <details className="entity-inspector">
        <summary>Inspect entity state</summary>
        <pre>{JSON.stringify(entity, null, 2)}</pre>
      </details>
      <details>
        <summary>Character memory</summary>
        <ActorMemory
          entity={entity}
          snapshot={snapshot}
          enabled={enabled}
          inspect={actions.inspect}
        />
      </details>
    </section>
  );
}
