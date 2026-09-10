import { CatchBoundary } from "@tanstack/react-router";
import { Html, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef, useEffect } from "react";
import { Group, Object3D, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { SCENE_POSITIONS } from "@gpta/core/scene";

export function VehicleModel(props: { color?: string; scooter?: boolean }) {
  return (
    <CatchBoundary
      getResetKey={() => (props.scooter ? "scooter" : "car")}
      errorComponent={VehicleAssetFailure}
    >
      <Suspense fallback={<VehiclePlaceholder />}>
        <LoadedVehicleModel {...props} />
      </Suspense>
    </CatchBoundary>
  );
}

function VehiclePlaceholder() {
  return (
    <mesh position={[0, 0.6, 0]}>
      <boxGeometry args={[0.6, 0.7, 1.5]} />
      <meshStandardMaterial color="#71818b" />
    </mesh>
  );
}
function VehicleAssetFailure() {
  return (
    <group>
      <VehiclePlaceholder />
      <Html position={[0, 1.7, 0]} center>
        <span className="entity-label" role="status">
          Vehicle asset unavailable
        </span>
      </Html>
    </group>
  );
}

/** Only visual geometry: the caller retains identity, movement and collision ownership. */
function LoadedVehicleModel({ color, scooter = false }: { color?: string; scooter?: boolean }) {
  const { scene } = useGLTF(
    `/assets/vehicles/${scooter ? "mila-scooter" : "ferrari-12cilindri"}.glb`,
  );
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        if (
          color &&
          object.material instanceof MeshStandardMaterial &&
          object.material.name === "BodyPaint"
        ) {
          object.material = object.material.clone();
          object.material.color.set(color);
        }
      }
    });
    return clone;
  }, [scene, color]);
  const root = useRef<Group>(null);
  const wheelRefs = useRef<Object3D[]>([]);
  useEffect(() => {
    const result: Object3D[] = [];
    root.current?.traverse((object) => {
      if (/^Wheel(?:Front|Rear)(?:L|R)?$/.test(object.name)) result.push(object);
    });
    wheelRefs.current = result;
  }, [model]);
  const previous = useRef<Vector3 | null>(null);
  const position = useMemo(() => new Vector3(), []);
  const forward = useMemo(() => new Vector3(), []);
  useFrame(() => {
    model.getWorldPosition(position);
    if (previous.current) {
      const distance = previous.current.distanceTo(position);
      // Ignore server corrections/teleports; sign follows local forward (+Z).
      if (distance < 2 && distance > 0.0001) {
        model.getWorldDirection(forward);
        const sign = Math.sign(forward.dot(position.clone().sub(previous.current)));
        for (const wheel of wheelRefs.current)
          wheel.rotateX((distance * sign) / (scooter ? 0.32 : 0.41));
      }
      previous.current.copy(position);
    } else previous.current = position.clone();
  });
  return <primitive ref={root} object={model} dispose={null} />;
}

/** Parked reference prop; no invented ownership or scooter driving actions. */
export function ParkedMilaScooter() {
  return (
    <group
      position={[SCENE_POSITIONS.mila.x - 2, 0, SCENE_POSITIONS.mila.z]}
      rotation={[0, -0.65, 0]}
    >
      <VehicleModel scooter />
    </group>
  );
}
