# Animated NPC cast — first playable interpretation

Six original Blender meshes now represent Mila, Lev, Niko, Irina, Sasha and Alexei. They follow costume descriptions from the separate character concept task. They are stylized procedural interpretations, **not converted Higgsfield portraits or photorealistic likenesses**. No additional image generation or credits were used.

Each GLB has a 13-bone skeleton and Idle, Walk and Greet clips. The client loads a separate asset per NPC, crossfades animation states, and falls back to the previous courier if an asset fails. Residents and remote players retain the courier prototype. Remote players now switch between walking and idle as their displayed position changes.

Named NPCs follow short visual routines within 0.8 m of their unchanged authoritative mission anchor. During the rest portion they greet nearby players. This does not add server AI, pathfinding or NPC collisions; proximity-driven gestures are local. Movement is interpolated from server time between updates. Existing reward, dialogue and persistence rules remain authoritative.

## Art identifiers

- Mila: mustard jacket, dark trousers, pale shoes, red messenger bag.
- Lev: long green coat, burgundy scarf, grey hair, modeled glasses and satchel.
- Niko: cobalt jacket, orange shoulder panels, curls and courier bag.
- Irina: plum cardigan, cream blouse, hair bun and buttons.
- Sasha: sage jacket, tied auburn hair, yellow headphones and brown boots.
- Alexei: navy jacket, reflective shoulder strips, grey moustache and black boots.

All share the original base topology. Faces, hands and skin materials are simple; weights are rigid per part. The walk has no foot IK or root motion and is deliberately a prototype. Realistic likeness, fabric textures, facial animation and production locomotion remain outstanding.

## Sources and rebuild

`build.py` creates the original courier. `build-cast.py` adds costume geometry and exports each cast member's editable `.blend` and runtime `.glb`. All geometry is original code-generated work; no external meshes or textures are embedded.

Concept provenance: separate task `01a08c3f-2fe3-7343-b5e4-75c04a708c45`, cast descriptions in its `outputs/cast/provenance.json` (Higgsfield Soul 2, 2D concepts). These descriptions informed the clothing only. The photos of the two real people in that task are excluded from this NPC cast.

From repository root:

```
blender --background --python-exit-code 1 --python source/blender/characters/build-cast.py
node source/blender/characters/validate-cast.mjs
npm test
```

`cast-validation.json` records byte sizes, SHA-256 hashes, expected bones/clips and finite float accessor checks for every GLB. Runtime browser spot checks found no errors; this is not a full device or deformation certification. The optional game-dev CLI was unavailable on PATH, so validation uses the local validator; no canonical game-dev package is claimed.

Open `/?view=gum` and use the six name buttons to inspect the cast, or enter the game to approach them.
