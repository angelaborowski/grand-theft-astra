"""GPT8 / Red Square refined reconstruction. Run with Blender 4.5 --background --python build_refined.py.
Footprints derived from OpenStreetMap contributors, ODbL 1.0; see README.md.
Architectural elevations are procedural approximations, not a measured survey.
"""
import bpy, math, json, os, random
from mathutils import Vector
from pathlib import Path
D=Path(__file__).resolve().parent
layout=json.loads((D/'map-layout.json').read_text())
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
 if c.name!='Collection' and c.users==0:bpy.data.collections.remove(c)
scene=bpy.context.scene
scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
random.seed(18)
COL=None

def collection(n):
 global COL
 COL=bpy.data.collections.new(n);scene.collection.children.link(COL);return COL

def link(o,m=None):
 for c in list(o.users_collection):c.objects.unlink(o)
 COL.objects.link(o)
 if m is not None:o.data.materials.append(m)
 return o

def mat(n,c,metal=0,rough=.7):
 m=bpy.data.materials.new(n);m.diffuse_color=(*c,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
 return m
brick=mat('Brick | warm terracotta',(.38,.085,.045)); red=mat('Museum | oxblood',(.30,.045,.025)); cream=mat('Limestone | warm ivory',(.66,.55,.37)); trim=mat('Carved stone | pale',(.83,.76,.61)); dark=mat('Recesses | charcoal',(.026,.043,.05)); roof=mat('Roof | weathered zinc',(.14,.18,.19),.3);green=mat('Roof | patinated green',(.04,.19,.12),.25);gold=mat('Metal | muted gold',(.7,.39,.08),.65,.28);granite=mat('Mausoleum | red granite',(.19,.047,.04));black=mat('Mausoleum | dark granite',(.025,.023,.025)); ground=mat('Paving | granite setts',(.24,.255,.265));context=mat('Context | desaturated stone',(.42,.43,.39));grass=mat('Ground | muted planted areas',(.13,.22,.13));blue=mat('Dome | cobalt',(.04,.19,.35));yellow=mat('Dome | ochre',(.7,.4,.06));white=mat('Dome | ivory',(.8,.75,.61))
# Shader-only paving; GLB retains a flat PBR base colour.
nt=ground.node_tree; tex=nt.nodes.new('ShaderNodeTexCoord');br=nt.nodes.new('ShaderNodeTexBrick');br.inputs['Scale'].default_value=1; br.inputs['Brick Width'].default_value=.32;br.inputs['Row Height'].default_value=.18;br.inputs['Mortar Size'].default_value=.009;br.inputs['Color1'].default_value=(.25,.27,.28,1);br.inputs['Color2'].default_value=(.16,.18,.20,1);br.inputs['Mortar'].default_value=(.09,.095,.10,1);nt.links.new(tex.outputs['Object'],br.inputs['Vector']);bump=nt.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.35;bump.inputs['Distance'].default_value=.025;nt.links.new(br.outputs['Fac'],bump.inputs['Height']);nt.links.new(bump.outputs['Normal'],nt.nodes.get('Principled BSDF').inputs['Normal']);nt.links.new(br.outputs['Color'],nt.nodes.get('Principled BSDF').inputs['Base Color'])

def mesh(n,v,f,m):
 me=bpy.data.meshes.new(n);me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(n,me);COL.objects.link(o)
 if m:o.data.materials.append(m)
 return o

def box(n,loc,size,m,bev=0):
 x,y,z=loc; a,b,c=[s/2 for s in size]
 v=[(x+u*a,y+w*b,z+t*c) for u,w,t in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]]
 o=mesh(n,v,[(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)],m)
 if bev:
  md=o.modifiers.new('Edge light','BEVEL');md.width=bev;md.segments=1
 return o

def prism(n,ring,z,h,m):
 N=len(ring);v=[(x,y,k) for k in [z,z+h] for x,y in ring];f=[tuple(range(N-1,-1,-1)),tuple(range(N,2*N))]+[(i,(i+1)%N,(i+1)%N+N,i+N) for i in range(N)]
 return mesh(n,v,f,m)

def cyl(n,x,y,z,r,h,m,N=16,r2=None):
 r2=r if r2 is None else r2
 v=[(x+rr*math.cos(i*2*math.pi/N),y+rr*math.sin(i*2*math.pi/N),zz) for rr,zz in [(r,z),(r2,z+h)] for i in range(N)]
 return mesh(n,v,[tuple(range(N-1,-1,-1)),tuple(range(N,2*N))]+[(i,(i+1)%N,(i+1)%N+N,i+N) for i in range(N)],m)

def roofhip(n,x,y,z,w,l,h,m):
 return mesh(n,[(x-w/2,y-l/2,z),(x+w/2,y-l/2,z),(x+w/2,y+l/2,z),(x-w/2,y+l/2,z),(x,y-l*.33,z+h),(x,y+l*.33,z+h)],[(0,1,4),(1,2,5,4),(2,3,5),(3,0,4,5),(0,3,2,1)],m)

def bounds(k):
 p=[p for r in layout[k]['rings'] for p in r];return min(p[0] for p in p),max(p[0] for p in p),min(p[1] for p in p),max(p[1] for p in p)
def center(k):
 a,b,c,d=bounds(k);return (a+b)/2,(c+d)/2

def footprint(k,h,m):
 for i,r in enumerate(layout[k]['rings']):
  o=prism(k+' | mapped footprint '+str(i),r,0,h,m);o['source']='https://www.openstreetmap.org/relation/'+layout[k]['osm_relation'];o['height_status']='Approximate unless documented';o['license']='ODbL 1.0 / OpenStreetMap contributors'

def arch(n,x,y,z,w,h,m,axis='X'):
 # Filled arched recess and a stone arch band on the facade plane.
 pts=[(-w/2,0),(w/2,0)]+[(w/2*math.cos(t),h-w/2+w/2*math.sin(t)) for t in [i*math.pi/12 for i in range(13)]]
 v=[(x,y+a,z+b) if axis=='X' else (x+a,y,z+b) for a,b in pts];mesh(n,v,[tuple(range(len(v)))],m)
 for i in range(12):
  t0=i*math.pi/12;t1=(i+1)*math.pi/12;vv=[]
  for rr,t in [(w/2,t0),(w/2,t1),(w/2+.18,t1),(w/2+.18,t0)]:
   a=rr*math.cos(t);b=h-w/2+rr*math.sin(t);vv.append((x-.035,y+a,z+b) if axis=='X' else (x+a,y-.035,z+b))
  mesh(n+' | arch stone',vv,[(0,1,2,3)],trim)

def cross(n,x,y,z,s=1):
 box(n+' | upright',(x,y,z+s),(.15*s,.15*s,2*s),gold);box(n+' | crossbar',(x,y,z+1.35*s),(1.1*s,.16*s,.15*s),gold)

def onion(n,x,y,z,r,h,m,accent=None):
 profile=[(0,.47),(.10,.75),(.25,1.0),(.42,1.08),(.59,.87),(.74,.54),(.9,.22),(1,.015)];N=32
 v=[]
 for a,rr in profile:
  for j in range(N):
   t=j*2*math.pi/N;rad=r*rr*(1+.035*math.cos(8*t+a*5));v.append((x+rad*math.cos(t),y+rad*math.sin(t),z+a*h))
 f=[(i*N+j,i*N+(j+1)%N,(i+1)*N+(j+1)%N,(i+1)*N+j) for i in range(len(profile)-1) for j in range(N)];o=mesh(n,v,f,m)
 if accent:
  o.data.materials.append(accent)
  for p in o.data.polygons:p.material_index=1 if ((p.index%N+int(p.index/N)*2)//3)%2 else 0
 for p in o.data.polygons:p.use_smooth=True
 cross(n,x,y,z+h,.7)

import numpy as np
from mathutils.geometry import tessellate_polygon
parts=json.loads((D/'building-parts.json').read_text())
# Fine surface detail. It remains procedural and editable inside Blender.
def masonry(ma,c1,c2,scale=.26):
 nt=ma.node_tree;bs=nt.nodes.get('Principled BSDF');geo=nt.nodes.new('ShaderNodeNewGeometry');sep=nt.nodes.new('ShaderNodeSeparateXYZ');nt.links.new(geo.outputs['Position'],sep.inputs[0]);norm=nt.nodes.new('ShaderNodeSeparateXYZ');nt.links.new(geo.outputs['Normal'],norm.inputs[0]);ab=nt.nodes.new('ShaderNodeMath');ab.operation='ABSOLUTE';nt.links.new(norm.outputs['X'],ab.inputs[0]);mult=nt.nodes.new('ShaderNodeMath');mult.operation='MULTIPLY';nt.links.new(sep.outputs['Y'],mult.inputs[0]);nt.links.new(ab.outputs[0],mult.inputs[1]);inv=nt.nodes.new('ShaderNodeMath');inv.operation='SUBTRACT';inv.inputs[0].default_value=1;nt.links.new(ab.outputs[0],inv.inputs[1]);mult2=nt.nodes.new('ShaderNodeMath');mult2.operation='MULTIPLY';nt.links.new(sep.outputs['X'],mult2.inputs[0]);nt.links.new(inv.outputs[0],mult2.inputs[1]);add=nt.nodes.new('ShaderNodeMath');add.operation='ADD';nt.links.new(mult.outputs[0],add.inputs[0]);nt.links.new(mult2.outputs[0],add.inputs[1]);vec=nt.nodes.new('ShaderNodeCombineXYZ');nt.links.new(add.outputs[0],vec.inputs['X']);nt.links.new(sep.outputs['Z'],vec.inputs['Y']);b=nt.nodes.new('ShaderNodeTexBrick');b.inputs['Scale'].default_value=1;b.inputs['Brick Width'].default_value=scale;b.inputs['Row Height'].default_value=scale*.32;b.inputs['Mortar Size'].default_value=.003;b.inputs['Color1'].default_value=(*c1,1);b.inputs['Color2'].default_value=(*c2,1);b.inputs['Mortar'].default_value=(*[v*.65 for v in c2],1);nt.links.new(vec.outputs[0],b.inputs['Vector']);nt.links.new(b.outputs['Color'],bs.inputs['Base Color']);bm=nt.nodes.new('ShaderNodeBump');bm.inputs['Strength'].default_value=.32;bm.inputs['Distance'].default_value=.012;nt.links.new(b.outputs['Fac'],bm.inputs['Height']);nt.links.new(bm.outputs[0],bs.inputs['Normal'])
brick2=mat('Basil | orange-red masonry',(.48,.135,.065));masonry(brick2,(.47,.14,.08),(.34,.082,.042),.28)
spassbrick=mat('Kremlin | red brick',(.37,.105,.057));masonry(spassbrick,(.39,.12,.068),(.27,.068,.038),.3)
stone2=mat('Limestone | aged cream',(.76,.71,.59));paintgreen=mat('Basil | painted emerald',(.018,.23,.12),.06,.55);glass=mat('Window | muted reflection',(.045,.075,.085),.45,.24)
colors={'white':stone2,'#a8a8a8':stone2,'#ec8859':spassbrick,'#ffd700':gold,'#FFD700':gold,'gold':gold,'yellow':gold,'lightgreen':paintgreen,'green':paintgreen,'#179470':paintgreen,'#1a5947':green,'#2E8B57':green,'firebrick':red,'grey':roof,'gray':roof,'darkgrey':roof,'darkslategrey':roof,'tan':cream}
def colorm(s,default):
 if s in colors:return colors[s]
 if s and s.startswith('#') and len(s)==7:
  rgb=tuple((int(s[i:i+2],16)/255)**2.2 for i in [1,3,5]);colors[s]=mat('Mapped colour '+s,rgb);return colors[s]
 return default

def group(p):
 x,y=p['center']
 if -35<x<35 and -290<y<-220:return 'Saint Basils'
 if -83<x<-44 and -199<y<-151:return 'Spasskaya'
 if -75<x<-27 and 122<y<159:return 'Nikolskaya'
 if -69<x<-48 and -27<y<-3:return 'Senatskaya'
 if 65<x<167 and -154<y<120:return 'GUM'
 if -18<x<51 and 140<y<269:return 'Historical Museum'
 if -48<x<-3 and -43<y<13:return 'Mausoleum'
 return 'Surrounding buildings'

def cap(n,ring,z,m):
 vs=[Vector((x,y,z)) for x,y in ring];tris=tessellate_polygon([vs]);v=[tuple(vs[p] if isinstance(p,int) else p) for tri in tris for p in tri];return mesh(n,v,[(i,i+1,i+2) for i in range(0,len(v),3)],m)

def wall(n,ring,z0,z1,m):
 if z1<=z0+.001:return
 N=len(ring);v=[(x,y,z) for z in [z0,z1] for x,y in ring];o=mesh(n,v,[(i,(i+1)%N,(i+1)%N+N,i+N) for i in range(N)],m);return o

def frame(ring):
 arr=np.array(ring);mean=arr.mean(0);_,_,vh=np.linalg.svd(arr-mean,full_matrices=False);basis=vh;proj=(arr-mean)@basis.T;low=proj.min(0);high=proj.max(0);center=mean+((low+high)/2)@basis;return center,basis,high-low

def roofpart(n,ring,z,h,shape,m,t):
 # Roof directions use the principal footprint axis where tags do not specify direction.
 if h<.02 or shape in ['flat','none']:
  cap(n,ring,z,m);return
 center,basis,dims=frame(ring);cx,cy=center
 if shape=='pyramidal':
  v=[(x,y,z) for x,y in ring]+[(cx,cy,z+h)];N=len(ring);mesh(n,v,[(i,(i+1)%N,N) for i in range(N)],m);return
 if shape in ['dome','onion']:
  if shape=='onion':onion(n,cx,cy,z,min(dims)/2,h,m)
  else:
   N=len(ring);L=12;v=[]
   for j in range(L+1):
    a=j*math.pi/2/L
    for x,y in ring:v.append((cx+(x-cx)*math.cos(a),cy+(y-cy)*math.cos(a),z+h*math.sin(a)))
   o=mesh(n,v,[(j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i) for j in range(L) for i in range(N)],m)
   for f in o.data.polygons:f.use_smooth=True
  return
 # Long-axis barrel or pitched roofs. Envelope is inferred from mapped footprint.
 w,l=dims[1],dims[0];long=basis[0];short=basis[1]
 if t.get('roof:orientation')=='across':w,l=l,w;long,short=short,long
 def pt(a,b,c):return tuple(center+a*long+b*short)+(c,)
 if shape=='round':
  N=16;v=[]
  for a in [-l/2,l/2]:
   for i in range(N+1):
    angle=math.pi*i/N;v.append(pt(a,w/2*math.cos(angle),z+h*math.sin(angle)))
  f=[(i,i+1,i+N+2,i+N+1) for i in range(N)];f +=[tuple(range(N,-1,-1)),tuple(range(N+1,2*(N+1)))];o=mesh(n,v,f,m)
  for f in o.data.polygons:f.use_smooth=True
 elif shape=='skillion':mesh(n,[pt(-l/2,-w/2,z),pt(l/2,-w/2,z),pt(l/2,w/2,z+h),pt(-l/2,w/2,z+h)],[(0,1,2,3)],m)
 else:
  q=0 if shape=='gabled' else .22*l
  v=[pt(-l/2,-w/2,z),pt(l/2,-w/2,z),pt(l/2,w/2,z),pt(-l/2,w/2,z),pt(-l/2+q,0,z+h),pt(l/2-q,0,z+h)];mesh(n,v,[(0,1,5,4),(3,4,5,2),(0,4,3),(1,2,5)],m)

collection('00 | Paved site')
box('Ground',(0,0,-.32),(1700,1700,.5),ground)
footprint('square',.035,ground)
collection('01 | OSM building geometry')
counts={};cols={}
# Upper onion-dome stacks are replaced with smooth profiles fitted to the mapped extents below.
domes=[(-12.6,-250.3,29,12,4.55,'spiral',green,yellow),(6.6,-243.1,27,12,4.7,'spiral',blue,stone2),(14.7,-260.8,27,12,4.7,'diamond',paintgreen,brick2),(-3.6,-268.6,27,12,4.7,'zigzag',red,stone2),(1.4,-255.35,55.6,6.4,1.75,'plain',gold,gold),(-3.9,-245.5,20.5,6.5,3.05,'spiral',green,brick2),(6.7,-265.6,20.5,6.5,3.05,'spiral',paintgreen,yellow),(-9.2,-259.4,20.5,6.5,3.05,'zigzag',red,stone2),(12,-251.7,20.5,6.5,3.05,'diamond',paintgreen,gold),(19.3,-254.4,14.5,5,2.65,'spiral',paintgreen,brick2)]
def is_dome(p):
 t=p['tags'];lo=float(t.get('min_height','0'));h=float(t.get('height','0'))
 for x,y,z,dh,r,typ,ma,mb in domes:
  if math.dist(p['center'],(x,y))<1.6 and lo>=z-.02 and h<=z+dh+.05:return True
 return False
used=[];skips=[]
for p in parts:
 t=p['tags'];g=group(p)
 if 'height' not in t:skips.append({'id':p['id'],'reason':'missing height'});continue
 try:hi=float(t['height']);lo=float(t.get('min_height',0));rh=float(t.get('roof:height',0))
 except ValueError:continue
 if hi<lo or hi>120:continue
 if g=='Saint Basils' and is_dome(p):continue
 if g not in cols:collection('Mapped | '+g);cols[g]=COL
 COL=cols[g];counts[g]=counts.get(g,0)+1;used.append(p['id'])
 default=brick2 if g=='Saint Basils' else spassbrick if g in ['Spasskaya','Nikolskaya','Senatskaya'] else red if g=='Historical Museum' else cream
 # Thin courses carry white or green painted trim, inferred from architectural reference.
 if g=='Saint Basils' and hi-lo<.7 and lo>5:default=stone2 if round(lo*2)%3 else paintgreen
 ma=colorm(t.get('building:colour'),default);rm=colorm(t.get('roof:colour'),paintgreen if g=='Saint Basils' else green if g in ['Spasskaya','Nikolskaya','Senatskaya'] else roof)
 if p['id']=='way/227682048':rm=brick2
 shape=t.get('roof:shape','flat');rh=min(rh,hi-lo);base=hi-rh
 for i,ring in enumerate(p['outer']):
  o=wall('OSM '+p['id'],ring,lo,base,ma)
  if o:o['source']='https://www.openstreetmap.org/'+p['id'];o['mapped_height']=hi;o['mapped_min_height']=lo
  roofpart('Roof '+p['id'],ring,base,rh,shape,rm if rh else ma,t)
 for ring in p['inner']:wall('Inner wall '+p['id'],ring,lo,base,ma)

# Preserve mapped open-air context from the original scene: outer wall and surrounding masses.
collection('Context | Kremlin wall')
for i in range(108):
 y=-169+i*2.86;x=-61+(y+175)/316*10
 box('Wall bay',(x,y,7),(4.2,2.9,14),spassbrick)
 # Swallow-tail shaped crenellation, repeating along the wall.
 v=[(x+2.2,y-.62,14),(x+2.2,y+.62,14),(x+2.2,y+.62,16),(x+2.2,y+.15,15.5),(x+2.2,y,15.0),(x+2.2,y-.15,15.5),(x+2.2,y-.62,16)];mesh('Swallow-tail merlon',v,[tuple(range(7))],spassbrick)
 box('Wall cap',(x,y,14),(4.7,2.9,.25),spassbrick)

# Smooth domes, modeled from the measured map envelope and checked against photographs.
collection('Detail | Saint Basils domes')
def smoothdome(n,x,y,z,h,r,style,ma,mb):
 N=128;L=64;v=[];f=[]
 profile=[(0,.50),(.10,.75),(.25,1.0),(.40,1.02),(.55,.86),(.72,.49),(.88,.19),(1,.015)]
 def radius(t):
  for j in range(len(profile)-1):
   a,ra=profile[j];b,rb=profile[j+1]
   if a<=t<=b:
    u=(t-a)/(b-a);u=u*u*(3-2*u);return ra+(rb-ra)*u
  return .015
 for i in range(L+1):
  t=i/L
  for j in range(N):
   a=2*math.pi*j/N;spiral=a-t*1.9
   if style=='spiral':rib=1+.085*math.cos(12*spiral)
   elif style=='diamond':rib=1+.075*math.cos(12*a+26*t)*math.cos(12*a-26*t)
   else:rib=1+.035*math.cos(16*a)
   rr=r*radius(t)*rib;v.append((x+rr*math.cos(a),y+rr*math.sin(a),z+t*h))
 for i in range(L):
  for j in range(N):f.append((i*N+j,i*N+(j+1)%N,(i+1)*N+(j+1)%N,(i+1)*N+j))
 o=mesh(n,v,f,ma);o.data.materials.append(mb)
 for poly in o.data.polygons:
  i=poly.index//N;j=poly.index%N;t=(i+.5)/L;a=2*math.pi*(j+.5)/N
  if style=='spiral':k=math.cos(12*(a-t*1.9))>0
  elif style=='diamond':k=abs(math.sin(8*a+18*t))<.22 or abs(math.sin(8*a-18*t))<.22
  elif style=='zigzag':k=(int(t*11+abs((a/math.pi*4)%2-1))%2)==0
  else:k=False
  poly.material_index=int(k);poly.use_smooth=True
 return o
for j,d in enumerate(domes):
 x,y,z,h,r,typ,ma,mb=d;smoothdome('Reconstructed dome '+str(j),x,y,z,h,r,typ,ma,mb)


collection('Detail | Cathedral painted facades')
def radial_arch(n,x,y,r,theta,z,w,h):
 normal=Vector((math.cos(theta),math.sin(theta),0));tan=Vector((-math.sin(theta),math.cos(theta),0));base=Vector((x,y,z))+normal*r
 def pos(u,v,out=0):return tuple(base+tan*u+Vector((0,0,v))+normal*out)
 pts=[(-w/2,0),(w/2,0)]+[(w/2*math.cos(a),h-w/2+w/2*math.sin(a)) for a in [i*math.pi/18 for i in range(19)]]
 mesh(n,[pos(u,v,.025) for u,v in pts],[tuple(range(len(pts)))],dark)
 for i in range(18):
  a=i*math.pi/18;b=(i+1)*math.pi/18
  vv=[pos(rr*math.cos(t),h-w/2+rr*math.sin(t),.06) for rr,t in [(w/2,a),(w/2,b),(w/2+.12,b),(w/2+.12,a)]]
  mesh(n+' | arched trim',vv,[(0,1,2,3)],stone2)
 for u in [-w/2-.08,w/2+.08]:
  mesh(n+' | upright trim',[pos(u-.055,0,.06),pos(u+.055,0,.06),pos(u+.055,h-w/2,.06),pos(u-.055,h-w/2,.06)],[(0,1,2,3)],stone2)

def beam(n,a,b,r,ma):
 a=Vector(a);b=Vector(b);d=b-a;up=Vector((0,0,1))
 if abs(d.normalized().dot(up))>.95:up=Vector((0,1,0))
 u=d.cross(up).normalized()*r;v=d.cross(u).normalized()*r
 mesh(n,[tuple(p+u*aa+v*bb) for p in [a,b] for aa,bb in [(-1,-1),(1,-1),(1,1),(-1,1)]],[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],ma)
for x,y,r,z,h in [(-12.6,-250.3,3.12,22,4.4),(6.6,-243.1,3.34,21,4.3),(14.7,-260.8,3.34,21,4.3),(-3.6,-268.6,3.34,21,4.3)]:
 for j in range(8):
  a=j*math.pi/4;radial_arch('Chapel | tall narrow window',x,y,r,a,z,.72,h)
 for zz,rr in [(z-.5,r+.12),(z+h+.15,r+.16)]:cyl('Chapel | painted belt',x,y,zz,rr,.22,stone2,64)
# Painted decorative panels on lower chapel drums, matched to source footprint radii.
for x,y in [(-12.6,-250.3),(6.6,-243.1),(14.7,-260.8),(-3.6,-268.6)]:
 candidate=[]
 for part in parts:
  if math.dist(part['center'],(x,y))>.65:continue
  t=part['tags'];lo=float(t.get('min_height',0));hi=float(t.get('height',0))
  if lo<=15<hi:
   candidate+=part['outer']
 if not candidate:continue
 ring=max(candidate,key=lambda q:sum(math.dist(p,(x,y)) for p in q)/len(q))
 N=len(ring)
 for j in range(N):
  a=Vector((*ring[j],0));b=Vector((*ring[(j+1)%N],0));mid=(a+b)/2;out=(mid-Vector((x,y,0))).normalized()*.045;a+=out;b+=out
  if (b-a).length<.7:continue
  a0=Vector((a.x,a.y,10));b0=Vector((b.x,b.y,10));a1=Vector((a.x,a.y,18));b1=Vector((b.x,b.y,18))
  beam('Chapel | white upright',a0,a1,.05,stone2);beam('Chapel | painted diagonal',a0,b1,.045,stone2)
  beam('Chapel | white lower band',a0,b0,.08,stone2);beam('Chapel | white upper band',a1,b1,.08,stone2)
# Central tent ribs and small decorative bosses.
cx,cy=1.4,-255.35
for j in range(8):
 a=j*math.pi/4;beam('Central tent | stone ridge',(cx+4.45*math.cos(a),cy+4.45*math.sin(a),40.4),(cx+.3*math.cos(a),cy+.3*math.sin(a),54.4),.065,stone2)
 for k in range(1,8):
  t=k/9;rr=4.45*(1-t)+.3*t;xx=cx+rr*math.cos(a+.12);yy=cy+rr*math.sin(a+.12);cyl('Central tent | glazed boss',xx,yy,40.4+t*14,.16,.18,paintgreen,8)
for j in range(8):radial_arch('Central church | narrow window',cx,cy,4.65,j*math.pi/4,23,1.0,5.0)

collection('Detail | Spasskaya clock and arches')
x,y=-67.3,-173.5
# Four clock faces, 6.12 m diameter; elevations are reference-based estimates.
for j in range(4):
 a=j*math.pi/2;normal=Vector((math.cos(a),math.sin(a),0));tan=Vector((-math.sin(a),math.cos(a),0));base=Vector((x,y,45.55))+normal*4.05
 def face(u,v,depth=.03):return tuple(base+tan*u+Vector((0,0,v))+normal*depth)
 N=96;mesh('Clock | black dial',[face(3.06*math.cos(i*2*math.pi/N),3.06*math.sin(i*2*math.pi/N)) for i in range(N)],[tuple(range(N))],black)
 for k in range(N):
  t=k*2*math.pi/N;t1=(k+1)*2*math.pi/N;mesh('Clock | gold rim',[face(r*math.cos(q),r*math.sin(q),.05) for r,q in [(3.0,t),(3.0,t1),(3.09,t1),(3.09,t)]],[(0,1,2,3)],gold)
 for k in range(12):
  t=k*math.pi/6;beam('Clock | hour mark',face(2.42*math.sin(t),2.42*math.cos(t),.08),face(2.81*math.sin(t),2.81*math.cos(t),.08),.055,gold)
 beam('Clock | minute hand',face(0,0,.1),face(0,2.55,.1),.035,gold);beam('Clock | hour hand',face(0,0,.1),face(1.75,.65,.1),.055,gold)
 for off in [-2.7,0,2.7]:
  xx=x-tan.x*off;yy=y-tan.y*off;radial_arch('Spasskaya | lantern opening',xx,yy,4.52,a,35.5,1.6,5.6)
radial_arch('Spasskaya | entrance portal',-54.4,-173.8,4.78,0,.05,4.7,7.8)
# Correct visual star silhouette over the thin mapped finial.
star=mat('Ruby star',(.55,.015,.01),.25,.3)
for axis in [0,math.pi/2]:
 tan=Vector((-math.sin(axis),math.cos(axis),0));v=[]
 for k in range(10):
  a=math.pi/2+k*math.pi/5;r=1.8 if k%2==0 else .78;v.append(tuple(Vector((x,y,69.1))+tan*r*math.cos(a)+Vector((0,0,r*math.sin(a)))))
 mesh('Spasskaya | ruby star',v,[tuple(range(10))],star)

# Accurate camera arrangement and high-quality lighting.
collection('Cameras and lighting')
def camera(n,loc,target,lens):
 data=bpy.data.cameras.new(n);o=bpy.data.objects.new(n,data);COL.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();data.lens=lens;data.clip_end=3000;return o
cams=[camera('01 | Cathedral and Spasskaya',(39,-75,1.7),(-25,-230,28),29),camera('02 | Cathedral near view',(28,-160,1.7),(1,-254,32),32),camera('03 | Site aerial',(480,410,370),(0,-55,0),42)]
scene.camera=cams[0];world=bpy.data.worlds.new('Physical sky');scene.world=world;world.use_nodes=True;nt=world.node_tree;sky=nt.nodes.new('ShaderNodeTexSky');sky.sky_type='NISHITA';sky.sun_elevation=math.radians(32);sky.sun_rotation=math.radians(130);sky.altitude=100;sky.air_density=1.1;sky.dust_density=1.6;sky.sun_size=math.radians(1.0);nt.links.new(sky.outputs[0],nt.nodes['Background'].inputs[0]);nt.nodes['Background'].inputs['Strength'].default_value=.35
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True;scene.render.resolution_x=1800;scene.render.resolution_y=1125;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=-1.0
scene['Accuracy']='OSM-derived architectural parts, inferred roofs and materials; not survey validated.'
(D/'mapped-parts-report.json').write_text(json.dumps({'imported_counts':counts,'imported_ids':used,'skips':skips,'dome_profiles':'Smooth reconstructed profiles fitted to mapped ring envelopes; patterns inferred from reference'},indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(D/'red-square-refined.blend'))
for cam,fn in zip(cams,['01-square','02-cathedral','03-aerial']):
 scene.camera=cam;scene.render.filepath=str(D/'previews'/f'{fn}.png');bpy.ops.render.render(write_still=True)
scene.camera=cams[0];bpy.ops.wm.save_as_mainfile(filepath=str(D/'red-square-refined.blend'))
print('REFINED_RENDER_COMPLETE',counts)
