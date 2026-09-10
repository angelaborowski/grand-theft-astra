import test from 'node:test';
import assert from 'node:assert/strict';
import {npcPose} from '../public/character-motion.js';
test('all NPC routines remain reachable and loop continuously',()=>{
 for(let i=0;i<6;i++)for(let t=0;t<60;t+=.05){
  const a={x:37,z:100},p=npcPose(t,i,a,null);
  assert.ok(Math.hypot(p.x-a.x,p.z-a.z)<=.801);
  const next=npcPose(t+.001,i,a,null);
  assert.ok(Math.hypot(next.x-p.x,next.z-p.z)<.001);
 }
});
test('stationary NPC greets nearby players but idles when unattended',()=>{
 const a={x:0,z:0};
 assert.equal(npcPose(12,0,a,null).clip,'Idle');
 assert.equal(npcPose(12,0,a,{x:0,z:2}).clip,'Greet');
 assert.equal(npcPose(2,0,a,null).clip,'Walk');
});
