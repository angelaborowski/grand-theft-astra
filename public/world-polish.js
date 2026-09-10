import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const material=(color,roughness=.8)=>new THREE.MeshStandardMaterial({color,roughness});
export function furnishRoom(room){
 // Replace the oversized placeholder bed and desk, keeping the saved room envelope/door.
 const old=[...room.children];for(const i of [6,7,8,9])room.remove(old[i]);
 const oak=material('#70543a'),linen=material('#dfd5bd'),blanket=material('#68746b'),brass=new THREE.MeshStandardMaterial({color:'#8a734a',metalness:.6,roughness:.4}),wall=material('#c3baa5');const groups=new Map();
 function block(w,h,d,m,x,y,z,r=.015){const g=new RoundedBoxGeometry(w,h,d,1,Math.min(r,w/4,h/4,d/4));g.translate(x,y,z);if(!groups.has(m))groups.set(m,[]);groups.get(m).push(g);}
 for(let x=75;x<94;x+=.38)block(.37,.025,19.5,oak,x,.145,80,.004);
 for(const x of[74.75,93.25])block(.12,.20,19.5,oak,x,.23,80);for(const z of[70.2,89.7])block(18.5,.20,.12,oak,84,.23,z);
 block(2,.25,2.55,oak,89,.4,75);block(2.02,.24,2.5,linen,89,.63,75);block(2.03,.08,1.65,blanket,89,.80,75.42,.035);block(2.1,1.1,.14,oak,89,.65,73.68);
 for(const x of[88.5,89.5])block(.75,.17,.46,linen,x,.83,74.16,.075);
 for(const x of[88.15,89.85])for(const z of[73.95,76.05])block(.10,.35,.10,oak,x,.26,z);
 block(.65,.65,.55,oak,87.35,.47,74.2);block(.59,.20,.05,wall,87.35,.61,74.49);block(.10,.035,.045,brass,87.35,.61,74.53);
 block(1.7,.09,.8,oak,77.2,.91,75);for(const x of[76.5,77.9])for(const z of[74.7,75.3])block(.07,.76,.07,oak,x,.49,z);
 block(.53,.10,.55,blanket,77.2,.54,76.2);block(.53,.6,.09,oak,77.2,.9,76.43);for(const x of[77,77.4])for(const z of[76,76.4])block(.05,.4,.05,oak,x,.33,z);
 // Panel mouldings and a framed picture on the back wall.
 for(const x of[77,80,83,86,89,92]){for(const xx of[x-.85,x+.85])block(.04,1.8,.035,oak,xx,1.6,70.17);for(const yy of[.7,2.5])block(1.74,.04,.035,oak,x,yy,70.17);}
 block(1.5,1.1,.10,oak,83,2.1,70.24);block(1.36,.96,.02,blanket,83,2.1,70.31);
 block(2.2,.025,3.2,blanket,85.5,.17,79);for(let i=0;i<12;i++)block(2.15,.008,.015,linen,85.5,.19,77.5+i*.26,.001);
 block(2.2,2.1,.08,oak,93.28,2,80);block(2.0,1.9,.025,wall,93.22,2,80);
 for(const [m,gs]of groups){const mesh=new THREE.Mesh(mergeGeometries(gs),m);mesh.castShadow=mesh.receiveShadow=true;room.add(mesh);gs.forEach(g=>g.dispose());}
 const lamp=new THREE.Mesh(new THREE.CylinderGeometry(.12,.2,.22,24),material('#e2cda8'));lamp.position.set(87.35,1.12,74.2);room.add(lamp);const light=new THREE.PointLight('#ffcc87',3,7,2);light.position.set(87.35,1.2,74.2);room.add(light);
}
export function museumDetail(){
 const group=new THREE.Group(),byMaterial=new Map();const stone=material('#b59d7d'),glass=new THREE.MeshStandardMaterial({color:'#293a42',metalness:.3,roughness:.3});
 function b(w,h,d,m,x,y,z){const g=new RoundedBoxGeometry(w,h,d,1,.035);g.translate(x,y,z);if(!byMaterial.has(m))byMaterial.set(m,[]);byMaterial.get(m).push(g);}
 // Reference-informed window rhythm on the square-facing museum elevation, not a measured facade.
 for(let x=-8;x<=40;x+=4){for(const y of[4.3,10.2,16.2]){b(1.2,2.7,.09,glass,x,y,-143.15);for(const xx of[x-.74,x+.74])b(.2,3,.35,stone,xx,y,-142.94);for(const yy of[y-1.5,y+1.5])b(1.7,.2,.4,stone,x,yy,-142.92);b(.07,2.65,.12,stone,x,y,-143);}}
 for(const y of[1,7.5,13.5,19])b(56,.18,.5,stone,16,y,-143);
 for(const [m,gs]of byMaterial){const mesh=new THREE.Mesh(mergeGeometries(gs),m);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);gs.forEach(g=>g.dispose());}group.name='Museum facade study';return group;
}
export function extendGum(original){
 const group=new THREE.Group();group.name='GUM extended facade study';
 for(const offset of[-180,-120,-60,60]){const c=original.clone(true);c.position.z+=offset;c.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,0,1),116),new THREE.Plane(new THREE.Vector3(0,0,-1),151)];}});group.add(c);}return group;
}
