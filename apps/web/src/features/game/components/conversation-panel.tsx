import type {
  ConversationComposer,
  ConversationEntry,
  ConversationHistory,
} from "../models/conversation-view";
import { ConversationTranscript } from "./conversation-transcript";
import { ConversationResponse } from "./conversation-response";
import { ConversationReply } from "./conversation-reply";

/** Current speech and History share one lower area and one unchanged reply draft. */
export function ConversationPanel({
  actorName,
  history,
  composer,
  speech = null,
  view = "speech",
  canRetry = true,
  mission,
  actions,
}: {
  actorName: string;
  history: ConversationHistory;
  composer: ConversationComposer;
  speech?: ConversationEntry["response"] | null;
  view?: "speech" | "history";
  canRetry?: boolean;
  mission?: { enabled: boolean; start: () => void };
  actions: {
    changeDraft: (text: string) => void;
    send: () => void;
    retry: () => void;
    reload: () => void;
    history?: () => void;
    leave?: () => void;
    recover?: (() => void) | undefined;
  };
}) {
  return (
    <section className="astra-conversation" aria-label={`Conversation with ${actorName}`}>
      <div className="astra-conversation-speech">
        <strong className="astra-conversation-speaker">{actorName}</strong>
        {mission && (
          <button type="button" disabled={!mission.enabled} onClick={mission.start}>
            Start Last Flight · ₽250
          </button>
        )}
        {view === "history" ? (
          <ConversationTranscript actorName={actorName} history={history} reload={actions.reload} />
        ) : (
          <>
            {speech !== null && <ConversationResponse actorName={actorName} response={speech} />}
            {history.status === "pending" && speech === null && (
              <p role="status">Loading conversation…</p>
            )}
            {history.status === "failed" && (
              <div className="astra-conversation-feedback" role="alert">
                <span>Conversation unavailable.</span>
                <button type="button" onClick={actions.reload}>
                  Retry history
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <ConversationReply
        actorName={actorName}
        composer={composer}
        canRetry={canRetry}
        view={view}
        actions={actions}
      />
    </section>
  );
}
