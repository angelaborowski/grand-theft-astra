import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { BufferAttribute } from "three";
import { BUILDINGS } from "@gpta/core/scene";

const count = 1000;
const wrap = (value: number, size: number) => ((value % size) + size) % size;

/** One draw call, camera-local coverage, and deterministic world-space flake motion. */
export function Snowfall() {
  const [positions] = useState(() => new Float32Array(count * 3));
  const attribute = useRef<BufferAttribute>(null);
  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const x = camera.position.x + wrap(i * 13.731 + t * 0.55 - camera.position.x, 64) - 32;
      const z = camera.position.z + wrap(i * 27.193 + t * 0.18 - camera.position.z, 64) - 32;
      const y = wrap(i * 7.31 - t * (0.8 + (i % 7) * 0.13), 25);
      const roof = BUILDINGS.find(
        (b) => Math.abs(x - b.x) < b.width / 2 && Math.abs(z - b.z) < b.depth / 2,
      );
      attribute.current?.setXYZ(i, x, roof && y < roof.height ? -100 : y, z);
    }
    if (attribute.current) attribute.current.needsUpdate = true;
  });
  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute ref={attribute} attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <shaderMaterial
        transparent
        depthWrite={false}
        uniforms={{}}
        vertexShader={`
          varying float fade;
          void main() {
            vec4 view = modelViewMatrix * vec4(position, 1.0);
            float d = length(view.xyz);
            fade = smoothstep(0.6, 2.0, d) * (1.0 - smoothstep(24.0, 40.0, d));
            gl_PointSize = clamp(95.0 / max(1.0, -view.z), 1.0, 5.0);
            gl_Position = projectionMatrix * view;
          }
        `}
        fragmentShader={`
          varying float fade;
          void main() {
            float alpha = (1.0 - smoothstep(0.12, 0.5, length(gl_PointCoord - 0.5))) * fade * 0.8;
            if (alpha < 0.01) discard;
            gl_FragColor = vec4(0.95, 0.98, 1.0, alpha);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `}
      />
    </points>
  );
}
