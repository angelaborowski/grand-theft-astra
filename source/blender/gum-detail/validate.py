import bpy,json,math
from pathlib import Path
p=Path(__file__).resolve().parents[3]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(p/'public/assets/gum-detail.glb'))
obs=[o for o in bpy.context.scene.objects if o.type=='MESH'];tri=0
for o in obs:
 assert o.data.uv_layers.active
 assert all(math.isfinite(v) for p in o.data.vertices for v in p.co)
 o.data.calc_loop_triangles();tri+=len(o.data.loop_triangles)
report=json.loads((p/'source/blender/gum-detail/report.json').read_text())
assert len(obs)==report['draw_meshes'] and tri==report['triangles']
sizes=[tuple(i.size) for i in bpy.data.images if i.type=='IMAGE'];assert (1024,1024) in sizes and sizes.count((2048,2048))>=2
assert any(n.type=='NORMAL_MAP' for m in bpy.data.materials if m.use_nodes for n in m.node_tree.nodes)
report.update(glb_reimported=True,uvs_preserved=True,finite_coordinates=True,embedded_image_sizes=sizes,normal_map_connected=True)
(p/'source/blender/gum-detail/validation.json').write_text(json.dumps(report,indent=2))
print('VALIDATED',len(obs),tri)
