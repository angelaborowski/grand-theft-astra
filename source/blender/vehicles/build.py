import bpy, math, json
from pathlib import Path
from mathutils import Vector
D=Path(__file__).resolve().parent
A=D.parents[2]/'public/assets/vehicles'
def mat(n,c,metal=0,rough=.4):
 m=bpy.data.materials.new(n);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;return m
def box(n,p,s,m,b=.04):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=n;o.dimensions=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if b: mod=o.modifiers.new('Soft manufactured edges','BEVEL');mod.width=b;mod.segments=3
 o.modifiers.new('Surface normals','WEIGHTED_NORMAL');o.data.materials.append(m);return o
def rod(n,a,b,r,m):
 d=Vector(b)-Vector(a);bpy.ops.mesh.primitive_cylinder_add(vertices=20,radius=r,depth=d.length,location=(Vector(a)+Vector(b))/2);o=bpy.context.object;o.name=n;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();o.data.materials.append(m);return o
def wheel(n,x,y,r,w,spokes=False):
 bpy.ops.object.empty_add(location=(x,y,r));root=bpy.context.object;root.name=n
 bpy.ops.mesh.primitive_torus_add(major_radius=r*.77,minor_radius=r*.23,major_segments=40,minor_segments=12,location=(x,y,r),rotation=(0,math.pi/2,0));o=bpy.context.object;o.name=n+'_tire';o.data.materials.append(rubber);parts=[o]
 parts.append(rod(n+'_hub',(x-w/2,y,r),(x+w/2,y,r),r*.25,chrome))
 for side in [-1,1]:
  xx=x+side*w*.35
  bpy.ops.mesh.primitive_torus_add(major_radius=r*.56,minor_radius=.018,major_segments=32,minor_segments=8,location=(xx,y,r),rotation=(0,math.pi/2,0));o=bpy.context.object;o.data.materials.append(chrome);parts.append(o)
  for i in range(16 if spokes else 8):
   t=i*2*math.pi/(16 if spokes else 8);parts.append(rod(n+'_spoke',(xx,y,r),(xx,y+math.sin(t)*r*.55,r+math.cos(t)*r*.55),.009 if spokes else .035,chrome))
 for o in parts:o.parent=root;o.matrix_parent_inverse=root.matrix_world.inverted()
 return root
def shell(n,sections,m):
 verts=[]
 for y,w,z0,z1 in sections:verts.extend([(-w,y,z0),(w,y,z0),(w,y,z1),(-w,y,z1)])
 faces=[(3,2,1,0)]
 for i in range(len(sections)-1):
  for j in range(4):a=i*4+j;b=i*4+(j+1)%4;faces.append((a,b,b+4,a+4))
 k=(len(sections)-1)*4;faces.append((k,k+1,k+2,k+3));mesh=bpy.data.meshes.new(n);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(n,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(m);mod=o.modifiers.new('Panel rounding','BEVEL');mod.width=.045;mod.segments=3;o.modifiers.new('Normals','WEIGHTED_NORMAL');return o
for kind in ['sedan','mila-scooter']:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 paint=mat('BodyPaint',(.06,.22,.36) if kind=='sedan' else (.32,.018,.025),.65,.28);rubber=mat('Rubber',(.018,.022,.026),0,.82);chrome=mat('Brushed chrome',(.55,.59,.62),.85,.24);glass=mat('Smoked glass',(.045,.10,.14),.35,.18);lamp=mat('Headlamp ivory',(.95,.88,.62),.25,.2);red=mat('Tail lamp',(.55,.015,.009),.2,.25);black=mat('Seat vinyl',(.035,.027,.023),0,.65)
 if kind=='sedan':
  shell('Sculpted lower body',[(-2.08,.88,.48,.85),(-1.65,1,.48,1.02),(1.5,1,.48,1.03),(2.08,.9,.5,.88)],paint)
  shell('Cabin glass',[(-1.12,.86,1.0,1.08),(-.65,.77,1.02,1.65),(.55,.77,1.02,1.65),(1.05,.86,1.0,1.08)],glass)
  box('Roof',(0,-.05,1.67),(1.57,1.25,.08),paint)
  for x in [-.97,.97]:
   for y in [-.66,.3]:
    box('Door panel',(x,y,.86),(.035,.87,.3),paint,.015);box('Door handle',(x*1.025,y-.22,1.04),(.04,.17,.035),chrome,.01)
   rod('B pillar',(x*.82,-.1,1.05),(x*.79,-.1,1.65),.04,paint)
   box('Mirror',(x*1.1,.62,1.21),(.22,.28,.13),paint)
   for y in [-1.3,1.3]:wheel(('WheelFront' if y<0 else 'WheelRear')+('L' if x<0 else 'R'),x,y,.44,.25)
  for y in [-2.07,2.07]:
   box('Bumper',(0,y,.58),(1.86,.1,.16),chrome);box('License plate',(0,y*1.03,.75),(.48,.025,.14),lamp,.01)
   for x in [-.67,.67]:box('Headlamp' if y<0 else 'Tail light',(x,y,.88),(.43,.06,.17),lamp if y<0 else red)
  for x in [-.35,-.18,0,.18,.35]:box('Grille slat',(x,-2.105,.91),(.07,.03,.14),rubber,.005)
  # Blender -Y exports to game +Z, matching existing forward direction.
 else:
  for y,n in [(-.72,'WheelFront'),(.65,'WheelRear')]:wheel(n,0,y,.32,.14,True)
  box('Step through floor',(0,-.12,.35),(.48,.95,.12),paint)
  box('Rubber footboard',(0,-.12,.42),(.4,.73,.025),rubber,.01)
  shell('Rear body',[(-.05,.23,.39,.59),(.35,.3,.38,.79),(.85,.24,.4,.77)],paint)
  box('Black saddle',(0,.33,.87),(.54,.83,.16),black,.075)
  shield=box('Front leg shield',(0,-.62,.72),(.61,.15,.72),paint,.07);shield.rotation_euler.x=-.16
  box('Front mudguard',(0,-.73,.65),(.24,.6,.12),paint)
  for x in [-.1,.1]:rod('Front fork',(x,-.72,.32),(x,-.6,1.14),.026,chrome)
  rod('Steering column',(0,-.62,.8),(0,-.65,1.22),.045,chrome)
  box('Headlamp housing',(0,-.68,1.19),(.36,.24,.25),paint,.045);box('Chrome headlamp rim',(0,-.81,1.19),(.31,.035,.21),chrome,.04);box('Headlamp lens',(0,-.833,1.19),(.27,.02,.17),lamp,.035)
  rod('Handlebar',(-.43,-.6,1.17),(.43,-.6,1.17),.025,chrome)
  for x in [-1,1]:
   rod('Grip',(x*.29,-.6,1.17),(x*.46,-.6,1.17),.037,rubber);rod('Mirror stem',(x*.28,-.6,1.19),(x*.38,-.58,1.48),.009,chrome);box('Mirror',(x*.39,-.58,1.49),(.17,.04,.1),chrome)
  box('Delivery box',(0,.69,1.16),(.66,.56,.47),paint,.045);box('Box lid seam',(0,.69,1.32),(.675,.575,.025),rubber,.01)
  for x in [-.22,.22]:box('Delivery straps',(x,.69,1.402),(.025,.56,.012),black,.004)
  box('Rear lamp',(0,.99,.76),(.17,.04,.1),red)
  rod('Exhaust',(.26,.26,.3),(.26,.91,.3),.055,chrome);rod('Side stand',(-.14,.15,.4),(-.34,.25,.025),.018,chrome)
  for x in [-.22,.22]:rod('Rear spring',(x,.5,.35),(x,.3,.73),.025,chrome)
 # UV map all authored meshes; export evaluated bevel geometry.
 for o in list(bpy.context.scene.objects):
  if o.type=='MESH':
   bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project();bpy.ops.object.mode_set(mode='OBJECT');o.select_set(False)
 bpy.ops.wm.save_as_mainfile(filepath=str(D/(kind+'.blend')))
 bpy.ops.export_scene.gltf(filepath=str(A/(kind+'.glb')),export_format='GLB',export_apply=True)
 # Render the exact source with studio lights; presentation helpers aren't exported.
 box('Studio floor',(0,0,-.09),(200,200,.1),mat('Studio',(.13,.16,.18)),0)
 for p,power,size in [((4,-4,7),1700,5),((-4,-1,4),1000,4),((0,4,5),1500,3)]:
  bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,.7))-o.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add(location=(5,-7,3.7) if kind=='sedan' else (3,-4,2.3));c=bpy.context.object;c.rotation_euler=(Vector((0,0,.8))-c.location).to_track_quat('-Z','Y').to_euler();c.data.type='ORTHO';c.data.ortho_scale=5.9 if kind=='sedan' else 2.65
 s=bpy.context.scene;s.camera=c;s.render.engine='CYCLES';s.cycles.samples=24;s.render.resolution_x=1100;s.render.resolution_y=850;s.render.resolution_percentage=100;s.world=bpy.data.worlds.new('Studio world');s.world.color=(.25,.25,.25);s.render.filepath=str(D/(kind+'.png'));bpy.ops.render.render(write_still=True)
