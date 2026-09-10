"""Reference-guided original geometry study. Approximate likeness; not photogrammetry."""
import bpy,math,random,json
from pathlib import Path
from mathutils import Vector
D=Path(__file__).resolve().parent
base=(D.parents[1]/'blender/characters/build.py').read_text()
# Reuse only original rig/helper functions and animation export, replacing all visible geometry.
setup=base[:base.index("oval('Clothed torso'")]
exec(compile(setup,str(D.parents[1]/'blender/characters/build.py'),'exec'))
D=Path(__file__).resolve().parent
random.seed(8)
def color(m,c):m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*c,1)
color(skin,(.53,.31,.16));color(jacket,(.65,.40,.015));color(pants,(.065,.060,.043));color(hair,(.035,.019,.008));color(shoe,(.56,.49,.32));color(bag,(.20,.019,.023))
cream=mat('Cream ribbed shirt',(.65,.60,.43));dark=mat('Charcoal technical fabric',(.065,.070,.052));teal=mat('Teal stripe',(.018,.32,.30));black=mat('Gloves and strap',(.018,.02,.016));sole=mat('Rubber sole',(.40,.35,.23))
def tube(n,points,r,ma,bone):
 cu=bpy.data.curves.new(n,'CURVE');cu.dimensions='3D';cu.bevel_depth=r;cu.bevel_resolution=2;sp=cu.splines.new('POLY');sp.points.add(len(points)-1)
 for q,p in zip(sp.points,points):q.co=(*p,1)
 o=bpy.data.objects.new(n,cu);s.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o=bpy.context.object;o.select_set(False);return attach(o,n,ma,bone)
def loft(n,rings,ma,bone,segments=48,start=0,end=math.tau):
 vs=[];fs=[]
 for j,(z,cx,cy,rx,ry) in enumerate(rings):
  for i in range(segments+1):
   a=start+(end-start)*i/segments;fold=1+.016*math.sin(a*11+j*1.7);vs.append((cx+rx*math.sin(a)*fold,cy-ry*math.cos(a)*fold,z))
 for j in range(len(rings)-1):
  for i in range(segments):k=j*(segments+1)+i;fs.append((k,k+1,k+segments+2,k+segments+1))
 me=bpy.data.meshes.new(n);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(n,me);s.collection.objects.link(o);attach(o,n,ma,bone);return o
# Head sculpt: oval cranium narrowing into jaw, localized eye sockets, cheekbones, nose and lips.
verts=[];faces=[];N=96;R=64
for j in range(R+1):
 v=j/R;z=1.465+v*.255;rad=math.sin(math.pi*v)**.52;rx=.098*rad*(.79+.21*min(1,v*2));ry=.083*rad
 for i in range(N):
  a=i/N*math.tau;x=rx*math.sin(a);y=-ry*math.cos(a)
  if math.cos(a)>0:
   def g(cx,cz,sx,sz):return math.exp(-((x-cx)/sx)**2-((z-cz)/sz)**2)
   front=max(0,math.cos(a))**4
   relief=.027*g(0,1.585,.018,.045)+.019*g(0,1.572,.023,.018)+.009*g(0,1.523,.035,.015)
   relief+=.009*(g(-.052,1.566,.028,.028)+g(.052,1.566,.028,.028))
   relief-=.010*(g(-.039,1.612,.025,.017)+g(.039,1.612,.025,.017))
   y-=relief*front
  verts.append((x,y,z))
for j in range(R):
 for i in range(N):a=j*N+i;b=j*N+(i+1)%N;faces.append((a,b,b+N,a+N))
mesh=bpy.data.meshes.new('Sculpted face');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Shaped face',mesh);s.collection.objects.link(o);attach(o,'Shaped face',skin,'head')
oval('Neck',(0,.012,1.435),(.05,.047,.085),skin,'head')
for sign in [-1,1]:
 oval('Ear',(sign*.093,.005,1.587),(.013,.024,.034),skin,'head')
 oval('Eye',(sign*.037,-.072,1.611),(.020,.010,.009),white,'head');oval('Hazel iris',(sign*.037,-.081,1.611),(.007,.003,.007),eye,'head')
 for upper in [True,False]:
  pts=[]
  for k in range(21):
   t=k/20;pts.append((sign*.037+(t-.5)*.043,-.08+abs(t-.5)*.012,1.611+math.sin(t*math.pi)*(.010 if upper else -.006)))
  tube('Eyelid',pts,.0025,skin,'head')
 tube('Brow',[(sign*.037+(t/12-.5)*.047,-.076,1.634+.006*math.sin(t/12*math.pi)) for t in range(13)],.003,hair,'head')
 tube('Silver hoop',[(sign*.100+.009*math.cos(t/32*math.tau),-.012,1.553+.015*math.sin(t/32*math.tau)) for t in range(33)],.0016,metal,'head')
for upper in [True,False]:tube('Lip',[(x,-.083-.007*math.sin(k/24*math.pi),1.534+(math.sin(k/24*math.pi)*(.003 if upper else -.005))) for k in range(25) for x in [(k/24-.5)*.045]],.0028,lip,'head')
# Layered bob made from volumetric locks rather than a solid helmet.
for i in range(420):
 a=random.uniform(.48,math.tau-.48);length=random.uniform(.14,.225);pts=[]
 for k in range(13):
  t=k/12;angle=a+.12*math.sin(t*4);r=.015+.090*math.sin(min(1,t*1.6)*math.pi/2);pts.append((r*math.sin(angle),.01-r*.82*math.cos(angle),1.731-length*t+.006*math.sin(t*6+i)))
 tube('Layered hair lock',pts,random.uniform(.0013,.003),hair,'head')
# Torso and open jacket panels.
loft('Midriff',[(.91,0,0,.13,.086),(1.0,0,0,.12,.080),(1.12,0,0,.145,.088)],skin,'spine')
loft('Cream shirt',[(1.065,0,0,.145,.094),(1.16,0,-.006,.154,.107),(1.26,0,-.01,.174,.105),(1.36,0,0,.17,.074),(1.415,0,0,.065,.047)],cream,'spine')
for side in [-1,1]:
 start,end=(.38,math.pi) if side==1 else (math.pi,math.tau-.38)
 rings=[(.95,0,.015,.19,.148),(1.05,0,.018,.188,.150),(1.19,0,.020,.20,.157),(1.34,0,.018,.225,.135),(1.40,0,.022,.18,.090)]
 loft('Open jacket lower',rings[:3],dark,'spine',start=start,end=end);loft('Open jacket yellow',rings[2:],jacket,'spine',start=start,end=end)
 a=start if side==1 else end;tube('Zipper edge',[(cx+rx*math.sin(a),cy-ry*math.cos(a)-.004,z) for z,cx,cy,rx,ry in rings],.0035,jacket,'spine')
 loft('Teal chest stripe',[(1.188,0,.018,.202,.159),(1.204,0,.018,.202,.159)],teal,'spine',start=start,end=end)
for side,sg in [('L',-1),('R',1)]:
 loft('Upper trouser',[(.49,sg*.10,0,.079,.076),(.62,sg*.10,0,.09,.09),(.78,sg*.095,0,.106,.101),(.95,sg*.084,0,.103,.097)],pants,'thigh'+side)
 loft('Loose trouser',[(.12,sg*.10,0,.077,.071),(.20,sg*.10,0,.072,.073),(.34,sg*.10,0,.068,.067),(.51,sg*.10,0,.080,.078)],pants,'shin'+side)
 oval('Cargo pocket',(sg*.165,-.058,.70),(.043,.030,.087),dark,'thigh'+side)
 oval('Trainer',(sg*.10,-.043,.077),(.069,.136,.063),shoe,'foot'+side);oval('Sole',(sg*.10,-.045,.034),(.072,.142,.025),sole,'foot'+side)
 for i in range(5):tube('Shoe lace',[(sg*.10-.039,-.035-i*.012,.126-i*.003),(sg*.10+.039,-.04-i*.012,.126-i*.003)],.002,cream,'foot'+side)
 loft('Upper sleeve',[(1.07,sg*.285,0,.06,.064),(1.18,sg*.26,0,.071,.074),(1.32,sg*.22,0,.084,.086),(1.36,sg*.20,0,.079,.081),(1.40,sg*.18,0,.022,.024)],jacket,'arm'+side)
 loft('Lower sleeve',[(.89,sg*.32,-.02,.047,.048),(1.00,sg*.31,-.01,.061,.057),(1.085,sg*.285,0,.062,.064)],dark,'forearm'+side)
 oval('Fingerless glove',(sg*.32,-.018,.858),(.039,.03,.054),black,'forearm'+side)
 for f in range(4):
  x=sg*.32+(f-1.5)*.017;limb('Finger',(x,-.02,.834),(x,-.025,.790+abs(f-1.5)*.004),.007,.008,skin,'forearm'+side)
 limb('Thumb',(sg*.35,-.023,.863),(sg*.365,-.032,.826),.01,.012,skin,'forearm'+side)
oval('Red messenger bag',(.245,.01,.85),(.063,.12,.145),bag,'root')
tube('Wide shoulder strap',[(-.135,-.102,1.405),(-.045,-.126,1.26),(.060,-.132,1.10),(.18,-.137,.94),(.235,-.08,.88)],.022,black,'spine')
# Join and reuse in-place idle/walk animation from source.
end=base[base.index('# Join while preserving weights;'):]
end=end.replace("D/'courier-prototype.blend'","D/'mila-study.blend'").replace("A/'courier-prototype.glb'","D/'mila-study.glb'")
exec(compile(end,'export-study','exec'))
# Studio views are actual mesh renders, not generated presentation imagery.
s.render.engine='CYCLES';s.cycles.samples=24;s.render.resolution_x=800;s.render.resolution_y=1000;s.render.resolution_percentage=100
s.world=bpy.data.worlds.new('Studio world');s.world.color=(.20,.20,.20)
bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.data.materials.append(mat('Studio floor',(.11,.12,.13)))
for loc,power,size in [((-3,-4,5),450,4),((3,-2,3),220,3),((0,3,4),500,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(Vector((0,0,1))-l.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(0,-3.7,1.15));cam=bpy.context.object;s.camera=cam;cam.data.lens=58
for name,loc,target in [('front',(0,-3.7,1.15),(0,0,.89)),('three-quarter',(2.4,-3.4,1.4),(0,0,.89)),('face',(0,-.72,1.63),(0,0,1.61))]:
 cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();s.render.filepath=str(D/(name+'.png'));bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(D/'mila-study.blend'))
