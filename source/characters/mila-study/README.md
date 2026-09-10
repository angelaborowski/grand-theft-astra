# Mila refined runtime asset

Mila now uses the shared `source/blender/characters/build-quality.py` pipeline. The local `build.py` delegates to it for Mila alone. The original procedural study remains in Git history. Runtime and study GLBs are byte-identical.

The current model uses a reshaped CC0 MakeHuman anatomical head, a CC0 skin map by MargaretToigo, fitted CC0 bob hair by MargaretToigo/MRT, and the project's authored jacket, cargo trousers, hands, shoes, accessories and 13-bone rig. Idle, Walk and Greet remain. Licence/source records are in `source/blender/characters/vendor/makehuman/SOURCES.md`.

The approved Higgsfield concept remains `reference.png`; no new paid generation was used. This is an approximate game-character refinement, not accepted realistic likeness or GTA/AAA quality. Hair, clothing construction and animation still differ from the reference. The current matched before/after and reimported poses are in `source/blender/characters/quality/comparison.html`.

From repository root:

```sh
blender --background --python-exit-code 1 --python source/characters/mila-study/build.py
python3 source/characters/mila-study/validate.py
blender --background --python-exit-code 1 --python source/characters/mila-study/render-export.py
```

Use the shared `validate-quality.py` for the entire cast. Browser verification is separate from the static and Blender import checks.
