import bpy,json,math,struct,hashlib
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
D=Path(__file__).resolve().parent;A=D.parents[2]/'public/assets/museum-interior.glb';r=json.loads((D/'report.json').read_text())
bpy.ops.wm.open_mainfile(filepath=str(D/'museum-interior.blend'));assert len([o for o in bpy.context.scene.objects if o.type=='MESH'])==r['editable_meshes']
arch=bpy.data.objects['Entrance arch infill'];wall=bpy.data.objects['End wall pier'];assert abs(min(v.co.y for v in arch.data.vertices)-min(v.co.y for v in wall.data.vertices))>.03
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(A));v=[];f=[];tri=0;meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
for o in meshes:
 me=o.data;me.calc_loop_triangles();tri+=len(me.loop_triangles);off=len(v);v.extend(tuple(o.matrix_world@p.co) for p in me.vertices);f.extend(tuple(off+i for i in p.vertices) for p in me.polygons)
 assert me.uv_layers.active is not None
assert all(math.isfinite(c) for p in v for c in p)
assert tri==r['triangles'] and len(meshes)==r['runtime_meshes'];assert tri<180000
bvh=BVHTree.FromPolygons(v,f);samples=[]
for x,y,z in [(0,1,0),(0,6,0),(0,7.15,.15),(0,8.35,.75),(0,9.25,1.2),(0,12,1.2),(0,25,1.2),(4.3,20,2.4),(4.3,28,1.2),(4.3,27.15,1.35),(4.3,25.05,2.4)]:
 hit,_,_,_=bvh.ray_cast(Vector((x,y,3)),Vector((0,0,-1)),4)
 assert hit is not None and abs(hit.z-z)<.035,(x,y,z,hit)
 samples.append({'blender_xy':[x,y],'height':round(hit.z,4),'expected':z})
for im in bpy.data.images:
 if im.source=='FILE':assert max(im.size)<=4096,im.name
bounds=[[round(min(p[i] for p in v),4),round(max(p[i] for p in v),4)] for i in range(3)]
checks={'passed':True,'triangles':tri,'meshes':len(meshes),'bytes':A.stat().st_size,'sha256':hashlib.sha256(A.read_bytes()).hexdigest(),'blender_bounds':bounds,'floor_samples':samples,'texture_limit':4096,'checks':['end arch separated from wall face','editable source mesh count','GLB reimport','finite vertices','UVs','triangle and mesh counts','central and gallery stair/floor heights','runtime texture size']}
(D/'validation.json').write_text(json.dumps(checks,indent=2)+'\n');print('VALIDATION_OK',tri,len(meshes))
