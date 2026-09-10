import type { ConversationEntry, ConversationHistory } from "../models/conversation-view";

function Reply({
  actorName,
  response,
}: {
  actorName: string;
  response: ConversationEntry["response"];
}) {
  if (response.status === "queued")
    return (
      <p className="conversation-status" role="status">
        Waiting for {actorName}…
      </p>
    );
  if (response.status === "thinking")
    return (
      <p className="conversation-status" role="status">
        {actorName} is thinking…
      </p>
    );
  if (response.status === "failed")
    return (
      <p className="action-error" role="alert">
        {response.error}
      </p>
    );
  return (
    <div className="conversation-reply">
      <strong>{actorName}</strong>
      <p>{response.text}</p>
      {response.status === "streaming" && (
        <span className="conversation-status" role="status">
          Speaking…
        </span>
      )}
      {response.status === "interrupted" && (
        <p className="action-error" role="alert">
          Reply interrupted. {response.error}
        </p>
      )}
    </div>
  );
}

/** A reverse flex wrapper follows new speech while the browser preserves manual scroll position. */
export function ConversationTranscript({
  actorName,
  history,
  reload,
}: {
  actorName: string;
  history: ConversationHistory;
  reload: () => void;
}) {
  if (history.status === "pending")
    return (
      <p className="conversation-status" role="status">
        Loading conversation…
      </p>
    );
  if (history.status === "failed")
    return (
      <div className="conversation-retry">
        <p className="action-error" role="alert">
          {history.error}
        </p>
        <button onClick={reload}>Reload conversation</button>
      </div>
    );
  if (history.turns.length === 0)
    return (
      <p className="empty-copy">
        Start a conversation. Ask about their life, work, or something on your mind.
      </p>
    );
  return (
    <div className="conversation-scroll">
      <ol
        className="conversation-transcript"
        aria-label="Conversation messages"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {history.turns.map((turn) => (
          <li key={turn.id} className="conversation-turn">
            <div className="conversation-question">
              <strong>{turn.playerName}</strong>
              <p>{turn.message}</p>
            </div>
            <Reply actorName={actorName} response={turn.response} />
          </li>
        ))}
      </ol>
    </div>
  );
}
