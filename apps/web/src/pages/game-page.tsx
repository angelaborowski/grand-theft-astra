import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";

const Game = lazy(() => import("../features/game/components/game"));

/** Three.js and Rapier load in the browser, after the HTML shell. */
export function GamePage() {
  const [started, setStarted] = useState(false);
  if (!started)
    return (
      <main className="start-screen">
        <div className="start-card">
          <span className="eyebrow">GPTA / FIRST DAY IN MOSCOW</span>
          <h1>
            A city with
            <br />a life of its own.
          </h1>
          <p>
            You arrive in Red Square with ₽20 and nowhere to sleep. Meet Mila. Find work. Decide who
            to trust.
          </p>
          <button className="primary-button start-button" onClick={() => setStarted(true)}>
            Start / continue <span>→</span>
          </button>
          <div className="start-controls">
            <span>
              <kbd>W A S D</kbd> Move
            </span>
            <span>
              <kbd>DRAG</kbd> Look around
            </span>
            <span>
              <kbd>SHIFT</kbd> Run
            </span>
          </div>
          <small>100 people. One persistent city. Your choices stay after you leave.</small>
        </div>
        <div className="start-map" aria-hidden="true">
          <div />
          <div />
          <div />
          <span>
            RED SQUARE
            <br />
            55.7539° N · 37.6208° E
          </span>
        </div>
      </main>
    );
  return (
    <ClientOnly fallback={<Loading />}>
      <Suspense fallback={<Loading />}>
        <Game />
      </Suspense>
    </ClientOnly>
  );
}

function Loading() {
  return (
    <main className="loading-screen">
      <div className="brand-mark">G</div>
      <h1>GPTA</h1>
      <p>Loading game code…</p>
      <span className="eyebrow">1 / 3 · GAME → PLAYER → SCENE</span>
    </main>
  );
}
