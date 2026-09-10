import { Environment } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import { DirectionalLight, Vector3 } from "three";

const sun = new Vector3(-65, 110, 30);
const right = new Vector3().crossVectors(new Vector3(0, 1, 0), sun).normalize();
const up = new Vector3().crossVectors(sun, right).normalize();
const texel = 110 / 2048;

/** A local photographic sky supplies matching clouds, diffuse fill, and reflections. */
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
      <Suspense fallback={null}>
        <Environment
          files="/assets/environment/snow_field_puresky_2k.hdr"
          background
          backgroundIntensity={0.8}
          environmentIntensity={0.65}
          backgroundRotation={[0, 0.7, 0]}
          environmentRotation={[0, 0.7, 0]}
        />
      </Suspense>
      <hemisphereLight args={["#dce4ec", "#888b8d", 0.45]} />
      <directionalLight
        ref={light}
        position={sun}
        color="#edf1f5"
        intensity={0.65}
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
