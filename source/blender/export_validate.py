import bpy,json,math
from pathlib import Path
D=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(D/'red-square-refined.blend'))
scene=bpy.context.scene
bpy.ops.object.select_all(action='DESELECT')
original_meshes=[o for o in scene.objects if o.type=='MESH']
export_col=bpy.data.collections.new('Temporary export consolidation');scene.collection.children.link(export_col)
groups={}
for ob in original_meshes:
 key=ob.users_collection[0].name
 if key.startswith('04'):
  key+=' / '+('Spasskaya' if ob.name.startswith('spasskaya') else 'Nikolskaya' if ob.name.startswith('nikolskaya') else 'Senatskaya' if ob.name.lower().startswith('senatskaya') else 'Wall')
 groups.setdefault(key,[]).append(ob)
dg=bpy.context.evaluated_depsgraph_get()
for key,objects in groups.items():
 vv=[];ff=[];mi=[];materials=[]
 for ob in objects:
  ev=ob.evaluated_get(dg);me=ev.to_mesh();off=len(vv);vv.extend([ob.matrix_world@v.co for v in me.vertices])
  remap=[]
  for material in me.materials:
   if material not in materials:materials.append(material)
   remap.append(materials.index(material))
  for f in me.polygons:ff.append(tuple(off+i for i in f.vertices));mi.append(remap[f.material_index] if remap else 0)
  ev.to_mesh_clear()
 me=bpy.data.meshes.new(key+' export');me.from_pydata(vv,[],ff);me.update();ob=bpy.data.objects.new(key,me);export_col.objects.link(ob)
 for material in materials:me.materials.append(material)
 for f,i in zip(me.polygons,mi):f.material_index=i
 ob.select_set(True)
export_mesh_count=len(export_col.objects)
bpy.ops.export_scene.gltf(filepath=str(D/'red-square-refined.glb'),export_format='GLB',use_selection=True,export_apply=True,export_materials='EXPORT',export_yup=True)
for ob in list(export_col.objects):bpy.data.objects.remove(ob,do_unlink=True)
bpy.data.collections.remove(export_col)
meshobjs=[o for o in scene.objects if o.type=='MESH'];dg=bpy.context.evaluated_depsgraph_get();tri=0;polys=0;verts=0
for ob in meshobjs:
 me=ob.evaluated_get(dg).to_mesh();me.calc_loop_triangles();tri+=len(me.loop_triangles);polys+=len(me.polygons);verts+=len(me.vertices);ob.evaluated_get(dg).to_mesh_clear()

report={'blender_version':bpy.app.version_string,'mesh_objects':len(meshobjs),'glb_mesh_objects':export_mesh_count,'evaluated_vertices':verts,'evaluated_polygons':polys,'evaluated_triangles':tri,'materials':len(bpy.data.materials),'bitmap_textures':[],'units':'metres','cameras':[{'name':o.name,'location':list(o.location),'lens_mm':o.data.lens} for o in scene.objects if o.type=='CAMERA'],'limitations':['Architectural details and some roofs are approximated.','Procedural brick and paving are not baked to the GLB; flat PBR base colors export.','No collisions, LODs, lightmaps, navmesh, interiors, or gameplay.','Map-derived geometry is not survey validated.']}
(D/'scene-report.json').write_text(json.dumps(report,indent=2))
assert len(report['cameras'])==3
assert scene.unit_settings.scale_length==1
assert not any(i.filepath and i.source=='FILE' and not i.packed_file for i in bpy.data.images)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(D/'red-square-refined.glb'))
obs=[o for o in bpy.context.scene.objects if o.type=='MESH'];tri=0
for o in obs:
 o.data.calc_loop_triangles();tri+=len(o.data.loop_triangles)
 assert all(math.isfinite(v) for p in o.data.vertices for v in p.co)
assert len(obs)==export_mesh_count
assert tri==report['evaluated_triangles']
(D/'validation.json').write_text(json.dumps({'blend_reopened':True,'no_external_texture_dependencies':True,'glb_reimported':True,'mesh_count':len(obs),'triangles':tri,'finite_coordinates':True},indent=2))
print('REFINED_EXPORT_VALIDATED',json.dumps(report))
