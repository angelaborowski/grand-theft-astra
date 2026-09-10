"""Verify all runtime character GLBs from their exported bytes."""
from pathlib import Path
import struct,json,math,hashlib
D=Path(__file__).resolve().parent;ROOT=D.parents[2];reports=[]
for name in ['mila-study','lev','niko','irina','sasha','alexei','courier-prototype']+[p.stem for p in sorted((ROOT/'public/assets/characters').glob('resident-*.glb'))]:
 p=ROOT/'public/assets'/((name+'.glb') if name=='courier-prototype' else 'characters/'+name+'.glb')
 b=p.read_bytes();magic,version,total=struct.unpack_from('<III',b);assert (magic,version,total)==(0x46546c67,2,len(b))
 n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);offset=28+n
 assert len(g['skins'])==1 and len(g['skins'][0]['joints'])==13
 clips=[a['name'] for a in g['animations']];assert set(['Idle','Walk','Greet'])<=set(clips)
 def values(i):
  a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];count={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];code,width={5126:('f',4),5123:('H',2),5125:('I',4),5121:('B',1)}[a['componentType']]
  return [struct.unpack_from('<'+code*count,b,offset+v.get('byteOffset',0)+a.get('byteOffset',0)+j*v.get('byteStride',width*count)) for j in range(a['count'])]
 for i,a in enumerate(g['accessors']):
  if a['componentType']==5126:assert all(math.isfinite(x) for row in values(i) for x in row)
 triangles=0;blended=0;vertices=0
 for m in g['meshes']:
  for prim in m['primitives']:
   attrs=prim['attributes'];vcount=g['accessors'][attrs['POSITION']]['count'];vertices+=vcount
   idx=values(prim['indices']);assert all(0<=x[0]<vcount for x in idx);triangles+=len(idx)//3
   ws=values(attrs['WEIGHTS_0']);assert all(abs(sum(w)-1)<1e-4 for w in ws);blended+=sum(sum(x>.001 for x in w)>1 for w in ws)
   assert all(0<=x<13 for row in values(attrs['JOINTS_0']) for x in row)
 assert blended>50
 assert triangles<(12000 if (name=='courier-prototype' or name.startswith('resident-')) else 50000)
 for a in g['animations']:
  assert len(a['channels'])>=13
  for sampler in a['samplers']:
   ts=[v[0] for v in values(sampler['input'])];assert len(ts)>1 and all(x<y for x,y in zip(ts,ts[1:]))
 assert len(g.get('images',[]))>=4
 for im in g['images']:
  assert 'bufferView' in im and 'uri' not in im
  v=g['bufferViews'][im['bufferView']];data=b[offset+v.get('byteOffset',0):offset+v.get('byteOffset',0)+v['byteLength']]
  assert data.startswith(b'\x89PNG\r\n\x1a\n');w,h=struct.unpack_from('>II',data,16);assert w<=1024 and h<=1024
 if name=='courier-prototype':assert any(m.get('name')=='Jacket' for m in g['materials'])
 reports.append(dict(name=name,sha256=hashlib.sha256(b).hexdigest(),bytes=len(b),triangles=triangles,vertices=vertices,bones=13,clips=clips,blendedVertices=blended,embeddedTextures=len(g['images']),finiteAccessors=True,normalizedWeights=True,likenessAccepted=False))
(D/'quality/validation.json').write_text(json.dumps(reports,indent=2)+'\n');print(json.dumps(reports,indent=2))
