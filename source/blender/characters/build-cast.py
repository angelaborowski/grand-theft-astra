"""Build six original stylized NPC interpretations from the documented Higgsfield concepts.
Uses the existing original courier topology, adding modeled costume identifiers.
No image-to-mesh conversion or photorealistic likeness is claimed.
"""
from pathlib import Path
import json
D=Path(__file__).resolve().parent
base=(D/'build.py').read_text()
cast={
 'mila':{'coat':(.48,.30,.055),'hair':(.07,.035,.018),'shoe':(.65,.62,.54),'bag':(.40,.025,.018),'scale':(1,1,.97)},
 'lev':{'coat':(.055,.13,.075),'hair':(.28,.27,.24),'shoe':(.07,.032,.017),'bag':(.12,.055,.025),'scale':(.94,1,.98)},
 'niko':{'coat':(.025,.12,.40),'hair':(.028,.018,.012),'shoe':(.28,.28,.26),'bag':(.15,.055,.028),'scale':(.94,.96,1.03)},
 'irina':{'coat':(.24,.065,.17),'hair':(.12,.10,.095),'shoe':(.16,.025,.045),'bag':(.15,.055,.028),'scale':(1.08,1.08,.95)},
 'sasha':{'coat':(.17,.25,.135),'hair':(.24,.07,.025),'shoe':(.105,.065,.028),'bag':(.15,.055,.028),'scale':(1.04,1.03,.99)},
 'alexei':{'coat':(.035,.065,.12),'hair':(.30,.30,.28),'shoe':(.018,.022,.025),'bag':(.15,.055,.028),'scale':(1.12,1.06,1.02)}
}
extra='''
cfg=CAST[NAME]
for material,key in [(jacket,'coat'),(hair,'hair'),(shoe,'shoe'),(bag,'bag')]:
 material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*cfg[key],1)
# Small geometry details remain attached to the appropriate animated body bone.
accent=mat('Costume accent',(.58,.20,.04));cream=mat('Shirt',(.68,.61,.45));scarf=mat('Burgundy scarf',(.24,.025,.045))
def detail(n,loc,scale,ma,bone='spine'):return oval(n,loc,scale,ma,bone)
if NAME not in ['mila','niko','lev']:
 for ob in list(pieces):
  if ob.name in ['Messenger bag','Bag strap']:
   pieces.remove(ob);bpy.data.objects.remove(ob,do_unlink=True)
if NAME=='lev':
 detail('Long wool coat',(0,.02,1.02),(.205,.145,.29),jacket)
 detail('Scarf collar',(0,0,1.415),(.093,.081,.044),scarf)
 detail('Scarf tail',(.06,-.132,1.25),(.042,.017,.15),scarf)
 for sign in [-1,1]:
  bpy.ops.mesh.primitive_torus_add(major_segments=24,minor_segments=6,location=(sign*.04,-.107,1.635),major_radius=.026,minor_radius=.003,rotation=(math.pi/2,0,0))
  attach(bpy.context.object,'Reading glasses',metal,'head')
 limb('Glasses bridge',(-.014,-.11,1.64),(.014,-.11,1.64),.003,.003,metal,'head')
if NAME=='niko':
 for sign in [-1,1]:
  detail('Orange shoulder panel',(sign*.20,-.047,1.375),(.07,.073,.042),accent,'arm'+('L' if sign<0 else 'R'))
 for i in range(9):
  a=i*math.tau/9;detail('Curl',(math.cos(a)*.077,math.sin(a)*.059,1.742),(.031,.029,.030),hair,'head')
if NAME=='irina':
 detail('Cream blouse',(0,-.124,1.28),(.075,.025,.14),cream)
 detail('Hair bun',(0,.112,1.70),(.065,.055,.052),hair,'head')
 for z in [1.1,1.18,1.26]:detail('Cardigan button',(.08,-.13,z),(.008,.006,.008),metal)
if NAME=='sasha':
 detail('Tied auburn hair',(0,.105,1.68),(.052,.062,.070),hair,'head')
 yellow=mat('Headphone yellow',(.72,.48,.015))
 for sign in [-1,1]:detail('Headphone cup',(sign*.092,-.065,1.43),(.031,.025,.04),yellow)
 limb('Headphone band',(-.09,.015,1.43),(.09,.015,1.43),.013,.013,yellow,'spine')
for sign in [-1,1]:
 detail('Jacket pocket',(sign*.115,-.115,1.12),(.060,.025,.050),jacket)
 if NAME=='alexei':
  detail('Reflective shoulder',(sign*.20,-.065,1.38),(.065,.035,.012),metal,'arm'+('L' if sign<0 else 'R'))
if NAME=='alexei':detail('Grey moustache',(0,-.107,1.58),(.037,.012,.01),hair,'head')
arm.scale=cfg['scale']
'''
for name in cast:
 code=base.replace("# Join while preserving weights;",extra+"\n# Join while preserving weights;")
 code=code.replace("[('Idle',False),('Walk',True)]","[('Idle',False),('Walk',True),('Greet',False)]")
 code=code.replace("elif name=='spine':", "elif action_name=='Greet' and name=='armR':p.rotation_euler.z=-1.25\n   elif action_name=='Greet' and name=='forearmR':p.rotation_euler.x=-.8+math.sin(phase)*.3\n   elif name=='spine':")
 code=code.replace("D/'courier-prototype.blend'", "D/(NAME+'.blend')").replace("A/'courier-prototype.glb'", "A/('characters/'+NAME+'.glb')")
 (D.parents[2]/'public/assets/characters').mkdir(exist_ok=True)
 exec(compile(code,str(D/'build.py'),'exec'),{'__file__':str(D/'build.py'),'NAME':name,'CAST':cast})
(D/'cast-spec.json').write_text(json.dumps(cast,indent=2))
