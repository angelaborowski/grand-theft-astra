import type { Player, WorldSnapshot } from "@gpta/core/world";
import { useState } from "react";
import { playerQuests, type QuestEntry } from "../models/quest-view";

/** Quest tracking changes only the destination; it cannot select a conversation recipient. */
export function MissionPanel({
  player,
  snapshot,
  trackedQuestId,
  actions,
}: {
  player: Player;
  snapshot: WorldSnapshot;
  trackedQuestId: QuestEntry["id"] | null;
  actions: { track: (id: QuestEntry["id"] | null) => void };
}) {
  const [selectedId, setSelectedId] = useState<QuestEntry["id"]>("shelter");
  const quests = playerQuests(player);
  const selected = quests.find((quest) => quest.id === selectedId) ?? quests[0];
  const target = snapshot.entities.find((entity) => entity.id === selected.targetId);
  const tracked = trackedQuestId === selected.id;
  return (
    <div className="astra-pause-columns">
      <div className="astra-pause-rows" aria-label="Quests">
        {quests.map((quest) => (
          <button
            key={quest.id}
            className="astra-pause-row"
            aria-pressed={quest.id === selected.id}
            onClick={() => setSelectedId(quest.id)}
          >
            {quest.name}
          </button>
        ))}
      </div>
      <section className="astra-pause-details" aria-label={selected.name}>
        <h2>{selected.objective}</h2>
        <p>{selected.description}</p>
        <dl className="astra-pause-summary">
          {selected.reward && (
            <div>
              <dt>Reward</dt>
              <dd>{selected.reward}</dd>
            </div>
          )}
          {target && (
            <div>
              <dt>Destination</dt>
              <dd>{target.name}</dd>
            </div>
          )}
        </dl>
        {target && (
          <button
            className="astra-pause-row"
            aria-pressed={tracked}
            onClick={() => actions.track(tracked ? null : selected.id)}
          >
            {tracked ? "Stop tracking" : "Start tracking"}
          </button>
        )}
        {selected.targetId !== null && !target && (
          <p className="astra-pause-note">Destination unavailable.</p>
        )}
      </section>
    </div>
  );
}
