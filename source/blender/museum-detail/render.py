"""Same-camera before/after comparison of exported geometry.
Before adds the current runtime museumDetail grid; bevels are approximated as boxes.
Run Blender --background --python render.py -- before|after.
"""
import bpy
import math
import sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
D=Path(__file__).resolve().parent
A=D.parents[2]/'public/assets'
mode=sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else 'after'
bpy.ops.wm.read_factory_settings(use_empty=True)
s=bpy.context.scene
bpy.ops.import_scene.gltf(filepath=str(A/('red-square.glb' if mode=='before' else 'museum-detail.glb')))
if mode=='before':
    for o in list(s.objects):
        if 'Historical' not in o.name:
            bpy.data.objects.remove(o,do_unlink=True)
vv=[];ff=[]
for o in s.objects:
    if o.type!='MESH':continue
    off=len(vv)
    vv.extend(tuple(o.matrix_world@v.co) for v in o.data.vertices)
    ff.extend(tuple(off+i for i in p.vertices) for p in o.data.polygons)
bvh=BVHTree.FromPolygons(vv,ff)
def mat(n,c,rough=.8):
    ma=bpy.data.materials.new(n);ma.diffuse_color=(*c,1);ma.use_nodes=True
    bs=ma.node_tree.nodes['Principled BSDF'];bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Roughness'].default_value=rough
    return ma
def srgb(hex):
    rgb=[int(hex[i:i+2],16)/255 for i in [0,2,4]]
    return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb)
def box(w,h,d,ma,x,z,y):
    bpy.ops.mesh.primitive_cube_add(size=1,location=(x,y,z));o=bpy.context.object;o.dimensions=(w,d,h);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(ma)
if mode=='before':
    # Mirror scene-assets.tsx brick UV/material override on the source city mesh.
    for o in s.objects:
        if o.type != 'MESH': continue
        for ma in o.data.materials:
            if ma.name != 'Museum | oxblood': continue
            nt=ma.node_tree; bs=nt.nodes['Principled BSDF']
            bs.inputs['Base Color'].default_value=(1,1,1,1)
            bs.inputs['Roughness'].default_value=1
            for suffix,socket in [('Diffuse','Base Color'),('Rough','Roughness'),('nor_gl','Normal')]:
                im=bpy.data.images.load(str(A/'materials/scanned'/('red_brick-'+suffix+'.jpg')))
                im.colorspace_settings.name='sRGB' if suffix=='Diffuse' else 'Non-Color'
                tx=nt.nodes.new('ShaderNodeTexImage');tx.image=im
                if suffix=='nor_gl':
                    nm=nt.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.35
                    nt.links.new(tx.outputs['Color'],nm.inputs['Color']);nt.links.new(nm.outputs[0],bs.inputs[socket])
                else: nt.links.new(tx.outputs['Color'],bs.inputs[socket])
        uv=o.data.uv_layers.get('UVMap') or o.data.uv_layers.new(name='UVMap')
        for poly in o.data.polygons:
            n=poly.normal
            for li in poly.loop_indices:
                co=o.data.vertices[o.data.loops[li].vertex_index].co
                uv.data[li].uv=((-co.y if abs(n.z)<=.7 and abs(n.x)>abs(n.y) else co.x)/2.24,(-co.y if abs(n.z)>.7 else co.z)/1.44)
    stone=mat('Before | stone',srgb('b59d7d'))
    reveal=mat('Before | reveal',srgb('302b28'))
    frame=mat('Before | frame',srgb('514839'),.6)
    glass=mat('Before | glass',srgb('43535d'),.18)
    def front(x,z):
        hit,_,_,_=bvh.ray_cast(Vector((x,120,z)),Vector((0,1,0)),70)
        return hit.y-.08 if hit is not None else None
    for x in range(-8,41,4):
        for z in [4.3,10.2,16.2]:
            y=front(x,z)
            if y is None:continue
            left,right=front(x-.85,z),front(x+.85,z)
            if left is None or right is None or abs(left-y)>1 or abs(right-y)>1:continue
            box(1.44,2.9,.08,reveal,x,z,y)
            box(1.2,2.7,.06,glass,x,z,y-.06)
            for xx in [x-.74,x+.74]:box(.2,3,.35,stone,xx,z,y-.2)
            for zz in [z-1.5,z+1.5]:box(1.7,.2,.4,stone,x,zz,y-.23)
            box(.07,2.65,.12,frame,x,z,y-.15)
            for zz in [z-.5,z+.65]:box(1.2,.065,.12,frame,x,zz,y-.15)
            box(1.85,.14,.58,stone,x,z-1.48,y-.29)
            box(1.62,.13,.32,stone,x,z-1.63,y-.18)
            box(1.83,.12,.45,stone,x,z+1.63,y-.24)
# Neutral scene for geometry/material comparison, same settings in both runs.
floor=mat('Comparison | neutral ground',(.23,.24,.23))
box(800,.10,800,floor,0,-.12,180)
s.world=bpy.data.worlds.new('Comparison daylight');s.world.use_nodes=True
s.world.node_tree.nodes['Background'].inputs[0].default_value=(.55,.65,.78,1)
s.world.node_tree.nodes['Background'].inputs[1].default_value=.65
bpy.ops.object.light_add(type='AREA',location=(-30,70,90))
bpy.context.object.data.energy=90000;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=65
bpy.context.object.rotation_euler=(Vector((13,153,20))-bpy.context.object.location).to_track_quat('-Z','Y').to_euler()
s.render.engine='CYCLES';s.cycles.samples=24;s.cycles.use_denoising=True
s.render.resolution_x=1440;s.render.resolution_y=1200;s.render.resolution_percentage=100
s.view_settings.view_transform='AgX';s.view_settings.look='AgX - Medium High Contrast';s.view_settings.exposure=0
s.render.image_settings.file_format='PNG'
(D/'previews').mkdir(exist_ok=True)
for name,loc,target,lens in [('front',(9,55,1.7),(13.3,151,27),40),('oblique',(-48,81,5),(12,154,25),44)]:
    bpy.ops.object.camera_add(location=loc);cam=bpy.context.object;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=lens;cam.data.clip_end=2000;s.camera=cam
    s.render.filepath=str(D/'previews'/f'{mode}-{name}.png');bpy.ops.render.render(write_still=True)
print('COMPARISON_COMPLETE',mode)
