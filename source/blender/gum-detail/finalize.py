"""Repair outward winding, consolidate evaluated geometry preserving UVs, export and render."""
import bpy,bmesh,json,math
from pathlib import Path
D=Path(__file__).resolve().parent;ASSETS=D.parents[2]/'public/assets'
bpy.ops.wm.open_mainfile(filepath=str(D/'gum-detail.blend'))
s=bpy.context.scene
objects=[o for o in s.objects if o.type=='MESH' and o.name!='Preview ground']
for o in objects:
 bm=bmesh.new();bm.from_mesh(o.data)
 if len(bm.faces)>1:bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
 else:
  for f in bm.faces:
   if f.normal.x>0:f.normal_flip()
 bm.to_mesh(o.data);bm.free()
s.camera=bpy.data.objects['01-player'];bpy.ops.wm.save_as_mainfile(filepath=str(D/'gum-detail.blend'))
bpy.ops.object.select_all(action='DESELECT');dg=bpy.context.evaluated_depsgraph_get();groups={}
for o in objects:groups.setdefault(o.data.materials[0].name,[]).append(o)
exports=[];tri=0
for key,group in groups.items():
 vv=[];ff=[];uvs=[];smooth=[]
 for o in group:
  ev=o.evaluated_get(dg);me=ev.to_mesh();offset=len(vv);vv.extend([tuple(o.matrix_world@v.co) for v in me.vertices]);layer=me.uv_layers.active
  for f in me.polygons:
   ff.append(tuple(offset+i for i in f.vertices));smooth.append(f.use_smooth)
   uvs.extend([tuple(layer.data[i].uv) if layer else (0,0) for i in f.loop_indices])
  ev.to_mesh_clear()
 me=bpy.data.meshes.new(key);me.from_pydata(vv,[],ff);me.update();uv=me.uv_layers.new()
 for item,p in zip(uv.data,uvs):item.uv=p
 for f,sm in zip(me.polygons,smooth):f.use_smooth=sm
 me.materials.append(bpy.data.materials[key]);ob=bpy.data.objects.new(key,me);s.collection.objects.link(ob);ob.select_set(True);exports.append(ob);me.calc_loop_triangles();tri+=len(me.loop_triangles)
bpy.ops.export_scene.gltf(filepath=str(ASSETS/'gum-detail.glb'),export_format='GLB',use_selection=True,export_apply=True)
report={'triangles':tri,'draw_meshes':len(exports),'length_metres':60,'texture_resolution':1024,'reference':'https://commons.wikimedia.org/wiki/File:Moscow_GUM_fragment_of_fa%D1%81ade.jpg','limitations':['Elevation dimensions and bay spacing inferred, not survey validated.','No scanned surfaces; original procedural PBR maps.','60m detail overlay, not a complete GUM reconstruction.']}
(D/'report.json').write_text(json.dumps(report,indent=2))
for ob in exports:bpy.data.objects.remove(ob,do_unlink=True)
for name in ['01-player','02-facade','03-stone-detail']:
 s.camera=bpy.data.objects[name];s.render.filepath=str(D/(name+'.png'));bpy.ops.render.render(write_still=True)
print('GUM_COMPLETE',tri,flush=True)
