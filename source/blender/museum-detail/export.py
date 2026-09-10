"""Consolidate without destructive edits or per-object Blender operators."""
import bpy
from pathlib import Path

def export_scene(directory):
    d=Path(directory)
    source=[o for o in bpy.context.scene.objects if o.type=='MESH']
    groups={}
    for o in source:
        me=o.data
        uv=me.uv_layers.active
        for poly in me.polygons:
            ma=me.materials[poly.material_index]
            bucket=groups.setdefault(ma.name,{'material':ma,'v':[],'f':[],'uv':[],'smooth':[]})
            off=len(bucket['v'])
            bucket['v'].extend(tuple(o.matrix_world@me.vertices[i].co) for i in poly.vertices)
            bucket['f'].append(tuple(range(off,off+len(poly.vertices))))
            bucket['uv'].extend(tuple(uv.data[i].uv) if uv else (0,0) for i in poly.loop_indices)
            bucket['smooth'].append(poly.use_smooth)
    export_col=bpy.data.collections.new('Museum | export consolidation')
    bpy.context.scene.collection.children.link(export_col)
    bpy.ops.object.select_all(action='DESELECT')
    tri=0
    for name,b in groups.items():
        me=bpy.data.meshes.new(name+' export')
        me.from_pydata(b['v'],[],b['f']);me.update()
        me.materials.append(b['material'])
        layer=me.uv_layers.new(name='UVMap')
        for li,p in zip(layer.data,b['uv']):li.uv=p
        for p,smooth in zip(me.polygons,b['smooth']):p.use_smooth=smooth
        o=bpy.data.objects.new('Museum replacement / '+name,me);export_col.objects.link(o);o.select_set(True)
        me.calc_loop_triangles();tri+=len(me.loop_triangles)
    bpy.ops.export_scene.gltf(filepath=str(d.parents[2]/'public/assets/museum-detail.glb'),export_format='GLB',use_selection=True,export_yup=True)
    for o in list(export_col.objects):bpy.data.objects.remove(o,do_unlink=True)
    bpy.data.collections.remove(export_col)
    return tri,len(groups)
