import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {WebSocketServer,WebSocket} from 'ws';
import {PLACES,SPAWN,validPosition,accrue,interact,publicPlayer,privatePlayer,normalize} from './world.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const dataDir=process.env.DATA_DIR||path.join(root,'data');
await mkdir(dataDir,{recursive:true});
const db=new DatabaseSync(path.join(dataDir,'world.sqlite'));
db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS world (id INTEGER PRIMARY KEY CHECK(id=1), state TEXT NOT NULL)');
let world={createdAt:Date.now(),players:{},events:[],gardenLevel:0};
const record=db.prepare('SELECT state FROM world WHERE id=1').get();
if(record)world=JSON.parse(record.state);
else {try{world=JSON.parse(await readFile(path.join(dataDir,'world.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}}
world.events??=[];world.gardenLevel??=0;world.kioskOwner??=null;
for(const p of Object.values(world.players))normalize(p);
const persist=db.prepare('INSERT INTO world(id,state) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state');
function save(){persist.run(JSON.stringify(world));}
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png'};
const server=http.createServer(async(req,res)=>{
 try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/api/session'&&req.method==='POST'){
  let raw='';for await(const part of req){raw+=part;if(raw.length>2048){res.writeHead(413).end();return;}}
  let input;try{input=JSON.parse(raw);}catch{res.writeHead(400).end();return;}
  if(!input||typeof input!=='object'){res.writeHead(400).end();return;}
  let p=typeof input.token==='string'&&Object.hasOwn(world.players,input.token)?world.players[input.token]:null;
  if(!p){const token=randomUUID();p={id:randomUUID(),token,name:String(input.name||'Explorer').trim().slice(0,24)||'Explorer',...SPAWN,yaw:0,money:25,quest:0,ownsKiosk:false,lastIncome:Date.now()};world.players[token]=p;}
  accrue(p);await save();res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify({token:p.token,player:privatePlayer(p)}));return;
 }
 if(url.pathname==='/api/health'){res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({ok:true,online:clients.size}));return;}
 let base=path.join(root,'public'),rel=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
 if(rel.startsWith('/vendor/three/')){base=path.join(root,'node_modules','three');rel=rel.slice('/vendor/three'.length);}
 const target=path.resolve(base,'.'+rel);if(!target.startsWith(base+path.sep)){res.writeHead(403).end();return;}
 const content=await readFile(target);res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}).end(content);
 }catch(e){res.writeHead(e.code==='ENOENT'?404:500).end('Unable to load resource');}
});
const wss=new WebSocketServer({server,maxPayload:2048});const clients=new Map();
function send(ws,v){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(v));}
wss.on('connection',(ws,req)=>{
 const token=new URL(req.url,'http://localhost').searchParams.get('token'),p=Object.hasOwn(world.players,token)?world.players[token]:null;
 if(!p){ws.close(1008,'Join first');return;}
 for(const [other,c]of clients)if(c.p.id===p.id){other.close(1000,'Session opened elsewhere');clients.delete(other);}
 const c={p,lastMove:Date.now(),lastAction:0,moveBudget:2};clients.set(ws,c);accrue(p);
 send(ws,{type:'welcome',player:privatePlayer(p),places:PLACES,createdAt:world.createdAt});
 ws.on('message',raw=>{let m;try{m=JSON.parse(raw);}catch{return;}if(!m||typeof m!=='object')return;const now=Date.now();
  if(m.type==='move'){
   const dt=Math.min(1,Math.max(0,(now-c.lastMove)/1000));c.lastMove=now;c.moveBudget=Math.min(3,c.moveBudget+10.5*dt);const distance=Math.hypot(m.x-p.x,m.z-p.z);
   if(validPosition(m.x,m.z,p.interior)&&distance<=c.moveBudget){c.moveBudget-=distance;p.x=m.x;p.z=m.z;if(Number.isFinite(m.yaw))p.yaw=m.yaw;}
   else send(ws,{type:'position',x:p.x,z:p.z});
  }
  if(m.type==='interact'&&now-c.lastAction>350){c.lastAction=now;let result;if(m.id==='kiosk'&&world.kioskOwner&&world.kioskOwner.id!==p.id){result={ok:false,message:'This book stall belongs to '+world.kioskOwner.name+'. You can still rent a room and help the neighborhood.'};}else result=interact(p,m.id,now);if(result.event==='property')world.kioskOwner={id:p.id,name:p.name};if(result.event){world.events.push({at:now,name:p.name,type:result.event});world.events=world.events.slice(-40);if(result.event==='garden')world.gardenLevel++;}save();send(ws,{type:'action',...result,player:privatePlayer(p)});}
 });
 ws.on('close',()=>{clients.delete(ws);void save();});
});
const tick=setInterval(()=>{const now=Date.now();const players=[...clients.values()].map(c=>publicPlayer(c.p));for(const[ws,c]of clients){accrue(c.p,now);send(ws,{type:'state',players,player:privatePlayer(c.p),time:now,createdAt:world.createdAt,gardenLevel:world.gardenLevel,kioskOwner:world.kioskOwner,recentEvent:world.events.at(-1)||null});}},100);
const autosave=setInterval(save,5000);
const port=Number(process.env.PORT||4173);server.listen(port,'0.0.0.0',()=>console.log(`GPT8 listening on http://localhost:${server.address().port}`));
async function shutdown(){clearInterval(tick);clearInterval(autosave);for(const ws of clients.keys())ws.close();await save();server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),1000).unref();}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
