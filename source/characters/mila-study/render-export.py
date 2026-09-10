"""Reimport the runtime GLB and render sampled Walk/Greet deformation."""
import bpy
from pathlib import Path
from mathutils import Vector
D=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(D/'mila-study.blend'))
for o in list(bpy.data.objects):
 if o.type=='ARMATURE' or (o.type=='MESH' and o.name!='Plane'):bpy.data.objects.remove(o,do_unlink=True)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
bpy.ops.import_scene.gltf(filepath=str(D.parents[2]/'public/assets/characters/mila-study.glb'))
arm=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
s=bpy.context.scene;s.cycles.samples=16;s.render.resolution_x=800;s.render.resolution_y=1000
s.camera.location=(2.4,-3.4,1.4);s.camera.rotation_euler=(Vector((0,0,.89))-s.camera.location).to_track_quat('-Z','Y').to_euler()
for clip in ['Walk','Greet']:
 for track in arm.animation_data.nla_tracks:track.mute=True
 action=next(a for a in bpy.data.actions if a.name==clip or a.name.startswith(clip+'.'))
 arm.animation_data.action=action
 if action.slots:arm.animation_data.action_slot=action.slots[0]
 s.frame_set(8);bpy.context.view_layer.update()
 s.render.filepath=str(D/('export-'+clip.lower()+'.png'));bpy.ops.render.render(write_still=True)
print('RUNTIME_IMPORT_POSES_COMPLETE')
