# Animated cast — full character refinement

The current builder is `build-quality.py`. It refines Mila, Lev, Niko, Irina, Sasha, Alexei, and the shared player/crowd body while preserving the 13-bone rig and Idle/Walk clips. Greet remains available. All runtime paths are unchanged; Mila uses `public/assets/characters/mila-study.glb`, the other named characters use their lowercase name, and player/crowd use `public/assets/courier-prototype.glb`.

The pass adds anatomical faces, individual jaw/nose proportions, age/freckle skin maps, fitted hair, continuous weighted knees/elbows, shaped fingers, structured shoes, garment folds, pockets, collar details and textile maps. The crowd body is decimated and retains a neutral textured `Jacket` material so the existing app palette can tint it. Heads and hair incorporate CC0 MakeHuman graphical assets. Licences, authors, original bytes and source URLs are in `vendor/makehuman/SOURCES.md`; original project garments/rigging remain editable.

All six approved cast concept images are preserved in `source/characters/references` (Mila reference in `source/characters/mila-study`). They guide costume and identity, but these models are still approximate game assets. This pass is not GTA/AAA-quality certification or accepted exact likeness. Five haircuts share a fitted base with silhouette changes, and locomotion remains a simple in-place cycle without finger/facial animation, foot IK or root motion. Clothing and face silhouettes still differ from the concepts. The 92 background residents share one mesh, not 92 unique likenesses.

`quality/comparison.html` presents actual before/after GLB reimport renders and sampled Walk/Greet poses. `quality/validation.json` records byte hashes, geometry budgets, texture counts, skin and animation checks. Original older builders remain historical sources; do not run `build-cast.py` to regenerate the refined runtime cast.

```sh
blender --background --python-exit-code 1 --python source/blender/characters/build-quality.py
python3 source/blender/characters/validate-quality.py
blender --background --python-exit-code 1 --python source/blender/characters/render-quality.py
pnpm check
```

Set `CHARACTER_SKIP_STUDIO=1` to export without source-scene studio renders. The `.blend` files remain editable either way. Exported textures are embedded; no remote asset fetch is required in the game. Independent review and browser integration evidence are reported separately from static validation.
