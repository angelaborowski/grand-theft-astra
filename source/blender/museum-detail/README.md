# Historical Museum facade accuracy pass

An editable, photo-informed facade improvement to the existing mapped building shell. Final export: 58,560 triangles, 11 material meshes, 4.54 MB; see `qa.md`. It is an approximation, not a survey, photogrammetry, or a complete restoration model.

## Source and export

- `museum-detail.blend`: original named mapped shell objects plus individually editable facade components. Native metres; no root transform.
- `build.py`: opens `../red-square-refined.blend`, retains `Mapped | Historical Museum`, adds facade geometry, packs generated roughness, saves editable source, then consolidates the runtime export.
- `public/assets/museum-detail.glb` (repository root): full replacement for the existing city museum node, including its original surrounding parts.
- `validate.py`: verifies the original shell's vertices and polygon indices exactly, reopens the editable source, reimports the GLB, checks UVs, finite coordinates, bounds, embedded textures and runtime limits.
- `render.py`: two fixed camera comparisons of exported geometry. Before includes the existing runtime rectangular window grid reconstructed from `museumDetail`; only its rounded-box bevels are omitted. The baseline also mirrors the runtime scanned-brick texture override and UV projection. These are Blender asset comparisons, not screenshots of a game session.
- `report.json` and `validation.json`: generated model counts and bounds; window positions are modeling parameters, not measured building dimensions.

```sh
BLENDER=/path/to/Blender.app/Contents/MacOS/Blender
"$BLENDER" --background --python-exit-code 1 --python source/blender/museum-detail/build.py
"$BLENDER" --background --python-exit-code 1 --python source/blender/museum-detail/validate.py
"$BLENDER" --background --python-exit-code 1 --python source/blender/museum-detail/render.py -- before
"$BLENDER" --background --python-exit-code 1 --python source/blender/museum-detail/render.py -- after
```

## Integration contract

The parent task owns the shared scene code. Load `/assets/museum-detail.glb` inside the same group as `RED_SQUARE_SCENE.asset`; use the existing `RED_SQUARE_SCENE.offsetY`. No extra rotation, scale, or translation. glTF converts Blender `(x, y, z)` to game `(x, z, -y)`.

Hide the original city group: raw glTF name `Mapped | Historical Museum`, Three.js name `Mapped_|_Historical_Museum`. Do this before the loader’s Mesh-only early return. Its children have names such as `Mapped_|_Historical_Museum_export`; hiding just one child leaves overlapping old surfaces. The raw name is also recorded in `validation.json`. Remove the procedural `museumDetail(city)` facade from the loaded scene. Keep GUM, `extendGum`, terrain, tower assets, collision definitions and gameplay anchors unchanged. This asset does not open a traversable entrance.

The new material names intentionally do not match the existing loader's generic brick override (`Museum.*oxblood`, `red brick`, etc.). Preserve their authored red paint and pale metal appearance. Do not apply the generic red-brick texture to every new facade mesh.

## Evidence and decisions

Sources accessed 10 September 2026. Reference photographs are not redistributed or used as texture maps.

| Evidence | Supported observation | Model decision / uncertainty |
| --- | --- | --- |
| [Official museum history](https://shm.ru/kollektsii-i-muzeynyy-kompleks/museum_history/istoricheskiy-muzey/history/) and its [front photograph](https://shm.ru/upload/iblock/b01/gim.png) | Hierarchy of lower windows, tall hall windows, triple tower windows, red molded ornament, pointed parapets, light metal roofs, double entrance arch | Window families and red surrounds replace the uniform pale rectangular grid. Sizes, tier elevations and fine ornament are visually fitted to existing mapped parts, not measured. |
| [Public Domain Pictures: museum photograph](https://www.publicdomainpictures.net/en/view-image.php?image=211864&picture=state-historical-museum-moscow) | Closer view of arch layers, fanlights, pilasters, cornice corbels, roof surfaces | Used to cross-check material and detail character. Temporary banners in the photo are omitted. No photograph is bundled. |
| [OSM museum relation 5963922](https://www.openstreetmap.org/relation/5963922) and repository `building-parts.json` | Existing mapped footprints, stacking and height tags | Original shell vertex positions and polygon indices remain exactly unchanged. OSM is community mapping; dimensions are not verified survey evidence. |
| [UNESCO ensemble description](https://whc.unesco.org/en/list/545/) | Museum/GUM/cathedral/Kremlin/Mausoleum context | Landmark identities and ensemble relationships; not a source for exact facade dimensions. |

The public museum photo shows much more intricate sculpture and roofline articulation than this bounded pass. Finials, exact sculptural tower crowns (the new tiered arches are simplified), stair-stepped roof profiles, full side/rear windows and carved ornament remain priorities. Rectangular mapped tower bodies are retained. Facade layers extend at most approximately half a metre toward the square; they do not relocate the shell or collision footprint.

## Provenance and licensing

Original map data and its existing derived shell remain © OpenStreetMap contributors, ODbL 1.0. Preserve `../README.md`, `../map-layout.json`, `../building-parts.json` and [OSM attribution](https://www.openstreetmap.org/copyright). New procedural modeling scripts and generated roughness are authored for this repository; no third-party mesh or image texture is introduced. The 512 × 512 painted-brick roughness texture is a generic deterministic pattern, not a sampled museum surface.

Higgsfield: capabilities were inspected; balance was 6.68 credits. Recraft V4.1 1K material-study preflight estimated 1.25 credits. The generation request returned **Requires basic plan or higher**, with no job ID. No purchase or subscription was started, and no generated image was used as geometry or measurement evidence. Local Blender work continued.

## Runtime inspection

From the repository root, serve a temporary local static preview, then open `/source/blender/museum-detail/preview.html`. It uses the repository’s installed Three.js and original world-polish module. Before/After buttons share camera and lighting. Runtime screenshots in `previews/` show the whole city context with only the museum replaced; they are asset integration checks, not a full game playtest.
