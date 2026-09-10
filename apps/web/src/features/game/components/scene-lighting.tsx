import { Environment, Sky } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { DirectionalLight, Vector3 } from "three";

const sun = new Vector3(-65, 110, 30);
const right = new Vector3().crossVectors(new Vector3(0, 1, 0), sun).normalize();
const up = new Vector3().crossVectors(sun, right).normalize();
const texel = 110 / 2048;

/** One sun and a static sky probe keep stone readable without per-frame reflection captures. */
export function SceneLighting() {
  const light = useRef<DirectionalLight>(null);
  const anchor = useRef(new Vector3());
  useFrame(({ camera }) => {
    if (!light.current) return;
    const target = anchor.current.set(camera.position.x, 0, camera.position.z);
    // Snap in light space so walking does not crawl shadow edges across the facade.
    target.addScaledVector(
      right,
      Math.round(target.dot(right) / texel) * texel - target.dot(right),
    );
    target.addScaledVector(up, Math.round(target.dot(up) / texel) * texel - target.dot(up));
    light.current.position.copy(target).add(sun);
    light.current.target.position.copy(target);
    light.current.target.updateMatrixWorld();
  });
  return (
    <>
      <Sky distance={1500} sunPosition={sun} turbidity={2.5} rayleigh={2} />
      <Environment resolution={128} frames={1} environmentIntensity={0.35}>
        <Sky sunPosition={sun} turbidity={2.5} rayleigh={2} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
          <planeGeometry args={[2000, 2000]} />
          <meshBasicMaterial color="#847d70" />
        </mesh>
      </Environment>
      <hemisphereLight args={["#c9e2f5", "#a29680", 0.35]} />
      <directionalLight
        ref={light}
        position={sun}
        color="#fff3df"
        intensity={2.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={55}
        shadow-camera-bottom={-55}
        shadow-camera-near={1}
        shadow-camera-far={260}
        shadow-normalBias={0.018}
        shadow-bias={-0.00005}
      />
    </>
  );
}
