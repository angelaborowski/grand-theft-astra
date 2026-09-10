import type { PlayerAction } from "@gpta/core/actions";
import type { MethodResult } from "@gpta/core/protocol";
import { MOVEMENT, isInsideGuesthouse } from "@gpta/core/scene";
import {
  distance,
  isActor,
  type Player,
  type Entity,
  type EntityId,
  type WorldSnapshot,
} from "@gpta/core/world";
import { useState } from "react";
import { entityDescription } from "../models/game-view";
import { MissionActions, LeaveGuesthouse } from "./mission-actions";
import { ActorMemory } from "./actor-memory";

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
  };
}) {
  const [text, setText] = useState("");
  if (!entity)
    return (
      <section className="interaction-panel panel">
        <p className="empty-copy">Walk toward a person, vehicle, or shop.</p>
      </section>
    );
  const meters = distance(player.position, entity.position);
  const canAct = enabled && meters <= MOVEMENT.interactionRange && result.status !== "pending";
  return (
    <section className="interaction-panel panel" aria-label="Entity interaction">
      <div className="interaction-heading">
        <div>
          <span className="eyebrow">{entity.kind}</span>
          <strong>{entity.name}</strong>
        </div>
        <span>{meters.toFixed(1)} m</span>
      </div>
      <p className="interaction-goal">
        {entity.kind === "vehicle"
          ? entity.ownerId === player.id
            ? "Your car"
            : "Parked vehicle"
          : entityDescription(entity)}
      </p>
      <details className="target-picker">
        <summary>Choose another target</summary>
        <label className="target-select">
          Target
          <select
            aria-label="Interaction target"
            value={entity.id}
            onChange={(event) => {
              const target = snapshot.entities.find((entry) => entry.id === event.target.value);
              if (target) actions.select(target.id);
            }}
          >
            {snapshot.entities
              .filter(
                (entry) =>
                  entry.id !== player.id &&
                  isInsideGuesthouse(entry.position) === isInsideGuesthouse(player.position),
              )
              .map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name} · {distance(player.position, entry.position).toFixed(0)} m
                </option>
              ))}
          </select>
        </label>
      </details>
      {(meters <= MOVEMENT.interactionRange || player.behavior.type === "driving") && (
        <div className="interaction-buttons">
          <MissionActions player={player} entity={entity} enabled={canAct} act={actions.act} />
          <LeaveGuesthouse
            player={player}
            enabled={enabled && result.status !== "pending"}
            act={actions.act}
          />
          {player.behavior.type === "driving" && (
            <button
              className="primary-button"
              disabled={!enabled || result.status === "pending"}
              onClick={() => {
                if (player.behavior.type === "driving")
                  actions.act({ type: "exit_vehicle", targetId: player.behavior.vehicleId });
              }}
            >
              Exit vehicle
            </button>
          )}
          {entity.kind === "vehicle" && player.behavior.type !== "driving" && (
            <button
              className="primary-button"
              disabled={!canAct}
              onClick={() => actions.act({ type: "take_vehicle", targetId: entity.id })}
            >
              Take vehicle
            </button>
          )}
          {isActor(entity) && (
            <button
              disabled={!canAct}
              onClick={() => actions.act({ type: "hit", targetId: entity.id })}
            >
              Hit NPC
            </button>
          )}
          {(entity.kind === "business" || entity.kind === "location") && (
            <button
              disabled={!canAct}
              onClick={() => actions.act({ type: "enter", targetId: entity.id })}
            >
              Enter location
            </button>
          )}
          {entity.kind === "business" && (
            <button
              disabled={!canAct}
              onClick={() => actions.act({ type: "rob", targetId: entity.id })}
            >
              Rob location
            </button>
          )}
        </div>
      )}
      {isActor(entity) && meters <= MOVEMENT.interactionRange && (
        <form
          className="talk-form"
          onSubmit={(event) => {
            event.preventDefault();
            actions.act({ type: "talk", targetId: entity.id, text });
          }}
        >
          <input
            aria-label="Say something"
            placeholder="Say something…"
            maxLength={500}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <button className="primary-button" disabled={!canAct || text.trim().length === 0}>
            Talk
          </button>
        </form>
      )}
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
