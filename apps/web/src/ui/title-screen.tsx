import { useState, type KeyboardEvent } from "react";
import { menuArtwork } from "./game-artwork";
import { GameBrand } from "./game-brand";
import { GameControls } from "./game-controls";
import { GameDialog } from "./game-dialog";
import { SettingsMenu } from "../features/game/components/settings-menu";
import "./astra-pause.css";

/** Entry offers fresh and saved players without hiding session failures. */
export function TitleScreen({
  canContinue,
  pending,
  notice,
  actions,
}: {
  canContinue: boolean;
  pending: boolean;
  notice: string | null;
  actions: { newGame: () => void; continueGame: () => void };
}) {
  const [panel, setPanel] = useState<"settings" | "controls" | null>(null);
  return (
    <main className="astra-screen astra-title-screen">
      <img
        className="astra-screen-artwork"
        src={menuArtwork.src}
        alt=""
        style={{ objectPosition: menuArtwork.position }}
        fetchPriority="high"
      />
      <div className="astra-title-brand">
        <GameBrand />
      </div>
      <div className="astra-title-footer">
        <nav className="astra-title-actions" aria-label="Main menu" onKeyDown={moveMenuFocus}>
          <button
            className="astra-menu-action"
            onClick={actions.newGame}
            disabled={pending}
            autoFocus
          >
            New Game
          </button>
          <button
            className="astra-menu-action"
            onClick={actions.continueGame}
            disabled={pending || !canContinue}
          >
            Continue
          </button>
          <button className="astra-menu-action" onClick={() => setPanel("settings")}>
            Settings
          </button>
          <button className="astra-menu-action" onClick={() => setPanel("controls")}>
            Controls
          </button>
        </nav>
        {notice && (
          <p className="astra-title-notice" role="alert">
            {notice}
          </p>
        )}
        {pending && (
          <p className="astra-title-notice" role="status">
            Starting game…
          </p>
        )}
      </div>
      {panel !== null ? (
        <GameDialog
          title={panel === "settings" ? "Settings" : "Controls"}
          actions={{ close: () => setPanel(null) }}
        >
          <header className="astra-dialog-header">
            <h1 className="astra-heading">{panel === "settings" ? "Settings" : "Controls"}</h1>
            <button className="astra-button" onClick={() => setPanel(null)}>
              Close <kbd>Esc</kbd>
            </button>
          </header>
          {panel === "settings" ? <SettingsMenu initialCategory="audio" /> : <GameControls />}
        </GameDialog>
      ) : null}
    </main>
  );
}

function moveMenuFocus(event: KeyboardEvent<HTMLElement>) {
  if (!(event.target instanceof HTMLButtonElement)) return;
  const buttons = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
  );
  const index = buttons.indexOf(event.target);
  let next: number;
  switch (event.key) {
    case "ArrowRight":
    case "ArrowDown":
      next = (index + 1) % buttons.length;
      break;
    case "ArrowLeft":
    case "ArrowUp":
      next = (index + buttons.length - 1) % buttons.length;
      break;
    case "Home":
      next = 0;
      break;
    case "End":
      next = buttons.length - 1;
      break;
    default:
      return;
  }
  event.preventDefault();
  buttons[next]?.focus();
}
