# GUM facade study — 10 September 2026

60 metres of editable exterior detail, anchored at Blender x=66, y=-110 to -50. The player can inspect it at http://localhost:4173/?view=gum and walk beside it in the existing game. The detail is additive: the map-derived roof and building mass remain in red-square.glb.

## What is modeled

Three window tiers, recessed glazing, projecting jambs, turned columns and collars, segmented arch stones, fanlight bars, pediments, granite plinth, rusticated pilasters, cornices, dentils and frieze relief. The Blender source retains separate editable objects; the GLB joins them by material to reduce draw calls. Units are metres. UVs are explicitly exported.

Original deterministic 1024px material maps provide limestone colour/roughness and granite colour/roughness/normal. They are generated from source code, not extracted from photographs. Height maps are supplied for further Blender refinement; they are not geometry displacement in the browser.

## Evidence and accuracy

Reference photograph inspected: Dmitry Ivanov, **Moscow GUM fragment of faсade**, 2018, CC BY-SA 4.0:
https://commons.wikimedia.org/wiki/File:Moscow_GUM_fragment_of_fa%D1%81ade.jpg
License: https://creativecommons.org/licenses/by-sa/4.0/
The photograph is used as visual reference, not distributed or baked into textures. The visible facade has projecting stonework, pediments, several window tiers and small framed friezes. Our repeated modules simplify these forms. This is not a traced, dimensionally calibrated replica.

Additional overview source: Sergey Rodovnichenko, **The GUM facade faces Red Square**, 2009, CC BY-SA 2.0:
https://commons.wikimedia.org/wiki/File:The_GUM_facade_faces_Red_Square_(4167126227).jpg
Official historical context: https://gumrussia.com/history/
Map anchor derives from the existing OSM scene; retain its OpenStreetMap/ODbL attribution.

**Unverified:** exact bay count and spacing, window heights, ornament shapes, stone colour and weathering, storefront configuration and survey alignment. The study overlays a flat facade on the mapped mass; it does not reconstruct entrances, returns or the entire GUM building. No claim of photogrammetry, survey accuracy or finished hyperrealism.

## Rebuild

From the repository root, using Blender 4.5:

```
blender --background --python source/blender/gum-detail/build.py
```

This writes gum-detail.blend and three Cycles previews here; public/assets/gum-detail.glb and public/assets/materials/*.png are used by the game. Procedural construction and previews can take several minutes. The GLB is also suitable for an Unreal import experiment; no Unreal project or performance validation is included.

## Next quality gate

Calibrate a specific 30–50m facade against more photographs and measured dimensions, replace repeated approximation with its real bay sequence, add roof and entrance detailing, test a licensed scan material, integrate a rigged character, then compare actual game views against those references. Unreal was not found in the standard local application locations during this pass. The browser game remains the tested delivery target.
