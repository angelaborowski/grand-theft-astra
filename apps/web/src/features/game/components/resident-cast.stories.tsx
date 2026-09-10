import type { Meta, StoryObj } from "@storybook/react-vite";
import { Html, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useRef, useEffect } from "react";
import { RESIDENT_ASSETS } from "../models/scene-assets";
import { CharacterModel, type CharacterMotion } from "./character-model";

const meta = { title: "Game/Residents", component: ResidentCast } satisfies Meta<
  typeof ResidentCast
>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Walking: Story = { args: { speed: 1.4 } };
export const Idle: Story = { args: { speed: 0 } };

function ResidentCast({ speed = 1.4 }: { speed?: number }) {
  const motion = useRef<CharacterMotion>({ speed });
  useEffect(() => {
    motion.current.speed = speed;
  }, [speed]);
  const residents = [
    ...new Map(Object.entries(RESIDENT_ASSETS).map(([job, asset]) => [asset, job])).entries(),
  ];
  return (
    <div style={{ height: "95vh", background: "#71808a" }}>
      <Canvas camera={{ position: [0, 7, 11], fov: 48 }}>
        <hemisphereLight intensity={2.1} />
        <directionalLight position={[-5, 10, 8]} intensity={2.8} />
        <Suspense fallback={null}>
          {residents.map(([asset, job], index) => (
            <group
              key={asset}
              position={[((index % 4) - 1.5) * 1.7, 0, Math.floor(index / 4) * -2.5]}
            >
              <CharacterModel asset={asset} motion={motion} />
              <Html
                position={[0, 1.98, 0]}
                center
                style={{
                  color: "white",
                  font: "12px sans-serif",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                }}
              >
                {job}
              </Html>
            </group>
          ))}
        </Suspense>
        <OrbitControls target={[0, 0.9, -3.5]} />
      </Canvas>
    </div>
  );
}
