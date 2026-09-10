"""Second material/detail pass. Idempotent; called by finalize.py after opening scene."""
import bpy, math
from pathlib import Path
from mathutils import Vector
D=Path(__file__).resolve().parent;T=D.parents[2]/'public/assets/materials/scanned'
s=bpy.context.scene
old=bpy.data.collections.get('GUM | secondary carved details')
if old:
 for ob in list(old.objects):bpy.data.objects.remove(ob,do_unlink=True)
 bpy.data.collections.remove(old)
col=bpy.data.collections.new('GUM | secondary carved details');s.collection.children.link(col)
def tex(n,space):
 im=bpy.data.images.load(str(T/n),check_existing=True);im.colorspace_settings.name=space;im.pack();return im
def setup(ma,asset,strength,color=False):
 n=ma.node_tree.nodes;l=ma.node_tree.links;b=n.get('Principled BSDF')
 for node in list(n):
  if node.label=='Scanned surface':n.remove(node)
 def node(key,space):
  t=n.new('ShaderNodeTexImage');t.label='Scanned surface';t.image=tex(asset+'-'+key+'.jpg',space);return t
 if color:
  t=node('Diffuse','sRGB');l.new(t.outputs['Color'],b.inputs['Base Color'])
 t=node('Rough','Non-Color');l.new(t.outputs['Color'],b.inputs['Roughness'])
 t=node('nor_gl','Non-Color');normal=n.new('ShaderNodeNormalMap');normal.label='Scanned surface';normal.inputs['Strength'].default_value=strength;l.new(t.outputs['Color'],normal.inputs['Color']);l.new(normal.outputs['Normal'],b.inputs['Normal'])
setup(bpy.data.materials['GUM | textured limestone'],'old_sandstone_02',.22)
setup(bpy.data.materials['Granite paving preview'],'cobblestone_floor_08',.65,True)
trim=bpy.data.materials['GUM | carved pale stone'];b=trim.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(.47,.43,.35,1);trim.diffuse_color=(.47,.43,.35,1)
metal=bpy.data.materials.get('GUM | weathered downpipes') or bpy.data.materials.new('GUM | weathered downpipes');metal.use_nodes=True;bs=metal.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.09,.12,.105,1);bs.inputs['Metallic'].default_value=.65;bs.inputs['Roughness'].default_value=.6
# Small dimensional details based on the visible downpipes and carved friezes in the reference.
def mesh(name,v,f,m):
 me=bpy.data.meshes.new(name);me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(name,me);col.objects.link(o);me.materials.append(m);return o
def pipe(name,a,b,r,m,N=12):
 a=Vector(a);b=Vector(b);d=(b-a).normalized();up=Vector((0,0,1)) if abs(d.z)<.95 else Vector((0,1,0));u=d.cross(up).normalized();v=d.cross(u)
 verts=[tuple(p+r*(u*math.cos(i*2*math.pi/N)+v*math.sin(i*2*math.pi/N))) for p in [a,b] for i in range(N)]
 faces=[tuple(range(N-1,-1,-1)),tuple(range(N,2*N))]+[(i,(i+1)%N,(i+1)%N+N,i+N) for i in range(N)]
 o=mesh(name,verts,faces,m)
 for p in o.data.polygons:p.use_smooth=len(p.vertices)==4
 return o
for u in [-26,-10,10,26]:
 y=-80+u
 path=[(65.05,y,18.7),(64.95,y,17.5),(65.15,y,16.7),(65.15,y,1.0),(64.85,y,.65)]
 for a,b in zip(path,path[1:]):pipe('GUM | rainwater downpipe',a,b,.065,metal)
 for z in [1.3,4,7,10,13,16]:pipe('GUM | pipe bracket',(65.13,y-.12,z),(65.13,y+.12,z),.024,metal)
# Profiled stone rosettes in existing frieze positions; dimensions remain inferred.
for u in range(-28,29,4):
 for z in [13.75,17.75]:
  cy=-80+u;N=32;verts=[]
  for depth,rad in [(0,.02),(.045,.16),(.085,.105),(.10,.015)]:
   for i in range(N):
    a=i*2*math.pi/N;r=rad*(1+.12*math.cos(a*8));verts.append((65.35-depth,cy+r*math.cos(a),z+r*math.sin(a)))
  faces=[(j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i)for j in range(3)for i in range(N)]
  o=mesh('GUM | carved frieze rosette',verts,faces,trim)
  for p in o.data.polygons:p.use_smooth=True
s['surface_pass']='Poly Haven CC0 stone normal/roughness and cobblestone PBR; not scans of GUM or Red Square.'
