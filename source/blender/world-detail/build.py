"""Kremlin wall and fictional bookstall detail. Metres in existing Blender map frame."""
import bpy,math,json,random,bmesh
from pathlib import Path
from mathutils import Vector
D=Path(__file__).resolve().parent;A=D.parents[2]/'public/assets';random.seed(82)
bpy.ops.wm.read_factory_settings(use_empty=True);s=bpy.context.scene;s.unit_settings.system='METRIC'
def mat(name,col,rough=.8,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*col,1);b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*col,1);b.inputs['Roughness'].default_value=rough;b.inputs['Metallic'].default_value=metal;return m
brick=mat('World | weathered red brick',(.3,.06,.025));n=brick.node_tree.nodes;l=brick.node_tree.links;b=n.get('Principled BSDF')
for key,socket in [('Diffuse','Base Color'),('Rough','Roughness'),('nor_gl','Normal')]:
 im=bpy.data.images.load(str(A/'materials/scanned'/('red_brick-'+key+'.jpg')));im.colorspace_settings.name='sRGB' if key=='Diffuse' else 'Non-Color';im.pack();t=n.new('ShaderNodeTexImage');t.image=im
 if key=='nor_gl':nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.55;l.new(t.outputs['Color'],nm.inputs['Color']);l.new(nm.outputs['Normal'],b.inputs[socket])
 else:l.new(t.outputs['Color'],b.inputs[socket])
stone=mat('World | coping stone',(.23,.24,.22));iron=mat('Stall | dark painted steel',(.026,.04,.033),.45,.65);cloth=mat('Stall | ochre canvas',(.35,.23,.105),.94);paper=mat('Stall | page edges',(.65,.60,.47));woods=[mat('Stall | oak '+str(i),(.17+i*.017,.10+i*.009,.05+i*.006))for i in range(5)];covers=[mat('Stall | cloth binding '+str(i),c)for i,c in enumerate([(.16,.045,.025),(.04,.11,.085),(.06,.09,.14),(.29,.21,.08),(.20,.10,.12)])]
col=None
for name in ['World | Kremlin wall replacement','World | bookstall replacement']:
 c=bpy.data.collections.new(name);s.collection.children.link(c)
col=bpy.data.collections['World | Kremlin wall replacement']
def mesh(name,v,f,m):
 me=bpy.data.meshes.new(name);me.from_pydata(v,[],f);me.update();bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free();me.update();o=bpy.data.objects.new(name,me);col.objects.link(o);me.materials.append(m);uv=me.uv_layers.new()
 for f in me.polygons:
  ax=max(range(3),key=lambda i:abs(f.normal[i]));axes=[i for i in range(3) if i!=ax]
  for li in f.loop_indices:
   p=me.vertices[me.loops[li].vertex_index].co;uv.data[li].uv=(p[axes[0]]/2,p[axes[1]]/2)
 return o
def box(name,p,size,m):
 x,y,z=p;a,b,c=[v/2 for v in size];v=[(x+u*a,y+w*b,z+t*c) for u,w,t in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]];return mesh(name,v,[(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)],m)
def rod(name,a,b,r,m,N=12):
 a=Vector(a);b=Vector(b);d=(b-a).normalized();up=Vector((0,0,1))if abs(d.z)<.9 else Vector((0,1,0));u=d.cross(up).normalized();v=d.cross(u);vs=[tuple(p+r*(u*math.cos(t*2*math.pi/N)+v*math.sin(t*2*math.pi/N)))for p in[a,b]for t in range(N)];return mesh(name,vs,[tuple(range(N-1,-1,-1)),tuple(range(N,2*N))]+[(i,(i+1)%N,(i+1)%N+N,i+N)for i in range(N)],m)
for i in range(108):
 y=-169+i*2.86;x=-61+(y+175)/316*10
 box('Wall masonry bay',(x,y,7),(4.2,2.86,14),brick)
 for z,depth,h in [(13.5,4.45,.25),(14,4.7,.26),(.3,4.5,.6)]:box('Projecting brick course',(x,y,z),(depth,2.86,h),brick)
 profile=[(-.65,14.1),(.65,14.1),(.65,16.1),(.22,15.75),(0,15.05),(-.22,15.75),(-.65,16.1)]
 vs=[(xx,y+yy,z)for xx in [x+.9,x+2.2]for yy,z in profile];N=len(profile);mesh('Solid swallow-tail merlon',vs,[tuple(range(N-1,-1,-1)),tuple(range(N,2*N))]+[(j,(j+1)%N,(j+1)%N+N,j+N)for j in range(N)],brick)
 # Low coping line behind the current playable boundary.
 box('Stone edge',(x+5.7,y,.25),(.4,2.82,.5),stone)
col=bpy.data.collections['World | bookstall replacement'];x,y=56,-78
for k in range(16):box('Individual counter plank',(x-2.25+k*.3,y,1.18),(.29,2.55,.10),random.choice(woods))
for z in [.30,.75]:
 for k in range(14):box('Lower shelf plank',(x-2.1+k*.32,y,z),(.30,2.25,.065),random.choice(woods))
for xx in [-2.2,2.2]:
 for yy in [-1.1,1.1]:
  rod('Counter steel leg',(x+xx,y+yy,.15),(x+xx,y+yy,1.2),.045,iron)
  rod('Awning upright',(x+xx,y+yy,1.2),(x+xx,y+yy,2.65),.03,iron)
for xx in [-2.2,2.2]:rod('Canopy frame',(x+xx,y-1.45,2.65),(x+xx,y+1.45,2.65),.04,iron)
# Curved and sagging cloth canopy with a thick hanging edge.
N=32;v=[]
for xx in [-2.5,2.5]:
 for i in range(N+1):
  yy=-1.5+3*i/N;z=2.66+.16*math.cos(yy/1.5*math.pi/2)-.035*math.cos(i*math.pi/2);v.append((x+xx,y+yy,z))
mesh('Shaped cloth awning',v,[(i,i+1,i+N+2,i+N+1)for i in range(N)],cloth)
for yy in [-1.5,1.5]:box('Canvas valance',(x,y+yy,2.54),(5,.035,.23),cloth)
for i in range(22):
 xx=x-2.0+(i%11)*.39;yy=y-.64+(i//11)*1.15;h=random.uniform(.09,.22);z=1.25+h/2
 box('Book page block',(xx,yy,z),(.29,.43,h),paper)
 for zz in [z-h/2,z+h/2]:box('Cloth book cover',(xx,yy,zz),(.31,.46,.014),covers[i%5])
 box('Bound spine',(xx-.15,yy,z),(.018,.46,h),covers[i%5])
 for k in range(3):box('Page-edge separation',(xx,yy-.218,z-h*.3+k*h*.3),(.27,.003,.003),woods[3])
# Fully editable source and a consolidated game export.
for im in bpy.data.images:
 if im.source=='FILE':im.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(D/'world-detail.blend'))
bpy.ops.object.select_all(action='DESELECT');groups={}
for o in list(s.objects):
 if o.type=='MESH':groups.setdefault((o.users_collection[0].name,o.data.materials[0].name),[]).append(o)
export=[]
for (cn,mn),objs in groups.items():
 for o in objs:o.select_set(True)
 bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();o=bpy.context.object;o.name=cn+' / '+mn;export.append(o);bpy.ops.object.select_all(action='DESELECT')
for o in export:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(A/'world-detail.glb'),export_format='GLB',use_selection=True)
tri=0
for o in export:o.data.calc_loop_triangles();tri+=len(o.data.loop_triangles)
(D/'report.json').write_text(json.dumps({'triangles':tri,'meshes':len(export),'wall_length_m':308.88,'limits':['Wall follows previous approximate alignment and height, not a new survey.','Bookstall is fictional gameplay scenery.','Brick material is a generic Poly Haven CC0 surface, not sampled from Kremlin.']},indent=2))
print('WORLD_DETAIL_COMPLETE',tri)
