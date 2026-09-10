"""Editable Bell 206B-style reconstruction. Metres; Blender -Y forward, Z up.
Photo-informed contours, not a manufacturer CAD model. See README.md.
Run with Blender --background --factory-startup --python-exit-code 1 --python this_file.
"""
import bpy, bmesh, math, json
from pathlib import Path
from mathutils import Vector
D=Path(__file__).resolve().parent
ROOT=D.parents[2]
A=ROOT/'public/assets/vehicles'
bpy.ops.wm.read_factory_settings(use_empty=True)
s=bpy.context.scene;s.unit_settings.system='METRIC'
asset=bpy.data.collections.new('Helicopter');s.collection.children.link(asset)
def material(name,color,metal=0,rough=.4):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,1);b.inputs['Metallic'].default_value=metal;b.inputs['Roughness'].default_value=rough
 return m
ivory=material('Ivory aviation enamel',(.73,.75,.71),.22,.28)
navy=material('Midnight blue enamel',(.013,.027,.048),.32,.25)
orange=material('Rescue orange accent',(.83,.16,.025),.15,.31)
black=material('Rubber seals and steps',(.009,.012,.014),0,.72)
alloy=material('Brushed aluminum',(.43,.47,.49),.82,.32)
steel=material('Rotor and engine steel',(.13,.16,.18),.8,.32)
blade=material('Composite rotor graphite',(.026,.032,.035),.28,.43)
glass=material('Smoked cockpit glazing',(.15,.26,.30),.05,.12)
b=glass.node_tree.nodes.get('Principled BSDF');b.inputs['Transmission Weight'].default_value=.65;b.inputs['IOR'].default_value=1.46
seat=material('Charcoal seat upholstery',(.043,.050,.055),0,.85)
red=material('Red navigation lens',(.65,.005,.004),.1,.18)
green=material('Green navigation lens',(.006,.42,.07),.1,.18)
white=material('Lamp lens',(.83,.88,.89),.1,.18)
for m in [ivory,navy,orange]:m.node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value=.3
root=bpy.data.objects.new('Helicopter',None);asset.objects.link(root)
def link(o,name,ma=None,parent=None):
 o.name=name
 for c in list(o.users_collection):c.objects.unlink(o)
 asset.objects.link(o)
 if ma:o.data.materials.append(ma)
 o.parent=parent or root
 if parent:o.matrix_parent_inverse=parent.matrix_world.inverted()
 return o
def mesh(name,v,f,ma,parent=None,smooth=False):
 me=bpy.data.meshes.new(name);me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(name,me);asset.objects.link(o);o.parent=parent or root
 if parent:o.matrix_parent_inverse=parent.matrix_world.inverted()
 me.materials.append(ma)
 for p in me.polygons:p.use_smooth=smooth
 return o
def box(name,p,size,ma,bevel=.02,parent=None):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=link(bpy.context.object,name,ma,parent);o.scale=size
 bpy.context.view_layer.objects.active=o;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Rounded panel edge','BEVEL');mod.width=bevel;mod.segments=3
  mod=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
 return o
def rod(name,a,b,r,ma,parent=None,r2=None,N=16):
 a,b=Vector(a),Vector(b);v=b-a
 bpy.ops.mesh.primitive_cone_add(vertices=N,radius1=r,radius2=r if r2 is None else r2,depth=v.length,location=(a+b)/2)
 o=link(bpy.context.object,name,ma,parent);o.rotation_euler=v.to_track_quat('Z','Y').to_euler()
 for p in o.data.polygons:p.use_smooth=len(p.vertices)==4
 return o
def path(name,pts,r,ma,parent=None,cyclic=False):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.bevel_depth=r;cu.bevel_resolution=2
 sp=cu.splines.new('POLY');sp.points.add(len(pts)-1)
 for p,v in zip(sp.points,pts):p.co=(*v,1)
 sp.use_cyclic_u=cyclic;o=bpy.data.objects.new(name,cu);asset.objects.link(o);o.parent=parent or root;cu.materials.append(ma)
 if parent:o.matrix_parent_inverse=parent.matrix_world.inverted()
 return o
# Cross sections trace the photographed short five-seat cabin (not the stretched 206L).
sections=[(-2.4,.06,.95,1.08),(-2.3,.35,.79,1.19),(-2.1,.56,.70,1.33),(-1.85,.65,.65,1.64),(-1.5,.71,.62,1.94),(-1.05,.73,.61,2.13),(-.7,.73,.61,2.18),(0,.73,.63,2.19),(.8,.68,.73,2.14),(1.2,.58,.91,2.05),(1.55,.40,1.22,1.94),(1.85,.26,1.47,1.82)]
def profile(y):
 for i in range(len(sections)-1):
  a,b=sections[i:i+2]
  if a[0]<=y<=b[0]:
   t=(y-a[0])/(b[0]-a[0]);return [a[k]+(b[k]-a[k])*t for k in range(1,4)]
 return list(sections[0 if y<sections[0][0] else -1][1:])
def surface(y,t,offset=0):
 w,lo,hi=profile(y)
 return ((w+offset)*math.cos(t),y,(lo+hi)/2+(hi-lo)/2*math.sin(t)+offset*math.sin(t))
ys=sorted(set([r[0] for r in sections]+[-2.02,-.82,-.74,-.08,.08,.91,1.02]+[round(-2.4+i*.05,4) for i in range(86)]))
N=64;v=[surface(y,j*math.tau/N) for y in ys for j in range(N)];f=[];kinds=[]
for i in range(len(ys)-1):
 y=(ys[i]+ys[i+1])/2
 for j in range(N):
  t=(j+.5)*math.tau/N;isfront=-2.02<y<-.82 and .04<t<math.pi-.04
  isside=(-.74<y<-.08 or .08<y<.91) and (.10<t<1.0 or math.pi-1.0<t<math.pi-.10)
  f.append((i*N+j,i*N+(j+1)%N,(i+1)*N+(j+1)%N,(i+1)*N+j));kinds.append(2 if isfront or isside else 1 if math.sin(t)>.08 else 0)
f.extend([tuple(reversed(range(N))),tuple((len(ys)-1)*N+j for j in range(N))]);kinds.extend([0,1])
body=mesh('CabinShell',v,f,ivory,smooth=True);body.data.materials.append(navy);body.data.materials.append(glass)
for p,k in zip(body.data.polygons,kinds):p.material_index=k
# Seals sit on the actual aperture boundaries, not flat decals covering a solid cabin.
for y in [-2.02,-.82]:path('Windshield rubber surround',[surface(y,.04+i*(math.pi-.08)/48,.009) for i in range(49)],.016,black)
for t in [.04,math.pi-.04,math.pi/2]:path('Windshield frame',[surface(-2.02+i*1.2/36,t,.012) for i in range(37)],.018,ivory if t==math.pi/2 else black)
for lo,hi in [(-.74,-.08),(.08,.91)]:
 for a,b in [(.10,1.0),(math.pi-1.0,math.pi-.10)]:
  pts=[surface(lo,a+(b-a)*i/16,.009) for i in range(17)]+[surface(lo+(hi-lo)*i/16,b,.009) for i in range(1,17)]+[surface(hi,b-(b-a)*i/16,.009) for i in range(1,17)]+[surface(hi-(hi-lo)*i/16,a,.009) for i in range(1,17)]
  path('DoorWindowSeal',pts,.014,black,cyclic=True)
# High-contrast thin painted stripe follows the curved waist of the aircraft.
for sign in [-1,1]:
 for t in [-.10,-.24]:
  angle=t if sign==1 else math.pi-t
  verts=[surface(y,angle+d,.006) for y in ys for d in [-.027,.027]]
  mesh('Waist accent stripe',verts,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(ys)-1)],orange if t==-.10 else ivory,smooth=True)
 for lo,hi in [(-.79,-.025),(.025,1.0)]:
  # Door outline descends around lower panel; hinges and recessed handle are separate editable parts.
  a=0 if sign==1 else math.pi
  pts=[surface(lo,a-.85*sign,.008),surface(hi,a-.85*sign,.008),surface(hi,a+.08*sign,.008)]
  path('Door lower seam',pts,.0045,black)
  for yy in [lo+.08,hi-.08]:
   rod('Door hinge',(sign*.726,yy,1.28),(sign*.726,yy+.08,1.28),.014,alloy)
  rod('Door handle',(sign*.74,hi-.19,1.39),(sign*.74,hi-.07,1.39),.017,alloy)
# Interior visible through physically separate glazing surfaces.
box('Cabin floor',(0,-.1,.84),(.80,2.1,.06),black)
for x,y in [(-.34,-.8),(.34,-.8),(-.40,.40),(0,.40),(.40,.40)]:
 box('Seat cushion',(x,y,1.02),(.34,.41,.12),seat,.05)
 back=box('Seat back',(x,y+.18,1.30),(.34,.12,.55),seat,.05);back.rotation_euler.x=-.10
 box('Headrest',(x,y+.19,1.63),(.23,.10,.17),seat,.045)
 path('Seat harness',[(x-.10,y+.105,1.56),(x+.04,y+.09,1.25),(x+.12,y-.05,1.08)],.018,black)
box('Instrument pedestal',(0,-1.28,1.15),(.38,.35,.48),black,.07)
panel=box('Instrument panel',(0,-1.39,1.40),(.99,.13,.28),black,.045);panel.rotation_euler.x=-.20
for x in [-.36,-.19,0,.19,.36]:
 rod('Instrument bezel',(x,-1.311,1.43),(x,-1.29,1.43),.05,alloy,N=24)
 rod('Instrument face',(x,-1.287,1.43),(x,-1.283,1.43),.041,blade,N=24)
 path('Gauge pointer',[(x,-1.279,1.43),(x+.02,-1.279,1.455)],.003,white)
for x in [-.34,.34]:path('Cyclic control',[(x,-.95,.83),(x,-1.05,1.13),(x,-.96,1.23)],.018,black)
# Raised transmission/engine deck, turbine exhaust and slatted ventilation.
def loft(name,sec,ma):
 verts=[];n=32
 for y,w,lo,hi in sec:
  for j in range(n):
   t=j*math.tau/n;verts.append((w*math.cos(t),y,(lo+hi)/2+(hi-lo)/2*math.sin(t)))
 faces=[(i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j) for i in range(len(sec)-1) for j in range(n)]+[tuple(reversed(range(n))),tuple((len(sec)-1)*n+j for j in range(n))]
 return mesh(name,verts,faces,ma,smooth=True)
loft('EngineCowling',[(-.5,.27,2.01,2.38),(-.2,.42,2.00,2.50),(.6,.41,1.95,2.45),(1.15,.31,1.87,2.33),(1.55,.21,1.77,2.08)],navy)
for sign in [-1,1]:
 for i in range(12):box('Engine cooling louver',(sign*.395,.16+i*.057,2.27),(.02,.027,.19),black,.006)
 rod('Exhaust rim',(sign*.27,.92,2.35),(sign*.36,1.04,2.54),.115,steel,N=32)
 rod('Exhaust dark bore',(sign*.36,1.04,2.54),(sign*.365,1.047,2.549),.094,black,N=32)
# Conical tail boom and drive-shaft cover.
rod('TailBoom',(0,1.30,1.65),(0,7.10,1.78),.31,navy,r2=.085,N=32)
path('Tail driveshaft cover',[(0,1.5,1.95),(0,3.0,1.98),(0,5.2,1.91),(0,7.05,1.87)],.035,ivory)
for y in [2.0,3.0,4.0,5.0,6.0]:
 r=.31+(y-1.3)/(7.1-1.3)*(.085-.31);z=1.65+(y-1.3)/5.8*.13
 path('Tail service joint',[(r*math.cos(t),y,z+r*math.sin(t)) for t in [i*math.tau/48 for i in range(48)]],.0045,alloy,cyclic=True)
# Swept vertical fin and inverted lower fin; dimensions are photo estimates.
def fin(name,outline,thick,ma):
 verts=[(x,y,z) for x in [-thick/2,thick/2] for y,z in outline];n=len(outline)
 return mesh(name,verts,[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],ma)
fin('VerticalFin',[(6.45,1.70),(6.78,2.91),(7.10,2.91),(7.00,1.65),(7.15,.70),(6.74,.70)],.075,navy)
fin('TailFinOrangeTip',[(6.73,2.74),(6.78,2.91),(7.10,2.91),(7.08,2.74)],.078,orange)
fin('LowerFinIvoryTip',[(6.70,.92),(7.11,.92),(7.15,.70),(6.74,.70)],.078,ivory)
verts=[(-1.15,4.50,1.71),(1.15,4.50,1.71),(1.15,4.91,1.70),(-1.15,4.91,1.70),(-1.15,4.50,1.76),(1.15,4.50,1.76),(1.15,4.91,1.73),(-1.15,4.91,1.73)]
mesh('HorizontalStabilizer',verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],ivory)
# Landing skids rest on Z=0, bent cross tubes and entry steps.
for sign in [-1,1]:
 pts=[(sign*1.00,-2.2,.25),(sign*1.00,-2.08,.13),(sign*1.00,-1.85,.055),(sign*1.00,1.6,.055),(sign*1.00,1.84,.10)]
 path('LandingSkid',pts,.055,alloy)
 for y in [-1.10,.90]:
  path('SkidCrossTube',[(0,y,.66),(sign*.58,y,.66),(sign*.76,y,.52),(sign*.90,y,.28),(sign*1.00,y,.10)],.041,ivory)
  box('Skid clamp',(sign*1.0,y,.12),(.15,.18,.08),steel,.018)
 path('Entry step rail',[(sign*.79,-.88,.45),(sign*1.01,-.88,.41),(sign*1.01,.36,.41),(sign*.79,.36,.45)],.023,alloy)
 box('Anti-slip step',(sign*1.00,-.25,.425),(.16,.64,.022),black,.008)
# Two independently rotatable empties with local axes matching glTF integration.
def pivot(name,loc):
 o=bpy.data.objects.new(name,None);asset.objects.link(o);o.parent=root;o.location=loc;bpy.context.view_layer.update();return o
main=pivot('MainRotor',(0,0,2.82))
rod('Fixed rotor mast',(0,0,2.39),(0,0,2.82),.041,alloy)
rod('Swashplate',(0,0,2.47),(0,0,2.51),.145,steel,N=32)
box('Teetering rotor hub',(0,0,2.82),(.58,.11,.10),alloy,.02,main)
for sign in [-1,1]:
 rod('Blade grip',(sign*.18,0,2.82),(sign*.56,0,2.82),.052,steel,main)
 rod('Pitch link',(sign*.12,.07,2.5),(sign*.34,.07,2.80),.012,alloy,main)
 # Thin airfoil volume, 13 inch chord approximation, full radius exactly 5.08 m.
 vv=[(sign*x,y,2.82+z) for x in [.49,5.08] for y,z in [(-.165,0),(-.09,.027),(.14,.015),(.165,0),(.10,-.008),(-.09,-.012)]]
 rotor=mesh('MainRotorBlade',vv,[(i,(i+1)%6,(i+1)%6+6,i+6) for i in range(6)]+[tuple(reversed(range(6))),tuple(range(6,12))],blade,main)
 box('Main blade tip marking',(sign*4.98,0,2.845),(.19,.30,.003),orange,.001,main)
tail=pivot('TailRotor',(-.24,6.87,1.82))
rod('Tail gearbox',(0,6.87,1.82),(-.24,6.87,1.82),.10,steel)
rod('Tail hub',(-.20,6.87,1.82),(-.34,6.87,1.82),.065,alloy,tail)
for sign in [-1,1]:
 box('TailRotorBlade',(-.27,6.87,1.82+sign*.455),(.024,.13,.74),ivory,.008,tail)
 for dist in [.35,.57,.78]:box('Tail blade warning stripe',(-.286,6.87,1.82+sign*dist),(.004,.131,.085),blade,.001,tail)
# Visible fasteners are bounded low-poly geometry; no baked photo branding.
for sign in [-1,1]:
 for y in [-1.6,-1.3,-1.,-.7,-.4,-.1,.2,.5,.8,1.1]:
  p=surface(y,-.48 if sign==1 else math.pi+.48,.012)
  rod('Panel rivet',(p[0],p[1],p[2]),(p[0]+sign*.004,p[1],p[2]),.005,alloy,N=8)
 rod('Navigation light',(sign*.71,.63,1.62),(sign*.76,.63,1.62),.036,red if sign<0 else green)
path('Belly aerial',[(0,.85,.75),(0,1.02,.39)],.009,black)
path('Roof aerial',[(0,-.65,2.18),(0,-.78,2.55)],.009,steel)
rod('Nose landing lamp',(0,-2.30,.89),(0,-2.32,.89),.07,white,N=24)
# Convert curves and evaluate modifiers while keeping named parts and rotor parenting.
bpy.ops.object.select_all(action='DESELECT')
for o in list(asset.objects):
 if o.type in ['MESH','CURVE']:
  bpy.context.view_layer.objects.active=o;o.select_set(True)
  bpy.ops.object.convert(target='MESH')
  o=bpy.context.object
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
  if not o.data.uv_layers:
   bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project();bpy.ops.object.mode_set(mode='OBJECT')
  o.select_set(False)
root['design']='Bell 206B-style photo reconstruction; not certified CAD'
root['units']='metres';root['forward']='glTF +Z';root['rotor_diameters_m']=[10.16,1.65]
s['source_notes']='See source/blender/helicopter/README.md'
bpy.ops.wm.save_as_mainfile(filepath=str(D/'helicopter.blend'))
# Keep detailed source objects editable; merge repeated static fittings only for runtime.
bpy.ops.object.select_all(action='DESELECT')
groups={}
for o in list(asset.objects):
 if o.type=='MESH' and o.parent==root:
  key=tuple(m.name for m in o.data.materials)
  groups.setdefault(key,[]).append(o)
exports=[]
for key,objects in groups.items():
 copies=[]
 for original in objects:
  copy=original.copy();copy.data=original.data.copy();asset.objects.link(copy);copies.append(copy);copy.select_set(True)
 bpy.context.view_layer.objects.active=copies[0];bpy.ops.object.join();joined=bpy.context.object
 joined.name='CabinShell' if len(key)>1 else 'Static '+key[0];exports.append(joined);joined.select_set(False)
for o in [root,main,tail,*main.children,*tail.children,*exports]:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(A/'helicopter.glb'),export_format='GLB',use_selection=True,export_apply=True,export_extras=True)
print('HELICOPTER_EXPORTED',flush=True)
