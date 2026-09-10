"""Mapped context trees; Blender 5.1, metres, native city coordinates."""
import bpy, math, random, json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
D=Path(__file__).resolve().parent; A=D.parents[2]/'public/assets'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(A/'red-square.glb'))
v=[];f=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH' or any(k in o.name.lower() for k in ['ground','terrain','paving']):continue
 off=len(v);v.extend(tuple(o.matrix_world@p.co) for p in o.data.vertices);f.extend(tuple(off+i for i in p.vertices) for p in o.data.polygons)
bvh=BVHTree.FromPolygons(v,f)
bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(n,c):
 m=bpy.data.materials.new(n);m.diffuse_color=(*c,1);m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*c,1);m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.94;return m
bark=mat('Trees | bark',(.12,.085,.055));leaves=[mat('Trees | foliage '+str(i),c) for i,c in enumerate([(.12,.22,.048),(.18,.28,.067),(.09,.18,.035),(.23,.31,.082)])]
def branch(a,b,r):
 d=Vector(b)-Vector(a);bpy.ops.mesh.primitive_cone_add(vertices=7,radius1=r,radius2=r*.5,depth=d.length,location=(Vector(a)+Vector(b))/2);o=bpy.context.object;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.data.materials.append(bark);return o
a=math.radians(41.6);positions=[];excluded=[]
for n in json.loads((D/'osm-trees.json').read_text())['elements']:
 e=(n['lon']-37.620)*111320*math.cos(math.radians(55.754));north=(n['lat']-55.754)*111320
 x=e*math.sin(a)+north*math.cos(a);y=-e*math.cos(a)+north*math.sin(a)
 if not (x < -85 and abs(y)<500):continue
 # A 5m crown clearance around each mapped root against current building surfaces.
 blocked=False
 for dx,dy in [(0,0),(5,0),(-5,0),(0,5),(0,-5)]:
  hit,_,_,_=bvh.ray_cast(Vector((x+dx,y+dy,200)),Vector((0,0,-1)),199)
  if hit is not None:blocked=True;break
 if blocked or any(math.hypot(x-p['x'],y-p['y'])<5 for p in positions):excluded.append(n['id']);continue
 rng=random.Random(n['id']);h=rng.uniform(10,16);r=rng.uniform(3,4.4)
 before=set(bpy.context.scene.objects)
 branch((x,y,0),(x+.2,y-.15,h*.73),.23)
 for k in range(7):
  ang=k*math.tau/7+rng.uniform(-.3,.3);rr=r*rng.uniform(.4,.85);z=h*rng.uniform(.57,.81);cx=x+math.cos(ang)*rr;cy=y+math.sin(ang)*rr
  branch((x,y,h*.4),(cx,cy,z),.095)
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=(cx,cy,z));o=bpy.context.object;o.scale=(r*.64,r*.64,h*.19);o.rotation_euler.z=ang
  for p in o.data.vertices:p.co*=rng.uniform(.87,1.13)
  o.data.materials.append(leaves[k%len(leaves)])
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=(x,y,h*.84));o=bpy.context.object;o.scale=(r*.7,r*.7,h*.16);o.data.materials.append(leaves[1])
 col=bpy.data.collections.new('OSM tree '+str(n['id']));bpy.context.scene.collection.children.link(col)
 for o in set(bpy.context.scene.objects)-before:
  for c in list(o.users_collection):c.objects.unlink(o)
  col.objects.link(o);o['osm_node']=str(n['id']);o['height_status']='Art-directed approximate';o['source']='https://www.openstreetmap.org/node/'+str(n['id'])
 positions.append({'osm_node':n['id'],'x':round(x,3),'y':round(y,3),'height':round(h,2)})
bpy.context.scene.unit_settings.system='METRIC'
bpy.ops.wm.save_as_mainfile(filepath=str(D/'city-landscape.blend'))
# Consolidate runtime meshes by material; editable source above retains individual trees.
source=list(bpy.context.scene.objects)
for ma in [bark,*leaves]:
 source=list(bpy.context.scene.objects)
 bpy.ops.object.select_all(action='DESELECT');group=[o for o in source if o.type=='MESH' and o.data.materials[0]==ma]
 if not group:continue
 for o in group:o.select_set(True)
 bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();bpy.context.object.name=ma.name
tri=0
for o in bpy.context.scene.objects:
 if o.type=='MESH':o.data.calc_loop_triangles();tri+=len(o.data.loop_triangles)
bpy.ops.export_scene.gltf(filepath=str(A/'city-landscape.glb'),export_format='GLB',export_yup=True)
(D/'report.json').write_text(json.dumps({'trees':len(positions),'triangles':tri,'runtime_meshes':5,'positions':positions,'excluded_overlap_nodes':excluded,'projection':'Local tangent approximation, origin 55.754N 37.620E, X bearing 41.6deg','scope':'Mapped context tree subset only. Crown dimensions and species appearance approximate.'},indent=2)+'\n')
print('LANDSCAPE_DONE',len(positions),tri)
