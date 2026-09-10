"""Historical Museum entrance hall study. Blender metres; +Y inward. Provisional dimensions."""
import bpy,math,json,random,sys
from pathlib import Path
from mathutils import Vector
D=Path(__file__).resolve().parent;T=D/'textures';A=D.parents[2]/'public/assets'
bpy.ops.wm.read_factory_settings(use_empty=True);S=bpy.context.scene;S.unit_settings.system='METRIC'
COL=None
def collection(name):
 global COL
 COL=bpy.data.collections.new(name);S.collection.children.link(COL)
def material(name,color,rough=.6,metal=0,texture=None):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;b=m.node_tree.nodes['Principled BSDF'];b.inputs['Base Color'].default_value=(*color,1);b.inputs['Roughness'].default_value=rough;b.inputs['Metallic'].default_value=metal
 if texture:
  im=bpy.data.images.load(str(T/texture),check_existing=True);tx=m.node_tree.nodes.new('ShaderNodeTexImage');tx.image=im;m.node_tree.links.new(tx.outputs['Color'],b.inputs['Base Color'])
  surface='wood' if texture=='oak.jpg' else ('stone' if 'marble' in texture or 'limestone' in texture else 'plaster')
  tx2=m.node_tree.nodes.new('ShaderNodeTexImage');tx2.image=bpy.data.images.load(str(T/(surface+'-roughness.png')),check_existing=True);tx2.image.colorspace_settings.name='Non-Color';m.node_tree.links.new(tx2.outputs['Color'],b.inputs['Roughness'])
  nm=m.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.18 if surface=='stone' else .08
  nt=m.node_tree.nodes.new('ShaderNodeTexImage');nt.image=bpy.data.images.load(str(T/'mineral-normal.png'),check_existing=True);nt.image.colorspace_settings.name='Non-Color';m.node_tree.links.new(nt.outputs['Color'],nm.inputs['Color']);m.node_tree.links.new(nm.outputs[0],b.inputs['Normal'])
 return m
stone=material('Interior | pale limestone',(.7,.65,.53),.48,texture='limestone.jpg');redstone=material('Interior | red marble',(.32,.13,.09),.42,texture='red-marble.jpg');dark=material('Interior | dark marble',(.07,.045,.03),.4,texture='dark-marble.jpg');oak=material('Interior | carved oak',(.25,.1,.03),.5,texture='oak.jpg');gold=material('Interior | antique brass',(.53,.32,.09),.29,.8);ochre=material('Interior | painted ochre',(.56,.36,.13),.8);red=material('Interior | vermilion border',(.36,.073,.035),.8);blue=material('Interior | blue limewash',(.28,.37,.39),.85);cream=material('Interior | warm plaster',(.7,.64,.46),.86);grout=material('Interior | mineral joints',(.18,.15,.11),.95);floral=material('Interior | original scrollwork',(.6,.5,.3),.8,texture='painted-scrollwork.png');fresco=material('Interior | ceiling photograph A.Savin FAL',(.5,.55,.5),.85,texture='ceiling-reference-asavin.jpg');glass=material('Interior | window glazing',(.29,.39,.42),.18,.15);bulb=material('Interior | warm lamp',(.95,.74,.4));bs=bulb.node_tree.nodes['Principled BSDF'];bs.inputs['Emission Color'].default_value=(1,.73,.38,1);bs.inputs['Emission Strength'].default_value=4

def mesh(name,v,f,ma,uv=None,smooth=False):
 me=bpy.data.meshes.new(name);me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(name,me);COL.objects.link(o);me.materials.append(ma)
 layer=me.uv_layers.new(name='UVMap')
 for p in me.polygons:
  p.use_smooth=smooth;n=p.normal
  for li in p.loop_indices:
   i=me.loops[li].vertex_index;c=me.vertices[i].co
   layer.data[li].uv=uv[i] if uv else ((c.y/2,c.z/4) if abs(n.x)>.6 else ((c.x/2,c.z/4) if abs(n.y)>.6 else (c.x/2,c.y/2)))
 return o

def box(n,loc,size,ma,bevel=0):
 x,y,z=loc;a,b,c=[q/2 for q in size];v=[(x+dx*a,y+dy*b,z+dz*c) for dx,dy,dz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
 o=mesh(n,v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],ma)
 if bevel:
  m=o.modifiers.new('Small worn edge','BEVEL');m.width=bevel;m.segments=2
 return o

def rod(n,a,b,r,ma,N=10,r2=None):
 a=Vector(a);b=Vector(b);axis=(b-a).normalized();u=axis.cross(Vector((0,0,1)))
 if u.length<.01:u=Vector((1,0,0))
 u.normalize();vv=axis.cross(u);v=[]
 for center,rr in [(a,r),(b,r if r2 is None else r2)]:
  for i in range(N):v.append(tuple(center+rr*(math.cos(i*math.tau/N)*u+math.sin(i*math.tau/N)*vv)))
 f=[tuple(reversed(range(N))),tuple(range(N,2*N))]+[(i,(i+1)%N,(i+1)%N+N,i+N) for i in range(N)]
 return mesh(n,v,f,ma,smooth=True)

def tube(n,points,r,ma,N=8):
 # Consecutive tube segments retain editable mesh members.
 for i in range(len(points)-1):rod(n,points[i],points[i+1],r,ma,N)

def arch(n,cx,cy,spring,r,width,depth,ma,axis='Y',N=48):
 v=[]
 for d in [-depth/2,depth/2]:
  for rr in [r,r+width]:
   for i in range(N+1):
    a=math.pi*i/N;q=rr*math.cos(a);z=spring+rr*math.sin(a)
    v.append((cx+q,cy+d,z) if axis=='Y' else (cx+d,cy+q,z))
 L=N+1;f=[]
 for i in range(N):f.extend([(i,i+1,L+i+1,L+i),(2*L+i,3*L+i,3*L+i+1,2*L+i+1),(i,2*L+i,2*L+i+1,i+1),(L+i,L+i+1,3*L+i+1,3*L+i)])
 f.extend([(0,L,3*L,2*L),(N,2*L+N,3*L+N,L+N)])
 return mesh(n,v,f,ma)

def panel(n,x,y,z,w,h,axis='Y'):
 # Original floral pattern UV scaled to the whole decorated panel.
 if axis=='Y':v=[(x-w/2,y,z),(x+w/2,y,z),(x+w/2,y,z+h),(x-w/2,y,z+h)]
 else:v=[(x,y-w/2,z),(x,y+w/2,z),(x,y+w/2,z+h),(x,y-w/2,z+h)]
 return mesh(n,v,[(0,1,2,3)],floral,[(0,0),(1,0),(1,h/(w*2)),(0,h/(w*2))])

def frame(n,x,y,z,w,h,ma=oak):
 for xx in [x-w/2,x+w/2]:box(n,(xx,y,z+h/2),(.1,.11,h),ma,.015)
 for zz in [z,z+h]:box(n,(x,y,zz),(w,.11,.1),ma,.015)

def floor(n,x0,x1,y0,y1,z):
 box(n+' substrate',((x0+x1)/2,(y0+y1)/2,z-.10),(x1-x0,y1-y0,.2),grout)
 step=.48
 for i in range(math.ceil((x1-x0)/step)):
  for j in range(math.ceil((y1-y0)/step)):
   xa=x0+i*step;xb=min(xa+step,x1);ya=y0+j*step;yb=min(ya+step,y1)
   # Alternating triangles form the reference's diagonal stone pattern.
   mid=((xa+xb)/2,(ya+yb)/2,z+.003)
   v=[(xa+.003,ya+.003,z+.003),(xb-.003,ya+.003,z+.003),(xb-.003,yb-.003,z+.003),(xa+.003,yb-.003,z+.003),mid]
   mesh(n+' light tessera',v,[(0,1,4),(2,3,4)],stone)
   mesh(n+' red tessera',v,[(1,2,4),(3,0,4)],redstone if (i+j)%4 else dark)
collection('01 | floors and stairs')
floor('Lower entrance floor',-3,3,0,7,0)
floor('Raised central landing',-3,3,9.4,30,1.2)
for i in range(8):
 y=7+i*.3;z=(i+1)*.15
 box('Central stair tread '+str(i+1),(0,y+.15,z/2),(6,.3,z),stone,.012)
 box('Stair nosing',(0,y+.025,z-.02),(6.03,.05,.035),stone,.01)
for side in [-1,1]:
 floor('Side gallery',3.7*side if side==1 else -5,5 if side==1 else -3.7,0,24.9,2.4)
 floor('Gallery approach',3*side if side==1 else -5,5 if side==1 else -3,27.3,30,1.2)
 # End gallery stairs are separate from the central route.
 for i in range(8):box('Gallery stair',(side*4.3,27.15-i*.3,1.2+(i+1)*.15/2),(1.4,.3,(i+1)*.15),stone,.01)
collection('02 | walls and piers')
for side in [-1,1]:
 x=side*5.15
 box('External backing wall',(x,15,5.65),(.3,30,11.3),cream)
 box('Gallery red dado',(side*4.975,15,2.8),(.045,30,.8),redstone)
 for y in [0,6,12,18,24,30]:
  for x in [side*3.35,side*4.98]:
   box('Pier stone plinth',(x,y,1.55),(.85,.88,3.1),stone,.025)
   box('Pier red foot',(x,y,.65),(.89,.92,1.3),redstone,.015)
   box('Pier shaft',(x,y,5.65),(.73,.78,5.1),red,.018)
   for dx in [-.372,.372]:panel('Painted pier side',x+dx,y,3.25,.62,4.8,'X')
   for dy in [-.398,.398]:panel('Painted pier face',x,y+dy,3.25,.57,4.8)
   for z,w,h in [(3.12,.99,.14),(3.23,.87,.1),(8.14,.89,.16),(8.3,1.02,.16),(8.46,1.13,.16)]:box('Pier moulding',(x,y,z),(w,w,h),stone,.017)
 # Arched openings along the nave and side aisle vaults.
 for y in [3,9,15,21,27]:
  arch('Longitudinal arcade',side*3.35,y,6.0,2.6,.34,.72,floral,'X')
  for dx in [-.38,.38]:
   arch('Red archivolt',side*3.35+dx,y,6.0,2.6,.055,.06,red,'X')
   arch('Pale outer archivolt',side*3.35+dx,y,6.0,2.89,.06,.065,stone,'X')
  # Side aisle ceiling, arched along the bay with pale blue plaster.
  v=[];f=[]
  for xx in [side*3.35,side*5.0]:
   for i in range(33):
    t=math.pi*i/32;v.append((xx,y+2.62*math.cos(t),6+2.62*math.sin(t)))
  for i in range(32):f.append((i,i+1,i+34,i+33))
  mesh('Side gallery vault',v,f,blue,smooth=True)
  panel('Gallery painted wall',side*4.97,y,3.35,4.65,2.55,'X')
 # Gallery parapets, repeated inset panels and rosettes.
 for y0,y1 in [(0,5.5),(6.5,11.5),(12.5,17.5),(18.5,23.5),(24.5,26.4)]:
  box('Stone gallery parapet',(side*3.52,(y0+y1)/2,2.92),(.24,y1-y0,1.04),stone,.025)
  for z in [2.43,3.38]:box('Parapet coping',(side*3.52,(y0+y1)/2,z),(.39,y1-y0+.04,.13),stone,.02)
  for y in [y0+.5+k*.9 for k in range(int((y1-y0)/.9))]:
   box('Parapet inset',(side*3.38,y,2.94),(.025,.66,.55),cream)
   for k in range(8):
    t=k*math.tau/8;rod('Stone rosette petal',(side*3.35,y,2.94),(side*3.34,y+.15*math.cos(t),2.94+.15*math.sin(t)),.045,stone,8)
collection('03 | painted barrel vault')
# Continuous longitudinal barrel; original photo UVs only cover the ceiling region.
v=[];uv=[];f=[];NX=64;NY=64
for j in range(NY+1):
 y=30*j/NY
 for i in range(NX+1):
  t=math.pi*i/NX;x=3.0*math.cos(t);z=8.45+3.0*math.sin(t)
  v.append((x,y,z));uv.append((.10+.80*j/NY,.18+.64*i/NX))
for j in range(NY):
 for i in range(NX):a=j*(NX+1)+i;f.append((a,a+1,a+NX+2,a+NX+1))
mesh('Photographic vaulted fresco, approximate reprojection',v,f,fresco,uv,True)
for y in [0,30]:
 arch('Transverse decorative arch',0,y,8.45,3,.25,.6,floral)
 for yy in [y-.31,y+.31]:arch('Arch red painted edge',0,yy,8.45,3,.055,.06,red)
collection('04 | portals and end walls')
for y in [0,30]:
 # End wall opening: entrance doorway remains clear below 3.7m.
 for side in [-1,1]:box('End wall pier',(side*3.25,y,4.2),(3.5,.35,8.4),cream)
 box('End wall upper lintel',(0,y,7.1),(3,.35,2.6),cream)
 arch('Entrance arch infill',0,y,2.4,1.5,1.45,.44,floral)
 vv=[(-2.95,y,5.81),(2.95,y,5.81)]+[(2.95*math.cos(i*math.pi/48),y,2.4+2.95*math.sin(i*math.pi/48)) for i in range(49)]
 mesh('End arch spandrel',vv,[tuple(range(len(vv)))],floral)
 for x in [-2.55,2.55]:panel('End wall arabesque',x,y+(.19 if y==0 else -.19),3.2,1.35,4.8)
 box('Wall over portal',(0,y,6.18),(3,.34,4.56),cream)
 vv=[(-3,y,8.45),(3,y,8.45)]+[(3*math.cos(i*math.pi/48),y,8.45+3*math.sin(i*math.pi/48)) for i in range(49)]
 mesh('Painted end lunette',vv,[tuple(range(len(vv)))],floral)
 panel('Painted wall above timber portal',0,y+(.19 if y==0 else -.19),5.4,2.9,2.4)
 # Triple clerestory group, bright glazing and timber mullions.
 for x,w,h in [(-1.32,.9,1.9),(0,1.1,2.25),(1.32,.9,1.9)]:
  z=8.0
  box('Clerestory glass',(x,y+(.2 if y==0 else -.2),z+h/2),(w,.06,h),glass)
  frame('Clerestory frame',x,y+(.25 if y==0 else -.25),z,w,h,oak)
  rod('Window vertical lead',(x,y+.26,z),(x,y+.26,z+h),.022,gold,6)
  for zz in [z+.45,z+.9,z+1.35]:box('Window lead',(x,y+.26,zz),(w,.035,.028),gold)
  arch('Clerestory crown',x,y,z+h,w/2,.14,.25,stone)
 # Massive timber portal surround and carved tiers.
 zbase=0 if y==0 else 1.2
 for x in [-1.57,1.57]:
  box('Portal jamb',(x,y,zbase+1.8),(.27,.48,3.6),oak,.025)
  for dx in [-.1,.1]:rod('Portal turned shaft',(x+dx,y-.27,zbase+.2),(x+dx,y-.27,zbase+3.2),.045,oak,12)
 arch('Carved portal head',0,y,zbase+2.45,1.42,.28,.48,oak)
 for zz,w in [(zbase+4.1,3.7),(zbase+4.3,3.9),(zbase+4.5,4.1)]:box('Portal cornice',(0,y,zz),(w,.52,.12),oak,.02)
 for x in [-1.6,-1.2,-.8,-.4,0,.4,.8,1.2,1.6]:
  # Raised foliate medallions across the lintel.
  for k in range(12):
   a=k*math.tau/12;b=(k+1)*math.tau/12
   rod('Carved lintel medallion',(x+.14*math.cos(a),y-.29,zbase+3.85+.14*math.sin(a)),(x+.14*math.cos(b),y-.29,zbase+3.85+.14*math.sin(b)),.023,ochre,6)
 # Tall carved pediment, reconstructed silhouette from the reference photos.
 vv=[(-1.65,y-.3,zbase+4.5),(1.65,y-.3,zbase+4.5),(.75,y-.3,zbase+5.75),(-.75,y-.3,zbase+5.75)]
 mesh('Timber portal pediment',vv,[(0,1,2,3)],oak)
 for aa,bb in [(vv[0],vv[3]),(vv[3],vv[2]),(vv[2],vv[1])]:rod('Pediment moulding',aa,bb,.08,ochre,10)
 for xx in [-.55,-.27,0,.27,.55]:rod('Pediment carving',(xx,y-.34,zbase+4.62),(xx,y-.34,zbase+5.65),.025,oak,8)
 rod('Portal finial',(0,y-.3,zbase+5.75),(0,y-.3,zbase+6.35),.13,oak,12,r2=.025)
 if y==30:
  box('Closed adjoining hall doors',(0,y-.1,2.7),(2.8,.16,3),oak,.018)
  for x in [-.7,.7]:
   for z in [1.55,2.5,3.45]:frame('Raised door panel',x,y-.21,z,1.1,.73)
  for x in [-.14,.14]:rod('Door handle',(x,y-.31,2.4),(x,y-.31,2.67),.027,gold)
 else:
  # Open leaves lie along the outside threshold, preserving a 2.8m opening.
  for x in [-1.5,1.5]:box('Open exterior door leaf',(x,-.74,1.5),(.14,1.45,3),oak,.02)
collection('05 | brass wall chandeliers')
for side in [-1,1]:
 for y in [6,12,18,24]:
  x=side*3.35;cx=x-side*.58;z=6.2
  rod('Sconce wall stem',(x,y,z-.6),(cx,y,z-.2),.065,gold,12)
  rod('Sconce central spindle',(cx,y,z-.65),(cx,y,z+.35),.075,gold,12,r2=.025)
  for k in range(8):
   a=k*math.tau/8;xx=cx+.38*math.cos(a);yy=y+.38*math.sin(a)
   pts=[]
   for j in range(7):
    t=j/6;pts.append((cx+.38*t*math.cos(a),y+.38*t*math.sin(a),z-.2-.17*math.sin(t*math.pi)))
   tube('Curved brass arm',pts,.018,gold)
   rod('Candle socket',(xx,yy,z-.2),(xx,yy,z-.11),.06,gold,12)
   rod('Ivory candle',(xx,yy,z-.11),(xx,yy,z+.15),.022,stone,10)
   rod('Warm flame',(xx,yy,z+.15),(xx,yy,z+.23),.026,bulb,10,r2=.005)
collection('06 | entrance vestibule and furnishings')
# Two low stone seats and raised brass handrails, no invented museum exhibits.
for side in [-1,1]:
 box('Marble seat',(side*2.45,4.9,.5),(.65,1.9,.12),stone,.035)
 for y in [4.2,5.6]:box('Seat support',(side*2.45,y,.24),(.42,.23,.48),dark,.02)
 for y in [7.0,8.0,9.3]:rod('Stair handrail post',(side*2.95,y,max(0,(y-7)*.5)),(side*2.95,y,.95+max(0,(y-7)*.5)),.025,gold)
 rod('Stair handrail',(side*2.95,7,.95),(side*2.95,9.4,2.15),.045,gold,12)
# Scene-only lights: runtime recipe separately supplied, not silently bundled into city.
collection('90 | lighting and cameras')
S.world=bpy.data.worlds.new('Interior ambient');S.world.use_nodes=True;S.world.node_tree.nodes['Background'].inputs[0].default_value=(.22,.27,.34,1);S.world.node_tree.nodes['Background'].inputs[1].default_value=.12
for y in [1,29]:
 bpy.ops.object.light_add(type='AREA',location=(0,y,8.6));o=bpy.context.object;o.name='Clerestory daylight';o.data.energy=650;o.data.shape='RECTANGLE';o.data.size=3.8;o.data.size_y=2.3;o.rotation_euler=(Vector((0,15,3))-o.location).to_track_quat('-Z','Y').to_euler()
for side in [-1,1]:
 for y in [6,12,18,24]:
  bpy.ops.object.light_add(type='POINT',location=(side*2.7,y,6.1));o=bpy.context.object;o.name='Warm sconce light';o.data.energy=65;o.data.color=(1,.72,.4);o.data.shadow_soft_size=.4
for y in [8,20]:
 bpy.ops.object.light_add(type='AREA',location=(0,y,9.7));o=bpy.context.object;o.name='Soft reflected fill';o.data.energy=140;o.data.size=5
S.render.engine='CYCLES';S.cycles.samples=40;S.cycles.use_denoising=True;S.render.resolution_x=1600;S.render.resolution_y=1200;S.render.resolution_percentage=100;S.view_settings.view_transform='AgX';S.view_settings.look='AgX - Medium High Contrast';S.view_settings.exposure=0
for name,loc,target,lens in [('Entrance',(0,1.2,1.7),(0,21,6.1),20),('Landing',(1.1,11,2.9),(0,28,6.3),22),('Return view',(-1,25,2.9),(0,2,5.6),22)]:
 bpy.ops.object.camera_add(location=loc);o=bpy.context.object;o.name=name;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();o.data.lens=lens;o.data.clip_start=.05;o.data.clip_end=150
S.camera=bpy.data.objects['Entrance']
for im in bpy.data.images:
 if im.source=='FILE':im.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(D/'museum-interior.blend'))
for im in bpy.data.images:
 if im.size[0]>4096 or im.size[1]>4096:
  factor=4096/max(im.size);im.scale(round(im.size[0]*factor),round(im.size[1]*factor));im.pack()
# Evaluate bevels and consolidate by material without modifying the saved editable scene.
source=[o for o in S.objects if o.type=='MESH'];deps=bpy.context.evaluated_depsgraph_get();groups={}
for o in source:
 eo=o.evaluated_get(deps);me=eo.to_mesh();uv=me.uv_layers.active
 for p in me.polygons:
  ma=me.materials[p.material_index];g=groups.setdefault(ma.name,{'ma':ma,'v':[],'f':[],'uv':[],'smooth':[]});off=len(g['v']);g['v'].extend(tuple(o.matrix_world@me.vertices[i].co) for i in p.vertices);g['f'].append(tuple(range(off,off+len(p.vertices))));g['uv'].extend(tuple(uv.data[i].uv) for i in p.loop_indices);g['smooth'].append(p.use_smooth)
 eo.to_mesh_clear()
collection('99 | runtime consolidation');bpy.ops.object.select_all(action='DESELECT');tri=0
for name,g in groups.items():
 me=bpy.data.meshes.new(name);me.from_pydata(g['v'],[],g['f']);me.materials.append(g['ma']);me.update();uv=me.uv_layers.new(name='UVMap')
 for u,v in zip(uv.data,g['uv']):u.uv=v
 for p,smooth in zip(me.polygons,g['smooth']):p.use_smooth=smooth
 o=bpy.data.objects.new(name,me);COL.objects.link(o);o.select_set(True);me.calc_loop_triangles();tri+=len(me.loop_triangles)
bpy.ops.export_scene.gltf(filepath=str(A/'museum-interior.glb'),export_format='GLB',export_yup=True,use_selection=True)
(D/'report.json').write_text(json.dumps({'editable_meshes':len(source),'runtime_meshes':len(groups),'triangles':tri,'gross_envelope_metres':[10,30,11.7],'dimension_status':'Provisional, photo-informed; only total hall area300m2 verified','source':'Official SHM venue brochure pp3-10; A.Savin ceiling photograph (FAL)','license':'LAL-1.3 (this new asset including photographic adaptation)','render_lights':12},indent=2)+'\n')
print('INTERIOR_EXPORTED',tri,len(groups))
