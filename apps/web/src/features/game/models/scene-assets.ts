import { SCENE_IDS } from "@gpta/core/scene";
import type { EntityId } from "@gpta/core/world";
import { Mesh, MeshStandardMaterial, type Object3D } from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";

/** Angela owns these assets; the game connects them through stable simulation identities. */
export const CHARACTER_ASSETS = new Map<EntityId, string>([
  [SCENE_IDS.mila, "/assets/characters/mila-study.glb"],
  [SCENE_IDS.lev, "/assets/characters/lev.glb"],
  [SCENE_IDS.niko, "/assets/characters/niko.glb"],
  [SCENE_IDS.irina, "/assets/characters/irina.glb"],
  [SCENE_IDS.sasha, "/assets/characters/sasha.glb"],
  [SCENE_IDS.alexei, "/assets/characters/alexei.glb"],
]);

/** The original courier supplies the local player's animated body. */
export const PLAYER_ASSET = "/assets/courier-prototype.glb";

/** Each character needs its own skeleton, while geometry and textures remain shared. */
export function cloneCharacter(source: Object3D, color?: string): Object3D {
  const model = clone(source);
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
    if (
      color &&
      object.material instanceof MeshStandardMaterial &&
      object.material.name === "Jacket"
    ) {
      object.material = object.material.clone();
      object.material.color.set(color);
    }
  });
  return model;
}
