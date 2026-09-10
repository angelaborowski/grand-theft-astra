import { MapTrifoldIcon } from "@phosphor-icons/react";
import type { EntityId } from "@gpta/core/world";
import { useState } from "react";
import { ActivityPanel, StatusBar } from "../../../ui/game-panels";
import { actionErrorMessage } from "../../../lib/world-connection";
import { useWorld } from "../hooks/use-world";
import { activityView, gameTime, selectedEntity } from "../models/game-view";
import { GameScene } from "./game-scene";
import { InteractionPanel } from "./interaction-panel";
import { Minimap } from "./minimap";
import { StuntObjective } from "./stunt-objective";
import { MissionPanel } from "./mission-panel";
import { isInsideGuesthouse } from "@gpta/core/scene";
import { ConversationSpeech } from "./conversation-speech";

/** This composition keeps scene, interaction, and inspector views on the same accepted snapshot. */
export default function Game() {
  const world = useWorld();
  const [selectedId, setSelectedId] = useState<EntityId | null>(null);
  const [overview, setOverview] = useState(false);
  const [journal, setJournal] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  if (world.status === "failed")
    return (
      <main className="loading-screen">
        <h1>GPTA</h1>
        <p role="alert">{world.message}</p>
        <button onClick={world.retry}>Reconnect</button>
      </main>
    );
  if (world.status === "pending")
    return (
      <main className="loading-screen">
        <div className="brand-mark">G</div>
        <h1>GPTA</h1>
        <p>{world.stage}</p>
        <span className="eyebrow">2 / 3 · GAME → PLAYER → SCENE</span>
        {world.connection.status === "disconnected" && (
          <>
            <p role="alert">{world.connection.message}</p>
            <button onClick={() => location.reload()}>Reconnect</button>
          </>
        )}
      </main>
    );
  const { snapshot, player, connection, action } = world;
  const showOverview = overview && !isInsideGuesthouse(player.position);
  const entity = selectedEntity(snapshot, player, selectedId);
  const view = activityView(snapshot);
  const result =
    action.status === "error"
      ? { status: "error" as const, message: actionErrorMessage(action.error) }
      : { status: action.status };
  return (
    <main className="game-shell immersive-game">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">G</div>
          <h1>GPTA</h1>
        </div>
        <button
          className="journal-toggle"
          aria-expanded={journal}
          onClick={() => setJournal(!journal)}
        >
          {journal ? "Close journal" : "Journal"}
        </button>
        <StatusBar
          connection={connection.status}
          time={gameTime(snapshot.time)}
          population={snapshot.population.total}
          active={snapshot.population.activeIds.length}
        />
      </header>
      <div className="game-layout">
        <section className="scene-wrap" aria-label="Playable Red Square">
          <GameScene
            snapshot={snapshot}
            player={player}
            enabled={connection.status === "connected"}
            overview={showOverview}
            selectedId={entity?.id ?? null}
            actions={{ move: world.move, select: setSelectedId, ready: setSceneReady }}
          />
          {!sceneReady && (
            <div className="scene-loading">
              <div className="brand-mark">G</div>
              <p>Preparing the scene and your character…</p>
              <span className="eyebrow">3 / 3 · GAME → PLAYER → SCENE</span>
            </div>
          )}
          <div className="scene-location">
            <span className="eyebrow">MOSCOW / DISTRICT 01</span>
            <h2>{isInsideGuesthouse(player.position) ? "Irina’s guesthouse" : "Red Square"}</h2>
            <span className="scene-caption">
              {player.behavior.type === "driving" ? "Driving" : "Free roam"} <span>·</span> ₽
              {player.money} <span>·</span> Health {player.health}
            </span>
          </div>
          <div className="scene-controls">
            <button
              onClick={() => setOverview(!showOverview)}
              aria-pressed={showOverview}
              disabled={isInsideGuesthouse(player.position)}
            >
              <MapTrifoldIcon size={15} style={{ verticalAlign: "middle", marginRight: 5 }} />
              {showOverview ? "Return to player" : "City overview"}
            </button>
          </div>
          <StuntObjective player={player} time={snapshot.time} select={setSelectedId} />
          <ConversationSpeech entity={entity} playerId={player.id} />
          {connection.status === "disconnected" && (
            <div className="disconnect-alert" role="alert">
              {connection.message}
            </div>
          )}
          <div className="bottom-overlay">
            <Minimap snapshot={snapshot} player={player} />
            <InteractionPanel
              entity={entity}
              player={player}
              snapshot={snapshot}
              enabled={connection.status === "connected"}
              result={result}
              actions={{
                act: action.mutate,
                inspect: world.inspect,
                sendConversation: world.sendConversation,
                conversationHistory: world.conversationHistory,
                select: (id) => {
                  setSelectedId(id);
                  action.reset();
                },
              }}
            />
          </div>
        </section>
        {journal && (
          <aside className="game-sidebar" aria-label="Journal">
            <MissionPanel player={player} select={setSelectedId} />
            <ActivityPanel {...view} />
          </aside>
        )}
      </div>
      <footer className="game-footer">
        <div className="key-controls">
          <span>
            <kbd>W A S D</kbd> {player.behavior.type === "driving" ? "Drive / steer" : "Move"}
          </span>
          <span>
            <kbd>{player.behavior.type === "driving" ? "SPACE" : "SHIFT"}</kbd>{" "}
            {player.behavior.type === "driving" ? "Brake" : "Run"}
          </span>
          <span>
            <kbd>DRAG</kbd> Camera
          </span>
          <span>
            <kbd>SCROLL</kbd> Zoom
          </span>
          <span>Click a person or vehicle to interact</span>
        </div>
        <span className="prototype-note">
          {snapshot.ai.status === "disabled" ? "Scripted simulation" : "Astra connected"}
        </span>
      </footer>
    </main>
  );
}
