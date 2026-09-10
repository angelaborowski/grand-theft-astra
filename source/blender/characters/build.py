"""Original adult courier prototype with a skeleton, idle and walk clips. No external mesh."""
import bpy,math,json
from mathutils import Vector
from pathlib import Path
D=Path(__file__).resolve().parent;A=D.parents[2]/'public/assets'
bpy.ops.wm.read_factory_settings(use_empty=True);s=bpy.context.scene;s.unit_settings.system='METRIC'
def mat(n,c,rough=.8):
 m=bpy.data.materials.new(n);m.use_nodes=True;m.diffuse_color=(*c,1);bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Roughness'].default_value=rough;return m
skin=mat('Skin',(.47,.255,.155),.64);jacket=mat('Jacket',(.38,.245,.07));pants=mat('Trousers',(.033,.048,.06));shoe=mat('Shoes',(.20,.19,.16));hair=mat('Hair',(.032,.020,.012));white=mat('Eye whites',(.6,.58,.50),.3);eye=mat('Iris',(.022,.035,.022),.28);lip=mat('Lips',(.22,.075,.055));metal=mat('Zip',(.3,.32,.3),.4);bag=mat('Bag',(.15,.055,.028))
rig=bpy.data.armatures.new('Courier rig');arm=bpy.data.objects.new('Courier rig',rig);s.collection.objects.link(arm);bpy.context.view_layer.objects.active=arm;arm.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
bones={'root':((0,0,0),(0,0,.9),None),'spine':((0,0,.90),(0,0,1.40),'root'),'head':((0,0,1.40),(0,0,1.76),'spine')}
for side,sgn in [('L',-1),('R',1)]:
 bones['thigh'+side]=((sgn*.10,0,.92),(sgn*.10,0,.52),'root');bones['shin'+side]=((sgn*.10,0,.52),(sgn*.10,0,.12),'thigh'+side);bones['foot'+side]=((sgn*.10,0,.12),(sgn*.10,-.13,.05),'shin'+side)
 bones['arm'+side]=((sgn*.22,0,1.36),(sgn*.29,0,1.08),'spine');bones['forearm'+side]=((sgn*.29,0,1.08),(sgn*.32,-.02,.85),'arm'+side)
for n,(a,b,parent)in bones.items():
 q=rig.edit_bones.new(n);q.head=a;q.tail=b
 if parent:q.parent=rig.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT');arm.select_set(False);pieces=[]
def attach(o,n,ma,bone):
 o.name=n;o.data.materials.append(ma)
 for p in o.data.polygons:p.use_smooth=True
 g=o.vertex_groups.new(name=bone);g.add(list(range(len(o.data.vertices))),1,'REPLACE');mod=o.modifiers.new('Deform','ARMATURE');mod.object=arm;pieces.append(o);return o
def oval(n,loc,scale,ma,bone):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=loc);o=bpy.context.object;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return attach(o,n,ma,bone)
def limb(n,a,b,r1,r2,ma,bone):
 a=Vector(a);b=Vector(b);d=b-a;bpy.ops.mesh.primitive_cone_add(vertices=24,radius1=r1,radius2=r2,depth=d.length,location=(a+b)/2);o=bpy.context.object;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();bpy.ops.object.transform_apply(location=False,rotation=True,scale=True);return attach(o,n,ma,bone)
oval('Clothed torso',(0,0,1.19),(.22,.13,.30),jacket,'spine');oval('Hips',(0,.0,.94),(.18,.115,.15),pants,'root');oval('Neck',(0,0,1.45),(.063,.06,.10),skin,'head')
oval('Head',(0,-.012,1.62),(.105,.087,.143),skin,'head');oval('Jaw',(0,-.035,1.54),(.075,.065,.065),skin,'head')
oval('Hair crown',(0,.005,1.71),(.108,.089,.07),hair,'head');oval('Hair back',(0,.055,1.62),(.105,.055,.12),hair,'head')
for sg in[-1,1]:
 oval('Ear',(sg*.105,0,1.62),(.018,.025,.035),skin,'head');oval('Eye',(sg*.04,-.088,1.642),(.020,.012,.010),white,'head');oval('Iris',(sg*.04,-.098,1.642),(.008,.005,.009),eye,'head');oval('Brow',(sg*.04,-.092,1.664),(.026,.006,.007),hair,'head')
oval('Nose',(0,-.100,1.604),(.015,.027,.028),skin,'head');oval('Mouth',(0,-.092,1.567),(.031,.006,.007),lip,'head')
for side,sg in [('L',-1),('R',1)]:
 limb('Trouser thigh',(sg*.10,0,.94),(sg*.10,0,.51),.075,.085,pants,'thigh'+side);oval('Knee',(sg*.10,0,.52),(.073,.07,.065),pants,'shin'+side)
 limb('Trouser shin',(sg*.10,0,.52),(sg*.10,0,.13),.048,.07,pants,'shin'+side);oval('Sneaker',(sg*.10,-.045,.075),(.07,.14,.068),shoe,'foot'+side)
 oval('Shoulder',(sg*.21,0,1.35),(.082,.10,.09),jacket,'arm'+side);limb('Sleeve',(sg*.22,0,1.35),(sg*.29,0,1.08),.055,.075,jacket,'arm'+side);oval('Elbow',(sg*.29,0,1.08),(.055,.06,.055),jacket,'forearm'+side);limb('Cuff sleeve',(sg*.29,0,1.08),(sg*.32,-.02,.90),.04,.055,jacket,'forearm'+side);oval('Hand',(sg*.32,-.02,.86),(.037,.027,.065),skin,'forearm'+side)
limb('Jacket zip',(0,-.13,1.03),(0,-.13,1.40),.006,.006,metal,'spine');oval('Messenger bag',(.21,.015,.99),(.065,.12,.14),bag,'root');limb('Bag strap',(-.13,-.13,1.4),(.20,-.14,1.02),.016,.016,bag,'spine')
# Join while preserving weights; one armature modifier on the combined skinned mesh.
bpy.ops.object.select_all(action='DESELECT')
for o in pieces:o.select_set(True)
bpy.context.view_layer.objects.active=pieces[0];bpy.ops.object.join();body=bpy.context.object;body.name='Courier body';body.parent=arm
for m in list(body.modifiers)[1:]:body.modifiers.remove(m)
s.render.fps=30
for action_name,walking in [('Idle',False),('Walk',True)]:
 arm.animation_data_create();arm.animation_data.action=bpy.data.actions.new(action_name)
 for f in range(1,32,5):
  phase=(f-1)/30*math.tau
  for name,p in arm.pose.bones.items():
   p.rotation_mode='XYZ';p.rotation_euler=(0,0,0);p.location=(0,0,0)
   if walking:
    if name.startswith('thigh'):p.rotation_euler.x=math.sin(phase+(math.pi if name.endswith('R')else 0))*.42
    if name.startswith('shin'):p.rotation_euler.x=max(0,-math.sin(phase+(math.pi if name.endswith('R')else 0)))*.55
    if name.startswith('arm'):p.rotation_euler.x=-math.sin(phase+(math.pi if name.endswith('R')else 0))*.27
   elif name=='spine':p.rotation_euler.y=math.sin(phase)*.012
   p.keyframe_insert('rotation_euler',frame=f)
 action=arm.animation_data.action;track=arm.animation_data.nla_tracks.new();track.name=action_name;track.strips.new(action_name,1,action);track.mute=True
 arm.animation_data.action=None
for p in arm.pose.bones:p.rotation_euler=(0,0,0)
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);arm.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=str(D/'courier-prototype.blend'))
bpy.ops.export_scene.gltf(filepath=str(A/'courier-prototype.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS')
print('COURIER_COMPLETE')
