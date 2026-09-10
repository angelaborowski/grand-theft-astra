import { isInsideGuesthouse } from "@gpta/core/scene";
import type { Player, WorldSnapshot } from "@gpta/core/world";
import { useEffect, useRef } from "react";
import { conversationSendRejected } from "../../../lib/world-connection";
import { nearbyCrowdGain, selectAudioCues } from "../models/world-audio";
import { useGameAudio } from "./use-game-audio";

/** Reconnect and visibility changes establish silent baselines before new effects can play. */
export function useSessionAudio({
  snapshot,
  player,
  screen,
  connected,
  conversation,
}: {
  snapshot: WorldSnapshot;
  player: Player;
  screen: "loading" | "playing" | "paused";
  connected: boolean;
  conversation: boolean;
}) {
  const { audio, muted } = useGameAudio();
  const previous = useRef<WorldSnapshot | null>(null);
  const space = isInsideGuesthouse(player.position) ? "guesthouse" : "square";
  useEffect(() => {
    audio?.setMix({ screen, space, connected, conversation });
  }, [audio, screen, space, connected, conversation]);
  useEffect(() => {
    const reset = () => {
      previous.current = null;
    };
    document.addEventListener("visibilitychange", reset);
    return () => document.removeEventListener("visibilitychange", reset);
  }, []);
  useEffect(() => {
    if (!connected || document.hidden || screen === "loading") {
      previous.current = null;
      return;
    }
    const before = previous.current;
    if (before && snapshot.revision <= before.revision) return;
    previous.current = snapshot;
    audio?.setLoop("crowd", nearbyCrowdGain(snapshot, player));
    if (muted || screen === "paused") return;
    for (const cue of selectAudioCues(before, snapshot, player.id)) audio?.play(cue);
  }, [audio, snapshot, player, screen, connected, muted]);
  useEffect(
    () => () => {
      audio?.setMix({ screen: "loading", space: "square", connected: false, conversation: false });
    },
    [audio],
  );
  useEffect(() => {
    if (!audio || !connected || screen !== "playing" || muted || space !== "square") return;
    let next: number;
    let stop: number | undefined;
    const siren = () => {
      if (!document.hidden) {
        audio.setLoop("police-siren", 0.055);
        stop = window.setTimeout(() => audio.setLoop("police-siren", 0), 8000);
      }
      next = window.setTimeout(siren, 45000 + Math.random() * 30000);
    };
    next = window.setTimeout(siren, 12000);
    return () => {
      clearTimeout(next);
      clearTimeout(stop);
      audio.setLoop("police-siren", 0);
    };
  }, [audio, connected, screen, muted, space]);
}

/** Only a confirmed rejection receives a failure cue; network errors remain silent. */
export function useRejectionSound(error: unknown) {
  const { audio } = useGameAudio();
  const previous = useRef(error);
  useEffect(() => {
    if (error === previous.current) return;
    previous.current = error;
    if (conversationSendRejected(error)) audio?.play("reject");
  }, [audio, error]);
}
