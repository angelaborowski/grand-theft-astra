import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {furnishRoom,museumDetail} from '../../../public/world-polish.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {writeFile,readFile} from 'node:fs/promises';
// GLTFExporter's binary Blob reader for the Node build pipeline.
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(b=>{this.result=b;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(b=>{this.result='data:'+blob.type+';base64,'+Buffer.from(b).toString('base64');this.onloadend?.();});}};
const room=new THREE.Group();for(let i=0;i<13;i++)room.add(new THREE.Group());furnishRoom(room);room.name='Hostel furnishings';
const file=await readFile(new URL('../../../public/assets/red-square.glb',import.meta.url));const model=await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'');const scene=new THREE.Scene();scene.add(room,museumDetail(model.scene));
const data=await new GLTFExporter().parseAsync(scene,{binary:true,onlyVisible:true});await writeFile(new URL('./furnishings-and-museum.glb',import.meta.url),Buffer.from(data));console.log('Exported furnishings and museum geometry');
