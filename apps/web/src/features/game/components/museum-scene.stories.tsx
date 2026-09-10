import type { Meta, StoryObj } from "@storybook/react-vite";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { Suspense } from "react";
import { MuseumScene } from "./museum-scene";
function MuseumPreview() {
  return (
    <div style={{ height: "90vh" }}>
      <Canvas camera={{ position: [200, 2.6, -6], near: 0.1, far: 100 }}>
        <Suspense fallback={null}>
          <Physics>
            <MuseumScene />
          </Physics>
          <OrbitControls target={[200, 1.7, 0]} />
        </Suspense>
      </Canvas>
    </div>
  );
}
const meta = { title: "Game/Museum opening", component: MuseumPreview } satisfies Meta<
  typeof MuseumPreview
>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Entrance: Story = {};
