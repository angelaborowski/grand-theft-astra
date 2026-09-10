import RAPIER from "@dimforge/rapier3d";
import * as bindings from "@dimforge/rapier3d/rapier_wasm3d_bg.js";
import module from "@dimforge/rapier3d/rapier_wasm3d_bg.wasm?module";

// Workers requires a precompiled module instead of wasm-bindgen's browser initialization.
bindings.__wbg_set_wasm(
  new WebAssembly.Instance(module, {
    "./rapier_wasm3d_bg.js": bindings,
  }).exports,
);

export { RAPIER };
