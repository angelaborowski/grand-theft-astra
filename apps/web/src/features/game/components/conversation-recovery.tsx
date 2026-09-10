import type { EntityId } from "@gpta/core/world";
import type { ConversationSubmission } from "../models/conversation-submission";

/** An inactive notice keeps the original send reachable without taking world input until focused. */
export function ConversationRecovery({
  submission,
  actions,
}: {
  submission: Extract<ConversationSubmission, { status: "sending" | "uncertain" | "rejected" }>;
  actions: { open: (actorId: EntityId) => void; focus: (active: boolean) => void };
}) {
  return (
    <aside
      className="astra-conversation-recovery"
      aria-label="Unconfirmed conversation message"
      onFocus={() => actions.focus(true)}
      onBlur={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        )
          actions.focus(false);
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        if (event.target instanceof HTMLElement) event.target.blur();
        actions.focus(false);
      }}
    >
      <p role="status">
        {submission.status === "sending"
          ? `Sending to ${submission.actorName}…`
          : `Message to ${submission.actorName} not confirmed.`}
      </p>
      <button type="button" onClick={() => actions.open(submission.attempt.actorId)}>
        Review message
      </button>
    </aside>
  );
}
