import { loadingArtworks } from "./game-artwork";
import { GameBrand } from "./game-brand";
import { GAME_DEBUG } from "../lib/game-debug";

export type LoadingScreenState =
  | { status: "pending"; message: string }
  | { status: "failed"; message: string; actions: { retry: () => void; label: string } };

/** Decorative artwork never controls readiness or delays entry to the city. */
export function LoadingScreen({
  state,
  overlay = false,
}: {
  state: LoadingScreenState;
  overlay?: boolean;
}) {
  return (
    <section
      className={`astra-screen astra-loading-screen${overlay ? " astra-loading-overlay" : ""}`}
      aria-label="Grand Theft Astra loading"
      data-state={state.status}
    >
      <div className="astra-loading-artworks" aria-hidden="true">
        {loadingArtworks.map((artwork, index) => (
          <img
            key={artwork.src}
            className="astra-loading-artwork"
            src={artwork.src}
            alt=""
            style={{ objectPosition: artwork.position, animationDelay: `${index * 8 - 1.2}s` }}
            fetchPriority={index === 0 ? "high" : "low"}
          />
        ))}
      </div>
      <div className="astra-loading-brand">
        <GameBrand size="loading" />
      </div>
      <div className="astra-loading-status">
        <LoadingStatus state={state} />
      </div>
    </section>
  );
}

function LoadingStatus({ state }: { state: LoadingScreenState }) {
  if (state.status === "failed") {
    return (
      <div className="astra-loading-failure" role="alert">
        <p className="astra-kicker">Unable to enter Moscow</p>
        <p>{state.message}</p>
        <button className="astra-button astra-button-primary" onClick={state.actions.retry}>
          {state.actions.label}
        </button>
      </div>
    );
  }
  return (
    <p className="astra-loading-message" role="status">
      <span>{GAME_DEBUG ? state.message : "Loading…"}</span>
      <span className="astra-loading-indicator" aria-hidden="true" />
    </p>
  );
}
