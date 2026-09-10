import { BUILDINGS, RED_SQUARE_SCENE } from "@gpta/core/scene";
import { Html, useGLTF, useTexture } from "@react-three/drei";
import { CatchBoundary, type ErrorComponentProps } from "@tanstack/react-router";
import { useState } from "react";
import { Mesh, RepeatWrapping, SRGBColorSpace } from "three";

const sceneAssets = [RED_SQUARE_SCENE.asset, "/assets/world-detail.glb", "/assets/gum-detail.glb"];
const pavingTextures = {
  map: "/assets/materials/scanned/cobblestone_floor_08-Diffuse.jpg",
  normalMap: "/assets/materials/scanned/cobblestone_floor_08-nor_gl.jpg",
  roughnessMap: "/assets/materials/scanned/cobblestone_floor_08-Rough.jpg",
};

/** Scene failures preserve movement and show an explicit retry action. */
export function SceneAssets() {
  return (
    <CatchBoundary getResetKey={() => "red-square-assets"} errorComponent={SceneAssetFailure}>
      <LoadedScene />
    </CatchBoundary>
  );
}

function LoadedScene() {
  const assets = useGLTF(sceneAssets);
  const [scenes] = useState(() =>
    assets.map((asset) => {
      const scene = asset.scene.clone(true);
      scene.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        object.castShadow = true;
        object.receiveShadow = true;
        // The detail GLB replaces the original wall, and the shared floor replaces exported terrain.
        if (/Ground|Terrain|Context.*Kremlin.*wall/i.test(object.name)) object.visible = false;
      });
      return scene;
    }),
  );
  return (
    <>
      <group position={[0, RED_SQUARE_SCENE.offsetY, 0]}>
        {scenes.map((scene) => (
          <primitive key={scene.uuid} object={scene} dispose={null} />
        ))}
      </group>
      <Paving />
    </>
  );
}

function Paving() {
  const textures = useTexture(pavingTextures, (loaded) => {
    const entries = Array.isArray(loaded) ? loaded : [loaded];
    entries.forEach((texture, index) => {
      texture.wrapS = texture.wrapT = RepeatWrapping;
      texture.repeat.set(800, 800);
      texture.anisotropy = 8;
      if (index === 0) texture.colorSpace = SRGBColorSpace;
    });
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[1600, 1600]} />
      <meshStandardMaterial {...textures} roughness={1} />
    </mesh>
  );
}

function SceneAssetFailure({ reset }: ErrorComponentProps) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1600, 1600]} />
        <meshStandardMaterial color="#969c90" />
      </mesh>
      {BUILDINGS.map((building) => (
        <mesh key={building.id} position={[building.x, building.height / 2, building.z]}>
          <boxGeometry args={[building.width, building.height, building.depth]} />
          <meshStandardMaterial color={building.color} />
        </mesh>
      ))}
      <Html fullscreen style={{ pointerEvents: "none" }}>
        <div className="disconnect-alert" role="alert" style={{ pointerEvents: "auto" }}>
          Scene assets could not load. Temporary geometry remains playable.
          <button
            onClick={() => {
              useGLTF.clear(sceneAssets);
              useTexture.clear(Object.values(pavingTextures));
              reset();
            }}
          >
            Retry assets
          </button>
        </div>
      </Html>
    </>
  );
}
