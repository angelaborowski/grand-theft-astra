import type { ConversationCharacter } from "../hooks/use-conversation";

/** Game facts about the person, kept apart from what they say. */
export function CharacterCard({ character }: { character: ConversationCharacter }) {
  const [givenName = "", familyName = ""] = character.name.split(" · ")[0]?.split(" ") ?? [];
  const initials = `${givenName.charAt(0)}${familyName.charAt(0)}`.toUpperCase();
  const known = character.talks > 0;
  return (
    <aside className="astra-character" aria-label={`About ${character.name}`}>
      <div className="astra-character-medallion" aria-hidden="true">
        {initials}
      </div>
      <div className="astra-character-identity">
        <strong>{character.name.split(" · ")[0]}</strong>
        <span className="astra-character-job">{character.job}</span>
      </div>
      <p className="astra-character-story">{character.story}</p>
      <dl className="astra-character-facts">
        <dt>Wants</dt>
        <dd>{character.desire}</dd>
        <dt>You</dt>
        <dd data-known={known}>
          {known
            ? `${character.talks} ${character.talks === 1 ? "talk" : "talks"} · remembers you`
            : "Stranger"}
        </dd>
      </dl>
    </aside>
  );
}
