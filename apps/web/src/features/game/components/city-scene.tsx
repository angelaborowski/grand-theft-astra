import { BUILDINGS, DISTRICT_BOUNDS } from "@gpta/core/scene";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { ParkedMilaScooter } from "./vehicle-model";
import { SceneAssets } from "./scene-assets";

/** Asset geometry stays separate from the shared movement collision contract. */
export function CityScene() {
  const width = DISTRICT_BOUNDS.maxX - DISTRICT_BOUNDS.minX;
  const depth = DISTRICT_BOUNDS.maxZ - DISTRICT_BOUNDS.minZ;
  const centerX = (DISTRICT_BOUNDS.minX + DISTRICT_BOUNDS.maxX) / 2;
  const centerZ = (DISTRICT_BOUNDS.minZ + DISTRICT_BOUNDS.maxZ) / 2;
  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[800, 1, 800]} position={[0, -1, 0]} />
        {BUILDINGS.map((building) => (
          <CuboidCollider
            key={building.id}
            args={[building.width / 2, building.height / 2, building.depth / 2]}
            position={[building.x, building.height / 2, building.z]}
          />
        ))}
        <CuboidCollider
          args={[1, 6, depth / 2]}
          position={[DISTRICT_BOUNDS.minX - 1, 5, centerZ]}
        />
        <CuboidCollider
          args={[1, 6, depth / 2]}
          position={[DISTRICT_BOUNDS.maxX + 1, 5, centerZ]}
        />
        <CuboidCollider
          args={[width / 2, 6, 1]}
          position={[centerX, 5, DISTRICT_BOUNDS.minZ - 1]}
        />
        <CuboidCollider
          args={[width / 2, 6, 1]}
          position={[centerX, 5, DISTRICT_BOUNDS.maxZ + 1]}
        />
      </RigidBody>
      <SceneAssets />
      <ParkedMilaScooter />
    </>
  );
}
