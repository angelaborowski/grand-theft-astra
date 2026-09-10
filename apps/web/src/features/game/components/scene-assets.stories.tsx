import type { Meta, StoryObj } from "@storybook/react-vite";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import { CHARACTER_ASSETS } from "../models/scene-assets";
import { CharacterModel, type CharacterMotion } from "./character-model";
import { Snowfall } from "./snowfall";
import { SceneLighting } from "./scene-lighting";
import { SceneAssets } from "./scene-assets";

const meta = { title: "Game/Angela assets", component: SceneAssets } satisfies Meta<
  typeof SceneAssets
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const RedSquare: Story = {
  render: () => (
    <div style={{ height: "80vh" }}>
      <Canvas gl={{ localClippingEnabled: true }} camera={{ position: [35, 80, 210], far: 1600 }}>
        <color attach="background" args={["#bacbd0"]} />
        <fog attach="fog" args={["#b9c3cd", 260, 1000]} />
        <SceneLighting />
        <Snowfall />
        <Suspense fallback={null}>
          <SceneAssets />
        </Suspense>
        <OrbitControls target={[10, 0, 65]} />
      </Canvas>
    </div>
  ),
};

export const WinterSky: Story = {
  render: () => (
    <div style={{ height: "90vh" }}>
      <Canvas
        gl={{ localClippingEnabled: true, toneMappingExposure: 0.9 }}
        camera={{ position: [10, 2.5, 170], fov: 58, near: 0.3, far: 1600 }}
      >
        <color attach="background" args={["#b9c3cd"]} />
        <fog attach="fog" args={["#b9c3cd", 260, 1000]} />
        <SceneLighting />
        <Snowfall />
        <Suspense fallback={null}>
          <SceneAssets />
        </Suspense>
        <OrbitControls target={[10, 24, 20]} />
      </Canvas>
    </div>
  ),
};

export const Cast: Story = { render: () => <CastPreview /> };

function CastPreview() {
  const motion = useRef<CharacterMotion>({ speed: 1.4 });
  return (
    <div style={{ height: "80vh" }}>
      <Canvas gl={{ localClippingEnabled: true }} camera={{ position: [0, 2.8, 10], fov: 48 }}>
        <color attach="background" args={["#bacbd0"]} />
        <hemisphereLight intensity={2.1} />
        <directionalLight position={[-5, 10, 8]} intensity={2.8} />
        <Suspense fallback={null}>
          {[...CHARACTER_ASSETS.entries()].map(([id, asset], index) => (
            <group key={id} position={[(index - 2.5) * 1.5, 0, 0]}>
              <CharacterModel asset={asset} motion={motion} />
            </group>
          ))}
        </Suspense>
        <OrbitControls target={[0, 1, 0]} />
      </Canvas>
    </div>
  );
}
