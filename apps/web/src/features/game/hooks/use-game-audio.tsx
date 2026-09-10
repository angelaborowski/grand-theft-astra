import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { GameAudio } from "../services/game-audio";
import type { AudioStatus } from "../models/audio-state";

const INITIAL_STATUS: AudioStatus = {
  status: "locked",
  message: "Sound starts when the browser permits playback.",
  unlocked: false,
};
const AudioContext = createContext<ReturnType<typeof useAudioSession> | null>(null);
const subscribeNothing = () => () => {};
const initialSnapshot = () => INITIAL_STATUS;
const PREFERENCE_KEY = "gpta.audio.muted.v1";

/** Keep one audio session across the title, loading, and playable world. */
export function GameAudioProvider({ children }: { children: ReactNode }) {
  const session = useAudioSession();
  return <AudioContext value={session}>{children}</AudioContext>;
}

/** Scene audio stays optional in isolated scene previews. */
export function useGameAudio() {
  const session = useContext(AudioContext);
  return session ?? { audio: null, muted: false, status: INITIAL_STATUS, toggle: () => {} };
}

function useAudioSession() {
  const [runtime, setRuntime] = useState<
    | { status: "loading" }
    | { status: "ready"; audio: GameAudio }
    | { status: "failed"; message: string }
  >({ status: "loading" });
  const [muted, setMuted] = useState(false);
  const audio = runtime.status === "ready" ? runtime.audio : null;
  const playback = useSyncExternalStore(
    audio?.subscribe ?? subscribeNothing,
    audio?.getSnapshot ?? initialSnapshot,
    initialSnapshot,
  );
  useEffect(() => {
    let disposed = false;
    let instance: GameAudio | null = null;
    void import("../services/game-audio")
      .then(({ GameAudio: AudioRuntime }) => {
        if (disposed) return;
        instance = new AudioRuntime();
        const preference = readMuted();
        instance.setMuted(preference);
        instance.setHidden(document.hidden);
        setMuted(preference);
        setRuntime({ status: "ready", audio: instance });
        void instance.preload();
        if (!preference) void instance.unlock();
      })
      .catch(() => {
        if (!disposed)
          setRuntime({ status: "failed", message: "Sound could not start. Reload to retry." });
      });
    return () => {
      disposed = true;
      instance?.dispose();
    };
  }, []);
  useEffect(() => {
    if (!audio) return;
    const unlock = (event: Event) => {
      if (event.target instanceof Element && event.target.closest("[data-sound-control]")) return;
      if (!muted) void audio.unlock();
    };
    const visibility = () => audio.setHidden(document.hidden);
    const select = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest("button:not(:disabled):not([data-sound-control])"))
        audio.play("select");
    };
    window.addEventListener("pointerdown", unlock, { capture: true });
    window.addEventListener("keydown", unlock, { capture: true });
    window.addEventListener("click", select);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("pointerdown", unlock, { capture: true });
      window.removeEventListener("keydown", unlock, { capture: true });
      window.removeEventListener("click", select);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [audio, muted]);
  const toggle = useCallback(() => {
    if (!audio) return;
    const next = !audio.unlocked ? false : !muted;
    setMuted(next);
    audio.setMuted(next);
    if (!next) void audio.unlock();
    try {
      localStorage.setItem(PREFERENCE_KEY, String(next));
    } catch {
      /* Storage can be blocked while audio remains available. */
    }
  }, [audio, muted]);
  const status: AudioStatus =
    runtime.status === "failed"
      ? { status: "unavailable", message: runtime.message, unlocked: false }
      : playback;
  return { audio, muted, status, toggle };
}

function readMuted(): boolean {
  try {
    return localStorage.getItem(PREFERENCE_KEY) === "true";
  } catch {
    return false;
  }
}
