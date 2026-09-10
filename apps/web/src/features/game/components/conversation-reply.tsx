import { KeyReturnIcon } from "@phosphor-icons/react";
import type { ConversationComposer } from "../models/conversation-view";
import { CONVERSATION_MESSAGE_LIMIT } from "../models/conversation-submission";
import { ControlHint } from "../../../ui/game-controls";

/** The draft stays editable while a reply is pending; only Send waits for the reply. */
export function ConversationReply({
  actorName,
  composer,
  canRetry,
  view,
  actions,
}: {
  actorName: string;
  composer: ConversationComposer;
  canRetry: boolean;
  view: "speech" | "history";
  actions: {
    changeDraft: (text: string) => void;
    send: () => void;
    retry: () => void;
    history?: () => void;
    leave?: () => void;
    recover?: (() => void) | undefined;
  };
}) {
  const editable =
    composer.status === "ready" ||
    composer.status === "rejected" ||
    composer.status === "waiting" ||
    composer.status === "sending";
  const sendable = composer.status === "ready" || composer.status === "rejected";
  return (
    <div className="astra-conversation-compose">
      <form
        data-state={composer.status}
        onSubmit={(event) => {
          event.preventDefault();
          actions.send();
        }}
      >
        <textarea
          aria-label={`Message ${actorName}`}
          placeholder={`Say something to ${actorName}…`}
          rows={1}
          maxLength={CONVERSATION_MESSAGE_LIMIT}
          value={composer.draft}
          disabled={!editable}
          autoComplete="off"
          autoFocus
          onChange={(event) => actions.changeDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }}
        />
        <button
          type="submit"
          className="astra-conversation-send"
          aria-label="Send (Enter)"
          title="Send · Enter"
          disabled={!sendable || composer.draft.trim().length === 0}
        >
          <KeyReturnIcon size={20} weight="bold" aria-hidden="true" />
        </button>
      </form>
      <div className="astra-conversation-toolbar">
        <ComposerFeedback composer={composer} canRetry={canRetry} actions={actions} />
        {actions.history && (
          <button type="button" onClick={actions.history} aria-pressed={view === "history"}>
            {view === "history" ? "Back" : "History"}
          </button>
        )}
        {actions.leave && (
          <button type="button" onClick={actions.leave}>
            <ControlHint keys="Esc">Leave</ControlHint>
          </button>
        )}
      </div>
    </div>
  );
}

function ComposerFeedback({
  composer,
  canRetry,
  actions,
}: {
  composer: ConversationComposer;
  canRetry: boolean;
  actions: { retry: () => void; recover?: (() => void) | undefined };
}) {
  if (composer.status === "ready") return <span className="astra-conversation-status" />;
  if (composer.status === "uncertain")
    return (
      <div className="astra-conversation-feedback" role="alert">
        <span>{composer.error}</span>
        <button type="button" onClick={actions.retry} disabled={!canRetry}>
          Retry message
        </button>
        {!canRetry && <span>Reconnect to retry.</span>}
      </div>
    );
  if (composer.status === "rejected")
    return (
      <p className="astra-conversation-feedback" role="alert">
        {composer.error}
      </p>
    );
  if (composer.status === "disabled")
    return (
      <div className="astra-conversation-feedback" role="status">
        <span>{composer.reason}</span>
        {actions.recover && (
          <button type="button" onClick={actions.recover}>
            Review message
          </button>
        )}
      </div>
    );
  // The transcript already shows thinking and streaming; only the send itself is reported here.
  if (composer.status === "waiting") return <span className="astra-conversation-status" />;
  return (
    <p className="astra-conversation-status" role="status">
      Sending…
    </p>
  );
}
