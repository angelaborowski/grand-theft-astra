# Mila Blender study — likeness NOT accepted

A direct Blender attempt using the approved Higgsfield image `hf_20260910_170229_037338d8-7fa2-489d-b956-1b95e8203c5f.png`, copied as `reference.png`. No new paid generation. Original code-generated geometry; this is not image-to-3D reconstruction.

Built a shaped face surface, eyelids, lips, volumetric hair locks, open yellow/charcoal jacket, teal stripes, cropped shirt, cargo pockets, fingers/gloves, shoe laces, hoop earrings and red bag. Export includes the existing original 13-bone rig and Idle/Walk clips. Weights remain rigid per part, with no facial rig. There are no photographic/PBR skin or fabric textures; materials are flat colours.

Actual mesh renders: front.png, three-quarter.png and face.png. Inspection finds a stylized face that does not reproduce the reference likeness, stiff clothing and simple hands/hair. The study is deliberately not the default game character. It demonstrates authored geometry and the integration route, but fails the user's realistic character acceptance criterion.

Optional runtime preview: `http://localhost:4173/?view=gum&candidate=mila`, then click Mila. Ordinary game URLs retain existing assets. `?candidate=mila` also permits playing with this study as Mila.

Rebuild from repo root with Blender:
`blender --background --python-exit-code 1 --python source/characters/mila-study/build.py`

Copy the newly exported mila-study.glb to public/assets/characters/mila-study.glb after rebuilding. Source Blender file includes studio lights/camera; the GLB contains only the character and rig. Export stats are recorded in validation.json.
