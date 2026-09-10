# Mila Blender study — likeness NOT accepted

An original mesh study guided by the approved Higgsfield image in `reference.png`. No paid generation, image-to-3D reconstruction, or new credits were used. The source is editable and the runtime path remains `public/assets/characters/mila-study.glb`.

This refinement broadens the jaw, reduces the eyes and brows, shapes the mouth and nose relief, replaces hair tubes with tapered layers over a continuous scalp, and adds a raised jacket collar, cuffs, waistband and garment seams. Continuous trouser legs and sleeves now blend knee/elbow weights instead of leaving separate rigid sections. The mesh drops from 113,016 to 69,128 triangles; 686 exported vertices have blended weights. Original 13-bone skeleton and Idle/Walk remain; Greet is included for the cast contract.

Open `comparison.html` for matched before/after renders and the reference. `export-walk.png` and `export-greet.png` are actual sampled poses after importing the exported runtime GLB into Blender. They are not browser captures or animation certification. The current web client already maps Mila to this runtime path; no game code changed.

The study remains stylized and does not meet realistic likeness acceptance. Hair still reads as authored layers with prominent crown highlights, the face differs from the reference, clothing lacks fabric textures and natural folds, hands and accessories are simple, and shoulders/hips retain rigid attachment. No facial rig, finger bones, foot IK or root motion is present. Side/back details are reconstruction choices from a single front reference. Materials use portable flat-color PBR values without photographic textures.

From repository root:

```sh
blender --background --python-exit-code 1 --python source/characters/mila-study/build.py
cp source/characters/mila-study/mila-study.glb public/assets/characters/mila-study.glb
python3 source/characters/mila-study/validate.py
blender --background --python-exit-code 1 --python source/characters/mila-study/render-export.py
pnpm check
```

`validate.py` checks actual runtime/source byte equality, GLB framing, finite accessors, 13 joints, animation clips and time samples, normalized weights, joint indices and the triangle budget. `validation.json` records the exported hash and counts. The optional game-dev CLI was unavailable on PATH; no canonical game-dev package is claimed.

Independent review identified crown facets, separate nose-wing beads and disconnected knee meshes. The nose beads were removed, the scalp subdivided, and knees/elbows rebuilt with continuous blended meshes. Static validation and repository checks passed. Browser verification remains for parent integration; no shared checkout, server, saves, helicopter or vehicles were modified.
