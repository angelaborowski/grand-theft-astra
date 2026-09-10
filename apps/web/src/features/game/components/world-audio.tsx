import type { Player, WorldSnapshot } from "@gpta/core/world";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { Vector3 } from "three";
import { useGameAudio } from "../hooks/use-game-audio";
import {
  sampleVehicleAudio,
  vehicleAudioEmitters,
  type VehicleAudioSample,
} from "../models/vehicle-audio";

/** The scene supplies camera orientation and accepted positions to the page-owned audio instance. */
export function WorldAudio({
  snapshot,
  player,
  enabled,
}: {
  snapshot: WorldSnapshot;
  player: Player;
  enabled: boolean;
}) {
  const { audio } = useGameAudio();
  const sample = useRef<VehicleAudioSample | null>(null);
  const sources = useRef(new Set<string>());
  const [vectors] = useState(() => ({ position: new Vector3(), forward: new Vector3() }));

  useFrame(({ camera }) => {
    if (!audio || !enabled) return;
    camera.getWorldPosition(vectors.position);
    camera.getWorldDirection(vectors.forward);
    audio.setListener(vectors.position, vectors.forward);
  });

  useEffect(() => {
    if (!audio) return;
    const owned = sources.current;
    return () => {
      for (const id of owned) audio.removePositionedLoop(id);
      owned.clear();
      sample.current = null;
    };
  }, [audio]);

  useEffect(() => {
    if (!audio) return;
    if (!enabled) {
      for (const id of sources.current) audio.removePositionedLoop(id);
      sources.current.clear();
      sample.current = null;
      return;
    }
    sample.current = sampleVehicleAudio(snapshot, sample.current, performance.now());
    const emitters = vehicleAudioEmitters(snapshot, player, sample.current);
    const next = new Set(emitters.map((emitter) => emitter.id));
    for (const id of sources.current) {
      if (!next.has(id)) audio.removePositionedLoop(id);
    }
    sources.current.clear();
    for (const emitter of emitters) {
      sources.current.add(emitter.id);
      audio.setPositionedLoop(emitter.id, emitter.loop, emitter.position, emitter.gain);
    }
  }, [audio, enabled, player, snapshot]);

  return null;
}
