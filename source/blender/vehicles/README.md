# Vehicle geometry and React integration

Three original, editable Blender models with exported geometry, UVs, material slots, wheel pivots, and studio renders. One Blender unit is one metre; Blender -Y exports to game +Z. No paid generation or third-party meshes were used.

- `ferrari-12cilindri.blend` / `.png`: photo-guided Ferrari 12Cilindri approximation. Continuous subdivided body, boolean wheel openings, dark cabin, slim lamps, front band, alloy wheels, brake discs/calipers, mirrors, diffuser and exhausts. Export: `public/assets/vehicles/ferrari-12cilindri.glb`.
- `mila-scooter.blend` / `.png`: burgundy step-through scooter based on the repository Mila reference, with rectangular headlamp, spoked wheels, saddle, fork, mirrors, footboard, delivery box, exhaust, and stand.
- `sedan.blend` / `.png`: retained generic blue sedan, with separate body/cabin, doors, trim, lights, handles, mirrors and wheels. This is a schematic asset, not a real marque reconstruction.

## Reference and accuracy

Inspected Mila reference: `public/assets/characters/mila-reference.png` (existing repository asset, preserved).
Inspected Ferrari front and side photos from [Auto Express, 3 May 2024](https://www.autoexpress.co.uk/ferrari/363052/new-ferrari-12cilidri-revealed-pictures). Photos were used as visual references only and are not redistributed or embedded as textures. Brand/model names identify the design reference; no manufacturer endorsement or CAD provenance is claimed.

The Ferrari captures major visual cues but is **not a faithful production-quality reconstruction or hyperrealistic model**. Body curvature, roof, glazing, lights, wheel design and trim remain approximate. It is scaled to the existing game vehicle envelope rather than manufacturer dimensions. All models have simple PBR colors; no baked photographic textures, opening doors, usable interiors, suspension rig, steering rig or LODs. Scooter weathering and package labels visible in Mila's reference are not reproduced.

## Runtime behavior

`VehicleModel` loads the Ferrari as the existing canonical vehicle body's visual replacement, following the user's Ferrari request. Its red paint stays red; the prior color prop remains compatible and only tints the generic sedan's `BodyPaint` slot. The generic sedan export remains available for later asset selection. `primitive-entities.tsx` changes only the Vehicle body implementation and its import. `city-scene.tsx` adds a parked scooter two metres left of Mila's original scene anchor. This is a visual prop without actions, persistence or collider; Mila may walk away from it.

No stable IDs, coordinates, saved data, action rules, ownership, movement, driving controller or physics definitions change. The canonical entity still has its original Blue sedan name; a rename/vehicle catalogue requires coordination with the game owner. Wheel rotation derives from rendered displacement, using local X axle pivots, and ignores jumps of two metres or more. There is no new scooter driving system. Local loading/error boundaries keep asset failures contained.

## Reproduce and validate

Run Blender `--background --python source/blender/vehicles/build.py`, then `--background --python source/blender/vehicles/build-ferrari.py`, then `--background --python source/blender/vehicles/validate.py` from the repository. Construction preserves editable named parts and modifiers; evaluated meshes are exported. Studio helpers are only added after saving/exporting.

`validation.json` records measured triangles, dimensions, bytes, SHA-256, expected wheel pivots, UVs and finite coordinates after Blender GLB reimport. Budgets: under 100,000 triangles and 8 MB each; width under 2.6m, length under 4.6m, height under 1.9m. The same Blender reimport pattern as existing repository validators is used. The optional game-dev CLI was unavailable.

Validation completed: `pnpm check` (lint, format, strict types, core and legacy tests, production build); direct visual inspection of all three Blender renders; independent review and actual Three GLTFLoader import of all exports (four/four/two correctly matched wheel pivots). Review findings for Object3D pivot types and missing error boundaries were fixed and re-reviewed. The build reports its existing large-chunk warning. Full in-game GPU/playthrough inspection was not performed in this isolated clone; shared development servers were not modified or replaced.

## Curved canopy and tyre pass

The Ferrari now has a continuous curved windscreen/roof/rear-screen surface, with narrow roof rails following the same profile, instead of the separate rectangular roof slab. The canopy perimeter intersects the existing body to avoid a floating windscreen edge. A profiled tyre mesh replaces the torus silhouette; the four original wheel pivot names and translations are unchanged. Paint clearcoat is exported through glTF material parameters. The existing vehicle envelope and approximate body remain; this is not a new claim of manufacturer-accurate geometry.

[Ferrari's 12Cilindri launch description](https://cdn.ferrari.com/cms/network/media/pdf/CS_Ferrari_12Cilindri_gbr.pdf) describes continuity between windscreen, dark roof and rear screen. That design relationship informs this pass; the current geometry is still an interpretation at the game's existing scale.

`ferrari-before.png` and `ferrari-after.png` render the old and revised GLBs with identical camera and lights. `render-export.py` reproduces this check:

```sh
blender --background --factory-startup --python-exit-code 1 --python source/blender/vehicles/render-export.py -- public/assets/vehicles/ferrari-12cilindri.glb source/blender/vehicles/ferrari-after.png
```

The before image uses the GLB from parent commit `b51fd71`; retain that commit to reproduce it. Independent review checked the wheel pivots and identified the canopy gap fixed in this pass. GLB reimport validation passes. A separate Three.js GPU viewer verifies model import and wheel rotation; this is distinct from a driving playthrough in the parent game's current mission build.

The Ferrari carries ivory `ASTRA` / `MOBILE` lettering on both doors at the user's request. The text is converted to subdivided mesh geometry and projected onto the body surface, so it survives GLB export without external fonts or textures.
