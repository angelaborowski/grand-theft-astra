import type { ConversationHistory } from "../models/conversation-view";
import { DebugDetails } from "../../../ui/debug-details";
import { ConversationResponse } from "./conversation-response";

/** History preserves every saved turn without enlarging the conversation area. */
export function ConversationTranscript({
  actorName,
  history,
  reload,
}: {
  actorName: string;
  history: ConversationHistory;
  reload: () => void;
}) {
  if (history.status === "pending") return <p role="status">Loading conversation…</p>;
  return (
    <div className="astra-conversation-history" tabIndex={0} aria-label="Conversation history">
      {history.status === "failed" && (
        <div className="astra-conversation-feedback">
          <p role="alert">Conversation unavailable.</p>
          <button type="button" onClick={reload}>
            Retry history
          </button>
          <DebugDetails message={history.error} />
        </div>
      )}
      {history.status === "ready" && history.turns.length === 0 && <p>No saved conversation.</p>}
      <ol>
        {history.turns.map((turn) => (
          <li key={turn.id}>
            <div className="astra-conversation-question">
              <strong>{turn.playerName}</strong>
              <p>{turn.message}</p>
            </div>
            <strong>{actorName}</strong>
            <ConversationResponse actorName={actorName} response={turn.response} />
          </li>
        ))}
      </ol>
    </div>
  );
}
