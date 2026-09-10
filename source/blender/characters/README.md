# Original rigged courier prototype

An original Blender-built adult figure replaces the box figures in-game. It has a 13-bone skeleton, mesh weights and Idle/Walk animation clips. The six named NPCs and roaming residents share the body with clothing-colour variations; Lev and Alexei also have grey hair. This is a stylized intermediate asset, not a realistic scan or a recreation of the approved Higgsfield portraits. Its rigid part weights, simple face and clothing require a dedicated character-art pass.

Rebuild: `blender --background --python-exit-code 1 --python source/blender/characters/build.py`.
The GLB was reimported in Blender and checked for finite coordinates, skeleton and animation actions. Blender also generates a helper Icosphere for bone display during import; it is not a character skin mesh.

No external character meshes or textures are used. All source geometry is generated here.
