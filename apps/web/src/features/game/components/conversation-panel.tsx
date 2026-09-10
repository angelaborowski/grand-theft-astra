import type { ConversationComposer, ConversationHistory } from "../models/conversation-view";
import { ConversationTranscript } from "./conversation-transcript";

/** Free text replaces dialogue choices; only server-confirmed replies enter the transcript. */
export function ConversationPanel({
  actorName,
  history,
  composer,
  actions,
}: {
  actorName: string;
  history: ConversationHistory;
  composer: ConversationComposer;
  actions: {
    changeDraft: (text: string) => void;
    send: () => void;
    retry: () => void;
    reload: () => void;
  };
}) {
  const disabled = composer.status !== "ready" && composer.status !== "rejected";
  return (
    <section className="conversation-panel" aria-label={`Conversation with ${actorName}`}>
      <div className="conversation-heading">
        <strong>Conversation</strong>
        <span className="eyebrow">WITH {actorName}</span>
      </div>
      <ConversationTranscript actorName={actorName} history={history} reload={actions.reload} />
      <form
        className="talk-form"
        onSubmit={(event) => {
          event.preventDefault();
          actions.send();
        }}
      >
        <input
          aria-label={`Message ${actorName}`}
          placeholder={`Say anything to ${actorName}…`}
          maxLength={2000}
          value={composer.draft}
          disabled={disabled}
          autoComplete="off"
          onChange={(event) => actions.changeDraft(event.target.value)}
        />
        <button
          className="primary-button"
          disabled={disabled || composer.draft.trim().length === 0}
        >
          Send
        </button>
      </form>
      {composer.status === "sending" && (
        <p className="conversation-status" role="status">
          Sending…
        </p>
      )}
      {composer.status === "disabled" && (
        <p className="conversation-status" role="status">
          {composer.reason}
        </p>
      )}
      {composer.status === "rejected" && (
        <p className="action-error" role="alert">
          {composer.error}
        </p>
      )}
      {composer.status === "uncertain" && (
        <div className="conversation-retry">
          <p className="action-error" role="alert">
            {composer.error}
          </p>
          <button onClick={actions.retry}>Retry message</button>
        </div>
      )}
    </section>
  );
}
