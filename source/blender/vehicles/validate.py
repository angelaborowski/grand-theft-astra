import bpy, json, math, hashlib
from pathlib import Path
from mathutils import Vector
D=Path(__file__).resolve().parent;A=D.parents[2]/'public/assets/vehicles';reports=[]
for name,count in [('sedan',4),('mila-scooter',2),('ferrari-12cilindri',4)]:
 p=A/(name+'.glb');bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(p));meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];tri=0;points=[]
 for o in meshes:
  assert o.data.uv_layers.active, o.name
  assert all(math.isfinite(v) for p in o.data.vertices for v in p.co)
  o.data.calc_loop_triangles();tri+=len(o.data.loop_triangles);points.extend(o.matrix_world@Vector(v) for v in o.bound_box)
 wheels=[o for o in bpy.context.scene.objects if o.type=='EMPTY' and o.name.startswith(('WheelFront','WheelRear'))];assert len(wheels)==count, [o.name for o in wheels]
 dims=[max(v[i] for v in points)-min(v[i] for v in points) for i in range(3)]
 assert tri<100000;assert p.stat().st_size<8000000
 assert min(v.z for v in points)>-.08
 assert dims[0]<2.6 and dims[1]<4.6 and dims[2]<1.9,dims
 reports.append(dict(asset=name,triangles=tri,meshes=len(meshes),wheel_pivots=[o.name for o in wheels],dimensions_blender_xyz=dims,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),reimported=True,finite_coordinates=True,uvs=True))
(D/'validation.json').write_text(json.dumps(reports,indent=2));print(json.dumps(reports,indent=2))
