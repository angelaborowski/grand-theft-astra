"""Reimport every occupational GLB and render a labelled animated cast sheet."""
import bpy,math,json
from pathlib import Path
from mathutils import Vector
D=Path(__file__).resolve().parent;ROOT=D.parents[2]
bpy.ops.wm.read_factory_settings(use_empty=True)
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=12;s.render.resolution_x=1600;s.render.resolution_y=1400;s.render.resolution_percentage=100
s.world=bpy.data.worlds.new('Studio');s.world.color=(.3,.3,.3)
for i,role in enumerate(json.loads((D/'resident-roles.json').read_text())):
 before=set(s.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets/characters'/('resident-'+role['id']+'.glb')))
 imported=set(s.objects)-before;arm=next(o for o in imported if o.type=='ARMATURE')
 for track in arm.animation_data.nla_tracks:track.mute=True
 action=next(a for a in bpy.data.actions if a.name.startswith('Walk') and a.slots and a.slots[0].target_id_type=='OBJECT')
 # Importer associates this armature's compatible actions through its own NLA tracks.
 walk=next((strip.action for track in arm.animation_data.nla_tracks for strip in track.strips if 'Walk' in strip.action.name),action)
 arm.animation_data.action=walk
 if walk.slots:arm.animation_data.action_slot=walk.slots[0]
 x=(i%4-1.5)*1.45;z=(3-i//4)*2.12
 arm.location.x+=x;arm.location.z+=z
 bpy.ops.object.text_add(location=(x,-.08,z-.17),rotation=(math.pi/2,0,0));label=bpy.context.object;label.data.body=role['id'].replace('-',' ').title();label.data.align_x='CENTER';label.data.size=.14
for loc,power,size in [((-5,-8,10),1800,8),((6,-3,5),900,7),((0,3,9),1400,6)]:
 bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.size=size;l.rotation_euler=(Vector((0,0,4))-l.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(0,-15,4.2));s.camera=bpy.context.object;s.camera.data.type='ORTHO';s.camera.data.ortho_scale=9.9;s.camera.rotation_euler=(Vector((0,0,4.2))-s.camera.location).to_track_quat('-Z','Y').to_euler()
s.render.fps=30;s.frame_set(8);s.render.filepath=str(D/'quality/residents-walk.png');bpy.ops.render.render(write_still=True)
