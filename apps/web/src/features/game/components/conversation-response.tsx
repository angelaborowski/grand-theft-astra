import type { ConversationEntry } from "../models/conversation-view";
import { DebugDetails } from "../../../ui/debug-details";

/** Saved partial speech remains visible after an interrupted reply. */
export function ConversationResponse({
  actorName,
  response,
}: {
  actorName: string;
  response: ConversationEntry["response"];
}) {
  if (response.status === "queued" || response.status === "thinking")
    return (
      <p className="astra-conversation-status" role="status">
        {actorName} is thinking…
      </p>
    );
  if (response.status === "failed")
    return (
      <div className="astra-conversation-feedback" role="alert">
        <p>No reply. Send another message.</p>
        <DebugDetails message={response.error} />
      </div>
    );
  return (
    <>
      <div
        className="astra-conversation-subtitles"
        role="log"
        aria-live="polite"
        aria-label={`${actorName} says`}
        tabIndex={0}
      >
        <p>{response.text}</p>
      </div>
      {response.status === "interrupted" && (
        <div className="astra-conversation-feedback" role="alert">
          <p>Reply interrupted. Send another message.</p>
          <DebugDetails message={response.error} />
        </div>
      )}
    </>
  );
}
