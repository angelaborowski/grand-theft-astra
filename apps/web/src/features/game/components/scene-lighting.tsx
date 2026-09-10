import { Environment, Sky } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { DirectionalLight } from "three";

/** Match the original daylight and keep shadow resolution around the viewer. */
export function SceneLighting() {
  const light = useRef<DirectionalLight>(null);
  useFrame(({ camera }) => {
    if (!light.current) return;
    light.current.position.set(camera.position.x - 65, 110, camera.position.z + 30);
    light.current.target.position.set(camera.position.x, 0, camera.position.z);
    light.current.target.updateMatrixWorld();
  });
  return (
    <>
      <Sky distance={1500} sunPosition={[-65, 110, 30]} turbidity={3} rayleigh={1.5} />
      <Environment resolution={128} environmentIntensity={0.25}>
        <Sky sunPosition={[-65, 110, 30]} turbidity={3} rayleigh={1.5} />
      </Environment>
      <hemisphereLight args={["#c9e2f5", "#b9a587", 0.55]} />
      <directionalLight
        ref={light}
        position={[-65, 110, 30]}
        intensity={2.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={55}
        shadow-camera-bottom={-55}
        shadow-camera-far={700}
        shadow-normalBias={0.025}
      />
    </>
  );
}
