"""Validate the exported runtime bytes, skeleton, animation and skin weights."""
from pathlib import Path
import struct,json,hashlib,math
D=Path(__file__).resolve().parent
runtime=D.parents[2]/'public/assets/characters/mila-study.glb'
b=(D/'mila-study.glb').read_bytes()
assert runtime.read_bytes()==b, 'Runtime and editable-study exports differ'
magic,version,size=struct.unpack_from('<III',b)
assert magic==0x46546c67 and version==2 and size==len(b)
n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);offset=28+n
assert len(g['skins'])==1 and len(g['skins'][0]['joints'])==13
clips=[a['name'] for a in g['animations']]
assert all(c in clips for c in ['Idle','Walk','Greet'])
def values(index):
 a=g['accessors'][index];v=g['bufferViews'][a['bufferView']];num={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
 code,width={5126:('f',4),5123:('H',2),5125:('I',4),5121:('B',1)}[a['componentType']]
 return [struct.unpack_from('<'+code*num,b,offset+v.get('byteOffset',0)+a.get('byteOffset',0)+i*v.get('byteStride',num*width)) for i in range(a['count'])]
for i,a in enumerate(g['accessors']):
 if a['componentType']==5126:assert all(math.isfinite(v) for row in values(i) for v in row)
triangles=0;blended=0
for mesh in g['meshes']:
 for p in mesh['primitives']:
  triangles+=g['accessors'][p['indices']]['count']//3
  weights=values(p['attributes']['WEIGHTS_0'])
  assert all(abs(sum(w)-1)<1e-5 for w in weights)
  blended+=sum(sum(v>0.001 for v in w)>1 for w in weights)
  assert all(0<=v<13 for row in values(p['attributes']['JOINTS_0']) for v in row)
assert blended>100
for a in g['animations']:
 assert len(a['channels'])>=13
 for sample in a['samplers']:
  times=[row[0] for row in values(sample['input'])]
  assert len(times)>1 and all(x<y for x,y in zip(times,times[1:]))
assert triangles<100000
report=dict(bytes=len(b),sha256=hashlib.sha256(b).hexdigest(),triangles=triangles,bones=13,clips=clips,blendedVertices=blended,finiteFloatAccessors=True,normalizedWeights=True,runtimeMatchesSource=True,likenessAccepted=False)
(D/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
