import type { CollisionBox } from "@gpta/core/scene";
import { useEffect } from "react";
import { BoxGeometry, DoubleSide, Mesh, MeshBasicMaterial, type Object3D } from "three";

/** CameraControls tests shared box geometry without traversing visual assets. */
export function SceneCameraColliders({
  attach,
  boxes,
  disabled,
}: {
  attach: (meshes: Object3D[]) => () => void;
  boxes: readonly CollisionBox[];
  disabled: boolean;
}) {
  useEffect(() => {
    if (disabled) return;
    const material = new MeshBasicMaterial({ side: DoubleSide });
    const meshes = boxes.map((box) => {
      const mesh = new Mesh(new BoxGeometry(box.width, box.height, box.depth), material);
      mesh.position.set(box.x, box.height / 2, box.z);
      mesh.updateMatrixWorld();
      return mesh;
    });
    const detach = attach(meshes);
    return () => {
      detach();
      for (const mesh of meshes) mesh.geometry.dispose();
      material.dispose();
    };
  }, [attach, boxes, disabled]);
  return null;
}
