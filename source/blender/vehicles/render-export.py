"""Matched-camera GLB render. Arguments after --: input.glb output.png."""
import bpy,sys
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(Path(args[0]).resolve()))
s=bpy.context.scene
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.04));floor=bpy.context.object;m=bpy.data.materials.new('Studio floor');m.diffuse_color=(.13,.16,.18,1);floor.data.materials.append(m)
for p,power,size in [((4,-4,7),2000,5),((-4,-1,4),1300,4),((0,4,5),1800,3)]:
 bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object;o.data.energy=power;o.data.size=size;o.rotation_euler=(Vector((0,0,.6))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(5,-7,3.1));c=bpy.context.object;c.rotation_euler=(Vector((0,0,.65))-c.location).to_track_quat('-Z','Y').to_euler();c.data.type='ORTHO';c.data.ortho_scale=5.6
s.camera=c;s.render.engine='CYCLES';s.cycles.samples=32;s.cycles.use_denoising=True;s.render.resolution_x=1200;s.render.resolution_y=850;s.render.resolution_percentage=100;s.world=bpy.data.worlds.new('Studio');s.world.color=(.3,.3,.3);s.render.filepath=str(Path(args[1]).resolve());bpy.ops.render.render(write_still=True)
