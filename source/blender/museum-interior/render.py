import bpy
from pathlib import Path
D=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(D/'museum-interior.blend'))
S=bpy.context.scene;S.render.resolution_x=1280;S.render.resolution_y=960;S.cycles.samples=24;(D/'previews').mkdir(exist_ok=True)
for name in ['Entrance','Landing','Return view']:
 S.camera=bpy.data.objects[name];S.render.filepath=str(D/'previews'/(name.lower().replace(' ','-')+'.png'));bpy.ops.render.render(write_still=True)
