"""Render the actual exported GLB, not a presentation replacement."""
import bpy,math,sys
from pathlib import Path
from mathutils import Vector
D=Path(__file__).resolve().parent
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(D.parents[2]/'public/assets/vehicles/helicopter.glb'))
s=bpy.context.scene
bpy.ops.mesh.primitive_plane_add(size=200)
f=bpy.context.object;f.name='Preview floor';m=bpy.data.materials.new('Preview floor');m.diffuse_color=(.15,.17,.19,1);f.data.materials.append(m)
for pos,power,size in [((3,-5,9),2200,7),((-5,-2,5),1600,6),((2,8,7),2500,5)]:
 bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,1,1))-o.location).to_track_quat('-Z','Y').to_euler()
s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.4,.46,.52,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.35
bpy.ops.object.camera_add();c=bpy.context.object;s.camera=c;c.data.type='ORTHO';c.data.ortho_scale=12
s.render.engine='CYCLES';s.cycles.samples=24;s.cycles.use_denoising=True;s.render.resolution_x=1280;s.render.resolution_y=800;s.render.resolution_percentage=100
s.view_settings.view_transform='AgX';s.render.image_settings.file_format='PNG'
for name,pos,target,scale in [('front-quarter',(10,-13,6),(0,1.5,1.25),12),('side',(15,2,3),(0,2.2,1.4),11),('rear-quarter',(-10,14,5),(0,2,1.5),12),('cabin',(5,-8,3.7),(0,-.5,1.3),5.6)]:
 c.location=pos;c.rotation_euler=(Vector(target)-c.location).to_track_quat('-Z','Y').to_euler();c.data.ortho_scale=scale;s.render.filepath=str(D/(name+'.png'));bpy.ops.render.render(write_still=True)
