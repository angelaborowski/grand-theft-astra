exec(open(str(__import__('pathlib').Path(__file__).with_name('build.py'))).read().split("for kind in ['sedan'")[0])
bpy.ops.wm.read_factory_settings(use_empty=True)
paint=mat('Ferrari red',(.65,.015,.022),.65,.23);rubber=mat('Rubber',(.012,.014,.018),0,.75);chrome=mat('Machined alloy',(.65,.68,.71),.85,.2);glass=mat('Dark glazing',(.015,.028,.04),.45,.16);black=mat('Carbon trim',(.018,.02,.025),.25,.35);lamp=mat('LED lenses',(.85,.94,1),.3,.15);red=mat('Tail lights',(.75,.008,.008),.25,.2)
# Dense longitudinal cross sections form continuous curved panels.
def loft(n,sections,m):
 verts=[];N=24
 for y,w,bottom,top in sections:
  for j in range(N):
   t=2*math.pi*j/N;x=w*math.copysign(abs(math.cos(t))**.55,math.cos(t));z=(top+bottom)/2+(top-bottom)/2*math.copysign(abs(math.sin(t))**.5,math.sin(t));verts.append((x,y,z))
 faces=[]
 for i in range(len(sections)-1):
  for j in range(N):a=i*N+j;b=i*N+(j+1)%N;faces.append((a,b,b+N,a+N))
 faces+=[tuple(reversed(range(N))),tuple((len(sections)-1)*N+j for j in range(N))]
 me=bpy.data.meshes.new(n);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(n,me);bpy.context.collection.objects.link(o);o.data.materials.append(m)
 for p in me.polygons:p.use_smooth=True
 mod=o.modifiers.new('Body curvature','SUBSURF');mod.levels=2
 bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
body=loft('12Cilindri sculpted body',[(-2.12,.8,.24,.63),(-2.06,.93,.23,.7),(-1.75,.97,.23,.82),(-1.3,1,.24,.99),(-.9,.96,.23,.91),(-.4,.91,.23,.89),(.25,.92,.23,.91),(.95,1.01,.24,1.04),(1.35,1.02,.26,1.03),(1.85,.96,.32,.93),(2.05,.9,.39,.87),(2.1,.87,.4,.85)],paint)
# Actual wheel openings cut through the body, not black discs over solid fenders.
for y in [-1.3,1.3]:
 bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=.46,depth=3,location=(0,y,.41),rotation=(0,math.pi/2,0));cut=bpy.context.object;bpy.context.view_layer.objects.active=body;mod=body.modifiers.new('Wheel arch','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cut;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cut,do_unlink=True)
# A continuous curved canopy replaces the rectangular glazing and floating roof slab.
canopy_sections=[(-.54,.73,.81,.885),(-.32,.70,.83,1.10),(-.12,.67,.84,1.23),(.08,.65,.84,1.31),(.35,.65,.85,1.34),(.65,.67,.88,1.33),(.90,.70,.90,1.24),(1.15,.73,.92,1.10),(1.35,.75,.93,.99)]
N=32;verts=[]
for y,w,base_z,top in canopy_sections:
 for j in range(N+1):
  a=-math.pi/2+j*math.pi/N;verts.append((w*math.sin(a),y,base_z+(top-base_z)*max(0,math.cos(a))**.38))
faces=[(i*(N+1)+j,i*(N+1)+j+1,(i+1)*(N+1)+j+1,(i+1)*(N+1)+j) for i in range(len(canopy_sections)-1) for j in range(N)]
me=bpy.data.meshes.new('Continuous canopy');me.from_pydata(verts,[],faces);me.update();canopy=bpy.data.objects.new('Curved windscreen roof and rear screen',me);bpy.context.collection.objects.link(canopy);me.materials.append(glass);me.materials.append(black)
for f in me.polygons:
 f.use_smooth=True;i=f.index//N;j=f.index%N
 if 3<=i<=5 and 6<=j<=25:f.material_index=1
# Sweeping roof rails and narrow pillars follow the same sampled canopy profile.
for sign in [-1,1]:
 for i in range(len(canopy_sections)-1):
  y,w,lo,hi=canopy_sections[i];yy,ww,ll,hh=canopy_sections[i+1]
  a=1.18
  rod('Curved roof rail',(sign*w*math.sin(a),y,lo+(hi-lo)*math.cos(a)**.38),(sign*ww*math.sin(a),yy,ll+(hh-ll)*math.cos(a)**.38),.012,paint)
# Clearcoat changes are exported PBR parameters, not Blender-only shader effects.
paint.node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value=.45
paint.node_tree.nodes.get('Principled BSDF').inputs['Coat Roughness'].default_value=.20
for x in [-1,1]:
 box('Side skirt',(x*.94,0,.24),(.095,1.75,.09),black)
 box('Mirror stem',(x*.86,-.19,1.02),(.19,.06,.045),black);box('Red mirror',(x*.97,-.19,1.06),(.22,.16,.11),paint,.05)
 box('Flush door handle',(x*.945,.63,.89),(.025,.16,.025),black,.008)
 for y in [-1.3,1.3]:
  root=wheel(('WheelFront' if y<0 else 'WheelRear')+('L' if x<0 else 'R'),x*.96,y,.41,.24)
  # A profiled low-aspect tyre replaces the round inner-tube silhouette.
  old_tire=next(o for o in root.children if '_tire' in o.name)
  bpy.data.objects.remove(old_tire,do_unlink=True)
  profile=[(-.115,.265),(-.127,.30),(-.124,.36),(-.106,.394),(-.077,.409),(.077,.409),(.106,.394),(.124,.36),(.127,.30),(.115,.265)]
  vv=[];count=64
  for xx,rr in profile:
   for i in range(count):
    t=i*math.tau/count;vv.append((x*.96+xx,y+math.sin(t)*rr,.41+math.cos(t)*rr))
  ff=[(j*count+i,j*count+(i+1)%count,((j+1)%len(profile))*count+(i+1)%count,((j+1)%len(profile))*count+i) for j in range(len(profile)) for i in range(count)]
  tire_mesh=bpy.data.meshes.new('Profiled tyre');tire_mesh.from_pydata(vv,[],ff);tire_mesh.update();tire=bpy.data.objects.new(root.name+'_tire',tire_mesh);bpy.context.collection.objects.link(tire);tire.data.materials.append(rubber);tire.parent=root;tire.matrix_parent_inverse=root.matrix_world.inverted()
  for f in tire_mesh.polygons:f.use_smooth=True
  for child in root.children:
   if child.name.startswith('Torus'):
    child.scale.x=child.scale.y=1.22
  # Replace generic spokes with five paired forged spokes.
  for o in list(root.children):
   if '_spoke' in o.name:bpy.data.objects.remove(o,do_unlink=True)
  for side in [-1,1]:
   xx=x*.96+side*.10
   for i in range(5):
    for offset in [-.065,.065]:
     t=i*2*math.pi/5+offset;o=rod('Forged spoke',(xx,y+math.sin(t)*.09,.41+math.cos(t)*.09),(xx,y+math.sin(t+.14)*.285,.41+math.cos(t+.14)*.285),.023,chrome);o.parent=root;o.matrix_parent_inverse=root.matrix_world.inverted()
  o=rod('Brake disc',(x*.96-.045,y,.41),(x*.96+.045,y,.41),.25,chrome);o.parent=root;o.matrix_parent_inverse=root.matrix_world.inverted()
  box('Yellow caliper',(x*.96,y+.2,.46),(.13,.1,.25),mat('Caliper yellow '+str(x)+str(y),(.9,.55,.015),.35))
box('Black front band',(0,-2.075,.65),(1.8,.055,.15),black,.02)
box('Lower intake',(0,-2.15,.4),(1.4,.065,.22),black,.055)
box('Splitter',(0,-2.14,.24),(1.86,.15,.04),black,.015)
for x in [-.72,.72]:
 box('Slim front LED',(x,-2.111,.686),(.36,.02,.024),lamp,.009)
 box('Rear LED',(x,2.08,.8),(.35,.025,.035),red,.009)
 box('Hood vent',(x*.63,-1.28,.92),(.19,.42,.014),black,.02)
 for xx in [x-.065,x+.065]:rod('Exhaust tip',(xx,1.93,.41),(xx,2.15,.41),.055,chrome)
box('Rear diffuser',(0,2.05,.42),(1.52,.15,.16),black,.02)
for x in [-.5,-.25,0,.25,.5]:box('Diffuser vane',(x,2.08,.34),(.025,.29,.19),black,.005)
# Painted door lettering is real exportable geometry fitted to the existing body.
from mathutils.bvhtree import BVHTree
bpy.context.view_layer.update()
hull=BVHTree.FromObject(body,bpy.context.evaluated_depsgraph_get())
lettering=mat('Astra Mobile ivory lettering',(.91,.92,.86),0,.48)
for side in [-1,1]:
 for word,height,size in [('ASTRA',.67,.19),('MOBILE',.51,.09)]:
  bpy.ops.object.select_all(action='DESELECT')
  curve=bpy.data.curves.new('Astra Mobile lettering','FONT');curve.body=word;curve.align_x='CENTER';curve.align_y='CENTER';curve.size=size;curve.resolution_u=8
  label=bpy.data.objects.new('Astra Mobile '+word+(' left' if side<0 else ' right'),curve);bpy.context.collection.objects.link(label);label.select_set(True);bpy.context.view_layer.objects.active=label;bpy.ops.object.convert(target='MESH')
  label=bpy.context.object;label.data.materials.append(lettering)
  import bmesh
  bm=bmesh.new();bm.from_mesh(label.data);bmesh.ops.triangulate(bm,faces=list(bm.faces));bmesh.ops.subdivide_edges(bm,edges=list(bm.edges),cuts=3,use_grid_fill=True);bm.to_mesh(label.data);bm.free()
  for vertex in label.data.vertices:
   y=side*vertex.co.x;z=height+vertex.co.y
   hit,normal,index,distance=hull.ray_cast(Vector((side*2,y,z)),Vector((-side,0,0)),3)
   assert hit is not None,'Lettering must lie on the door surface'
   vertex.co=(hit.x+side*.006,y,z)
  label.select_set(False)
import bmesh
for o in list(bpy.context.scene.objects):
 if o.type=='MESH':
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
  if 'tire' in o.name:
   for face in o.data.polygons: face.use_smooth=True
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project();bpy.ops.object.mode_set(mode='OBJECT');o.select_set(False)
bpy.ops.wm.save_as_mainfile(filepath=str(D/'ferrari-12cilindri.blend'))
bpy.ops.export_scene.gltf(filepath=str(A/'ferrari-12cilindri.glb'),export_format='GLB',export_apply=True)
box('Studio floor',(0,0,-.075),(200,200,.1),mat('Studio',(.14,.16,.18)),0)
for p,power,size in [((4,-4,7),2000,5),((-4,-1,4),1300,4),((0,4,5),1800,3)]:
 bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object;o.data.energy=power;o.data.size=size;o.rotation_euler=(Vector((0,0,.6))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(5,-7,3.1));c=bpy.context.object;c.rotation_euler=(Vector((0,0,.65))-c.location).to_track_quat('-Z','Y').to_euler();c.data.type='ORTHO';c.data.ortho_scale=5.6
s=bpy.context.scene;s.camera=c;s.render.engine='CYCLES';s.cycles.samples=32;s.render.resolution_x=1200;s.render.resolution_y=850;s.render.resolution_percentage=100;s.world=bpy.data.worlds.new('Studio');s.world.color=(.3,.3,.3);s.render.filepath=str(D/'ferrari-12cilindri.png');bpy.ops.render.render(write_still=True)
