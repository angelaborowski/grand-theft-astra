# Red Square world detail

This pass replaces the previous Kremlin wall context and fictional gameplay bookstall with editable Blender geometry. It also supplies a Poly Haven brick material applied by the client to brick surfaces on existing landmarks. It does not replace their mapped geometry.

- Approximately 309m of wall, following the previous alignment and heights.
- Solid swallow-tail battlements, projecting masonry courses and a low stone edge outside the playable boundary.
- Fictional bookstall: individual counter and shelf planks, steel framing, a curved canvas canopy, covers/spines/page blocks on books.
- Poly Haven Red Brick colour, normal and roughness textures, CC0. The files and verified hashes are listed in public/assets/materials/scanned/provenance.json. Source: https://polyhaven.com/a/red_brick . Powered by Poly Haven. License: https://polyhaven.com/license .

Historical reference: https://kremlin-architectural-ensemble.kreml.ru/en-Us/architecture/view/bashni-kremlya/
Reference image catalogue: https://commons.wikimedia.org/wiki/Category:Quality_images_of_Moscow_Kremlin_Wall
The wall dimensions and battlement profile remain approximations. The material is generic brick, not sampled from the Kremlin. The bookstall is invented scenery. No claim of survey accuracy or finished hyperrealism.

Rebuild from repository root:
```
blender --background --python-exit-code 1 --python source/blender/world-detail/build.py
blender --background --python-exit-code 1 --python source/blender/world-detail/validate.py
```

The editable world-detail.blend preserves the wall and stall collections. The GLB consolidates meshes by collection/material. The game only hides the original wall/stall once the replacement asset loads; they remain a fallback on load failure. Existing gameplay collisions, prices and interactions are unchanged.

Inspect the Kremlin wall, Book stall and Cathedral buttons at http://localhost:4173/?view=gum . These are views of the actual game renderer.
