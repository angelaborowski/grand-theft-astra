import { BUILDINGS } from "@gpta/core/scene";
import { useEffect, useState } from "react";
import { BoxGeometry, DoubleSide, Mesh, MeshBasicMaterial } from "three";

/** Low-cost camera blockers use the same envelopes as player collision, never hero mesh triangles. */
export function useCameraObstacles() {
  const [meshes] = useState(() =>
    BUILDINGS.map((building) => {
      const mesh = new Mesh(
        new BoxGeometry(building.width, building.height, building.depth),
        new MeshBasicMaterial({ side: DoubleSide }),
      );
      mesh.position.set(building.x, building.height / 2, building.z);
      mesh.updateMatrixWorld(true);
      return mesh;
    }),
  );
  useEffect(
    () => () => {
      for (const mesh of meshes) {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
    },
    [meshes],
  );
  return meshes;
}
