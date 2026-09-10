import { BrainIcon, BroadcastIcon, ClockIcon, UsersIcon } from "@phosphor-icons/react";

/** A readable projection of a persisted world event. */
export type ActivityItem = {
  id: string;
  time: string;
  title: string;
  detail: string;
  source: "astra" | "simulation" | "player";
};
/** A decision keeps its actual state visible while routines continue. */
export type DecisionItem = {
  id: string;
  actor: string;
  status: "pending" | "completed" | "failed" | "disabled";
  detail: string;
};

/** Display connection state and counts supplied by the world. */
export function StatusBar({
  connection,
  time,
  population,
  active,
}: {
  connection: "connecting" | "connected" | "disconnected";
  time: string;
  population: number;
  active: number;
}) {
  return (
    <div className="status-bar">
      <span className={`connection ${connection}`}>
        <BroadcastIcon size={15} />
        {connection}
      </span>
      <span>
        <ClockIcon size={15} />
        {time}
      </span>
      <span>
        <UsersIcon size={15} />
        {population.toLocaleString("en-US")} people <small>{active} active</small>
      </span>
    </div>
  );
}

/** Show accepted events and asynchronous decisions without claiming scripted actions are AI output. */
export function ActivityPanel({
  events,
  decisions,
  mode,
}: {
  events: ActivityItem[];
  decisions: DecisionItem[];
  mode: string;
}) {
  return (
    <section className="panel activity-panel" aria-label="City activity">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">UNDER THE SURFACE</span>
          <h2>City activity</h2>
        </div>
        <span className="live-dot" />
      </div>
      <div className="intelligence-mode">
        <BrainIcon size={17} />
        <span>{mode}</span>
      </div>
      <div className="decision-list">
        {decisions.slice(0, 3).map((decision) => (
          <div className="decision" key={decision.id}>
            <span className={`decision-state ${decision.status}`}>{decision.status}</span>
            <strong>{decision.actor}</strong>
            <p>{decision.detail}</p>
          </div>
        ))}
      </div>
      <ol className="event-list">
        {events.slice(0, 8).map((event) => (
          <li key={event.id}>
            <span className={`event-marker ${event.source}`} />
            <div>
              <div className="event-meta">
                <span>{event.source}</span>
                <time>{event.time}</time>
              </div>
              <h3>{event.title}</h3>
              <p>{event.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      {events.length === 0 && (
        <p className="empty-copy">Explore the square. Your actions create events here.</p>
      )}
      <div className="panel-footnote">Action → observation → decision → consequence</div>
    </section>
  );
}

/** Present dialogue as saved speech from the world. */
export function DialoguePanel({
  messages,
}: {
  messages: { id: string; speaker: string; text: string }[];
}) {
  if (messages.length === 0) return null;
  return (
    <section className="dialogue-panel panel" aria-label="Conversation" aria-live="polite">
      <span className="eyebrow">OVERHEARD IN THE SQUARE</span>
      {messages.slice(-2).map((message) => (
        <p key={message.id}>
          <strong>{message.speaker}</strong>
          <span>{message.text}</span>
        </p>
      ))}
    </section>
  );
}
