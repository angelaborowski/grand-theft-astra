import type { MethodResult } from "@gpta/core/protocol";
import { isActor, type Entity, type EntityId, type WorldSnapshot } from "@gpta/core/world";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { actionErrorMessage } from "../../../lib/world-connection";

/** Memory comes from the selected person's Durable Object, through the existing WebSocket. */
export function ActorMemory({
  entity,
  snapshot,
  enabled,
  inspect,
}: {
  entity: Entity;
  snapshot: WorldSnapshot;
  enabled: boolean;
  inspect: (id: EntityId) => Promise<MethodResult<"actor.inspect">>;
}) {
  const [open, setOpen] = useState(false);
  const actor = isActor(entity) && entity.kind !== "player";
  const decision = snapshot.decisions.findLast((entry) => entry.actorId === entity.id);
  const query = useQuery({
    queryKey: ["actor-memory", entity.id, decision?.id, decision?.status],
    queryFn: () => inspect(entity.id),
    enabled: actor && enabled && open,
    staleTime: 5000,
  });
  if (!actor) return null;
  const observations = snapshot.observations
    .filter((entry) => entry.actorId === entity.id)
    .slice(-3);
  return (
    <details
      className="entity-inspector actor-memory"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>Inspect actor memory</summary>
      <p>
        <strong>Current action:</strong> {entity.behavior.type}
      </p>
      <p>
        <strong>Latest decision:</strong> {decision ? decision.status : "No decision recorded"}
      </p>
      {query.status === "pending" && <p>Loading saved memory…</p>}
      {query.status === "error" && <p role="alert">{actionErrorMessage(query.error)}</p>}
      {query.status === "success" && (
        <>
          <p>
            <strong>Decisions:</strong> {query.data.sequence} · <strong>Pending trigger:</strong>{" "}
            {query.data.pendingTrigger ?? "None"}
          </p>
          {query.data.memory.length === 0 ? (
            <p>No saved decisions yet.</p>
          ) : (
            query.data.memory
              .slice(-3)
              .map((memory) => <p key={memory.decisionId}>{memory.summary}</p>)
          )}
        </>
      )}
      <p>
        <strong>Recent observations</strong>
      </p>
      {observations.length === 0 ? (
        <p>No observations recorded.</p>
      ) : (
        <ul>
          {observations.map((observation) => (
            <li key={`${observation.eventId}:${observation.actorId}`}>{observation.text}</li>
          ))}
        </ul>
      )}
    </details>
  );
}
