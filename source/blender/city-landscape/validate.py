import bpy,json,math
from pathlib import Path
D=Path(__file__).resolve().parent;A=D.parents[2]/'public/assets/city-landscape.glb'
r=json.loads((D/'report.json').read_text());assert r['trees']>0
bpy.ops.wm.open_mainfile(filepath=str(D/'city-landscape.blend'))
assert len([c for c in bpy.data.collections if c.name.startswith('OSM tree ')])==r['trees']
for p in r['positions']:assert p['x'] < -85 and abs(p['y'])<500
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(A))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];tri=0
for o in meshes:
 o.data.calc_loop_triangles();tri+=len(o.data.loop_triangles)
 assert all(math.isfinite(v) for p in o.data.vertices for v in p.co)
assert len(meshes)==r['runtime_meshes'] and tri==r['triangles']
assert tri<150000
(D/'validation.json').write_text(json.dumps({'passed':True,'trees':r['trees'],'triangles':tri,'meshes':len(meshes),'bytes':A.stat().st_size,'checks':['editable tree collection count','all roots outside square boundary','finite exported coordinates','export mesh and triangle counts']},indent=2)+'\n')
print('VALIDATION_OK',r['trees'],tri)
