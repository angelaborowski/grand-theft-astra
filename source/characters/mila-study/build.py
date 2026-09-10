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
color(skin,(.48,.285,.165));color(jacket,(.65,.40,.015));color(pants,(.065,.060,.043));color(hair,(.035,.019,.008));color(shoe,(.56,.49,.32));color(bag,(.20,.019,.023))
cream=mat('Cream ribbed shirt',(.65,.60,.43));dark=mat('Charcoal technical fabric',(.065,.070,.052));teal=mat('Teal stripe',(.018,.32,.30));black=mat('Gloves and strap',(.018,.02,.016));sole=mat('Rubber sole',(.40,.35,.23))
def tube(n,points,r,ma,bone):
 cu=bpy.data.curves.new(n,'CURVE');cu.dimensions='3D';cu.bevel_depth=r;cu.bevel_resolution=2;sp=cu.splines.new('POLY');sp.points.add(len(points)-1)
 for q,p in zip(sp.points,points):q.co=(*p,1)
 o=bpy.data.objects.new(n,cu);s.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o=bpy.context.object;o.select_set(False);return attach(o,n,ma,bone)
def loft(n,rings,ma,bone,segments=48,start=0,end=math.tau):
 vs=[];fs=[]
 for j,(z,cx,cy,rx,ry) in enumerate(rings):
  for i in range(segments+1):
   a=start+(end-start)*i/segments;fold=1+.009*math.sin(a*11+j*1.7);vs.append((cx+rx*math.sin(a)*fold,cy-ry*math.cos(a)*fold,z))
 for j in range(len(rings)-1):
  for i in range(segments):k=j*(segments+1)+i;fs.append((k,k+1,k+segments+2,k+segments+1))
 me=bpy.data.meshes.new(n);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(n,me);s.collection.objects.link(o);attach(o,n,ma,bone);return o
# Head sculpt: oval cranium narrowing into jaw, localized eye sockets, cheekbones, nose and lips.
verts=[];faces=[];N=96;R=64
for j in range(R+1):
 v=j/R;z=1.465+v*.255;rad=math.sin(math.pi*v)**.52;rx=.102*rad*(.91+.09*min(1,v*2));ry=.083*rad
 for i in range(N):
  a=i/N*math.tau;x=rx*math.sin(a);y=-ry*math.cos(a)
  if math.cos(a)>0:
   def g(cx,cz,sx,sz):return math.exp(-((x-cx)/sx)**2-((z-cz)/sz)**2)
   front=max(0,math.cos(a))**4
   relief=.023*g(0,1.590,.014,.032)+.034*g(0,1.575,.017,.013)+.013*g(0,1.533,.034,.020)
   relief+=.006*(g(-.012,1.574,.009,.007)+g(.012,1.574,.009,.007))
   relief+=.009*(g(-.052,1.566,.028,.028)+g(.052,1.566,.028,.028))
   relief-=.004*(g(-.039,1.612,.025,.017)+g(.039,1.612,.025,.017))
   y-=relief*front
  verts.append((x,y,z))
for j in range(R):
 for i in range(N):a=j*N+i;b=j*N+(i+1)%N;faces.append((a,b,b+N,a+N))
mesh=bpy.data.meshes.new('Sculpted face');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Shaped face',mesh);s.collection.objects.link(o);attach(o,'Shaped face',skin,'head')
oval('Neck',(0,.012,1.435),(.05,.047,.085),skin,'head')
for sign in [-1,1]:
 oval('Ear',(sign*.093,.005,1.587),(.013,.024,.034),skin,'head')
 oval('Eye',(sign*.037,-.072,1.611),(.0175,.010,.007),white,'head');oval('Hazel iris',(sign*.037,-.081,1.611),(.006,.003,.006),eye,'head')
 for upper in [True,False]:
  pts=[]
  for k in range(21):
   t=k/20;pts.append((sign*.037+(t-.5)*.037,-.080+abs(t-.5)*.012,1.611+math.sin(t*math.pi)*(.008 if upper else -.004)))
  tube('Eyelid',pts,.0018,skin,'head')
 tube('Brow',[(sign*.037+(t/12-.5)*.047,-.076,1.634+.006*math.sin(t/12*math.pi)) for t in range(13)],.0018,hair,'head')
 tube('Silver hoop',[(sign*.100+.009*math.cos(t/32*math.tau),-.012,1.553+.015*math.sin(t/32*math.tau)) for t in range(33)],.0016,metal,'head')
# Defined mouth, nose wings and tear ducts; all attached to the head bone.
for upper in [True,False]:
 pts=[]
 for k in range(33):
  t=k/32;x=(t-.5)*.047
  z=1.535+(math.sin(math.pi*t)*(.004 if upper else -.005))
  if upper:z-=.002*math.exp(-((t-.5)/.10)**2)
  pts.append((x,-.087-.012*math.sin(math.pi*t),z))
 tube('Lip vermilion',pts,.0023,lip,'head')
for sg in [-1,1]:
 oval('Pupil',(sg*.037,-.084,1.611),(.0028,.001,.0034),black,'head')
 oval('Eye glint',(sg*.037-.002,-.085,1.613),(.0012,.0007,.0012),white,'head')
# A continuous scalp under tapered ribbon locks prevents holes and blunt noodle ends.
loft('Hair scalp',[(1.625+.115*t/24,0,.014,.107*math.sqrt(max(.0001,1-(t/24)**2)),.092*math.sqrt(max(.0001,1-(t/24)**2))) for t in range(25)],hair,'head',segments=64,start=.72,end=math.tau-.72)
hair_high=mat('Warm brown hair highlights',(.062,.033,.016),.48)
for i in range(230):
 a=random.uniform(.66,math.tau-.66);length=random.uniform(.17,.232);vs=[];fs=[]
 width=random.uniform(.003,.008)
 for k in range(21):
  t=k/20;ang=a+.13*math.sin(t*3.8)+.08*t*t
  r=.006+.103*math.sin(min(1,t*1.65)*math.pi/2)+.006*t*t
  z=1.743-length*t
  w=width*math.sin(math.pi*t)**.7+.00015
  for side in [-1,1]:
   aa=ang+side*w/r
   vs.append((r*math.sin(aa),.014-r*.86*math.cos(aa),z+.003*math.sin(t*7+a)))
 for k in range(20):fs.append((k*2,k*2+1,k*2+3,k*2+2))
 me=bpy.data.meshes.new('Tapered bob layer');me.from_pydata(vs,[],fs);me.update()
 ob=bpy.data.objects.new('Tapered bob layer',me);s.collection.objects.link(ob);attach(ob,'Tapered bob layer',hair_high if i%7==0 else hair,'head')
 # Both sides of the ribbon remain visible in the GLB.
 for ma in ob.data.materials:ma.use_backface_culling=False
# Side-part swept locks lower the hairline and frame the cheek.
for sg in [-1,1]:
 for i in range(26):
  t0=i/25;pts=[]
  for k in range(21):
   t=k/20
   pts.append((sg*(.008+.086*t)+.004*math.sin(t*4+i),-.041-.040*math.sin(t*math.pi/2)+t0*.024,1.723-.105*t+.012*math.sin(t*math.pi)-.010*t0))
  tube('Swept fringe',pts,.0014,hair_high if i%8==0 else hair,'head')
# Torso and open jacket panels.
loft('Midriff',[(.92,0,0,.15,.098),(1.0,0,0,.12,.080),(1.12,0,0,.145,.088)],skin,'spine')
loft('Cream shirt',[(1.065,0,0,.145,.094),(1.16,0,-.006,.154,.107),(1.26,0,-.01,.174,.105),(1.36,0,0,.17,.074),(1.415,0,0,.065,.047)],cream,'spine')
for side in [-1,1]:
 start,end=(.38,math.pi) if side==1 else (math.pi,math.tau-.38)
 rings=[(.95,0,.015,.19,.148),(1.05,0,.018,.188,.150),(1.19,0,.020,.20,.157),(1.34,0,.018,.225,.135),(1.40,0,.022,.18,.090)]
 loft('Open jacket lower',rings[:3],dark,'spine',start=start,end=end);loft('Open jacket yellow',rings[2:],jacket,'spine',start=start,end=end)
 a=start if side==1 else end;tube('Zipper edge',[(cx+rx*math.sin(a),cy-ry*math.cos(a)-.004,z) for z,cx,cy,rx,ry in rings],.0035,jacket,'spine')
 loft('Teal chest stripe',[(1.188,0,.018,.202,.159),(1.204,0,.018,.202,.159)],teal,'spine',start=start,end=end)
loft('Trouser waistband',[(.91,0,0,.177,.110),(.968,0,0,.171,.108)],pants,'root')
for side,sg in [('L',-1),('R',1)]:
 leg=loft('Continuous cargo leg',[(.12,sg*.10,0,.077,.071),(.20,sg*.10,0,.079,.076),(.34,sg*.10,0,.079,.076),(.44,sg*.10,0,.082,.079),(.48,sg*.10,0,.085,.081),(.52,sg*.10,0,.086,.082),(.56,sg*.10,0,.087,.084),(.62,sg*.10,0,.09,.09),(.78,sg*.095,0,.106,.101),(.95,sg*.084,0,.103,.097)],pants,'thigh'+side)
 shin_group=leg.vertex_groups.new(name='shin'+side)
 for v in leg.data.vertices:
  w=max(0,min(1,(.59-v.co.z)/.14))
  leg.vertex_groups['thigh'+side].add([v.index],1-w,'REPLACE');shin_group.add([v.index],w,'REPLACE')
 oval('Cargo pocket',(sg*.165,-.058,.70),(.043,.030,.087),dark,'thigh'+side)
 oval('Trainer',(sg*.10,-.043,.077),(.069,.136,.063),shoe,'foot'+side);oval('Sole',(sg*.10,-.045,.034),(.072,.142,.025),sole,'foot'+side)
 for i in range(5):tube('Shoe lace',[(sg*.10-.039,-.035-i*.012,.126-i*.003),(sg*.10+.039,-.04-i*.012,.126-i*.003)],.002,cream,'foot'+side)
 sleeve=loft('Continuous jacket sleeve',[(.88,sg*.32,-.02,.047,.048),(.98,sg*.31,-.01,.061,.057),(1.035,sg*.30,0,.062,.063),(1.08,sg*.285,0,.066,.067),(1.13,sg*.275,0,.070,.073),(1.18,sg*.26,0,.073,.076),(1.32,sg*.22,0,.084,.086),(1.36,sg*.20,0,.079,.081),(1.40,sg*.18,0,.022,.024)],jacket,'arm'+side)
 sleeve.data.materials.append(dark)
 for face in sleeve.data.polygons:
  if sum(sleeve.data.vertices[i].co.z for i in face.vertices)/len(face.vertices)<1.14:face.material_index=1
 forearm=sleeve.vertex_groups.new(name='forearm'+side)
 for v in sleeve.data.vertices:
  w=max(0,min(1,(1.15-v.co.z)/.14));sleeve.vertex_groups['arm'+side].add([v.index],1-w,'REPLACE');forearm.add([v.index],w,'REPLACE')
 oval('Fingerless glove',(sg*.32,-.018,.858),(.039,.03,.054),black,'forearm'+side)
 for f in range(4):
  x=sg*.32+(f-1.5)*.017;limb('Finger',(x,-.02,.834),(x,-.025,.790+abs(f-1.5)*.004),.007,.008,skin,'forearm'+side)
 limb('Thumb',(sg*.35,-.023,.863),(sg*.365,-.032,.826),.01,.012,skin,'forearm'+side)
oval('Red messenger bag',(.245,.01,.85),(.063,.12,.145),bag,'root')
tube('Wide shoulder strap',[(-.135,-.102,1.405),(-.045,-.126,1.26),(.060,-.132,1.10),(.18,-.137,.94),(.235,-.08,.88)],.022,black,'spine')
# Raised collar, cuff ribs, pocket flaps and panel seams add readable garment structure.
for sg,side in [(-1,'L'),(1,'R')]:
 loft('Raised jacket collar',[(1.365,sg*.09,.008,.075,.087),(1.425,sg*.075,.015,.052,.062),(1.452,sg*.062,.02,.038,.053)],jacket,'spine',segments=32,start=.3 if sg==1 else math.pi,end=math.pi if sg==1 else math.tau-.3)
 for z in [.895,.903,.911,.919]:
  loft('Cuff rib',[(z,sg*.32,-.02,.049,.050),(z+.003,sg*.32,-.02,.049,.050)],black,'forearm'+side,segments=32)
 for z in [.967,.979]:
  tube('Jacket hem stitch',[(sg*(.08+t/30*.10),-.125-.015*math.sin(t/30*math.pi),z) for t in range(31)],.0013,jacket,'spine')
 tube('Cargo pocket seam',[(sg*.174,-.081,.78),(sg*.204,-.062,.76),(sg*.204,-.062,.64),(sg*.164,-.09,.64)],.0015,black,'thigh'+side)
 tube('Trouser outer seam',[(sg*.181,.005,.91),(sg*.195,.005,.76),(sg*.185,.005,.62),(sg*.18,.005,.49)],.0012,dark,'thigh'+side)
 tube('Shoe toe panel',[(sg*.1+.061*math.cos(t/24*math.pi),-.08-.080*math.sin(t/24*math.pi),.082) for t in range(25)],.0018,cream,'foot'+side)
# Subtle material roughness; render and runtime share these portable PBR constants.
for ma,rough in [(skin,.52),(hair,.83),(hair_high,.83),(jacket,.72),(dark,.86),(pants,.88),(cream,.9),(bag,.66)]:
 ma.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=rough
# Join and reuse in-place idle/walk animation from source.
end=base[base.index('# Join while preserving weights;'):]
end=end.replace("[('Idle',False),('Walk',True)]","[('Idle',False),('Walk',True),('Greet',False)]")
end=end.replace("elif name=='spine':", "elif action_name=='Greet' and name=='armR':p.rotation_euler.z=-1.25\n   elif action_name=='Greet' and name=='forearmR':p.rotation_euler.x=-.8+math.sin(phase)*.3\n   elif name=='spine':")
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
