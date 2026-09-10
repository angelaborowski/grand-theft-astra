import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

/** Original contact shading runs on the actual gameplay camera. */
export function SceneEffects() {
  const { gl, scene, camera, size, viewport } = useThree();
  const ambient = useRef<SSAOPass | null>(null);
  const current = useRef<EffectComposer | null>(null);
  useEffect(() => {
    const composer = new EffectComposer(gl);
    composer.renderTarget1.samples = 4;
    composer.renderTarget2.samples = 4;
    const render = new RenderPass(scene, camera),
      ao = new SSAOPass(scene, camera, 1, 1, 16),
      output = new OutputPass();
    ao.kernelRadius = 1.2;
    ao.minDistance = 0.0004;
    ao.maxDistance = 0.025;
    composer.addPass(render);
    composer.addPass(ao);
    composer.addPass(output);
    current.current = composer;
    ambient.current = ao;
    return () => {
      current.current = null;
      ambient.current = null;
      ao.dispose();
      output.dispose();
      composer.dispose();
    };
  }, [gl, scene, camera]);
  useEffect(() => {
    current.current?.setPixelRatio(viewport.dpr);
    current.current?.setSize(size.width, size.height);
    // Broad contact shading can be sampled at half resolution while geometry stays sharp.
    ambient.current?.setSize(
      Math.max(1, Math.round(size.width * viewport.dpr * 0.5)),
      Math.max(1, Math.round(size.height * viewport.dpr * 0.5)),
    );
  }, [gl, scene, camera, size.width, size.height, viewport.dpr]);
  useFrame(() => {
    current.current?.render();
  }, 1);
  return null;
}
