const FIRST_START_KEY = "gpta.audio.first-start.v1";

/** Browser storage preserves intro completion between visits. */
export function readFirstStartPlayed(): boolean {
  try {
    return localStorage.getItem(FIRST_START_KEY) === "true";
  } catch {
    return false;
  }
}

/** New Game clears completion even when the audio runtime has not loaded yet. */
export function saveFirstStartPlayed(played: boolean): void {
  try {
    if (played) localStorage.setItem(FIRST_START_KEY, "true");
    else localStorage.removeItem(FIRST_START_KEY);
  } catch {
    /* The active audio session still owns completion when storage is unavailable. */
  }
}
