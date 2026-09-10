import { useFrame } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import type { CharacterMotion } from "../models/character-poses";
import { useGameAudio } from "../hooks/use-game-audio";

const STEPS = ["footstep-1", "footstep-2", "footstep-3"] as const;

/** Actual grounded movement controls cadence; key presses alone never produce footsteps. */
export function PlayerAudio({
  motion,
  enabled,
}: {
  motion: RefObject<CharacterMotion>;
  enabled: boolean;
}) {
  const { audio } = useGameAudio();
  const stride = useRef(0);
  const step = useRef(0);
  useFrame((_, delta) => {
    const current = motion.current;
    if (
      !enabled ||
      document.hidden ||
      !document.hasFocus() ||
      !current.pose?.grounded ||
      current.speed < 0.15 ||
      delta > 0.3
    ) {
      stride.current = 0;
      return;
    }
    stride.current += current.speed * delta;
    const length = current.pose.posture === "crouched" ? 0.8 : 1.5;
    if (stride.current < length) return;
    stride.current %= length;
    const cue = STEPS[step.current % STEPS.length];
    if (cue) audio?.play(cue);
    step.current += 1;
  });
  return null;
}
