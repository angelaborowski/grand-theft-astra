import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";

/** Actual frame rate stays visible; the perf query adds detailed frame times. */
export function FrameMeter() {
  const [detailed] = useState(() => new URLSearchParams(window.location.search).has("perf"));
  const samples = useRef<number[]>([]);
  const elapsed = useRef(0);
  const [label, setLabel] = useState("— FPS");
  useFrame((_, delta) => {
    if (document.hidden) {
      samples.current = [];
      elapsed.current = 0;
      return;
    }
    samples.current.push(delta * 1000);
    elapsed.current += delta;
    if (elapsed.current < 1) return;
    const sorted = samples.current.sort((a, b) => a - b);
    const p95 = sorted[Math.floor((sorted.length - 1) * 0.95)] ?? 0;
    const fps = `${Math.round(sorted.length / elapsed.current)} FPS`;
    setLabel(detailed ? `${fps} · p95 ${p95.toFixed(1)} ms` : fps);
    samples.current = [];
    elapsed.current = 0;
  });
  return (
    <Html
      fullscreen
      zIndexRange={[8, 0]}
      calculatePosition={(_, __, size) => [size.width / 2, size.height / 2]}
      style={{ pointerEvents: "none" }}
    >
      <output className="gameplay-frame-meter" aria-live="off">
        {label}
      </output>
    </Html>
  );
}
