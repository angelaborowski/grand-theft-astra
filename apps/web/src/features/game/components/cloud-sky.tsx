import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { BackSide, Mesh, ShaderMaterial } from "three";

/** A camera-centred sky dome with slowly advecting cloud layers. */
export function CloudSky() {
  const mesh = useRef<Mesh>(null);
  const material = useRef<ShaderMaterial>(null);
  const [uniforms] = useState(() => ({ time: { value: 0 } }));
  useFrame(({ camera, clock }) => {
    mesh.current?.position.copy(camera.position);
    const time = material.current?.uniforms.time;
    if (time) time.value = clock.elapsedTime;
  });
  return (
    <mesh ref={mesh} renderOrder={-100}>
      <sphereGeometry args={[1200, 32, 16]} />
      <shaderMaterial
        ref={material}
        side={BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`varying vec3 direction;
          void main() { direction = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
        fragmentShader={`
          uniform float time;
          varying vec3 direction;
          float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float noise(vec2 p) {
            vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
          }
          float fbm(vec2 p) {
            float n = 0.0, a = 0.5;
            for (int i=0; i<5; i++) { n += a * noise(p); p = mat2(1.6,1.2,-1.2,1.6) * p; a *= 0.5; }
            return n;
          }
          void main() {
            vec3 d = normalize(direction);
            float elevation = max(d.y, 0.0);
            vec3 sky = mix(vec3(0.66,0.79,0.9), vec3(0.10,0.36,0.73), pow(elevation, 0.45));
            vec2 uv = d.xz / max(0.12, d.y + 0.15);
            float cloud = fbm(uv * 1.3 + vec2(time * 0.012, time * 0.004));
            float coverage = smoothstep(0.43, 0.65, cloud) * smoothstep(0.0, 0.12, d.y);
            vec3 cloudColor = mix(vec3(0.66,0.73,0.82), vec3(1.0), smoothstep(0.48,0.72,cloud));
            float wisps = smoothstep(0.55,0.75,fbm(uv * vec2(0.8,3.0) + vec2(time * 0.006, 12.0))) * 0.22;
            sky = mix(sky, vec3(0.9,0.95,1.0), wisps * smoothstep(0.0,0.2,d.y));
            gl_FragColor = vec4(mix(sky, cloudColor, coverage), 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `}
      />
    </mesh>
  );
}
