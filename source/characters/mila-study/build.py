"""Build the current Mila asset via the shared refined cast pipeline."""
from pathlib import Path
import runpy,sys,shutil
D=Path(__file__).resolve().parent
builder=D.parents[1]/'blender/characters/build-quality.py'
sys.argv=[str(builder),'--','mila'];runpy.run_path(str(builder),run_name='__main__')
shutil.copy2(D.parents[2]/'public/assets/characters/mila-study.glb',D/'mila-study.glb')
shutil.copy2(builder.parent/'mila.blend',D/'mila-study.blend')
