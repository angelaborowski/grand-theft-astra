import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {mkdtemp,readFile,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';import {WebSocket} from 'ws';import {DatabaseSync} from 'node:sqlite';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function start(data){const proc=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:'0',DATA_DIR:data},stdio:['ignore','pipe','pipe']});let errors='';proc.stderr.on('data',d=>errors+=d);const url=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(errors||'Startup timeout')),5000);proc.stdout.on('data',d=>{const m=String(d).match(/http:\/\/localhost:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});proc.on('error',reject);});return {proc,url,stop:()=>new Promise(r=>{proc.once('exit',r);proc.kill('SIGTERM');})};}
async function join(url,name,token){const r=await fetch(url+'/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,token})});assert.equal(r.status,200);return r.json();}
async function client(url,token){const ws=new WebSocket(url.replace('http:','ws:')+'/?token='+token),messages=[];ws.on('message',d=>messages.push(JSON.parse(d)));await new Promise((r,j)=>{ws.once('open',r);ws.once('error',j);});return{ws,messages,send:m=>ws.send(JSON.stringify(m))};}
async function until(fn){for(let i=0;i<100;i++){const r=fn();if(r)return r;await delay(30);}throw Error('Message timeout');}
test('real HTTP and WebSocket sessions share world, reject remote rewards and restore saved state after restart',{timeout:20000},async()=>{
 const data=await mkdtemp(path.join(os.tmpdir(),'gpt8-test-'));let app,a,b;
 try{app=await start(data);const aa=await join(app.url,'One'),bb=await join(app.url,'Two');assert.notEqual(aa.token,bb.token);a=await client(app.url,aa.token);b=await client(app.url,bb.token);await until(()=>a.messages.find(m=>m.type==='state'&&m.players.length===2));
 assert.equal((await fetch(app.url+'/assets/red-square.glb')).status,200);assert.equal((await fetch(app.url+'/vendor/three/build/three.module.js')).status,200);
 a.send({type:'interact',id:'recipient'});const denied=await until(()=>a.messages.find(m=>m.type==='action'));assert.equal(denied.ok,false);assert.equal(denied.player.money,25);
 a.send({type:'move',x:20,z:201,yaw:0});await until(()=>a.messages.find(m=>m.type==='position'));
 let x=39,z=83;for(let i=0;i<16;i++){await delay(100);x-=.125;z+=.7;a.send({type:'move',x,z,yaw:0});}
 await delay(400);a.send({type:'interact',id:'guide'});await until(()=>a.messages.find(m=>m.type==='action'&&m.player.quest===1));
 a.ws.close();b.ws.close();await delay(150);await app.stop();const db=new DatabaseSync(path.join(data,'world.sqlite'));const saved=JSON.parse(db.prepare('SELECT state FROM world WHERE id=1').get().state);db.close();assert.equal(saved.players[aa.token].quest,1);assert.equal(saved.players[aa.token].money,25);
 app=await start(data);const resumed=await join(app.url,'Wrong replacement',aa.token);assert.equal(resumed.player.quest,1);assert.equal(resumed.player.name,'One');assert.equal(resumed.player.money,25);assert.ok(Math.abs(resumed.player.z-z)<.1);
 }finally{a?.ws.close();b?.ws.close();if(app?.proc.exitCode===null)await app.stop();await rm(data,{recursive:true,force:true});}
});

test('two simultaneous buyers cannot both acquire the same property',{timeout:15000},async()=>{
 const data=await mkdtemp(path.join(os.tmpdir(),'gpt8-ownership-'));let app,a,b;
 try{const db=new DatabaseSync(path.join(data,'world.sqlite'));db.exec('CREATE TABLE world(id INTEGER PRIMARY KEY,state TEXT NOT NULL)');const make=(id)=>({id,token:id,name:id,x:56,z:72,money:85,quest:3,ownsKiosk:false,lastIncome:0});db.prepare('INSERT INTO world VALUES(1,?)').run(JSON.stringify({createdAt:Date.now(),players:{a:make('a'),b:make('b')},events:[],gardenLevel:0}));db.close();app=await start(data);a=await client(app.url,'a');b=await client(app.url,'b');a.send({type:'interact',id:'kiosk'});b.send({type:'interact',id:'kiosk'});const ra=await until(()=>a.messages.find(m=>m.type==='action')),rb=await until(()=>b.messages.find(m=>m.type==='action'));assert.equal([ra,rb].filter(x=>x.ok).length,1);assert.deepEqual([ra.player.money,rb.player.money].sort((x,y)=>x-y),[35,85]);const worldState=await until(()=>a.messages.find(m=>m.type==='state'&&m.kioskOwner));assert.ok(['a','b'].includes(worldState.kioskOwner.id));
 a.send(null);await delay(80);assert.equal((await fetch(app.url+'/api/health')).status,200);
 }finally{a?.ws.close();b?.ws.close();if(app?.proc.exitCode===null)await app.stop();await rm(data,{recursive:true,force:true});}
});
