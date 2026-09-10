# Historical Museum entrance hall interior

A reference-informed Blender reconstruction of the entrance hall (Parade Vestibule / Парадные сени) and its landing. This is a first playable-scale interior study, not a surveyed reconstruction or the entire museum. The existing museum exterior is not modified.

## What is supported by references

The official museum venue brochure, pages 3–10, identifies the hall and gives its total area as **300 m²**. Photographs support tall decorated square piers, raised side galleries, a lower central approach with a stair, pale stone parapets, a painted barrel vault and a substantial timber portal. Later brochure staircase photographs belong to a different building on Revolution Square and were not used.

The 10 × 30 m working envelope, heights, bays, stair dimensions and proposed city anchor are provisional. The heritage passport describes the building but did not provide a usable measured interior plan in the inspected pages. Earlier discussion of architectural drawings did not establish measured dimensions. No claim of survey accuracy or finished hyperrealism is made.

The ceiling uses an approximate UV reprojection of a licensed photograph of the actual mural. It retains some photographic perspective and lighting; it is not a rectified, de-lit conservation texture. Wall scrollwork is newly generated ornament inspired by the references, not a reproduction of each historical motif. Timber carving and stone rosettes are simplified. The lions and detailed heraldic sculpture are not represented. The opposite hall remains closed rather than inventing its contents.

## Files and regeneration

- `museum-interior.blend`: editable mesh objects, materials, packed original textures, lighting and cameras.
- `make_textures.py`: generates original stone, oak, surface maps and painted scrollwork using Pillow and NumPy.
- `build.py`: regenerates geometry, saves the editable source, evaluates edge bevels, bounds runtime textures to 4096px, and consolidates the export by material.
- `public/assets/museum-interior.glb`: runtime mesh asset, no lights or cameras. The full-resolution ceiling source remains packed in Blender; the export uses a reduced copy in memory.
- `render.py`: Cycles reference renders of saved source geometry.
- `validate.py`: GLB reimport, finite coordinates, UVs, texture limits, source count and floor/stair height sampling.
- `integration.json`: local coordinate convention, route surfaces, provisional placement and lighting suggestions for the parent task.
- `preview.html`: Three.js asset viewer with three camera presets and a constrained central-hall walking mode. Serve repository root and open `/source/blender/museum-interior/preview.html`. This is not the full game.

Run texture generation with a Python environment containing Pillow and NumPy, then Blender 5.1.2 headlessly with `--python build.py`, followed by `--python validate.py` and `--python render.py`. Script paths are resolved relative to this source folder and repository structure. No provider or paid generation is used. The optional game-dev CLI was not available; the repository's Blender/GLB pipeline is used instead, without claiming a game-dev canonical-package receipt.

## Integration

Use a separately loaded interior scene or an explicit entry transition. The existing exterior still contains solid walls and a closed entrance; simply loading this GLB inside it does not make an entrance. The parent task owns entry/exit interactions, spawn/facing, collision and stair handling, outdoor/interior lighting, and saved-state compatibility. Do not add this asset globally to the exterior array without that work.

Local Blender X is across the hall, Y inward, Z up; threshold is (0,0,0). glTF converts to game (X,Z,-Y). All placement is supplied separately. The proposed exterior anchor is only a fitting hint, not a verified portal position. Avoid applying the anchor twice. The side galleries are decorative in this release: pier mouldings create narrow passages, so they are not declared traversable. Runtime preview deliberately restricts walking to the central clear corridor; it is not a general-purpose collision solver.

## Sources and license

See `ATTRIBUTION.md` and `LICENSE-LAL-1.3.txt`. This new interior asset, its photographic adaptation and original procedural additions are supplied under Free Art License 1.3 (SPDX **LAL-1.3**). This does not relicense pre-existing game code or exterior assets. Preserve attribution/license and the editable source availability when redistributing this asset.
