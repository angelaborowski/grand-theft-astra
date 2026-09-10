export const PLACES = {
 guide:{id:'guide',name:'Mila · local courier',x:37,z:100},
 parcel:{id:'parcel',name:'Collect the parcel',x:53,z:143},
 recipient:{id:'recipient',name:'Lev · book collector',x:20,z:201},
 kiosk:{id:'kiosk',name:'Square-side book stall',x:56,z:78},
 courier:{id:'courier',name:'Niko · cycle courier',x:46,z:161},
 host:{id:'host',name:'Irina · guesthouse keeper',x:58,z:59},
 gardener:{id:'gardener',name:'Sasha · gardener',x:48,z:46},
 guard:{id:'guard',name:'Alexei · square steward',x:-15,z:113},
 exit:{id:'exit',name:'Return to Red Square',x:84,z:87}
};
export const SPAWN={x:39,z:83};
export function normalize(p){p.inventory??=[];p.reputation??=0;p.memories??={};p.hasRoom??=false;p.interior??=false;p.gardenHelp??=false;return p;}
export function validPosition(x,z,interior=false){
 if(!Number.isFinite(x)||!Number.isFinite(z))return false;
 if(interior)return x>=75.5&&x<=92.5&&z>=72&&z<=88.5&&!(x>87&&z<78)&&!(x>75.9&&x<78.5&&z>74.2&&z<76.9);
 if(x < -42||x > 62||z < -115||z > 222)return false;
 if(x < -8&&z > -5&&z < 37)return false;
 if(Math.hypot(x-36,z-188)<7.2)return false;
 if(Math.abs(x-56)<3&&Math.abs(z-78)<2.4)return false;
 return true;
}
export function accrue(p,now=Date.now()){
 if(!p.ownsKiosk)return;const ticks=Math.min(480,Math.floor((now-p.lastIncome)/60000));
 if(ticks>0){p.money+=ticks*12;p.lastIncome=now-(now-p.lastIncome)%60000;}
}
export function interact(p,id,now=Date.now()){
 normalize(p);const place=PLACES[id];if(!place||Math.hypot(p.x-place.x,p.z-place.z)>7)return{ok:false,message:'Move closer to interact.'};
 accrue(p,now);const before=p.memories[id]||0;p.memories[id]=before+1;const hello=before?`Good to see you again, ${p.name||'explorer'}. `:'';
 if(id==='guide'){
  if(p.quest===0){p.quest=1;return{ok:true,message:'Mila: Need a bed tonight? Deliver my parcel to Lev for ₽80. Collect it beside GUM. Bring it yourself, or ask Niko to handle the last stretch for a ₽20 fee.'};}
  return{ok:true,message:'Mila: '+hello+(p.quest<3?'Follow the gold marker. Lev is expecting you.':'Irina has a room for ₽20. The book stall costs ₽50 if you want to settle in.')};
 }
 if(id==='parcel'){
  if(p.quest!==1)return{ok:false,message:p.quest<1?'Talk to Mila before collecting this parcel.':'You already collected your parcel.'};
  p.quest=2;p.inventory.push('Sealed book parcel');return{ok:true,message:'Parcel collected. Deliver it to Lev for ₽80, or ask Niko nearby to finish the delivery for ₽60 net.'};
 }
 if(id==='recipient'||id==='courier'){
  if(p.quest!==2)return{ok:true,message:(id==='recipient'?'Lev: ':'Niko: ')+hello+(p.quest===3?'Your delivery is remembered. Irina can help you find a bed.':'I am waiting for Mila’s parcel.')};
  p.quest=3;p.inventory=p.inventory.filter(x=>x!=='Sealed book parcel');const direct=id==='recipient';p.money+=direct?80:60;p.reputation+=direct?2:1;p.deliveryRoute=direct?'Delivered personally':'Niko delivered it';
  return{ok:true,event:'delivery',message:direct?'Lev: Thank you. +₽80 and +2 reputation. Irina has a room for the night.':'Niko: I will take it from here. +₽60 after my fee, +1 reputation. Find Irina for a room.'};
 }
 if(id==='host'){
  if(!p.hasRoom){if(p.money<20)return{ok:false,message:'Irina: A bed costs ₽20. Mila has work, and Sasha could use a hand.'};p.money-=20;p.hasRoom=true;p.inventory.push('Guesthouse key');return{ok:true,event:'room',message:'Irina: Your room is ready. −₽20. Guesthouse key added to inventory. Talk to me again to enter.'};}
  p.interior=true;p.x=84;p.z=84;return{ok:true,teleport:true,message:'Irina: '+hello+'Welcome home. Your key and room are saved. Use the marked door to return to the square.'};
 }
 if(id==='exit'){p.interior=false;p.x=58;p.z=64;return{ok:true,teleport:true,message:'Back in Red Square. Your room is waiting whenever you need it.'};}
 if(id==='gardener'){
  if(p.gardenHelp)return{ok:true,message:'Sasha: '+hello+'I remember you helping with the flowers. Thank you.'};
  p.gardenHelp=true;p.money+=10;p.reputation++;return{ok:true,event:'garden',message:'Sasha: Thank you for watering the flowers. +₽10, +1 reputation. The planter is blooming for everyone in the square.'};
 }
 if(id==='guard')return{ok:true,message:'Alexei: '+hello+(p.reputation>0?'People are saying good things about you. Keep helping the neighborhood.':'Welcome. Mila works nearby. Irina’s guesthouse is beside GUM. Start by getting to know people.')};
 if(id==='kiosk'){
  if(p.ownsKiosk)return{ok:true,message:'Your book stall earns ₽12 per real minute, including while you are away (up to 8 hours).'};
  if(p.money<50)return{ok:false,message:'This stall costs ₽50. Complete the delivery to earn enough.'};
  p.money-=50;p.ownsKiosk=true;p.lastIncome=now;return{ok:true,event:'property',message:'The book stall is yours. It now earns ₽12 per real minute. Your progress is saved.'};
 }
}
export function publicPlayer(p){return{id:p.id,name:p.name,x:p.x,z:p.z,yaw:p.yaw||0,interior:!!p.interior};}
export function privatePlayer(p){normalize(p);return{...publicPlayer(p),money:p.money,quest:p.quest,ownsKiosk:p.ownsKiosk,inventory:p.inventory,reputation:p.reputation,hasRoom:p.hasRoom,memories:p.memories,gardenHelp:p.gardenHelp};}
