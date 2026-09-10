import { BUILDINGS, RED_SQUARE_SCENE } from "@gpta/core/scene";
import { Html, useGLTF, useTexture } from "@react-three/drei";
import { CatchBoundary, type ErrorComponentProps } from "@tanstack/react-router";
import { useState } from "react";
import {
  BufferAttribute,
  Mesh,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Vector2,
} from "three";
import { extendGum } from "../models/world-polish";

const sceneAssets = [
  RED_SQUARE_SCENE.asset,
  "/assets/world-detail.glb",
  "/assets/gum-detail.glb",
  "/assets/museum-detail.glb",
  "/assets/city-landscape.glb",
];
const pavingTextures = {
  map: "/assets/materials/scanned/cobblestone_floor_08-Diffuse.jpg",
  normalMap: "/assets/materials/scanned/cobblestone_floor_08-nor_gl.jpg",
  roughnessMap: "/assets/materials/scanned/cobblestone_floor_08-Rough.jpg",
};

const brickTextures = {
  map: "/assets/materials/scanned/red_brick-Diffuse.jpg",
  normalMap: "/assets/materials/scanned/red_brick-nor_gl.jpg",
  roughnessMap: "/assets/materials/scanned/red_brick-Rough.jpg",
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
  const sourceBricks = useTexture(brickTextures);
  const [bricks] = useState(() => {
    const textures = {
      map: sourceBricks.map.clone(),
      normalMap: sourceBricks.normalMap.clone(),
      roughnessMap: sourceBricks.roughnessMap.clone(),
    };
    textures.map.colorSpace = SRGBColorSpace;
    for (const texture of Object.values(textures)) {
      texture.wrapS = texture.wrapT = RepeatWrapping;
      texture.anisotropy = 8;
      texture.needsUpdate = true;
    }
    return textures;
  });
  const [scenes] = useState(() =>
    assets.map((asset, index) => {
      const scene = asset.scene.clone(true);
      scene.traverse((object) => {
        if (
          /Paved.*site/.test(object.name) ||
          (index === 0 && /Mapped.*Historical.*Museum/.test(object.name))
        )
          object.visible = false;
        if (!(object instanceof Mesh)) return;
        object.geometry = object.geometry.clone();
        const applyBrick = (material: import("three").Material) => {
          const m = material.clone();
          if (
            index !== 3 &&
            m instanceof MeshStandardMaterial &&
            /red brick|orange-red masonry|Museum.*oxblood|Brick.*terracotta/.test(m.name)
          ) {
            m.color.set("#ffffff");
            m.map = bricks.map;
            m.normalMap = bricks.normalMap;
            m.roughnessMap = bricks.roughnessMap;
            m.normalScale = new Vector2(0.35, 0.35);
            m.roughness = 1;
            const pos = object.geometry.getAttribute("position"),
              norm = object.geometry.getAttribute("normal");
            if (pos && norm) {
              const uv = new Float32Array(pos.count * 2);
              for (let i = 0; i < pos.count; i++) {
                uv[i * 2] =
                  (Math.abs(norm.getY(i)) <= 0.7 && Math.abs(norm.getX(i)) > Math.abs(norm.getZ(i))
                    ? pos.getZ(i)
                    : pos.getX(i)) / 2.24;
                uv[i * 2 + 1] =
                  Math.abs(norm.getY(i)) > 0.7 ? pos.getZ(i) / 1.44 : pos.getY(i) / 1.44;
              }
              object.geometry.setAttribute("uv", new BufferAttribute(uv, 2));
            }
          }
          if (m instanceof MeshStandardMaterial && /recessed glazing/.test(m.name)) {
            m.color.set("#52636b");
            m.metalness = 0;
            m.roughness = 0.16;
            m.envMapIntensity = 1.4;
          }
          return m;
        };
        object.material = Array.isArray(object.material)
          ? object.material.map(applyBrick)
          : applyBrick(object.material);
        object.castShadow = true;
        object.receiveShadow = true;
        // The detail GLB replaces the original wall, and the shared floor replaces exported terrain.
        if (/Ground|Terrain|Paved.*site|Context.*Kremlin.*wall/i.test(object.name))
          object.visible = false;
      });
      return scene;
    }),
  );
  const [polish] = useState(() => {
    const gum = scenes[2];
    return { gum: gum ? extendGum(gum) : null };
  });
  return (
    <>
      <group position={[0, RED_SQUARE_SCENE.offsetY, 0]}>
        {polish.gum && <primitive object={polish.gum} dispose={null} />}
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
      <meshStandardMaterial {...textures} color="#c4c1b9" roughness={1} normalScale={[0.6, 0.6]} />
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
              useTexture.clear(Object.values(brickTextures));
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
