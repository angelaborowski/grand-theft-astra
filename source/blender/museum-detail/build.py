"""Photo-informed museum facade; preserves the existing OSM shell and game frame.
Run Blender --background --python source/blender/museum-detail/build.py.
The photographs are reference only; see README.md for uncertainty and provenance.
"""
import bpy
import bmesh
import json
import math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

D = Path(__file__).resolve().parent
ROOT = D.parents[2]
ASSETS = ROOT / 'public/assets'
bpy.ops.wm.open_mainfile(filepath=str(D.parent / 'red-square-refined.blend'))
s = bpy.context.scene
shell = list(bpy.data.collections['Mapped | Historical Museum'].objects)
for o in list(s.objects):
    if o not in shell:
        bpy.data.objects.remove(o, do_unlink=True)
s.unit_settings.system = 'METRIC'
s.unit_settings.scale_length = 1
s.render.engine = 'CYCLES'
s.cycles.samples = 24
s.cycles.use_denoising = True
s.render.resolution_x, s.render.resolution_y = 1440, 1200
s.render.resolution_percentage = 100
s.view_settings.view_transform = 'AgX'
s.view_settings.look = 'AgX - Medium High Contrast'
s.view_settings.exposure = 0
# Keep the original world-space vertices for regression checks and surface attachment.
vv, ff = [], []
for o in shell:
    off = len(vv)
    vv.extend(tuple(o.matrix_world @ v.co) for v in o.data.vertices)
    ff.extend(tuple(off + i for i in p.vertices) for p in o.data.polygons)
bvh = BVHTree.FromPolygons(vv, ff)

def front(x, z):
    hit, normal, _, _ = bvh.ray_cast(Vector((x, 110, z)), Vector((0, 1, 0)), 75)
    return hit.y if hit is not None and abs(normal.z) < .15 else None

def material(name, color, rough=.75, metal=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Roughness'].default_value = rough
    bs.inputs['Metallic'].default_value = metal
    return m

red = material('Museum detail | painted red masonry', (.32, .065, .042))
edge = material('Museum detail | red molded brick', (.40, .095, .062))
shade = material('Museum detail | recessed red panels', (.22, .039, .026))
stone = material('Museum detail | restrained pale stone', (.62, .58, .49))
metal = material('Museum detail | pale folded roof metal', (.57, .60, .59), .43, .55)
glass = material('Museum detail | dark glazing', (.065, .098, .105), .24, .15)
wood = material('Museum detail | timber glazing bars', (.18, .135, .08), .55)
black = material('Museum detail | opening shadow', (.012, .017, .018))
gold = material('Museum detail | gilded finial', (.57, .31, .065), .32, .7)

# Small reproducible bitmap roughness: survives glTF, unlike procedural shader nodes.
# Generic painted brick, not a photographic sample of the monument.
import numpy as np
rng = np.random.default_rng(810)
N = 512
yy, xx = np.mgrid[:N, :N]
row = yy // 32
mortar = ((yy % 32) < 2) | (((xx + (row % 2) * 64) % 128) < 2)
values = np.clip(.79 + rng.normal(0, .018, (N, N)) + mortar * .10, 0, 1)
pixels = np.ones((N, N, 4), dtype=np.float32)
pixels[:, :, :3] = values[:, :, None]
im = bpy.data.images.new('Museum | generated painted-brick roughness', width=N, height=N)
im.colorspace_settings.name = 'Non-Color'
im.pixels.foreach_set(pixels.ravel())
im.filepath_raw = str(D / 'painted-brick-roughness.png')
im.file_format = 'PNG'
im.save()
im.pack()
for ma in [red, edge]:
    node = ma.node_tree.nodes.new('ShaderNodeTexImage')
    node.image = im
    ma.node_tree.links.new(node.outputs['Color'], ma.node_tree.nodes['Principled BSDF'].inputs['Roughness'])

col = bpy.data.collections.new('Museum | editable facade details')
s.collection.children.link(col)

def uv_map(me):
    uv = me.uv_layers.get('UVMap') or me.uv_layers.new(name='UVMap')
    for p in me.polygons:
        axis = max(range(3), key=lambda i: abs(p.normal[i]))
        axes = [i for i in range(3) if i != axis]
        for li in p.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv = (co[axes[0]] / 1.04, co[axes[1]] / 1.04)

def mesh(name, vs, fs, ma):
    me = bpy.data.meshes.new(name)
    me.from_pydata(vs, [], fs)
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(me)
    bm.free()
    me.update()
    uv_map(me)
    o = bpy.data.objects.new(name, me)
    col.objects.link(o)
    me.materials.append(ma)
    return o

def box(name, x, y, z, w, d, h, ma):
    vs = [(x + a*w/2, y+b*d/2, z+c*h/2) for a,b,c in
          [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]]
    return mesh(name, vs, [(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)], ma)

def extrude(name, x, y, z, profile, depth, ma):
    count = len(profile)
    vs = [(x+u, y+d, z+v) for d in [-depth/2, depth/2] for u,v in profile]
    return mesh(name, vs, [tuple(range(count-1,-1,-1)), tuple(range(count,count*2))] +
                [(i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count)], ma)

def arch_profile(w, h, steps=16):
    r = w/2
    return [(-r,0),(r,0)] + [(r*math.cos(t*math.pi/steps),h-r+r*math.sin(t*math.pi/steps)) for t in range(steps+1)]

def arch_band(name, x, y, z, w, h, thick, depth, ma):
    # Closed three-dimensional voussoir band; front visible normal points toward -Y.
    r, spring = w/2, h-w/2
    for i in range(16):
        a, b = i*math.pi/16, (i+1)*math.pi/16
        p = [(rr*math.cos(t),spring+rr*math.sin(t)) for rr,t in [(r,a),(r,b),(r+thick,b),(r+thick,a)]]
        extrude(name+' | curved voussoir', x, y, z, p, depth, ma)
    for u in [-r-thick/2,r+thick/2]:
        box(name+' | jamb',x+u,y,z+spring/2,thick,depth,spring,ma)

windows = []
def window(name, x, z, w, h, surround=.22):
    samples = [front(x+u, z+v) for u in [-w/2,0,w/2] for v in [.1,h-w/2]]
    if any(y is None for y in samples) or max(samples)-min(samples) > .6:
        return
    y = min(samples)-.035
    extrude(name+' | shadow',x,y,z,arch_profile(w+.10,h+.05),.045,black)
    extrude(name+' | glazing',x,y-.045,z+.10,arch_profile(w-.15,h-.2),.035,glass)
    for index, t in enumerate([surround, .13]):
        arch_band(name,x,y-.15-index*.10,z,w+index*surround*2,h+index*surround,surround if index==0 else t,.24,edge if index==0 else red)
    spring = h-w/2
    for u in [-w*.25,0,w*.25]:
        box(name+' | upright glazing bar',x+u,y-.11,z+spring/2,.045,.06,spring,wood)
    for v in [spring/3,2*spring/3,spring]:
        box(name+' | horizontal glazing bar',x,y-.11,z+v,w-.16,.06,.055,wood)
    # Fanlight radial muntins, clipped to the arch.
    for theta in [math.pi/4,math.pi/2,3*math.pi/4]:
        beam(name+' | fanlight', (x,y-.11,z+spring), (x+(w/2-.1)*math.cos(theta),y-.11,z+spring+(w/2-.1)*math.sin(theta)), .024, wood)
    box(name+' | sill',x,y-.20,z-.08,w+.5,.52,.16,stone)
    windows.append({'name':name,'x':x,'base_z':z,'width':w,'height':h,'surface_y':round(y+.035,4)})

def beam(name, a, b, r, ma):
    a,b = Vector(a),Vector(b)
    d=(b-a).normalized()
    up=Vector((0,1,0)) if abs(d.y)<.9 else Vector((0,0,1))
    u=d.cross(up).normalized()*r
    v=d.cross(u).normalized()*r
    vs=[tuple(p+u*uu+v*vv) for p in [a,b] for uu,vv in [(-1,-1),(1,-1),(1,1),(-1,1)]]
    return mesh(name,vs,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],ma)

# Copy rather than mutate shared material definitions or mapped mesh coordinates.
for o in shell:
    o.data = o.data.copy()
    for index, ma in enumerate(o.data.materials):
        if ma.name == 'Museum | oxblood':
            o.data.materials[index] = red
        elif o.name.startswith('Roof ') and all(v.co.y < 190 for v in o.data.vertices):
            o.data.materials[index] = metal
    uv_map(o.data)
    o['accuracy'] = 'Existing OSM shell coordinates preserved; front metal colour visually inferred.'

# Window arrangement follows the official frontal photograph, fitted to mapped tiers.
for x,z,w,h in [(-10.4,4,1.5,4.1),(-5.6,2.3,1.75,3.7),(-.6,4,1.8,4.4),(4.8,5,1.8,5.1),
                  (21.1,5,1.8,5.1),(26.2,4,1.8,4.4),(30.7,2.3,1.75,3.7),(36.5,4,1.5,4.1),
                  (11.8,12.1,.9,2.5),(14.1,12.1,.9,2.5)]:
    window('Lower facade arch',x,z,w,h)
for x in [-.55,27.3]:
    window('Main tower | tall arched window',x,18.3,2.6,6.0)
    for u in [-1.25,0,1.25]:
        window('Main tower | triple upper window',x+u,29, .85,2.6,.13)
for x in [9.0,13.2,17.4]:
    window('Central hall | tall arched window',x,18.2,2.35 if x==13.2 else 1.7,6.3 if x==13.2 else 5.8)
for x in [4.9,9,12.3,14.1,17.5,21.4]:
    window('Central upper arcade',x,28.6,.90,2.8,.13)
for x in [-8.6,35.5]:
    window('Side turret | arched opening',x,18,1.65,5.1)
for x in [-.5,27.35]:
    for u in [-.95,0,.95]:
        window('Lantern | narrow opening',x+u,38.0,.48,2.5,.10)

# Stepped projecting courses follow the original facade rather than a straight floating strip.
def course(x0,x1,z,h=.18,depth=.30,ma=edge):
    count=max(1,math.ceil((x1-x0)/.55))
    for i in range(count):
        x=x0+(i+.5)*(x1-x0)/count
        y=front(x,z)
        if y is not None:
            box('Facade | fitted horizontal course',x,y-depth/2+.02,z,(x1-x0)/count+.008,depth,h,ma)
for z in [1.2,10.1,10.45,15.8,16.1,17.0]:
    course(-13,39,z,.16,.30,stone if z==1.2 else edge)
for z in [25.0,25.35,26.9,27.2,32.2,32.5,35.2,35.55]:
    course(-3.6,30.5,z,.17,.36,stone if z in [25.35,32.5] else edge)
# Cornice corbels are small red blocks, not broad white window frames.
for x0,x1,z in [(-13,39,15.45),(-3.7,30.6,34.95),(-3.7,30.6,26.6)]:
    for i in range(int((x1-x0)/.6)):
        x=x0+i*.6+.3
        y=front(x,z)
        if y is not None:
            box('Cornice | corbel',x,y-.18,z,.18,.36,.36,red)
# Main tower corner pilasters and recessed decorative panels.
for center in [-.5,27.35]:
    for x in [center-3.2,center+3.2]:
        for z0,z1 in [(17.4,24.8),(27.5,32.0)]:
            y=front(x,(z0+z1)/2)
            if y is not None:
                box('Tower | engaged pilaster',x,y-.15,(z0+z1)/2,.33,.38,z1-z0,edge)
                for z in [z0,z1]:
                    box('Tower | pilaster capital',x,y-.24,z,.58,.5,.22,red)
    for x in [center-2.6,center+2.6]:
        for z in [29,30,31]:
            y=front(x,z)
            if y is not None:
                extrude('Tower | recessed lozenge',x,y-.045,z,[(-.18,0),(0,-.24),(.18,0),(0,.24)],.045,shade)

# Pointed red gables: silhouette ornaments sit immediately in front of mapped roof planes.
def gable(name,x,y,z,w,h):
    profile=[(-w/2,0),(-w*.34,h*.34),(-w*.21,h*.34),(0,h),(w*.21,h*.34),(w*.34,h*.34),(w/2,0)]
    extrude(name,x,y,z,profile,.30,red)
    for i in range(len(profile)-1):
        a,b=profile[i],profile[i+1]
        beam(name+' | molded edge',(x+a[0],y-.23,z+a[1]),(x+b[0],y-.23,z+b[1]),.095,edge)
for x in [8.1,13.3,18.5]:
    gable('Central | stepped gable',x,148.90-(x-13.3)*.042,31.6,4.4,3.1 if x!=13.3 else 4.7)
# Finely scaled triangular parapet motifs across the low facade.
for x in [-12,-10,-8,3,5,7,9,11,13,15,17,19,21,23,34,36,38]:
    y=front(x,16.5)
    if y is not None:
        gable('Lower | pointed parapet',x,y-.14,16.7,1.65,.82)
# Reconstructed entrance portal, kept visual only (existing collision remains).
x=12.93
y=front(x,2) or 144.3
for u in [-.78,.78]:
    extrude('Entrance | double arch shadow',x+u,y-.08,.08,arch_profile(1.35,3.4),.08,black)
    extrude('Entrance | timber door',x+u,y-.14,.08,arch_profile(1.15,3.18),.035,wood)
    arch_band('Entrance | portal',x+u,y-.30,.08,1.35,3.4,.22,.38,edge)
    for v in [.75,1.55,2.30]:
        box('Entrance | door panel',x+u,y-.175,v,.82,.035,.55,shade)
gable('Entrance | pointed hood',x,y-.24,3.9,4.1,3.1)
for u in [-2.0,2.0]:
    box('Entrance | engaged pier',x+u,y-.18,2.2,.42,.48,4.4,edge)

# The photograph shows tiered kokoshnik crowns beneath each tall metal spire.
# Add shallow red crowns around the retained mapped octagonal upper bodies.
def ring_band(name,cx,cy,z,r0,r1,height,ma,N=8):
    vs=[(cx+r*math.cos(i*2*math.pi/N+math.pi/8),cy+r*math.sin(i*2*math.pi/N+math.pi/8),zz)
        for zz,r in [(z,r0),(z+height,r1)] for i in range(N)]
    return mesh(name,vs,[tuple(range(N-1,-1,-1)),tuple(range(N,2*N))]+[(i,(i+1)%N,(i+1)%N+N,i+N) for i in range(N)],ma)
for cx,cy in [(-.501,154.334),(27.353,152.953)]:
    for z,r in [(41.8,2.18),(42.15,2.32),(42.55,2.46)]:
        ring_band('Lantern | projecting octagonal crown',cx,cy,z,r,r+.06,.23,edge)
    for side in range(4):
        angle=side*math.pi/2
        start=set(col.objects)
        for row in range(3):
            for off in [-.93,0,.93]:
                arch_band('Spire | tiered kokoshnik',cx+off*(1-.10*row),cy-1.60,43.0+row*1.15,.80-row*.06,.80,.12,.22,edge)
        # Rotate authored front-facing ornament around the mapped tower centre.
        for o in set(col.objects)-start:
            for v in o.data.vertices:
                x,y=v.co.x-cx,v.co.y-cy
                v.co.x=cx+x*math.cos(angle)-y*math.sin(angle)
                v.co.y=cy+x*math.sin(angle)+y*math.cos(angle)
            o.data.update();uv_map(o.data)
    for off in [-2.6,-1.3,0,1.3,2.6]:
        y=front(cx+off,35.8)
        if y is not None:
            arch_band('Tower | blind parapet arcade',cx+off,y-.16,35.7,1.03,1.05,.16,.27,edge)

# Dedicated source properties make approximations explicit in Blender.
s['Museum accuracy'] = 'Photo-informed facade study, not measured elevations. Existing OSM shell retained.'
s['Game frame'] = 'Blender XYZ metres -> glTF X,Z,-Y; loader uses shared offsetY only.'
s['References'] = 'Official SHM gim.png and PublicDomainPictures photograph; see README.md.'
s['Higgsfield'] = 'Read-only preflight 1.25 credits; generation rejected: Requires basic plan or higher. No generated texture used.'
s['Facade window parameters'] = json.dumps(windows)
# Save editable source BEFORE consolidation. Lights/cameras live only in render.py.
bpy.ops.wm.save_as_mainfile(filepath=str(D/'museum-detail.blend'))
import runpy
export_scene = runpy.run_path(str(D/'export.py'))['export_scene']
tri, mesh_count = export_scene(D)
report={'triangles':tri,'draw_meshes':mesh_count,'windows':windows,'window_count':len(windows),
        'source_shell_vertices':len(vv),'source_shell_objects':len(shell),
        'units':'metres','transform':'Blender XYZ -> glTF X,Z,-Y; no additional translation/rotation/scale',
        'replaces_city_node':'Mapped | Historical Museum',
        'source_collection':'Mapped | Historical Museum',
        'limitations':['Reference-informed proportions, not a measured elevation.','Roof profiles and overall heights remain community mapped approximations.','Side/rear elevations and rooftop finial sculpture remain unfinished.','Doors/windows are shallow facade geometry; existing collisions remain.','Generic procedural roughness is not a scanned monument surface.']}
(D/'report.json').write_text(json.dumps(report,indent=2)+'\n')
print('MUSEUM_COMPLETE',tri,mesh_count,len(windows))
