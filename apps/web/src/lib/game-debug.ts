/** Vite replaces this public flag at build time; normal builds hide diagnostics. */
export const GAME_DEBUG = import.meta.env.VITE_GAME_DEBUG === "true";
