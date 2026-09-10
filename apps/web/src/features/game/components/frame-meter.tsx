import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";

/** Opt-in, visible measurements of actual rendered frames; never advances the simulation. */
export function FrameMeter() {
  const [enabled] = useState(() => new URLSearchParams(window.location.search).has("perf"));
  const samples = useRef<number[]>([]);
  const elapsed = useRef(0);
  const [label, setLabel] = useState("Measuring frame times…");
  useFrame((_, delta) => {
    if (!enabled) return;
    if (document.hidden) {
      samples.current = [];
      elapsed.current = 0;
      return;
    }
    samples.current.push(delta * 1000);
    elapsed.current += delta;
    if (elapsed.current < 3) return;
    const sorted = samples.current.sort((a, b) => a - b);
    const p95 = sorted[Math.floor((sorted.length - 1) * 0.95)] ?? 0;
    setLabel(`${Math.round(sorted.length / elapsed.current)} FPS · p95 ${p95.toFixed(1)} ms`);
    samples.current = [];
    elapsed.current = 0;
  });
  return enabled ? (
    <Html
      fullscreen
      calculatePosition={(_, __, size) => [size.width / 2, size.height / 2]}
      style={{ pointerEvents: "none" }}
    >
      <output
        style={{
          position: "absolute",
          right: 12,
          bottom: 12,
          background: "#111e",
          color: "white",
          padding: 8,
          font: "12px monospace",
        }}
      >
        {label}
      </output>
    </Html>
  ) : null;
}
