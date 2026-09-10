"""Render current Mila GLB using the shared comparison studio."""
from pathlib import Path
import runpy,sys,shutil
D=Path(__file__).resolve().parent
renderer=D.parents[1]/'blender/characters/render-quality.py'
sys.argv=[str(renderer),'--','mila'];runpy.run_path(str(renderer),run_name='__main__')
for a,b in [('mila-after.png','front.png'),('mila-after.png','three-quarter.png'),('mila-walk.png','export-walk.png'),('mila-greet.png','export-greet.png')]:shutil.copy2(renderer.parent/'quality'/a,D/b)
