"""Matched studio comparisons and animation samples from reimported GLBs."""
import bpy,math,sys
from pathlib import Path
from mathutils import Vector
D=Path(__file__).resolve().parent;ROOT=D.parents[2];OUT=D/'quality'
names=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['mila','lev','niko','irina','sasha','alexei','courier-prototype']
def setup():
 bpy.ops.wm.read_factory_settings(use_empty=True);s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=12;s.render.resolution_x=700;s.render.resolution_y=1000;s.render.resolution_percentage=100
 s.world=bpy.data.worlds.new('Studio');s.world.color=(.10,.10,.10)
 bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;m=bpy.data.materials.new('Floor');m.diffuse_color=(.085,.095,.10,1);floor.data.materials.append(m)
 for loc,power,size in [((-3,-4,5),450,4),((3,-2,3),180,3),((0,3,4),220,3)]:
  bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.size=size;l.rotation_euler=(Vector((0,0,1))-l.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add(location=(1.5,-3.8,1.30));s.camera=bpy.context.object;s.camera.data.lens=62;s.camera.rotation_euler=(Vector((0,0,.89))-s.camera.location).to_track_quat('-Z','Y').to_euler()
 return s
for name in names:
 for version in ['before','after']:
  s=setup();p=OUT/'before'/(name+'.glb') if version=='before' else ROOT/'public/assets'/('courier-prototype.glb' if name=='courier-prototype' else 'characters/'+('mila-study' if name=='mila' else name)+'.glb')
  bpy.ops.import_scene.gltf(filepath=str(p));arm=next(o for o in s.objects if o.type=='ARMATURE')
  if arm.animation_data:
   for track in arm.animation_data.nla_tracks:track.mute=True
   arm.animation_data.action=None
  for bone in arm.pose.bones:bone.matrix_basis.identity()
  idle=next(a for a in bpy.data.actions if a.name=='Idle');arm.animation_data.action=idle
  if idle.slots:arm.animation_data.action_slot=idle.slots[0]
  s.render.fps=30;s.frame_set(1);bpy.context.view_layer.update()
  s.render.filepath=str(OUT/(name+'-'+version+'.png'));bpy.ops.render.render(write_still=True)
  if version=='after':
   cam=s.camera;loc=cam.location.copy();rot=cam.rotation_euler.copy();cam.location=(.22,-.8,1.63);cam.rotation_euler=(Vector((0,0,1.61))-cam.location).to_track_quat('-Z','Y').to_euler();s.render.filepath=str(OUT/(name+'-face.png'));bpy.ops.render.render(write_still=True);cam.location=loc;cam.rotation_euler=rot
   for clip in ['Walk','Greet']:
    action=next(a for a in bpy.data.actions if a.name==clip);arm.animation_data.action=action
    if action.slots:arm.animation_data.action_slot=action.slots[0]
    s.render.fps=30;s.frame_set(8);bpy.context.view_layer.update();s.render.filepath=str(OUT/(name+'-'+clip.lower()+'.png'));bpy.ops.render.render(write_still=True)
 print('IMPORT_REVIEW_COMPLETE',name,flush=True)
