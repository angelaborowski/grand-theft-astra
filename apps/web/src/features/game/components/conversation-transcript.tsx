import type { ConversationHistory } from "../models/conversation-view";
import type { ConversationCharacter } from "../hooks/use-conversation";
import { DebugDetails } from "../../../ui/debug-details";
import { ConversationResponse } from "./conversation-response";

/** History preserves every saved turn without enlarging the conversation area. */
export function ConversationTranscript({
  actorName,
  character,
  history,
  reload,
}: {
  actorName: string;
  character: ConversationCharacter | null;
  history: ConversationHistory;
  reload: () => void;
}) {
  if (history.status === "pending") return <p role="status">Loading conversation…</p>;
  return (
    <div className="astra-conversation-history" tabIndex={0} aria-label="Conversation history">
      {character && <CharacterCard character={character} />}
      {history.status === "failed" && (
        <div className="astra-conversation-feedback">
          <p role="alert">Conversation unavailable.</p>
          <button type="button" onClick={reload}>
            Retry history
          </button>
          <DebugDetails message={history.error} />
        </div>
      )}
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

/** The card shows game facts about the person; the reply below is what Astra says as them. */
function CharacterCard({ character }: { character: ConversationCharacter }) {
  return (
    <section className="astra-conversation-character" aria-label={`About ${character.name}`}>
      <p className="astra-conversation-character-kicker">
        <span>{character.job}</span>
        {character.aiDriven && <span className="astra-conversation-character-ai">Astra · AI</span>}
      </p>
      <p>{character.story}</p>
      <p className="astra-conversation-character-meta">
        Wants: {character.desire}
        <br />
        {character.talks === 0
          ? "You have not talked before."
          : `You have talked ${character.talks} ${character.talks === 1 ? "time" : "times"}. They remember.`}
      </p>
    </section>
  );
}
