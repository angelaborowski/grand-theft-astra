declare module "@dimforge/rapier3d/rapier_wasm3d_bg.js" {
  /** Connect wasm-bindgen's generated functions to the precompiled module instance. */
  export function __wbg_set_wasm(exports: WebAssembly.Exports): void;
}

declare module "*.wasm?module" {
  const module: WebAssembly.Module;
  export default module;
}
