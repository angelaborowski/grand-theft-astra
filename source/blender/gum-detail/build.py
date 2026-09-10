"""GUM facade study. Independent detail layer in the existing metre-based map frame.
Reference-informed dimensions are approximations, not a surveyed reconstruction.
Blender 4.5: --background --python source/blender/gum-detail/build.py
"""
import bpy, math, json
import numpy as np
from pathlib import Path
from mathutils import Vector
D=Path(__file__).resolve().parent
ROOT=D.parents[2]
ASSETS=ROOT/'public/assets'
TEX=ASSETS/'materials';TEX.mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
s=bpy.context.scene;s.unit_settings.system='METRIC'
col=bpy.data.collections.new('GUM | 60 metre facade study');s.collection.children.link(col)
# Original deterministic surface maps, with no photographic pixels copied.
rng=np.random.default_rng(1893);N=1024
y,x=np.mgrid[:N,:N]
def image_file(name,arr,color=False):
 im=bpy.data.images.new(name,width=N,height=N,alpha=True)
 im.colorspace_settings.name='sRGB' if color else 'Non-Color'
 if arr.ndim==2:arr=np.repeat(arr[:,:,None],3,axis=2)
 rgba=np.concatenate([np.clip(arr,0,1),np.ones((N,N,1))],axis=2).astype(np.float32)
 im.pixels.foreach_set(rgba.ravel());im.filepath_raw=str(TEX/(name+'.png'));im.file_format='PNG';im.save();return im
noise=rng.normal(0,.025,(N,N));cloud=(np.sin(x*.039)*np.sin(y*.031)+np.sin(x*.013+y*.021))*.015
stone=image_file('limestone-color',np.array([.64,.60,.51])[None,None,:]+(noise+cloud)[:,:,None],True)
rough=image_file('limestone-roughness',.78+noise*2)
height=image_file('limestone-height',.5+noise*2+cloud)
# Granite setts: 4m tile, 16 courses, running bond, worn edge profile.
rows=16;cols=12
cy=y/(N/rows);cx=x/(N/cols)+(np.floor(cy)%2)*.5
fx=cx%1;fy=cy%1
edge=np.minimum(np.minimum(fx,1-fx)*N/cols,np.minimum(fy,1-fy)*N/rows)
h=np.clip((edge-1)/5,0,1)
ids=(np.floor(cy).astype(int)*cols+np.floor(cx).astype(int))%(rows*cols)
variation=rng.uniform(-.07,.07,rows*cols)[ids]
v=.32+variation+noise*.65
paving=image_file('granite-color',np.stack([v*.99,v,v*1.015],axis=2)*(.48+.52*h[:,:,None]),True)
ph=image_file('granite-height',.1+.8*h+noise*.2)
pr=image_file('granite-roughness',.82+variation*.5+noise)
# Explicit tangent-space normal so the same relief is available in glTF/Three.js.
dy,dx=np.gradient(.1+.8*h+noise*.2);norm=np.dstack([-dx*3,-dy*3,np.ones_like(dx)]);norm/=np.linalg.norm(norm,axis=2)[:,:,None]
pn=image_file('granite-normal',norm*.5+.5)
def material(name,color,roughness=.75,metal=0,textured=False):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 n=m.node_tree.nodes;l=m.node_tree.links;b=n.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,1);b.inputs['Roughness'].default_value=roughness;b.inputs['Metallic'].default_value=metal
 if textured:
  t=n.new('ShaderNodeTexImage');t.image=stone;l.new(t.outputs['Color'],b.inputs['Base Color'])
  r=n.new('ShaderNodeTexImage');r.image=rough;l.new(r.outputs['Color'],b.inputs['Roughness'])
 return m
limestone=material('GUM | textured limestone',(.64,.60,.51),textured=True)
trim=material('GUM | carved pale stone',(.72,.68,.59));base=material('GUM | pink granite plinth',(.25,.17,.15),.7)
glass=material('GUM | recessed glazing',(.035,.065,.085),.2,.25);bronze=material('GUM | bronze window frames',(.075,.066,.05),.45,.6)
shadow=material('GUM | reveal shadow',(.075,.071,.06));roof=material('GUM | aged roof metal',(.12,.19,.18),.6,.55)
objects=[]
def mesh(name,verts,faces,m):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();ob=bpy.data.objects.new(name,me);col.objects.link(ob);me.materials.append(m);objects.append(ob)
 # planar, metre-scaled UVs survive export instead of shader-only coordinates
 uv=me.uv_layers.new(name='UVMap')
 for f in me.polygons:
  a=max(range(3),key=lambda i:abs(f.normal[i]));axes=[i for i in range(3) if i!=a]
  for li in f.loop_indices:
   p=me.vertices[me.loops[li].vertex_index].co;uv.data[li].uv=(p[axes[0]]/2,p[axes[1]]/2)
 return ob
# Local u follows the facade, d projects out toward the square; world x=66-d.
def pt(u,z,d):return (66-d,-80+u,z)
def box(name,u,z,d,w,h,depth,m,bevel=0):
 verts=[pt(u+du*w/2,z+dz*h/2,d+dd*depth/2) for du,dz,dd in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
 ob=mesh(name,verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],m)
 if bevel:
  mod=ob.modifiers.new('Carved edge','BEVEL');mod.width=bevel;mod.segments=2
 return ob
def beam(name,a,b,width,depth,m):
 du,dz=b[0]-a[0],b[1]-a[1];length=math.hypot(du,dz);nu,nz=-dz/length*width/2,du/length*width/2
 v=[pt(u+side*nu,z+side*nz,d) for d in [.60,.60+depth] for u,z in [a,b] for side in [-1,1]]
 mesh(name,v,[(0,2,3,1),(4,5,7,6),(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3)],m)
def arch(name,u,z,r,thickness,d,depth,m,steps=24):
 for k in range(steps):
  t0=k*math.pi/steps+.007;t1=(k+1)*math.pi/steps-.007
  v=[pt(u+rr*math.cos(t),z+rr*math.sin(t),dd) for dd in [d,d+depth] for rr,t in [(r,t0),(r,t1),(r+thickness,t1),(r+thickness,t0)]]
  mesh(name,v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],m)
def column(u,z,h,r=.14):
 bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=r,depth=h,location=pt(u,z+h/2,.8));o=bpy.context.object;o.name='GUM | turned column';o.data.materials.append(trim)
 for c in list(o.users_collection):c.objects.unlink(o)
 col.objects.link(o);objects.append(o)
 for zz,rr,hh in [(z,.21,.18),(z+.25,.17,.12),(z+h-.25,.19,.12),(z+h,.25,.22)]:box('Column collar',u,zz,.8,rr*2,hh,rr*2,trim,.02)
def window(u,z,w,h,pediment=False):
 # Glazing in a deep pocket; modeled jambs create real shadows and parallax.
 box('Window pocket',u,z+h/2,.25,w+.25,h+.25,.14,shadow)
 box('Glazing',u,z+h/2,.34,w,h,.07,glass)
 for a in [-w/2,w/2]:
  box('Stone reveal',u+a,z+h/2,.53,.2,h+.15,.55,trim,.025)
  column(u+a+.15*(1 if a>0 else -1),z,h,.11)
 for zz in [z,z+h]:box('Window sill and lintel',u,zz,.67,w+.6,.18,.7,trim,.025)
 for a in [-w/2,0,w/2]:box('Bronze mullion',u+a,z+h/2,.43,.055,h,.06,bronze)
 for zz in [z+h*.35,z+h*.73]:box('Window transom',u,zz,.43,w,.05,.06,bronze)
 if pediment:
  beam('Triangular window pediment',(u-w/2-.4,z+h+.24),(u,z+h+1.45),.18,.22,trim)
  beam('Triangular window pediment',(u,z+h+1.45),(u+w/2+.4,z+h+.24),.18,.22,trim)
  beam('Inner pediment',(u-w/2-.13,z+h+.3),(u,z+h+1.1),.06,.26,trim)
  beam('Inner pediment',(u,z+h+1.1),(u+w/2+.13,z+h+.3),.06,.26,trim)
# 60m contiguous study; footprint anchor is mapped, fine elevation is inferred.
box('Facade backing',0,9.5,-.12,60,19,.25,limestone)
box('Granite base',0,.55,.18,60,1.1,.5,base,.02)
for z,w,h,d in [(1.15,60,.22,.45),(6.4,60,.22,.65),(7.05,60,.18,.75),(12.3,60,.22,.65),(14.45,60,.15,.55),(17.25,60,.25,.7),(18.25,60,.2,.9),(18.6,60,.22,1.05)]:
 box('Continuous stone cornice',0,z,d,w,h,.4,trim,.025)
for u in range(-28,29,4):
 # Ground-level shop arches, glass genuinely behind their stone voussoirs.
 window(u,1.35,2.65,3.3)
 arch('Shop arch stones',u,4.65,1.325,.28,.47,.40,trim)
 # Dark semicircular fanlight behind arch.
 v=[pt(u,4.65,.34)]+[pt(u+1.3*math.cos(t),4.65+1.3*math.sin(t),.34) for t in np.linspace(0,math.pi,25)]
 mesh('Arched fanlight',v,[tuple(range(len(v)))],glass)
 for a in [.35,.7,1.05,1.4,1.75,2.1,2.45,2.8]:beam('Fanlight radial bar',(u,4.65),(u+1.25*math.cos(a),4.65+1.25*math.sin(a)),.025,.025,bronze)
 window(u,7.6,1.7,3.2,True)
 window(u,14.8,1.25,1.7)
 # Raised square and diamond frieze relief.
 for z in [6.7,13.75,17.75]:
  box('Frieze framed panel',u,z,.45,.9,.48,.15,trim,.02)
  box('Frieze recessed panel',u,z,.54,.68,.30,.035,shadow)
  box('Frieze raised boss',u,z,.58,.3,.22,.08,limestone,.015)
for u in range(-30,31,4):
 box('Rusticated pilaster',u,9.2,.38,.42,17,.5,trim,.02)
 for z in np.arange(1.5,17,.48):box('Pilaster rustication',u,float(z),.7,.55,.12,.25,trim,.012)
for u in np.arange(-29.7,30,.58):box('Cornice dentil',float(u),18.05,.75,.22,.28,.28,trim,.012)
# Full asset remains individually editable in Blender. Export joins by material to bound draw calls.
for ob in objects:
 ob['accuracy']='Reference-informed approximation';ob['units']='metres'
# A ground plane for offline comparison only; game uses these same texture maps.
plane=box('Preview ground',0,-.05,32,130,.2,100,base)
pm=material('Granite paving preview',(.3,.3,.3));n=pm.node_tree.nodes;l=pm.node_tree.links;b=n.get('Principled BSDF')
t=n.new('ShaderNodeTexImage');t.image=paving;l.new(t.outputs['Color'],b.inputs['Base Color']);t=n.new('ShaderNodeTexImage');t.image=pn;nm=n.new('ShaderNodeNormalMap');l.new(t.outputs['Color'],nm.inputs['Color']);l.new(nm.outputs['Normal'],b.inputs['Normal']);b.inputs['Roughness'].default_value=.87
plane.data.materials.clear();plane.data.materials.append(pm)
# Correct preview paving UV scale to four metres.
for p in plane.data.polygons:
 for li in p.loop_indices:
  v=plane.data.vertices[plane.data.loops[li].vertex_index].co;plane.data.uv_layers.active.data[li].uv=(v.x/4,v.y/4)
objects.remove(plane)
w=bpy.data.worlds.new('Daylight');w.use_nodes=True;s.world=w
n=w.node_tree.nodes;sky=n.new('ShaderNodeTexSky');sky.sky_type='NISHITA';sky.sun_elevation=math.radians(35);sky.sun_rotation=math.radians(225);w.node_tree.links.new(sky.outputs['Color'],n.get('Background').inputs['Color']);n.get('Background').inputs['Strength'].default_value=.25
s.render.engine='CYCLES';s.cycles.samples=24;s.cycles.use_denoising=True;s.render.resolution_x=1400;s.render.resolution_y=900;s.render.resolution_percentage=100;s.view_settings.view_transform='AgX'
cams=[]
for name,loc,target in [('01-player',(49,-96,1.78),(66,-77,8)),('02-facade',(30,-80,8),(66,-80,9)),('03-stone-detail',(60,-97,2.1),(66,-96,4.1))]:
 data=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,data);s.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();data.lens=28;cams.append(o)
s.camera=cams[0]
for im in bpy.data.images:
 if im.source=='FILE':im.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(D/'gum-detail.blend'))
exec(compile((D/'finalize.py').read_text(), str(D/'finalize.py'), 'exec'))
