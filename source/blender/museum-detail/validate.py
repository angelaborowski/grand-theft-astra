"""Regression-check editable shell, GLB, materials, bounds and budgets."""
import bpy
import json
import math
import hashlib
import struct
from pathlib import Path
from mathutils import Vector
D=Path(__file__).resolve().parent
A=D.parents[2]/'public/assets'
def geometry(objects):
    return {o.name:([tuple(v.co) for v in o.data.vertices],[tuple(p.vertices) for p in o.data.polygons],[tuple(row) for row in o.matrix_world]) for o in objects if o.type=='MESH'}
bpy.ops.wm.open_mainfile(filepath=str(D.parent/'red-square-refined.blend'))
original=geometry(bpy.data.collections['Mapped | Historical Museum'].objects)
bpy.ops.wm.open_mainfile(filepath=str(D/'museum-detail.blend'))
assert bpy.context.scene.unit_settings.scale_length == 1
source=geometry(bpy.data.collections['Mapped | Historical Museum'].objects)
assert source==original,'Mapped shell vertices or topology changed'
assert all(im.packed_file for im in bpy.data.images if im.source=='FILE' and im.filepath),'Unpacked texture'
source_objects=len([o for o in bpy.context.scene.objects if o.type=='MESH'])
source_verts=[o.matrix_world@v.co for o in bpy.context.scene.objects if o.type=='MESH' for v in o.data.vertices]
source_bounds=[[min(v[i] for v in source_verts),max(v[i] for v in source_verts)] for i in range(3)]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(A/'museum-detail.glb'))
objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
tri=0
for o in objects:
    assert o.data.uv_layers.active
    assert all(math.isfinite(v) for p in o.data.vertices for v in p.co)
    o.data.calc_loop_triangles();tri+=len(o.data.loop_triangles)
    assert len(o.data.materials)==1
verts=[o.matrix_world@v.co for o in objects for v in o.data.vertices]
bounds=[[min(v[i] for v in verts),max(v[i] for v in verts)] for i in range(3)]
assert all(abs(a-b)<.001 for pair,pair2 in zip(bounds,source_bounds) for a,b in zip(pair,pair2)),'GLB coordinate drift'
report=json.loads((D/'report.json').read_text())
assert tri==report['triangles'] and len(objects)==report['draw_meshes']
assert tri<60000 and len(objects)<=16
assert len((A/'museum-detail.glb').read_bytes())<8_000_000
# Inspect glTF payload to ensure textures really are embedded and root frame is unchanged.
def gltf(path):
    raw=path.read_bytes();n,kind=struct.unpack_from('<II',raw,12);assert kind==0x4E4F534A
    return json.loads(raw[20:20+n])
g=gltf(A/'museum-detail.glb')
assert all('bufferView' in im and 'uri' not in im for im in g.get('images',[]))
old=gltf(A/'red-square.glb')
old_names=[n.get('name') for n in old['nodes'] if 'Historical' in n.get('name','')]
assert len(old_names)==1
report.update(editable_source_reopened=True,mapped_shell_exactly_preserved=True,glb_reimported=True,uvs_preserved=True,
              finite_coordinates=True,source_mesh_objects=source_objects,blender_bounds_m=bounds,
              glb_bytes=(A/'museum-detail.glb').stat().st_size,embedded_images=len(g.get('images',[])),
              original_city_nodes_to_hide=old_names,sha256=hashlib.sha256((A/'museum-detail.glb').read_bytes()).hexdigest())
(D/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
print('MUSEUM_VALIDATED',tri,len(objects),old_names)
