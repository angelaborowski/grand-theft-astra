"""Reference-guided cast pass. CC0 anatomical head/hair, original garments, and procedural textile maps.
Keeps the original metre scale, stable runtime paths, and 13-bone animation contract.
"""
import bpy, math, random, json, sys, os
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
D=Path(__file__).resolve().parent
ROOT=D.parents[2]
OUT=D/'quality';OUT.mkdir(exist_ok=True)
BASE=(D/'build.py').read_text()
CONFIG={
 'mila':dict(width=1,head=.99,age=26,skin=(.49,.29,.17),coat=(.69,.43,.015),shirt=(.69,.65,.51),pants=(.055,.050,.041),hair=(.025,.014,.009),style='bob',shoe=(.46,.40,.28),bag=True),
 'lev':dict(width=.93,head=.94,age=64,skin=(.49,.32,.22),coat=(.048,.063,.035),shirt=(.053,.032,.025),pants=(.081,.043,.028),hair=(.16,.15,.115),style='receding',shoe=(.018,.014,.009),bag=True),
 'niko':dict(width=.96,head=.96,age=27,skin=(.43,.255,.14),coat=(.012,.13,.27),shirt=(.14,.23,.25),pants=(.057,.061,.052),hair=(.016,.010,.007),style='curls',shoe=(.013,.10,.19),bag=True),
 'irina':dict(width=1.23,head=1.12,age=57,skin=(.49,.295,.22),coat=(.105,.019,.060),shirt=(.68,.64,.50),pants=(.022,.024,.026),hair=(.13,.14,.13),style='bun',shoe=(.060,.013,.023),bag=False),
 'sasha':dict(width=1.08,head=1.05,age=34,skin=(.56,.335,.245),coat=(.19,.25,.17),shirt=(.34,.025,.020),pants=(.075,.075,.052),hair=(.066,.022,.01),style='tied',shoe=(.12,.046,.023),bag=False),
 'alexei':dict(width=1.10,head=1.03,age=59,skin=(.45,.29,.19),coat=(.021,.036,.055),shirt=(.23,.25,.22),pants=(.065,.068,.057),hair=(.18,.185,.16),style='short',shoe=(.019,.019,.018),bag=False),
 'courier-prototype':dict(width=1,head=1,age=36,skin=(.41,.255,.16),coat=(.29,.21,.12),shirt=(.25,.27,.24),pants=(.045,.057,.06),hair=(.035,.025,.018),style='short',shoe=(.032,.038,.039),bag=False),
}
SELECT=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else list(CONFIG)

def build(name):
 global s,arm,pieces,skin,jacket,pants,hair,shoe,bag,white,eye,lip,metal
 cfg=CONFIG[name];low=cfg.get('low',name=='courier-prototype');random.seed(41+list(CONFIG).index(name))
 exec(compile(BASE[:BASE.index("oval('Clothed torso'")],str(D/'build.py'),'exec'),globals())
 # Existing primitives remain available, but lofts use continuous weighted geometry.
 def setc(ma,c):ma.diffuse_color=(*c,1);ma.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*c,1)
 for ma,key in [(skin,'skin'),(jacket,'coat'),(pants,'pants'),(hair,'hair'),(shoe,'shoe')]:setc(ma,cfg[key])
 dark=mat('Charcoal canvas',(.038,.040,.030));shirt=mat('Shirt',cfg['shirt']);black=mat('Leather',(.012,.014,.014),.65)
 accent=mat('Accent',(.50,.19,.026));thread=mat('Stitching',tuple(c*.68 for c in cfg['coat']));sole=mat('Sole',(.08,.075,.06));gold=mat('Brass',(.34,.22,.055),.32)
 setc(lip,tuple(c*f for c,f in zip(cfg['skin'],(.63,.42,.45))));setc(white,(.53,.52,.45));setc(eye,(.06,.065,.043))
 for ma in [hair,skin]:ma.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.62
 def tube(n,pts,r,ma,bone,steps=6,taper=False):
  vs=[];fs=[]
  for j,p in enumerate(pts):
   p=Vector(p);v=Vector(pts[min(j+1,len(pts)-1)])-Vector(pts[max(0,j-1)]);v.normalize();a=v.cross(Vector((0,1,0)))
   if a.length<.1:a=v.cross(Vector((1,0,0)))
   a.normalize();b=v.cross(a);rr=r*(max(.08,math.sin(math.pi*(j+.4)/(len(pts)+.1))**.45) if taper else 1)
   for k in range(steps):vs.append(tuple(p+rr*(a*math.cos(k*math.tau/steps)+b*math.sin(k*math.tau/steps))))
  for j in range(len(pts)-1):
   for k in range(steps):a=j*steps+k;b=j*steps+(k+1)%steps;fs.append((a,b,b+steps,a+steps))
  return mesh(n,vs,fs,ma,bone)
 def mesh(n,vs,fs,ma,bone):
  me=bpy.data.meshes.new(n);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(n,me);s.collection.objects.link(o);attach(o,n,ma,bone)
  uv=me.uv_layers.new(name='UVMap')
  for loop in me.loops:
   v=me.vertices[loop.vertex_index].co;uv.data[loop.index].uv=(math.atan2(v.y,v.x)/math.tau+.5,v.z*2)
  return o
 def loft(n,rings,ma,bone,seg=None,start=0,end=math.tau,fold=.0):
  seg=seg or (20 if low else 40);vs=[];fs=[]
  # Interpolate rings to allow folds without a stack-of-cones silhouette.
  dense=[]
  for a,b in zip(rings,rings[1:]):
   for k in range(3):dense.append(tuple(x+(y-x)*k/3 for x,y in zip(a,b)))
  dense.append(rings[-1])
  for z,cx,cy,rx,ry in dense:
   for k in range(seg+1):
    a=start+(end-start)*k/seg;w=1+fold*(.5*math.sin(a*7+z*47)+.5*math.sin(a*11-z*31));vs.append((cx+rx*math.sin(a)*w,cy-ry*math.cos(a)*w,z))
  for j in range(len(dense)-1):
   for k in range(seg):i=j*(seg+1)+k;fs.append((i,i+1,i+seg+2,i+seg+1))
  return mesh(n,vs,fs,ma,bone)
 def blend(o,b1,b2,z0,z1):
  g=o.vertex_groups.get(b2) or o.vertex_groups.new(name=b2)
  for v in o.data.vertices:
   w=max(0,min(1,(z1-v.co.z)/(z1-z0)));o.vertex_groups[b1].add([v.index],1-w,'REPLACE');g.add([v.index],w,'REPLACE')
 def box(n,loc,scale,ma,bone,bevel=.006):
  bpy.ops.mesh.primitive_cube_add(size=2,location=loc);o=bpy.context.object;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
  mod=o.modifiers.new('Tailored rounded edges','BEVEL');mod.width=bevel;mod.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name);attach(o,n,ma,bone);return o
 # CC0 MakeHuman hm08 head topology, reshaped per cast; original rig is retained.
 h=cfg['head'];age=cfg['age'];raw=[];uvs=[];rawfaces=[];group=''
 for line in (D/'vendor/makehuman/base.obj').read_text().splitlines():
  if line.startswith('v '):raw.append(tuple(map(float,line.split()[1:])))
  elif line.startswith('vt '):uvs.append(tuple(map(float,line.split()[1:3])))
  elif line.startswith('g '):group=line.split()[1]
  elif line.startswith('f ') and group=='body':
   face=[tuple(int(v)-1 for v in word.split('/')[:2]) for word in line.split()[1:]]
   if all(raw[v][1]>5.80 for v,t in face):rawfaces.append(face)
 used=sorted({v for face in rawfaces for v,t in face});mapping={old:new for new,old in enumerate(used)}
 def hp(p):
  x,y,z=p;fullness=1+.06*max(0,1-abs(y-6.7)) if name=='irina' else 1
  px=x*.115*h*fullness;py=-z*.10+.052;pz=(y-5.8)*.115+1.425
  jaw={'mila':.94,'lev':.90,'niko':1.03,'irina':1.10,'sasha':1.05,'alexei':1.13,'courier-prototype':1.04}.get(name,1.04)
  px*=1+(jaw-1)*math.exp(-((pz-1.52)/.043)**2)
  nose={'mila':-.002,'lev':.005,'niko':.003,'irina':.001,'sasha':-.001,'alexei':.004,'courier-prototype':.002}.get(name,.002)
  py-=nose*math.exp(-(px/.018)**2-((pz-1.57)/.028)**2)*max(0,min(1,-py/.06))
  return (px,py,pz)
 head=mesh('Anatomical head',[hp(raw[v]) for v in used],[[mapping[v] for v,t in face] for face in rawfaces],skin,'head')
 for v in head.data.vertices:
  if v.co.z<1.455:v.co.z=1.411;v.co.x*=.73;v.co.y*=.75
 for poly,face in zip(head.data.polygons,rawfaces):
  for li,(_,ti) in zip(poly.loop_indices,face):head.data.uv_layers.active.data[li].uv=uvs[ti]
 skin_names={'mila':'toigo_light_skin_with_natural_makeup','lev':'onlytheghosts_old_eurasian_male','niko':'toigo_light_skin_male_bronze','irina':'onlytheghosts_old_eurasian_female','sasha':'toigo_light_skin_female_freckles','alexei':'jartur69_middleage_slavic_male_with_genitals_and_beard','courier-prototype':'toigo_light_skin_male_bronze'}
 skin_dir=D/'vendor/makehuman/skins'/skin_names[cfg.get('profile',name)]
 mhmat=next(skin_dir.glob('*.mhmat'));diffuse=next(line.split(maxsplit=1)[1] for line in mhmat.read_text().splitlines() if line.startswith('diffuseTexture'))
 image=bpy.data.images.load(str(skin_dir/diffuse));image.scale(1024,1024);image.pack()
 face_mat=skin.copy();face_mat.name='Textured skin';head.data.materials[0]=face_mat
 tex=face_mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image;face_mat.node_tree.links.new(tex.outputs['Color'],face_mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
 head_tree=BVHTree.FromPolygons([v.co for v in head.data.vertices],[list(p.vertices) for p in head.data.polygons])
 # Use an ellipsoid inside each anatomical eye socket; iris sits on its front surface.
 for sg in [-1,1]:
  ex=sg*.30775*.115*h;ey=-1.24535*.10+.052;ez=(7.28415-5.8)*.115+1.425
  oval('Eye',(ex,ey,ez),(.0114,.0107,.0114),white,'head');oval('Iris',(ex,ey-.0103,ez),(.0052,.0011,.0052),eye,'head');oval('Pupil',(ex,ey-.0112,ez),(.0023,.0006,.0026),black,'head')
  brow_points=[]
  for k in range(17):
   x=ex+(k/16-.5)*.035;z=ez+.017+.004*math.sin(k/16*math.pi);hit=head_tree.ray_cast(Vector((x,-.4,z)),Vector((0,1,0)))[0]
   if hit:brow_points.append((x,hit.y-.0012,z))
  if len(brow_points)>1:tube('Eyebrow',brow_points,.0015,hair,'head',steps=5,taper=True)
 # Opaque scalp under the alpha cards prevents unintended bald patches.
 scalp_faces=[f for f in rawfaces if all(abs(raw[v][0])<.64 or raw[v][1]>7.7 for v,t in f) and all(raw[v][1]>(8.15 if cfg['style']=='receding' else 7.98) if raw[v][2]>.65 else raw[v][1]>7.05 for v,t in f)]
 scalp_ids=sorted({v for f in scalp_faces for v,t in f});sm={v:i for i,v in enumerate(scalp_ids)};sv=[]
 for v in scalp_ids:
  q=Vector(hp(raw[v]));q+=(q-Vector((0,.01,1.62))).normalized()*.0015;sv.append(tuple(q))
 if cfg['style']!='bob':mesh('Scalp beneath hair',sv,[[sm[v] for v,t in f] for f in scalp_faces],hair,'head')
 # CC0 fitted hair cage; barycentric MakeClothes mapping preserves scalp fit.
 style=cfg['style'];hair_name='toigo_curled_under_bob' if style=='bob' else 'cortu_short_messy_hair'
 hd=D/'vendor/makehuman/hair'/hair_name;clo=next(hd.glob('*.mhclo'));lines=clo.read_text().splitlines();props={l.split()[0]:l.split()[1:] for l in lines if l and not l.startswith('#')}
 obj=hd/props['obj_file'][0];hairuv=[];hairfaces=[]
 for line in obj.read_text().splitlines():
  if line.startswith('vt '):hairuv.append(tuple(map(float,line.split()[1:3])))
  elif line.startswith('f '):hairfaces.append([tuple(int(v)-1 for v in w.split('/')[:2]) for w in line.split()[1:]])
 scale=[]
 for key,axis in [('x_scale',0),('y_scale',1),('z_scale',2)]:
  vals=props[key];scale.append(abs(raw[int(vals[0])][axis]-raw[int(vals[1])][axis])/float(vals[2]))
 start=next(i for i,l in enumerate(lines) if l.startswith('verts '))+1;hv=[]
 for line in lines[start:]:
  fields=line.split()
  if len(fields)!=9:break
  ids=list(map(int,fields[:3]));weights=list(map(float,fields[3:6]));offset=list(map(float,fields[6:9]))
  hpnt=[sum(raw[ids[j]][k]*weights[j] for j in range(3))+offset[k]*scale[k] for k in range(3)]
  q=list(hp(hpnt))
  if style=='receding':q[0]*=.91;q[1]=.02+(q[1]-.02)*.91;q[2]=1.63+(q[2]-1.63)*.93
  elif style=='curls':q[0]*=1.10;q[1]=.02+(q[1]-.02)*1.10;q[2]+=.008
  elif style in ['bun','tied']:q[0]*=.94;q[1]=.02+(q[1]-.02)*.94
  hv.append(tuple(q))
 hm=hair.copy();hm.name='Textured hair';ho=mesh('Fitted hair',hv,[[v for v,t in f] for f in hairfaces],hm,'head')
 for poly,face in zip(ho.data.polygons,hairfaces):
  for li,(_,ti) in zip(poly.loop_indices,face):ho.data.uv_layers.active.data[li].uv=hairuv[ti]
 matfile=hd/props['material'][0];diffuse=next(l.split(maxsplit=1)[1] for l in matfile.read_text().splitlines() if l.startswith('diffuseTexture'))
 him=bpy.data.images.load(str(hd/diffuse));him.scale(512,512)
 pix=list(him.pixels)
 for i in range(0,len(pix),4):
  if age>50:
   lum=sum(pix[i:i+3])/3
   pix[i:i+3]=[lum*.72,lum*.74,lum*.70]
  elif style=='bob':pix[i:i+3]=[pix[i]*.27,pix[i+1]*.32,pix[i+2]*.38]
  else:pix[i:i+3]=[pix[i+k]*min(1,cfg['hair'][k]*5) for k in range(3)]
 him.pixels.foreach_set(pix);him.pack();ht=hm.node_tree.nodes.new('ShaderNodeTexImage');ht.image=him;bs=hm.node_tree.nodes.get('Principled BSDF');hm.node_tree.links.new(ht.outputs['Color'],bs.inputs['Base Color']);bs.inputs['Roughness'].default_value=.72
 if style!='bob':
  hm.node_tree.links.new(ht.outputs['Alpha'],bs.inputs['Alpha']);hm.surface_render_method='DITHERED';hm.use_backface_culling=False
 if style in ['bun','tied']:
  oval('Tied hair',(0,.098,1.665),(.043,.039,.037),hair,'head')
  if style=='tied':tube('Ponytail',[(0,.108,1.68),(.022,.119,1.62),(.036,.103,1.54)],.024,hair,'head',steps=12,taper=True)
 if name=='alexei':
  for sg in [-1,1]:tube('Grey moustache',[(sg*.002,-.116,1.537),(sg*.012,-.114,1.536),(sg*.025,-.109,1.532)],.003,hair,'head',steps=6,taper=True)
 # Continuous tailored torso and weighted limbs.
 width=cfg['width'];hem=.68 if name=='lev' else (.89 if name=='irina' else .965)
 shirtbottom=1.07 if name=='mila' else .94
 loft('Undershirt',[(shirtbottom,0,0,.145*width,.097),(1.18,0,-.008,.16*width,.106),(1.33,0,0,.17*width,.087),(1.414,0,0,.058,.048)],shirt,'spine',fold=.008)
 if name=='mila':loft('Midriff',[(.945,0,0,.139,.093),(1.09,0,0,.137,.090)],skin,'spine')
 rings=[(hem,0,.02,.175*width,.125),(.99,0,.018,.18*width,.126),(1.16,0,.01,.19*width,.137),(1.32,0,.008,.213*width,.116),(1.39,0,.013,.172*width,.080),(1.425,0,.015,.067,.049)]
 # Long coat rings must ascend.
 rings=sorted(rings)
 for sg in [-1,1]:
  start,end=(.29,math.pi) if sg==1 else (math.pi,math.tau-.29)
  coat=loft('Jacket panel',rings,jacket,'spine',start=start,end=end,fold=.025)
  coat.data.materials.append(dark);coat.data.materials.append(accent)
  for face in coat.data.polygons:
   z=sum(coat.data.vertices[v].co.z for v in face.vertices)/len(face.vertices)
   if name=='mila' and z<1.19:face.material_index=1
   if name=='niko' and sg==-1:face.material_index=2
  tube('Front binding',[(sg*rx*math.sin(.29),cy-ry*math.cos(.29)-.002,z) for z,cx,cy,rx,ry in rings],.0022,thread,'spine')
  if name!='irina':
   # Folded lapels connect to the collar at the neck.
   mesh('Collar lapel',[(sg*.065,-.056,1.428),(sg*.105,-.083,1.37),(sg*.075,-.135,1.29),(sg*.036,-.114,1.355)],[(0,1,2,3)],jacket,'spine')
  if name=='mila':loft('Teal stripe',[(1.18,0,.012,.203,.146),(1.197,0,.012,.203,.146)],mat('Teal',(.01,.25,.23)),'spine',start=start,end=end,fold=.025)
 loft('Waistband',[(.918,0,0,.177*width,.108),(.967,0,0,.174*width,.108)],pants,'root')
 for sg,side in [(-1,'L'),(1,'R')]:
  rr=1.13 if name=='irina' else 1
  leg=loft('Continuous trouser',[(.12,sg*.1,0,.060*rr,.058),(.20,sg*.1,0,.066*rr,.067),(.34,sg*.1,0,.07*rr,.066),(.48,sg*.1,0,.078*rr,.074),(.55,sg*.1,0,.083*rr,.080),(.72,sg*.096,0,.090*rr,.090),(.95,sg*.084,0,.097*width,.098)],pants,'thigh'+side,fold=.025)
  blend(leg,'thigh'+side,'shin'+side,.45,.59)
  oval('Shoulder lining',(sg*.208,0,1.332),(.052,.063,.034),accent if name=='niko' and sg==-1 else jacket,'arm'+side)
  sleeve=loft('Continuous sleeve',[(.875,sg*.32,-.02,.043,.045),(.96,sg*.31,-.01,.053,.051),(1.055,sg*.292,0,.06,.061),(1.11,sg*.283,0,.065,.067),(1.23,sg*.246,0,.077,.077),(1.345,sg*.213,0,.080,.078),(1.39,sg*.18,0,.043,.04)],jacket,'arm'+side,fold=.040)
  blend(sleeve,'arm'+side,'forearm'+side,1.025,1.15);sleeve.data.materials.append(dark);sleeve.data.materials.append(accent)
  for face in sleeve.data.polygons:
   z=sum(sleeve.data.vertices[v].co.z for v in face.vertices)/len(face.vertices)
   if name=='mila' and z<1.16:face.material_index=1
   if name=='niko' and sg==-1:face.material_index=2
  loft('Cuff',[(.878,sg*.32,-.02,.045,.047),(.901,sg*.318,-.018,.047,.048)],dark if name=='mila' else jacket,'forearm'+side,fold=.045)
  # Anatomical palm plus bent, tapered digit surfaces instead of mittens/cones.
  palm_ma=black if name in ['mila','niko','sasha'] else skin
  oval('Palm',(sg*.32,-.019,.846),(.030,.020,.044),palm_ma,'forearm'+side)
  for f in range(4):
   x=sg*.32+(f-1.5)*.014;length=[.047,.057,.052,.040][f]
   pts=[(x,-.019,.831),(x,-.022,.817),(x,-.031,.831-length*.72),(x,-.036,.831-length)]
   tube('Finger',pts,.0065,skin if name!='sasha' else palm_ma,'forearm'+side,steps=8,taper=True)
  tube('Thumb',[(sg*.344,-.019,.857),(sg*.354,-.032,.839),(sg*.348,-.043,.823)],.008,skin,'forearm'+side,steps=8,taper=True)
  # Flat outsole, structured toe box and vamp.
  box('Outsole',(sg*.1,-.046,.035),(.065,.123,.020),sole,'foot'+side,.015)
  oval('Shoe upper',(sg*.1,-.042,.078),(.064,.120,.049),shoe,'foot'+side)
  box('Heel',(sg*.1,.037,.040),(.056,.033,.023),sole,'foot'+side,.010)
  tube('Toe seam',[(sg*.1+.057*math.cos(t/20*math.pi),-.084-.065*math.sin(t/20*math.pi),.077) for t in range(21)],.0013,black,'foot'+side)
  if name not in ['lev','irina','alexei']:
   for j in range(4):tube('Laces',[(sg*.1-.028,-.018-j*.012,.119-j*.002),(sg*.1+.027,-.023-j*.012,.119-j*.002)],.0015,shirt,'foot'+side)
  if not low:
   # Sewn pockets sit on the jacket/trouser surface.
   box('Patch pocket',(sg*.12*width,-.118,1.05),(.047,.008,.055),dark if name=='mila' else jacket,'spine',.006)
   tube('Pocket stitching',[(sg*.12*width-.042,-.128,1.096),(sg*.12*width-.042,-.128,1.003),(sg*.12*width+.042,-.128,1.003),(sg*.12*width+.042,-.128,1.096)],.0009,thread,'spine',steps=4)
   if name in ['mila','sasha']:box('Cargo pocket',(sg*.165,-.065,.71),(.033,.017,.060),pants,'thigh'+side,.005)
 # Costume identifiers from the completed reference images.
 if name=='lev':
  scarf=mat('Burgundy scarf',(.19,.014,.043));loft('Scarf collar',[(1.37,0,.01,.08,.073),(1.445,0,.01,.065,.060)],scarf,'spine',fold=.07)
  box('Scarf hanging end',(-.035,-.141,1.24),(.033,.012,.15),scarf,'spine',.003)
  for sg in [-1,1]:
   tube('Glasses frame',[(sg*.036+.023*math.cos(t/32*math.tau),-.103,1.596+.020*math.sin(t/32*math.tau)) for t in range(33)],.0014,gold,'head')
   tube('Glasses temple',[(sg*.064,-.103,1.601),(sg*.090,-.03,1.605),(sg*.095,.008,1.598)],.0014,gold,'head')
  tube('Glasses bridge',[(-.013,-.113,1.600),(0,-.125,1.604),(.013,-.113,1.600)],.0013,gold,'head')
 if name=='irina':
  for z in [1.0,1.09,1.18,1.27,1.35]:oval('Cardigan button',(-.059,-.132,z),(.006,.003,.006),black,'spine')
  for sg in [-1,1]:oval('Gold earring',(sg*.103,.002,1.562),(.003,.003,.006),gold,'head')
  tube('Key ring',[(-.32+.018*math.cos(t/24*math.tau),-.025,.77+.018*math.sin(t/24*math.tau)) for t in range(25)],.002,gold,'forearmL')
  for i in range(3):box('Key',(-.332+i*.009,-.025,.738),(.002,.002,.016),gold,'forearmL',.001)
 if name=='sasha':
  yellow=mat('Headphones yellow',(.67,.44,.009))
  for sg in [-1,1]:oval('Headphone cup',(sg*.078,-.071,1.408),(.029,.027,.039),yellow,'spine')
  tube('Headphone band',[(-.080,-.05,1.41),(-.065,.05,1.425),(0,.071,1.43),(.065,.05,1.425),(.080,-.05,1.41)],.007,black,'spine')
 if name=='alexei':
  for sg in [-1,1]:tube('Reflective shoulder piping',[(sg*.08,-.071,1.405),(sg*.16,-.09,1.365),(sg*.23,-.071,1.31)],.0025,metal,'spine')
 if cfg['bag']:
  bagc=(.16,.012,.023) if name=='mila' else ((.10,.032,.011) if name=='lev' else (.025,.036,.044));setc(bag,bagc)
  box('Messenger bag',(.239,.015,.86),(.052,.091,.109),bag,'root',.018)
  box('Bag flap',(.240,-.079,.89),(.049,.009,.064),bag,'root',.008)
  tube('Shoulder strap',[(-.12,-.102,1.40),(-.033,-.140,1.24),(.084,-.151,1.06),(.23,-.092,.91)],.014,black,'spine',steps=6)
 # Occupational clothing is joined to the same animated skeleton.
 role=cfg.get('occupation')
 if role:
  uniform=mat('Uniform details',cfg.get('detail',(.8,.75,.6)))
  reflective=mat('Reflective tape',(.7,.76,.7))
  if role in ['baker','chef','barista','florist','shopkeeper']:
   # A curved apron follows the torso; short hem stays clear of walking knees.
   loft('Apron skirt',[(.91,0,-.020,.205*width,.16),(.98,0,-.020,.205*width,.16),(1.12,0,-.012,.205*width,.16)],uniform,'spine',seg=20,start=-1.35,end=1.35)
   mesh('Apron bib',[(-.10,-.133,1.13),(.10,-.133,1.13),(.085,-.115,1.34),(-.085,-.115,1.34)],[(0,1,2,3)],uniform,'spine')
   for sg in [-1,1]:tube('Apron strap',[(sg*.083,-.116,1.32),(sg*.063,-.07,1.41),(sg*.065,.055,1.40)],.009,uniform,'spine')
   box('Apron pocket',(0,-.158,1.015),(.065,.006,.042),uniform,'spine')
  if role in ['police','security','delivery','tram-driver','mechanic']:
   oval('Uniform cap',(0,.012,1.724),(.104,.100,.046),jacket,'head')
   oval('Cap visor',(0,-.081,1.715),(.098,.072,.009),jacket,'head')
  if role in ['baker','chef']:
   loft('Chef hat band',[(1.68,0,.01,.099,.093),(1.74,0,.01,.102,.095)],uniform,'head')
   oval('Chef hat crown',(0,.013,1.768),(.106,.096,.061 if role=='chef' else .028),uniform,'head')
  if role in ['construction','firefighter','sanitation']:
   oval('Protective helmet',(0,.01,1.736),(.111,.112,.066),uniform,'head')
   oval('Helmet brim',(0,-.005,1.713),(.125,.126,.009),uniform,'head')
   for z in [1.06,1.22]:loft('Reflective torso band',[(z,0,.01,.200*width,.153),(z+.026,0,.01,.200*width,.153)],reflective,'spine')
   for sg in [-1,1]:box('Reflective shoulder strip',(sg*.105,-.122,1.305),(.015,.008,.073),reflective,'spine')
  if role in ['police','security']:
   box('Protective vest',(0,-.109,1.225),(.139*width,.051,.132),black,'spine',.015)
   box('Metal badge',(-.07,-.164,1.29),(.015,.004,.021),gold,'spine')
   box('Radio',(.135,-.105,1.32),(.018,.017,.032),black,'spine')
   tube('Radio antenna',[(.135,-.105,1.35),(.135,-.105,1.41)],.002,black,'spine')
  if role in ['mechanic','construction','electrician','gardener']:
   loft('Utility belt',[(.94,0,.01,.183*width,.132),(.985,0,.01,.183*width,.132)],black,'root')
   for sg in [-1,1]:box('Tool pouch',(sg*.19,-.014,.92),(.032,.058,.055),uniform,'root')
   tube('Tool handle',[(.195,-.026,.92),(.195,-.026,1.025)],.009,metal,'root')
  if role in ['medic','doctor']:
   box('Medical ID',(-.075,-.137,1.29),(.022,.004,.029),uniform,'spine')
   tube('Stethoscope',[(-.06,-.073,1.41),(-.082,-.122,1.30),(-.044,-.156,1.19),(.044,-.156,1.19),(.082,-.122,1.30),(.06,-.073,1.41)],.004,black,'spine')
   oval('Stethoscope head',(.044,-.16,1.19),(.016,.004,.016),metal,'spine')
  if role in ['delivery','photographer']:
   box('Work backpack',(0,.19,1.21),(.15,.078,.19),uniform,'spine',.024)
   for sg in [-1,1]:tube('Pack shoulder strap',[(sg*.10,.18,1.36),(sg*.12,-.025,1.40),(sg*.12,-.13,1.20)],.015,black,'spine')
  if role=='photographer':
   box('Camera',(0,-.182,1.16),(.06,.029,.04),black,'spine')
   oval('Camera lens',(0,-.224,1.16),(.025,.025,.025),metal,'spine')
 # Subtle embedded weave maps: native image textures, exported with each GLB.
 for ma in [jacket,pants,shirt,dark]:
  size=128;im=bpy.data.images.new(name+' '+ma.name+' weave',width=size,height=size);pixels=[];basec=ma.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value[:3]
  for y in range(size):
   for x in range(size):
    if name=='courier-prototype' and ma==jacket:basec=(.8,.8,.8)
    grain=random.uniform(-.035,.035);weave=.018*math.sin(x*math.pi/2)*math.sin(y*math.pi/2);f=1+grain+weave
    # image pixels are linear scene values; PNG export performs encoding.
    pixels.extend([min(1,c*f) for c in basec]+[1])
  im.pixels.foreach_set(pixels);im.pack();tex=ma.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im;ma.node_tree.links.new(tex.outputs['Color'],ma.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
 # Runtime crowd tint relies on material name Jacket; keep it unchanged.
 export=BASE[BASE.index('# Join while preserving weights;'):]
 export=export.replace("bpy.ops.wm.save_as_mainfile", "s.frame_set(0);bpy.context.view_layer.update()\nbpy.ops.wm.save_as_mainfile")
 export=export.replace("s.render.fps=30", "if LOW:\n mod=body.modifiers.new('Crowd topology budget','DECIMATE');mod.ratio=.24;bpy.context.view_layer.objects.active=body;bpy.ops.object.modifier_apply(modifier=mod.name)\ns.render.fps=30")
 globals()['LOW']=low
 export=export.replace("[('Idle',False),('Walk',True)]","[('Idle',False),('Walk',True),('Greet',False)]")
 export=export.replace("elif name=='spine':","elif action_name=='Greet' and name=='armR':p.rotation_euler.z=-.45\n   elif action_name=='Greet' and name=='forearmR':p.rotation_euler.x=-1.4+math.sin(phase)*.18\n   elif name=='spine':")
 blendpath=D/(name+'.blend');glbpath=ROOT/'public/assets'/('courier-prototype.glb' if name=='courier-prototype' else 'characters/'+('mila-study' if name=='mila' else name)+'.glb')
 export=export.replace("str(D/'courier-prototype.blend')",repr(str(blendpath))).replace("str(A/'courier-prototype.glb')",repr(str(glbpath)))
 exec(compile(export,'export-quality','exec'),globals())
 if name=='mila':
  import shutil
  shutil.copy2(glbpath,ROOT/'public/assets/characters/mila.glb')
 if os.environ.get('CHARACTER_SKIP_STUDIO')=='1':
  print('QUALITY_COMPLETE',name,flush=True);return
 # Reusable studio scene also stays in the editable Blender source.
 s.render.engine='CYCLES';s.cycles.samples=20;s.render.resolution_x=700;s.render.resolution_y=1000;s.render.resolution_percentage=100
 s.world=bpy.data.worlds.new('Studio');s.world.color=(.10,.10,.10)
 bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.name='Studio floor';floor.data.materials.append(mat('Floor',(.085,.095,.10)))
 for loc,power,size in [((-3,-4,5),450,4),((3,-2,3),180,3),((0,3,4),220,3)]:
  bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(Vector((0,0,1))-l.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add(location=(1.5,-3.8,1.30));cam=bpy.context.object;s.camera=cam;cam.data.lens=62;cam.rotation_euler=(Vector((0,0,.89))-cam.location).to_track_quat('-Z','Y').to_euler();s.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
 if not low:
  cam.location=(.22,-.80,1.63);cam.rotation_euler=(Vector((0,0,1.598))-cam.location).to_track_quat('-Z','Y').to_euler();s.render.filepath=str(OUT/(name+'-face.png'));bpy.ops.render.render(write_still=True)
 bpy.ops.wm.save_as_mainfile(filepath=str(blendpath));print('QUALITY_COMPLETE',name,flush=True)
if __name__=='__main__':
 for name in SELECT:build(name)
