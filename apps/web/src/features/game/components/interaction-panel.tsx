import { useState } from "react";
import type { EntityId } from "@gpta/core/world";
import { GameDialog } from "../../../ui/game-dialog";
import type { useConversation } from "../hooks/use-conversation";
import { ConversationPanel } from "./conversation-panel";

/** Conversation owns a locked recipient; physical actions remain in the world. */
export function InteractionPanel({
  conversation,
  mission,
  actions,
}: {
  conversation: ReturnType<typeof useConversation>;
  mission?: { enabled: boolean; start: () => void };
  actions: { close: () => void; recover: (actorId: EntityId) => void };
}) {
  const [historyOpen, setHistoryOpen] = useState(true);
  return (
    <GameDialog
      title={`Conversation with ${conversation.actorName}`}
      className="astra-conversation-dialog"
      actions={{ close: () => (historyOpen ? setHistoryOpen(false) : actions.close()) }}
    >
      <ConversationPanel
        actorName={conversation.actorName}
        {...(mission ? { mission } : {})}
        history={conversation.history}
        composer={conversation.composer}
        speech={conversation.speech}
        view={historyOpen ? "history" : "speech"}
        canRetry={conversation.canRetry}
        actions={{
          ...conversation.actions,
          history: () => setHistoryOpen(!historyOpen),
          leave: actions.close,
          recover:
            conversation.recovery === null
              ? undefined
              : () => {
                  if (conversation.recovery) actions.recover(conversation.recovery.attempt.actorId);
                },
        }}
      />
    </GameDialog>
  );
}
