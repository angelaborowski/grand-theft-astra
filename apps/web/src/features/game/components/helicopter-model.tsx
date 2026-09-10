import { Html, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CatchBoundary } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Group, Mesh, Object3D } from "three";

/** Blender export is already metre-scaled, Y-up, with separate rotor pivots. */
type HelicopterMotion = { mode: "departure"; departing: boolean } | { mode: "controlled" };

export function HelicopterModel({ motion }: { motion: HelicopterMotion }) {
  return (
    <CatchBoundary getResetKey={() => "helicopter"} errorComponent={HelicopterFailure}>
      <AnimatedHelicopter motion={motion} />
    </CatchBoundary>
  );
}
function AnimatedHelicopter({ motion }: { motion: HelicopterMotion }) {
  const { scene } = useGLTF("/assets/vehicles/helicopter.glb");
  const [model] = useState(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    return clone;
  });
  const mainRotor = useRef<Object3D | undefined>(undefined);
  const tailRotor = useRef<Object3D | undefined>(undefined);
  useEffect(() => {
    mainRotor.current = model.getObjectByName("MainRotor");
    tailRotor.current = model.getObjectByName("TailRotor");
  }, [model]);
  const root = useRef<Group>(null);
  const departureTime = useRef(0);
  useFrame(({ clock }, delta) => {
    if (mainRotor.current) mainRotor.current.rotation.y += Math.min(delta, 0.1) * 32;
    if (tailRotor.current) tailRotor.current.rotation.x += Math.min(delta, 0.1) * 48;
    if (motion.mode === "controlled") return;
    departureTime.current = motion.departing ? Math.min(20, departureTime.current + delta) : 0;
    if (root.current) {
      root.current.position.y =
        1.8 + Math.sin(clock.elapsedTime * 1.4) * 0.08 + departureTime.current * 3;
      root.current.position.z = -departureTime.current * departureTime.current * 0.4;
    }
  });
  return (
    <group ref={root} position={[0, motion.mode === "controlled" ? 0 : 1.8, 0]}>
      <primitive object={model} dispose={null} />
    </group>
  );
}
function HelicopterFailure() {
  return (
    <Html position={[0, 3, 0]} center zIndexRange={[8, 0]}>
      <span className="route-label" role="status">
        Helicopter asset unavailable
      </span>
    </Html>
  );
}
