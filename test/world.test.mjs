import test from 'node:test';import assert from 'node:assert/strict';
import {PLACES,SPAWN,validPosition,interact,accrue} from '../world.mjs';
function player(){return {...SPAWN,money:25,quest:0,ownsKiosk:false,lastIncome:0};}
function at(p,id){Object.assign(p,{x:PLACES[id].x,z:PLACES[id].z});}
test('delivery pays once, property purchase is affordable once, income accrues offline',()=>{
 const p=player();assert.equal(interact(p,'recipient').ok,false);assert.equal(p.money,25);
 at(p,'guide');assert.equal(interact(p,'guide').ok,true);assert.equal(p.quest,1);
 at(p,'recipient');interact(p,'recipient');assert.equal(p.quest,1);assert.equal(p.money,25);
 at(p,'parcel');interact(p,'parcel');assert.equal(p.quest,2);interact(p,'parcel');assert.equal(p.quest,2);
 at(p,'recipient');interact(p,'recipient');assert.equal(p.money,105);interact(p,'recipient');assert.equal(p.money,105);
 at(p,'kiosk');interact(p,'kiosk',1000);assert.equal(p.money,55);assert.equal(p.ownsKiosk,true);
 interact(p,'kiosk',1000);assert.equal(p.money,55);accrue(p,121000);assert.equal(p.money,79);
 accrue(p,121000);assert.equal(p.money,79);
});
test('invalid actions, insufficient money, and invalid positions cannot alter state',()=>{
 const p=player();assert.equal(interact(p,'kiosk').ok,false);at(p,'kiosk');assert.equal(interact(p,'kiosk').ok,false);assert.equal(p.ownsKiosk,false);assert.equal(p.money,25);
 assert.equal(interact(p,'not-a-place').ok,false);for(const xy of [[NaN,0],[Infinity,0],[100,0],[-20,10],[36,188],[56,78]])assert.equal(validPosition(...xy),false);assert.equal(validPosition(39,83),true);
});
test('offline income is bounded to eight hours per return',()=>{const p=player();p.ownsKiosk=true;p.lastIncome=1000;accrue(p,1000+24*3600000);assert.equal(p.money,25+480*12);accrue(p,1000+24*3600000);assert.equal(p.money,25+480*12);});

test('alternative courier branch preserves inventory, reputation and persistent memories',()=>{const p=player();at(p,'guide');interact(p,'guide');at(p,'parcel');interact(p,'parcel');assert.deepEqual(p.inventory,['Sealed book parcel']);at(p,'courier');interact(p,'courier');assert.equal(p.money,85);assert.equal(p.reputation,1);assert.deepEqual(p.inventory,[]);interact(p,'courier');assert.equal(p.money,85);assert.equal(p.memories.courier,2);at(p,'host');interact(p,'host');assert.equal(p.hasRoom,true);assert.equal(p.money,65);assert.ok(p.inventory.includes('Guesthouse key'));interact(p,'host');assert.equal(p.interior,true);assert.equal(validPosition(p.x,p.z,true),true);at(p,'exit');interact(p,'exit');assert.equal(p.interior,false);assert.equal(validPosition(p.x,p.z),true);});
test('garden consequence only pays once and dialogue remembers help',()=>{const p=player();at(p,'gardener');assert.equal(interact(p,'gardener').event,'garden');assert.equal(p.money,35);const again=interact(p,'gardener');assert.match(again.message,/remember/);assert.equal(p.money,35);assert.equal(p.reputation,1);});

test('furnished room blocks desk and chair while preserving door approach',()=>{
 assert.equal(validPosition(77.2,75,true),false);
 assert.equal(validPosition(77.2,76.2,true),false);
 assert.equal(validPosition(84,84,true),true);
 assert.equal(validPosition(84,87,true),true);
});
