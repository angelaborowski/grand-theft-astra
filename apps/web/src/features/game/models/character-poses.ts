import { Bone, Euler, Quaternion, type Object3D } from "three";

/** Poses describe displayed actions without changing the character's physical body. */
export type CharacterPose = {
  posture: "standing" | "crouched";
  grounded: boolean;
  aiming: boolean;
  pitch: number;
  action: "none" | "fire" | "punch" | "reload";
  actionTime: number;
};

/** Existing NPCs use their movement clips until they receive an explicit action pose. */
export type CharacterMotion = { speed: number; pose?: CharacterPose };

type Joint = { bone: Bone; rest: Quaternion };
type PoseRig = {
  joints: Map<string, Joint>;
  root: Bone | null;
  rootHeight: number;
  rotation: Quaternion;
  euler: Euler;
};

/** Cache the existing rig once; geometry and the original animation clips stay intact. */
export function createCharacterPoseRig(model: Object3D): PoseRig {
  const joints = new Map<string, Joint>();
  model.traverse((object) => {
    if (object instanceof Bone)
      joints.set(object.name, { bone: object, rest: object.quaternion.clone() });
  });
  const root = joints.get("root")?.bone ?? null;
  return {
    joints,
    root,
    rootHeight: root?.position.y ?? 0,
    rotation: new Quaternion(),
    euler: new Euler(),
  };
}

/** Apply pose offsets after the animation mixer, which restores the base rotations each update. */
export function applyCharacterPose(rig: PoseRig, motion: CharacterMotion, time: number): void {
  if (rig.root) rig.root.position.y = rig.rootHeight;
  const pose = motion.pose;
  if (!pose) return;
  if (pose.posture === "crouched") {
    const stride = Math.sin(time * 8) * Math.min(motion.speed / 2, 1) * 0.15;
    if (rig.root) rig.root.position.y = rig.rootHeight - 0.45;
    rotateJoint(rig, "spine", 0.25);
    rotateJoint(rig, "thighL", -1.25 + stride);
    rotateJoint(rig, "thighR", -1.25 - stride);
    rotateJoint(rig, "shinL", 2.2 - stride);
    rotateJoint(rig, "shinR", 2.2 + stride);
  } else if (!pose.grounded) {
    rotateJoint(rig, "thighL", -0.55);
    rotateJoint(rig, "thighR", -0.35);
    rotateJoint(rig, "shinL", 0.9);
    rotateJoint(rig, "shinR", 0.65);
    rotateJoint(rig, "armL", -0.5, 0, -0.25);
    rotateJoint(rig, "armR", -0.5, 0, 0.25);
  }
  if (pose.aiming || pose.action === "fire") {
    const recoil = pose.action === "fire" ? Math.max(0, 1 - pose.actionTime / 0.2) * 0.22 : 0;
    rotateJoint(rig, "armR", -1.25 - pose.pitch - recoil, 0, -0.12);
    rotateJoint(rig, "forearmR", -0.2);
    rotateJoint(rig, "armL", -1.05 - pose.pitch, 0.25, 0.35);
    rotateJoint(rig, "forearmL", -0.7);
  } else if (pose.action === "punch") {
    const extension = Math.sin(Math.min(1, pose.actionTime / 0.35) * Math.PI);
    rotateJoint(rig, "armR", -0.6 - extension, 0, -0.12);
    rotateJoint(rig, "forearmR", -1.1 + extension);
  } else if (pose.action === "reload") {
    rotateJoint(rig, "armR", -0.8, 0, -0.2);
    rotateJoint(rig, "forearmR", -0.9);
    rotateJoint(rig, "armL", -0.8, 0.25, 0.3);
    rotateJoint(rig, "forearmL", -1.2 + Math.sin(time * 15) * 0.15);
  }
}

function rotateJoint(rig: PoseRig, name: string, x: number, y = 0, z = 0): void {
  const joint = rig.joints.get(name);
  if (!joint) return;
  rig.euler.set(x, y, z);
  rig.rotation.setFromEuler(rig.euler);
  joint.bone.quaternion.copy(joint.rest).multiply(rig.rotation);
}
