// The complete floor is generated up front. Rooms retain their own state.
const weaponNames=['Fist','Lance','Fan','Disc'];
const exitNames=['Tiny palace','Portal','Giant mirror','Hole','Giant mouth','Hollow tree','Skull stairs','Buried elevator','Whirlpool','Folded doorway'];
let world,level=1,chamber=0,health=8,hurt=0,power=null,weapon=0,shots=[],worldTime=0,travel=0,destination=-1;
const directions=[[1,0],[-1,0],[0,1],[0,-1]];
function randomFor(value){let s=0;for(const c of String(value))s=Math.imul(s^c.charCodeAt(0),16777619);return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};}
function makeLevel(value,depth){
 const rnd=randomFor(value+':'+depth),pick=n=>Math.floor(rnd()*n);
 const result={hue:pick(360),shape:pick(3),rule:pick(2),exit:pick(exitNames.length),rooms:[],boss:0},nodes=[[0,0]];
 while(nodes.length<6){const p=nodes[pick(nodes.length)],d=directions[pick(4)],n=[p[0]+d[0],p[1]+d[1]];if(!nodes.some(p=>p[0]===n[0]&&p[1]===n[1]))nodes.push(n);}
 const links=nodes.map(p=>directions.map(d=>nodes.findIndex(n=>n[0]===p[0]+d[0]&&n[1]===p[1]+d[1]))),seen=new Set([0]),queue=[0];
 for(let j=0;j<queue.length;j++)for(const n of links[queue[j]])if(n>=0&&!seen.has(n)){seen.add(n);queue.push(n);result.boss=n;}
 const side=links[result.boss].findIndex(n=>n<0),p=nodes[result.boss],d=directions[side];nodes.push([p[0]+d[0],p[1]+d[1]]);links[result.boss][side]=6;links.push([-1,-1,-1,-1]);links[6][side^1]=result.boss;result.nodes=nodes;
 for(let i=0;i<nodes.length;i++){
  const r=generate(value+':'+depth+':'+i,result.shape),spots=[];
  if(i===6){for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++)r.cells[y*W+x]=+(Math.abs((x-15)/11)**([8,2,8,2,2,1,3,8,2,1][result.exit])+Math.abs((y-10)/8)**([8,2,8,2,2,1,3,8,2,1][result.exit])<1);r.features.fill(0);}
  r.doors=[];
  links[i].forEach((to,dir)=>{if(to<0)return;const [dx,dy]=directions[dir],x=15+dx*15,y=10+dy*10;r.doors.push({to,dir,x:x+.5,y:y+.5});
   for(let k=0;k<=Math.max(Math.abs(x-15),Math.abs(y-10));k++)for(let w=-1;w<=1;w++){const n=(10+dy*k+dx*w)*W+15+dx*k+dy*w;r.cells[n]=1;r.features[n]=0;}
  });
  for(let n=0;n<r.cells.length;n++)if([-W-1,-W,-W+1,-1,0,1,W-1,W,W+1].every(d=>r.cells[n+d])&&Math.hypot(n%W-15,Math.floor(n/W)-10)>5&&r.doors.every(d=>Math.hypot(n%W+.5-d.x,Math.floor(n/W)+.5-d.y)>3))spots.push(n);
  const spot=()=>{const n=spots.splice(pick(spots.length),1)[0];return{x:n%W+.5,y:Math.floor(n/W)+.5};};
  r.gate=i===6?{x:15.5,y:7.5}:spot();r.enemies=[];r.hazards=[];
  for(let j=0;j<(i===6?0:i===result.boss?1:Math.min(7,2+depth+i));j++){
   const boss=i===result.boss,e={...spot(),boss,kind:pick(2),pattern:pick(3),form:pick(assets.enemyCount),phase:0,wait:1+rnd(),angle:0,flash:0};
   e.hp=e.max=boss?18+depth*4:2+Math.min(4,depth);r.enemies.push(e);
  }
  for(let j=0;j<(i===6?0:4);j++)r.hazards.push({...spot(),offset:pick(4)});
  r.loot=i===6?[]:[{x:16.5,y:11.5,kind:1,value:makePower(rnd)},{x:14.5,y:11.5,kind:3,value:1+pick(3)}];
  result.rooms.push(r);
 }
 return result;
}
function makePower(rnd){return{stat:Math.floor(rnd()*3),value:(rnd()<.5?-1:1)*(1+Math.floor(rnd()*2))};}
function powerText(p){return p?['Damage','Speed','Reach'][p.stat]+' '+(p.value>0?'+':'')+p.value:'None';}
function boost(stat){return power&&power.stat===stat?power.value:0;}
function movementFactor(){return Math.max(.4,1+boost(1)*.15)*(world?.rule===1&&room.hazards.some(h=>Math.hypot(h.x-player.x,h.y-player.y)<.8)?.55:1);}
function worldAttack(){
 const a=actionStates.attack.direction,damage=Math.max(1,2+boost(0)),reach=2+boost(2)*.3;
 if(!weapon){
  for(const e of room.enemies)if(e.hp>0&&Math.hypot(e.x-player.x,e.y-player.y)<reach+(e.boss?.5:0)&&Math.cos(Math.atan2(e.y-player.y,e.x-player.x)-a)>.2&&clearShot(player,e))hitEnemy(e,damage);
 }else{
  const count=weapon===2?3:1;
  for(let i=0;i<count;i++)fire(player,a+(i-(count-1)/2)*.22,14,damage,weapon===3?1.2:.7+reach*.1,true,weapon===3);
 }
 tone(95+weapon*45,.045,'square',.015);
}
function clearShot(a,b){const d=Math.hypot(b.x-a.x,b.y-a.y);for(let t=.2;t<d;t+=.2)if(!canFit(room.solid,a.x+(b.x-a.x)*t/d,a.y+(b.y-a.y)*t/d))return false;return true;}
function fire(p,a,speed,damage,life,friendly=false,disc=false){if(shots.length<96)shots.push({x:p.x,y:p.y,dx:Math.cos(a)*speed,dy:Math.sin(a)*speed,damage,life,age:0,friendly,disc,hit:new Set()});}
function hitEnemy(e,damage){
 e.hp-=damage;e.flash=.12;tone(e.boss?80:180,.045,'triangle',.025);
 if(e.hp<=0){const rnd=randomFor(e.form+':'+level);objects.push({x:e.x,y:e.y,kind:1,value:makePower(rnd)});}
}
function hurtPlayer(){if(hurt<=0&&health>0){health--;hurt=.8;tone(55,.15,'sawtooth',.025);if(!health){keys.clear();releaseActions();}}}
function worldInteract(){
 if(!health){level=1;reset();return true;}
 if(chamber===6&&world.rooms[world.boss].enemies.every(e=>e.hp<=0)&&Math.hypot(player.x-room.gate.x,player.y-room.gate.y)<1.8){destination=-1;travel=.35;releaseActions();return true;}
 return false;
}
function takeLoot(o){if(o.kind===3)weapon=o.value;else power=o.value||makePower(randomFor(room.detail+':'+collected));tone(550,.08,'triangle',.03);}
function tickWorld(dt){
 if(dt<=0)return;
 worldTime+=dt;hurt=Math.max(0,hurt-dt);
 if(travel<=0&&health&&room.enemies.every(e=>e.hp<=0)){const d=room.doors.find(d=>{const [x,y]=directions[d.dir],a=player.x-d.x,b=player.y-d.y;return a*x+b*y>-.2&&Math.abs(a*y+b*x)<.8;});if(d){destination=d.to;travel=.35;releaseActions();}}
 if(travel>0){travel-=dt;if(travel<=0){const from=chamber;if(destination<0){level++;world=makeLevel(seed,level);chamber=0;health=Math.min(8,health+2);enterRoom();}else{chamber=destination;enterRoom(from);}}return;}
 if(!health)dt=0;
 // One distance field lets all creatures navigate the same generated geometry.
 const dist=new Int16Array(W*H).fill(999),start=Math.floor(player.y)*W+Math.floor(player.x),queue=[start];dist[start]=0;
 for(let i=0;i<queue.length;i++)for(const d of [-1,1,-W,W]){const n=queue[i]+d;if(room.solid[n]&&dist[n]===999&&Math.abs(n%W-queue[i]%W)<2){dist[n]=dist[queue[i]]+1;queue.push(n);}}
 for(const e of room.enemies)if(e.hp>0){
  e.flash=Math.max(0,e.flash-dt);e.wait-=dt;
  const d=Math.hypot(e.x-player.x,e.y-player.y),a=Math.atan2(player.y-e.y,player.x-e.x);
  if(e.phase===0){
   if(e.kind!==1||d>6||!clearShot(e,player)){
    const n=Math.floor(e.y)*W+Math.floor(e.x),next=[n-1,n+1,n-W,n+W].filter(k=>dist[k]<dist[n]).sort((a,b)=>dist[a]-dist[b])[0];
    if(next!==undefined)movePlayer(room.solid,e,next%W+.5-e.x,Math.floor(next/W)+.5-e.y,dt*(e.boss?.18:.25));
   }
   if(e.wait<=0&&d<11){e.phase=1;e.wait=e.boss?.7:.55;e.angle=a;}
  }else if(e.wait<=0){
   const count=e.pattern===0?1:e.pattern===1?3:e.boss?10:6;
   for(let j=0;j<count;j++)fire(e,e.angle+(e.pattern===2?j/count*Math.PI*2:(j-(count-1)/2)*.24),e.boss?4:3.5,1,3);
   e.phase=0;e.wait=e.boss?1.1:1.7;
  }
  if(d<(e.boss?.9:.55))hurtPlayer();
 }
 for(const h of room.hazards){const pulse=(worldTime+h.offset)%4;
  if(world.rule!==1&&pulse>3&&Math.hypot(h.x-player.x,h.y-player.y)<.65)hurtPlayer();
 }
 for(const s of shots){
  s.age+=dt;s.life-=dt;
  if(s.disc&&s.age>.4){const a=Math.atan2(player.y-s.y,player.x-s.x);s.dx=Math.cos(a)*14;s.dy=Math.sin(a)*14;}
  const steps=Math.max(1,Math.ceil(Math.hypot(s.dx,s.dy)*dt/.2));
  for(let i=0;i<steps&&s.life>0;i++){
   s.x+=s.dx*dt/steps;s.y+=s.dy*dt/steps;
   if(!canFit(room.solid,s.x,s.y)){s.life=0;break;}
   if(s.friendly){for(const e of room.enemies)if(e.hp>0&&!s.hit.has(e)&&Math.hypot(e.x-s.x,e.y-s.y)<(e.boss?.85:.5)){s.hit.add(e);hitEnemy(e,s.damage);if(!s.disc)s.life=0;}}
   else if(Math.hypot(s.x-player.x,s.y-player.y)<.4){hurtPlayer();s.life=0;}
  }
 }
 shots=shots.filter(s=>s.life>0);musicTick(dt);
}
function worldColor(light=65,offset=0){return 'hsl('+((world.hue+offset)%360)+' 45% '+light+'%)';}
function drawWorld(){
 for(const h of room.hazards){const pulse=(worldTime+h.offset)%4;ctx.strokeStyle=world.rule===1?worldColor(35):pulse>3?'#ff6d59':'#c79c55';ctx.lineWidth=pulse>3?2:1;ctx.strokeRect(h.x*12-5,h.y*12-5,10,10);if(pulse>3&&world.rule!==1){ctx.fillStyle='#ff6d59';ctx.fillRect(h.x*12-2,h.y*12-2,4,4);}}
 for(const e of room.enemies)if(e.hp>0){
  const scale=e.boss?3:1,cx=Math.round(e.x*12),cy=Math.round(e.y*12);
  ctx.globalAlpha=e.flash?.35:1;ctx.drawImage(atlas,(assets.enemies+e.form)*12,0,12,12,cx-6*scale,cy-6*scale,12*scale,12*scale);ctx.globalAlpha=1;
  if(e.phase){ctx.strokeStyle='#ffd785';ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(e.angle)*20,cy+Math.sin(e.angle)*20);ctx.stroke();}
  if(e.boss){ctx.fillStyle='#191b16';ctx.fillRect(cx-18,cy-16,36,2);ctx.fillStyle=worldColor();ctx.fillRect(cx-18,cy-16,36*e.hp/e.max,2);}
 }
 for(const s of shots){ctx.fillStyle=s.friendly?'#e9efc5':'#ff896a';ctx.fillRect(Math.round(s.x*12)-1,Math.round(s.y*12)-1,s.disc?4:3,s.disc?4:3);}
 drawGate();
 world.nodes.forEach(([x,y],i)=>{ctx.fillStyle=i===chamber?'#fff':i===world.boss?'#e29a63':i===6?worldColor(80,180):world.rooms[i].visited?'#a0a88a':'#454b3d';ctx.fillRect(34+x*6,34+y*6,5,5);});
 let near=objects.find(o=>(o.kind===1||o.kind===3)&&Math.hypot(o.x-player.x,o.y-player.y)<1.6);
 const ready=room.enemies.every(e=>e.hp<=0),atGate=Math.hypot(player.x-room.gate.x,player.y-room.gate.y)<1.8;
 $('run-status').textContent=!health?'Fallen · Interact to restart':('HP '+health+'/8 · Level '+level+' · Room '+(chamber+1)+'/7 · '+weaponNames[weapon]+' · '+powerText(power)+' · '+['Pulse traps','Tar'][world.rule]);
 $('pickup-status').textContent=ready&&atGate&&chamber===6?'Interact: '+exitNames[world.exit]:near?(near.kind===3?'Take '+weaponNames[near.value]:'Replace '+powerText(power)+' → '+powerText(near.value||null)):(ready?'Doors open':'Enemies '+room.enemies.filter(e=>e.hp>0).length);
 if(travel>0){ctx.fillStyle=worldColor(80);ctx.globalAlpha=travel/.35;ctx.fillRect(0,0,W*12,H*12);ctx.globalAlpha=1;}
}
// Pixel-built landmarks: silhouette first, animated opening second.
function drawGate(){
 const g=room.gate,x=Math.round(g.x*12),y=Math.round(g.y*12),kind=world.exit,open=room.enemies.every(e=>e.hp<=0);
 for(const d of room.doors){ctx.save();ctx.translate(d.x*12,d.y*12);ctx.rotate([Math.PI/2,-Math.PI/2,Math.PI,0][d.dir]);ctx.fillStyle=worldColor(55,30);ctx.fillRect(-15,-8,30,22);ctx.fillStyle='#080a08';ctx.fillRect(-10,-8,20,18);ctx.fillStyle=d.to===world.boss?'#e29a63':d.to===6?worldColor(80,180):worldColor(80);if(open)ctx.fillRect(-10,8,20,2);else for(let j=-8;j<=8;j+=8)ctx.fillRect(j,-8,2,18);ctx.restore();}
 if(chamber!==6||!open)return;
 ctx.fillStyle=worldColor(70,180);
 const rect=(a,b,w,h)=>ctx.fillRect(x+a*2,y+b*2,w*2,h*2);
 if([0,6,7,9].includes(kind)){rect(-10,-13,20,24);if(kind===0){rect(-14,-17,6,28);rect(8,-17,6,28);rect(-5,-20,10,7);}if(kind===6){rect(-13,-9,26,13);ctx.fillStyle='#101310';rect(-8,-6,5,4);rect(3,-6,5,4);}}
 else if(kind===5){rect(-8,-17,16,28);rect(-14,-21,28,9);rect(-18,-16,36,6);}
 else{for(let j=-12;j<=12;j+=2){const w=Math.round(Math.sqrt(144-j*j));rect(-w,j*.8,w*2,2);}}
 ctx.fillStyle='#111925';rect(-6,-7,12,16);
 if(kind===4){ctx.fillStyle='#efedcf';for(let j=-6;j<7;j+=4){rect(j,-8,2,4);rect(j,6,2,4);}}
 if([0,3,6,7].includes(kind)){ctx.fillStyle=worldColor(85);for(let j=0;j<4;j++)rect(-5+j,1+j*2,10-j*2,1);}
 if(kind===2){ctx.fillStyle='#aee5e7';rect(-5,-6,10,14);ctx.fillStyle='#efffff';rect(-3,-4,2,8);}
 if([1,8,9].includes(kind)){ctx.fillStyle=worldColor(85);for(let j=0;j<8;j++){const a=worldTime*2+j*.8,r=2+j*.6;rect(Math.round(Math.cos(a)*r),Math.round(Math.sin(a)*r),2,2);}}
}
let audio,muted=true,beatClock=0,beat=0,note=0;
function tone(hz,duration,type='square',volume=.02){if(!audio||muted)return;const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=hz;g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);o.onended=()=>{o.disconnect();g.disconnect();};}
function musicTick(dt){
 if(!audio||muted)return;beatClock-=dt;if(beatClock>0)return;beatClock=.15+world.shape*.035;
 const rnd=randomFor(seed+':music:'+level+':'+beat),scale=[0,2,3,5,7,10];
 note=beat%16===0?0:Math.max(0,Math.min(11,note+(rnd()<.5?-1:1)));
 if(beat%4===0)tone(65.4*2**(world.hue%12/12),.16,'triangle',.035);
 if(rnd()>.2)tone(130.8*2**((world.hue%12+scale[note%6]+12*Math.floor(note/6))/12),.11,world.shape===1?'triangle':'square',.015);
 beat++;
}
