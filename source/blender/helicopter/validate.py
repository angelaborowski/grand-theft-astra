"""Reimport validation plus rotor geometry invariance under rotation."""
import bpy, json, math, hashlib
from pathlib import Path
from mathutils import Vector
D=Path(__file__).resolve().parent;p=D.parents[2]/'public/assets/vehicles/helicopter.glb'
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(p))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];points=[];tri=0
for o in meshes:
 assert o.data.uv_layers.active,o.name
 assert all(math.isfinite(c) for v in o.data.vertices for c in v.co)
 o.data.calc_loop_triangles();tri+=len(o.data.loop_triangles)
 points.extend(o.matrix_world@v.co for v in o.data.vertices)
assert tri<100000 and p.stat().st_size<8000000
assert min(v.z for v in points)>-.001
main=bpy.data.objects['MainRotor'];tail=bpy.data.objects['TailRotor']
assert main.type=='EMPTY' and tail.type=='EMPTY'
assert len([o for o in main.children if o.name.startswith('MainRotorBlade')])==2
assert len([o for o in tail.children if o.name.startswith('TailRotorBlade')])==2
rotors={}
for ob,axis,diameter in [(main,2,10.16),(tail,0,1.65)]:
 pivot=ob.matrix_world.translation.copy()
 blades=[o for o in ob.children if o.name.startswith(ob.name+'Blade')]
 verts=[o.matrix_world@v.co for o in blades for v in o.data.vertices]
 dim_axis=0 if ob==main else 2
 measured=max(v[dim_axis] for v in verts)-min(v[dim_axis] for v in verts)
 assert abs(measured-diameter)<.002,(ob.name,measured)
 before=sorted((v-pivot).length for v in verts)
 ob.rotation_euler[axis]+=math.pi/2;bpy.context.view_layer.update()
 after=sorted((o.matrix_world@v.co-pivot).length for o in blades for v in o.data.vertices)
 assert max(abs(a-b) for a,b in zip(before,after))<1e-5
 ob.rotation_euler[axis]-=math.pi/2;bpy.context.view_layer.update()
 rotors[ob.name]={'pivot_gltf_xyz':[pivot.x,pivot.z,-pivot.y],'spin_axis_gltf':'Y' if ob==main else 'X','diameter_m':measured,'rotation_radius_preserved':True}
report={'glb_reimported':True,'triangles':tri,'meshes':len(meshes),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'finite_coordinates':True,'uvs':True,'dimensions_gltf_xyz':[max(v.x for v in points)-min(v.x for v in points),max(v.z for v in points)-min(v.z for v in points),max(v.y for v in points)-min(v.y for v in points)],'ground_min_y':min(v.z for v in points),'rotors':rotors,'forward':'+Z','up':'+Y','units':'metres'}
(D/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
