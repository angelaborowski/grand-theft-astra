import bpy,json,math
from pathlib import Path
D=Path(__file__).resolve().parent;A=D.parents[2]/'public/assets'
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(A/'world-detail.glb'))
obs=[o for o in bpy.context.scene.objects if o.type=='MESH'];tri=0
for o in obs:
 assert o.data.uv_layers.active
 assert all(math.isfinite(v)for p in o.data.vertices for v in p.co)
 o.data.calc_loop_triangles();tri+=len(o.data.loop_triangles)
r=json.loads((D/'report.json').read_text());assert tri==r['triangles'] and len(obs)==r['meshes']
r.update(glb_reimported=True,finite_coordinates=True,uvs_preserved=True)
(D/'validation.json').write_text(json.dumps(r,indent=2));print('WORLD_VALIDATED',tri)
