"""Build the occupational crowd using the shared, editable cast pipeline."""
import importlib.util,json,sys
from pathlib import Path
D=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('quality',D/'build-quality.py')
quality=importlib.util.module_from_spec(spec);spec.loader.exec_module(quality)
selected=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
for i,role in enumerate(json.loads((D/'resident-roles.json').read_text())):
 name='resident-'+role['id']
 cfg=dict(quality.CONFIG['courier-prototype'])
 cfg.update(role,low=True,occupation=role['id'],profile=['niko','sasha','lev','irina'][i%4],width=[1,.98,1.05,1.12][i%4],head=[1,.97,1.02,1.05][i%4],age=[32,29,54,47][i%4])
 quality.CONFIG[name]=cfg
 if not selected or role['id'] in selected:quality.build(name)
