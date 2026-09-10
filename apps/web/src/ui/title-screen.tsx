import { useState, type KeyboardEvent } from "react";
import { menuArtwork } from "./game-artwork";
import { GameBrand } from "./game-brand";
import { ControlHint, GameControls } from "./game-controls";
import { GameDialog } from "./game-dialog";

/** Entry actions preserve the session; this screen does not create or reset a player. */
export function TitleScreen({ actions }: { actions: { start: () => void } }) {
  const [controlsOpen, setControlsOpen] = useState(false);
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
          <button className="astra-menu-action" onClick={actions.start} autoFocus>
            Enter Red Square
          </button>
          <button className="astra-menu-action" onClick={() => setControlsOpen(true)}>
            Controls
          </button>
        </nav>
        <ControlHint keys="Enter">Select</ControlHint>
      </div>
      {controlsOpen ? (
        <GameDialog title="Controls" actions={{ close: () => setControlsOpen(false) }}>
          <header className="astra-dialog-header">
            <h1 className="astra-heading">Controls</h1>
            <button className="astra-button" onClick={() => setControlsOpen(false)}>
              Close <kbd>Esc</kbd>
            </button>
          </header>
          <GameControls />
        </GameDialog>
      ) : null}
    </main>
  );
}

function moveMenuFocus(event: KeyboardEvent<HTMLElement>) {
  if (!(event.target instanceof HTMLButtonElement)) return;
  const buttons = Array.from(event.currentTarget.querySelectorAll("button"));
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
