import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const names=['mila','lev','niko','irina','sasha','alexei'];
const report=[];
for(const name of names){
 const url=new URL('../../../public/assets/characters/'+name+'.glb',import.meta.url);
 const bytes=fs.readFileSync(url),length=bytes.readUInt32LE(12);
 assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(8),bytes.length);
 const gltf=JSON.parse(bytes.toString('utf8',20,20+length));
 assert.equal(gltf.skins.length,1);assert.equal(gltf.skins[0].joints.length,13);
 const clips=gltf.animations.map(a=>a.name);for(const clip of ['Idle','Walk','Greet'])assert.ok(clips.includes(clip));
 const binStart=20+length+8;
 for(const accessor of gltf.accessors){if(accessor.componentType!==5126||accessor.bufferView===undefined)continue;
  const view=gltf.bufferViews[accessor.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[accessor.type];
  for(let i=0;i<accessor.count;i++)for(let k=0;k<n;k++)assert.ok(Number.isFinite(bytes.readFloatLE(binStart+(view.byteOffset||0)+(accessor.byteOffset||0)+i*(view.byteStride||n*4)+k*4)));
 }
 report.push({name,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bones:13,clips,finiteFloatAccessors:true});
}
fs.writeFileSync(new URL('cast-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
