// Generate only the current floor, using one seeded stream; visits retain room state.
let world,level=1,chamber=0,score=0,health=2,hurt=0,hitFlash=0,weapon=0,shots=[],worldTime=0,travel=0,destination=-1,radiation=0,iceX=0,iceY=0,bleedClock=0,uranium=false,reveal=0,starterMoon=0,revealAt={x:0,y:0};
// A safe, fixed prologue. The dungeon is generated only when its doorway is crossed.
function makeEntrance(){
 // One open superellipse chamber around the ring; the player starts at its left edge.
 const cells=new Uint8Array(W*H);fillShape(cells,14,9,4);
 return{hue:215,shape:0,song:Math.random()*2**31|0,rooms:[{cells,floorTile:0,wall:FLOOR_COUNT,spawn:313,doors:[],enemies:[],loot:[],gate:{x:15.5,y:10.5}}]};
}
function makeLevel(value,depth){
 rng=randomFor(value+':'+depth);
 const song=rng()*2**31|0,theme=song%3,result={hue:song%360,shape:theme,rooms:[],boss:5,reward:song/2**31,song},links=Array.from({length:6},()=>[]);
 for(let i=1,parent=0;i<6;){
  parent+=pick(i-parent);const dir=pick(4),offset=3+pick(dir<2?H-6:W-6);
  if(links[parent].some(d=>d.dir===dir))continue;
  for(let k=0;k<2;k++){const [dx,dy]=directions[dir^k];links[k?i:parent].push({to:k?parent:i,dir:dir^k,x:(dx?15+dx*15:offset)+.5,y:(dy?10+dy*10:offset)+.5});}
  i++;
 }
 for(let i=0;i<6;i++){
  const doors=links[i];
  const {cells,spawn,safe}=generate(rng,doors),r={cells,spawn,doors},spots=[],available=new Set(),prop=PROP_START+pick(PROP_COUNT);
  r.floorTile=pick(FLOOR_COUNT);r.wall=FLOOR_COUNT+pick(WALL_COUNT);r.hazard=[0,NEEDLE,WEB,ICE,FIRE][pick(5)];
  if(i===result.boss)fillShape(cells,11,8);
  const pool=enemyPools?enemyPools[theme]:enemyRules.slice(0,ENEMY_COUNT).map((_,k)=>k),boss=i===result.boss,roll=pick(20),group=boss?-1:enemyRules.findIndex((r,k)=>(SEQUENCED_ENEMIES?r[E_MODE][0]:r[E_MODE])===(roll?6:3)&&pool.includes(k)),grouped=roll<5&&group>=0,first=enemyRules[grouped?group:0],mode=boss?-1:grouped?(SEQUENCED_ENEMIES?first[E_MODE][0]:first[E_MODE]):0;
  const count=boss?BOSS_COUNT:grouped?first[E_COUNT]+pick(first[E_COUNT_STEP]+1):Math.min(4,1+depth+(i>>1));
  if(mode===6&&count){
   const [dx,dy]=sample(directions),step=dy?1:W,start=325+dx*8+dy*5*W-step*(count>>1);
   tunnel(cells,start%W,start/W|0,safe);
   for(let j=0;j<count;j++){const n=start+step*j;cells[n]=1;safe[n]=1;spots.push(n);}
  }
  for(const d of doors){const [dx,dy]=directions[d.dir],x=d.x|0,y=d.y|0;for(let k=0;k<3;k++)for(let w=-1;w<=1;w++)cells[(y-dy*k+dx*w)*W+x-dx*k+dy*w]=+(k===2||w===0);}
  // Decorate and collect one safe-floor pool for both enemy placement and hazards.
  for(let n=0;n<W*H;n++)if(cells[n]===1&&Math.hypot(n%W-15,(n/W|0)-10)>(i===result.boss?7:4)&&doors.every(d=>geomDistance(tilePoint(n),d)>3)){
   if(safe[n]){if(mode!==6)spots.push(n);}else if(rng()<.15)cells[n]=1|((prop+1)<<1);else available.add(n);
  }
  const fallback=spots[0],spot=()=>tilePoint(spots.splice(mode===6?0:pick(spots.length),1)[0]??fallback);
  r.gate=tilePoint(i===result.boss?108:325);r.enemies=[];
  // A room is all swarm, one conga line, or a random mix of every other creature.
  const solo=pool.filter(k=>![3,6].includes(SEQUENCED_ENEMIES?enemyRules[k][E_MODE][0]:enemyRules[k][E_MODE]));let swarmForm;for(let j=0;j<count;j++){
   let kind=boss?0:grouped?group:sample(solo.length?solo:pool);
   const rule=enemyRules[kind+(boss?ENEMY_COUNT:0)],m=SEQUENCED_ENEMIES?rule[E_MODE][0]:rule[E_MODE],e={...spot(),boss,kind,pattern:pick(3),form:rule[E_ART]+theme*rule[E_THEME]+pick(rule[E_FRAMES]),phase:0,wait:m===9||!rule[E_WIND]?0:1+rng(),angle:0,cycle:0};
   if(boss){e.x=15.5;e.y=6.5+pick(3);}
   e.hp=boss?(6+depth)*40/3:1;e.slot=j;if(mode===6)e.follow=r.enemies[j-1];if(m===3)e.form=swarmForm=swarmForm??e.form;r.enemies.push(e);
  }
  if(!boss){if(r.hazard)growHazards(r,available);
   for(let k=pick(4);k--&&available.size;){const n=sample([...available]),tag=[SPIKE,TRAP,RADIATION][pick(3)];available.delete(n);
    if(tag===RADIATION?safe.some((v,p)=>v&&geomDistance(tilePoint(p),tilePoint(n))<3.5):neighbors(n).filter(k=>r.cells[k]&1).length<3)continue;
    r.cells[n]=1|(tag<<1);
   }
  }
  r.loot=[];r.reward=!boss&&ARMOR_COUNT&&rng()<.25?pick(ARMOR_COUNT):-1;
  result.rooms[i]=r;
 }
 return result;
}
function growHazards(r,available){
 for(let patches=0;patches<2&&available.size;){
  const grown=patch(available,24);
  if(grown.length<12)continue;
  patches++;for(const n of grown)r.cells[n]=1|(r.hazard<<1);
 }
}
function enemyRule(e){return enemyRules[e.kind+(BOSS_COUNT&&e.boss?ENEMY_COUNT:0)];}
function hazardAt(p){return room.cells[(p.y|0)*W+(p.x|0)]>>1;}
function movementFactor(){return hazardAt(player)===WEB?.55:1;}
function moveHero(dx,dy,dt,speed=10,collision=true){
 dt=Math.min(dt,.05);if(dt<=0)return;
 const length=Math.hypot(dx,dy)||1,k=hazardAt(player)===ICE?Math.min(1,dt*(dx||dy?.8:.35)):1;
 iceX+=(dx/length-iceX)*k;iceY+=(dy/length-iceY)*k;
 speed*=movementFactor();
 if(collision)movePlayer(room.cells,player,iceX,iceY,dt,speed*Math.hypot(iceX,iceY));
 else{player.x=Math.max(.5,Math.min(W-.5,player.x+iceX*dt*speed));player.y=Math.max(.5,Math.min(H-.5,player.y+iceY*dt*speed));}
}
function exposure(value,active,dt,e){
 if(!active||!health)return 0;
 value=Math.min(3,(value||0)+dt);
 if(value>=3&&(e||hurt<=0)){if(e)hitEnemy(e,e.hp);else hurtPlayer();return 0;}
 return value;
}
function tickHazards(dt){
 const sources=objects.filter(o=>o.kind===5);if(uranium)sources.push(player);
 for(const e of room.enemies)if(e.hp>0){e.exposure=exposure(e.exposure,sources.some(p=>geomDistance(e,p)<3),dt,e);}
 extinguish();
 const n=(player.y|0)*W+(player.x|0),tag=room.cells[n]>>1;
 if(tag===TRAP){room.cells[n]=1|(CLOSED<<1);tone(180,.06,'square',.04);hurtPlayer();}
 if(tag===SPIKE||tag===FIRE||tag===NEEDLE&&worldTime%4>3)hurtPlayer();
 const exposed=sources.some(p=>geomDistance(player,p)<3);
 radiation=exposure(radiation,exposed,dt);
}
function worldAttack(){
 const w=weaponRules[weapon],a=actionStates.attack.direction,damage=2*w[W_DAMAGE],reach=2*w[W_REACH];
 const type=w[W_TYPE];
 if(type===0&&!w[W_COUNT]||type===5){const b=strike(type,a,damage,reach*.8,type===0?.08:0);hitBlow(b);if(type===5){strike(5,a,damage,reach*.8,.075);tone(130,.045,'square',.02,.075);}}
 else if(type>2&&type<8){const b=strike(type,a,damage,type===4?1.5:type===6?1.18:type===7?2.5:1.65,type===7?.3:0);if(type===6)dash=b;}
 else if(type===8){strike(8,a,0,0);cast(player,a,[0,1,4][Math.random()*3|0],true);}
 else if(!w[W_COUNT])melee(a,reach,damage);
 else volley(player,a,w[W_COUNT],w[W_SPEED],damage,w[W_LIFE]+reach*w[W_REACH_LIFE],true,w[W_FLAGS],w[W_SPREAD],w[W_CURVE]);
 tone(w[W_PITCH],.045);
}
// A shared fan/ring primitive. Every shot snapshots its own motion traits.
function volley(p,a,count,speed,damage,life,friendly=false,flags=0,spread=.23,curve=0,gap=-1){
 for(let j=0;j<count;j++)if(j!==gap){
  const s=fire(p,a+(flags&4?j/count*Math.PI*2:(j-(count-1)/2)*spread),speed,damage,life,friendly,!!(flags&2));
  if(CURVED_SHOTS&&s&&curve)s.curve=(s.dx*Math.sin(a)-s.dy*Math.cos(a))*curve;
 }
}
function clearShot(a,b){const d=geomDistance(b,a);for(let t=.2;t<d;t+=.2)if(!canFit(room.cells,a.x+(b.x-a.x)*t/d,a.y+(b.y-a.y)*t/d))return false;return true;}
function fire(p,a,speed,damage,life,friendly=false,disc=false){if(shots.length>=96)return;const s={x:p.x,y:p.y-(friendly?.12:0),dx:Math.cos(a)*speed,dy:Math.sin(a)*speed,damage:friendly?damage:0,life,age:0,art:friendly&&disc?weaponArt:-1,hit:[],traits:(disc?2:0)|(PIERCING_SHOTS&&friendly?weaponRules[weapon][W_FLAGS]&1:0)};shots.push(s);return s;}
function bossWeapon(e){const pool=bossDrops[e.kind];return pool[Math.floor(world.reward*pool.length)];}
function hitEnemy(e,damage){
 if(e.hp<=0)return;
e.hp=Math.max(0,e.hp-damage);if(e.hp){e.flash=.12;tone(80,.045,'triangle',.025);return;}tone(BOSS_COUNT&&e.boss?110:75,BOSS_COUNT&&e.boss?.5:.12,'triangle',.04);
 if(health)score+=BOSS_COUNT&&e.boss?100:10;
 objects.push({x:e.x,y:e.y,kind:1,value:Math.random()*5|0});
 if(BOSS_COUNT&&e.boss)objects.push({x:e.x,y:e.y,kind:3,value:bossWeapon(e)});
}
function hurtPlayer(){if(hurt<=0&&health>0){
 health--;hurt=.8;hitFlash=.18;tone(220,.04,'square',.05);tone(70,.16,'sawtooth',.04,.025);
 if(!health){clearKeys();resetActions();fields=[];blows=[];dash=null;gaze=radiation=iceX=iceY=0;tone(45,.35,'triangle',.04,.08);}
}}
function worldInteract(){
 if(!health){reset(true);return true;}
 if((!level||BOSS_COUNT&&chamber===world.boss&&room.enemies.every(e=>e.hp<=0))&&geomDistance(player,room.gate)<1.8){if(!level){player.x=room.gate.x;player.y=room.gate.y;}destination=-1;travel=.35;releaseActions();return true;}
 if(uranium){let p={x:player.x+Math.cos(facing)*.7,y:player.y+Math.sin(facing)*.7};if(!canFit(room.cells,p.x,p.y)||!clearShot(player,p))p={x:player.x,y:player.y};objects.push({...p,kind:5,value:0});uranium=false;tone(170,.06,'triangle',.02);return true;}
 let target,distance=1.6;for(const o of objects)if(o.kind>=3){const d=geomDistance(player,o);if(d<distance&&clearShot(player,o)){target=o;distance=d;}}
 if(target){if(target.kind===5){uranium=true;tone(420,.06,'triangle',.02);}else{if(!attackLocked())facing=geomBearing(target,player);takeLoot(target);if(DEV)collected++;}target.kind=2;return true;}
 return false;
}
function takeLoot(o){if(o.kind===4){health++;maxHealth++;}else{weapon=o.value;weaponArt=weaponRules[weapon][W_SPRITE];if(DEV)$('weapon-test').value=weapon;}tone(550,.08,'triangle',.03);}
function tickWorld(dt){
 if(dt<=0)return;
 if(reveal>0){reveal=Math.max(0,reveal-dt);return;}
 routes.clear();extinguish();worldTime+=dt;hitFlash=Math.max(0,hitFlash-dt);hurt=Math.max(0,hurt-dt);
 if(travel<=0&&health&&room.enemies.every(e=>e.hp<=0)){const d=room.doors.find(d=>{const [x,y]=directions[d.dir],a=player.x-d.x,b=player.y-d.y;return a*x+b*y>-.2&&Math.abs(a*y+b*x)<.8;});if(d){destination=d.to;travel=.35;releaseActions();tone(100,.12,'triangle',.03);}}
 if(travel>0){travel-=dt;if(travel<=0){const from=chamber;if(destination<0){level++;world=makeLevel(seed,level);chamber=0;enterRoom();}else{chamber=destination;enterRoom(from);}}return;}
 if(!health)return;
 if(health===1){bleedClock-=dt;if(bleedClock<=0){bleedClock=.4+Math.random()*.4;room.blood.push([player.x,player.y,Math.random()*10|0,Math.random()*Math.PI*2]);if(room.blood.length>192)room.blood.shift();}}else bleedClock=0;
 // Standing on the ring's centre descends without pressing interact.
 if(!level&&geomDistance(player,room.gate)<.3)worldInteract();
 tickHazards(dt);if(!health)return;
 let looking=false;
 // Identity determines the attack grammar; seeds vary cadence and density within it.
 for(const e of room.enemies)if(e.hp>0){
  e.flash=Math.max(0,(e.flash||0)-dt);e.wait-=dt;
  const d=geomDistance(e,player),a=geomBearing(player,e),rule=enemyRule(e),rawMode=SEQUENCED_ENEMIES?rule[E_MODE][(e.cycle-(e.phase>1))%rule[E_MODE].length]:rule[E_MODE];
  if(rawMode>=3){
   const mode=rawMode,speed=rule[E_MOVE]*5;
   if(mode===3||mode===6){
    let target=player,active=true;
    if(mode===6){
     let lead=e.follow;while(lead&&lead.hp<=0)lead=lead.follow;
     const lag=(e.slot||0)*.18;active=worldTime>=lag&&(worldTime-lag)%4<3;
     if(lead){target=lead;active=active&&geomDistance(e,lead)>.95;
     }
    }
    if(active&&target){seek(e,target,dt,speed);let x=0,y=0;
     for(const other of room.enemies)if(other!==e&&other.hp>0){const dx=e.x-other.x,dy=e.y-other.y,r=Math.hypot(dx,dy);if(r>0&&r<.65){x+=dx/r*(.65-r);y+=dy/r*(.65-r);}}
     movePlayer(room.cells,e,x,y,dt,Math.min(speed*.6,Math.hypot(x,y)*4));
    }
   }
   if(mode===5||mode===8){
    if(mode===5&&e.phase){if(e.wait<=dt){e.hp=0;tone(55,.2,'sawtooth',.035);}}
    else if((mode===5||e.wait<=0)&&clearShot(e,player)&&(mode===8||d<1)){
     const field=cast(e,a,mode===5?5:e.pattern*e.pattern);
     if(field){e.phase=mode===5?1:0;e.wait=mode===5?field.burn:3.5;}
    }else if(mode===5||d>8||!clearShot(e,player))seek(e,player,dt,speed);
   }
   // Medusa swings its gaze cone after the player and closes in to keep them inside it.
   if(mode===9){const turn=Math.atan2(Math.sin(a-e.angle),Math.cos(a-e.angle));e.angle+=Math.max(-dt*2.5,Math.min(dt*2.5,turn));if(d>4||!clearShot(e,player))seek(e,player,dt,speed);e.look=d<7&&Math.cos(a-e.angle)>.866&&clearShot(e,player);if(e.look)looking=true;}
   if(mode!==9)e.angle=a;
  }else{
   const mode=rawMode,lunge=mode===1;
   while(e.wait<=0&&(e.phase||d<rule[E_RANGE]&&clearShot(e,player))){
    e.phase=(e.phase+1)%4;e.wait=[rule[E_COOL]+e.pattern*rule[E_COOL_STEP],rule[E_WIND],rule[E_ACTIVE],rule[E_RECOVER]][e.phase];
    if(e.phase===1){e.angle=a;tone(BOSS_COUNT&&e.boss?140:260,.05,'triangle',.006);}
    if(e.phase===2){e.cycle++;if(!lunge){const count=rule[E_COUNT]+e.pattern*rule[E_COUNT_STEP],ring=mode===2;volley(e,e.angle,count,rule[E_SPEED],1,rule[E_LIFE],false,ring?4:0,rule[E_SPREAD],0,ring?e.cycle%count:-1);}}
   }
   if(!e.phase&&(lunge||d>rule[E_STANDOFF]||!clearShot(e,player)))seek(e,player,dt,rule[E_MOVE]*5);
   if(e.phase===2&&lunge){const x=e.x,y=e.y;movePlayer(room.cells,e,Math.cos(e.angle),Math.sin(e.angle),dt,rule[E_CHARGE]);if(Math.hypot(e.x-x,e.y-y)<dt){e.phase=3;e.wait=rule[E_RECOVER];}}
  }
  if(touchEnemy(e))hurtPlayer();
 }
 gaze=exposure(gaze,looking,dt);
 extinguish();tickCombat(dt);extinguish();
 if(room.enemies.every(e=>e.hp<=0)&&room.reward>=0){objects.push({x:player.x,y:player.y,kind:4,value:room.reward});room.reward=-1;}
 for(const s of shots){
  s.age+=dt;s.life-=dt;if(CURVED_SHOTS&&s.curve){const a=Math.atan2(s.dy,s.dx)+s.curve*dt,v=Math.hypot(s.dx,s.dy);s.dx=Math.cos(a)*v;s.dy=Math.sin(a)*v;}
  if((s.traits&2)&&s.age>.4){const a=geomBearing(player,s);s.dx=Math.cos(a)*14;s.dy=Math.sin(a)*14;}
  const steps=Math.max(1,Math.ceil(Math.hypot(s.dx,s.dy)*dt/.2));
  for(let i=0;i<steps&&s.life>0;i++){
   const oldX=s.x,oldY=s.y,v=Math.hypot(s.dx,s.dy)||1,tip=s.art>=0?0:.3,radius=s.art>=0?.3:.09;
   s.x+=s.dx*dt/steps;s.y+=s.dy*dt/steps;
   if(!canFit(room.cells,s.x+s.dx/v*tip,s.y+s.dy/v*tip,radius)){s.life=0;break;}
   if(s.damage){for(const e of room.enemies)if(e.hp>0&&!s.hit.includes(e)&&capsuleHit(oldX-s.dx/v*tip,oldY-s.dy/v*tip,s.x+s.dx/v*tip,s.y+s.dy/v*tip,radius,e)){s.hit.push(e);hitEnemy(e,s.damage);if(!(s.traits&3)){s.life=0;break;}}}
   else if(capsuleHit(oldX-s.dx/v*tip,oldY-s.dy/v*tip,s.x+s.dx/v*tip,s.y+s.dy/v*tip,radius,player)){hurtPlayer();s.life=0;}
  }
 }
 shots=shots.filter(s=>s.life>0);musicTick(dt);
}
function worldColor(light=65,offset=0){return 'hsl('+(world.hue+offset)+' 45% '+light+'%)';}
function drawWorld(){
 for(const [x,y,index,angle] of room.blood||[]){transform(ctx,x*12,y*12,angle);tile(ctx,assets.blood+index,-6,-6);ctx.restore();}
 const pulse=worldTime%4;
 for(let n=0;n<W*H;n++){const tag=room.cells[n]>>1;if(tag<HAZARD_START)continue;let index=assets.pantry+tag-1;
  if(tag===NEEDLE&&!(pulse>3||pulse>2.5&&(worldTime*12|0)%2))index=assets.traps;
  if(tag===CLOSED)index=assets.traps+1;
  if(tag===FIRE)index=assets.flame+(worldTime*12|0)%3;
  tile(ctx,index,n%W*12,(n/W|0)*12);
 }
 for(const e of room.enemies)if(e.hp>0){
  const rule=enemyRule(e),size=BOSS_COUNT&&e.boss?24:12,cx=Math.round(e.x*12),cy=Math.round(e.y*12),wind=e.phase===1,bob=e.phase===0?Math.sin(worldTime*9+e.x)*1.2:0;
  ctx.fillStyle='#050a10';ctx.fillRect(cx-size/2,cy+size/2-2,size,3);
  transform(ctx,cx,cy+Math.round(bob)+(wind?1:0),0,Math.cos(e.angle)>0?-1:1);ctx.globalAlpha=e.flash?.35:1;
  if(BOSS_COUNT&&e.boss)for(let j=0;j<4;j++)tile(ctx,assets.bosses+j,-12+j%2*12,-12+(j>>1)*12);
  else tile(ctx,assets.enemies+(rule[E_ANIM]?rule[E_ART]+world.shape*rule[E_THEME]+Math.floor(worldTime*rule[E_ANIM])%rule[E_FRAMES]:e.form),-6,-6);
  ctx.restore();
  if(e.exposure){ctx.globalAlpha=.75+Math.min(3,e.exposure)/12;statusTile(assets.effects+5,cx,cy-size/2-9);ctx.globalAlpha=1;}
  // A medusa's gaze is a visible line while it is building madness.
  if((SEQUENCED_ENEMIES?rule[E_MODE][0]:rule[E_MODE])===9){ctx.fillStyle='#c394ff';ctx.globalAlpha=e.look?.3:.1;ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,84,e.angle-.52,e.angle+.52);ctx.fill();ctx.globalAlpha=1;}
 }
 for(const s of shots){const x=Math.round(s.x*12),y=Math.round(s.y*12),dir=Math.round(Math.atan2(s.dy,s.dx)*4/Math.PI),diagonal=dir&1;transform(ctx,x,y,s.art>=0?Math.round(s.age*32/Math.PI)*Math.PI/2:(dir+diagonal)*Math.PI/4);ctx.shadowColor='#080d13';ctx.shadowOffsetX=ctx.shadowOffsetY=1;tile(ctx,s.art>=0?assets.weapon+s.art:assets.mini+(diagonal?3:4),-6,-6);ctx.restore();}
 drawGate();
 if(DEV/*diagnostics*/){
 let near=objects.find(o=>o.kind>=3&&geomDistance(o,player)<1.6);
 const ready=room.enemies.every(e=>e.hp<=0),atGate=geomDistance(player,room.gate)<1.8;
 $('run-status').textContent=!health?'Fallen · Press any key to revive':('HP '+health+'/'+maxHealth+' · '+level+' / '+(chamber+1)+' · '+weaponNames[weapon]);
 $('pickup-status').textContent=uranium?'O · Drop uranium':BOSS_COUNT&&ready&&atGate&&chamber===world.boss?'Interact: Descend':near?'Take '+(near.kind===5?'Uranium':near.kind===4?'Armor':weaponNames[near.value]):(ready?'Doors open':'Enemies '+room.enemies.filter(e=>e.hp>0).length);
 }
 if(!level){
  tile(ctx,assets.sky+9,Math.round(room.gate.x*12)-6,Math.round(room.gate.y*12)-8);
  const controls=DEV?dev.controls():['W A S D','I','O'];
  // Four-pixel gaps between the gothic glyphs' ink bounds, centered at x=186.
  ctx.shadowColor='#101722';ctx.shadowOffsetX=ctx.shadowOffsetY=4;
  for(let i=0;i<9;i++)tile(ctx,assets.title+i,[92,108,124,144,164,184,208,232,256][i],30,24);
  ctx.shadowOffsetX=ctx.shadowOffsetY=0;
  writeTiles((DEV?controls[0].replaceAll(' ',''):'WASD')+' -> MOVE',6);writeTiles(DEV?'"'+controls[1]+'" -> ATTACK':'"I" -> ATTACK',16);writeTiles(DEV?'"'+controls[2]+'" -> INTERACT':'"O" -> INTERACT',17.5);
  if(DEV/*diagnostics*/){$('run-status').textContent='Room Zero';$('pickup-status').textContent=geomDistance(player,room.gate)<1.8?controls[2]+' · Descend':'Follow the stairs';}
 }
}
function drawTransition(){
 if(!reveal&&!travel)return;
 ctx.save();ctx.fillStyle='#080a10';
 if(reveal){const x=revealAt.x*12,y=revealAt.y*12,r=Math.hypot(Math.max(x,W*12-x),Math.max(y,H*12-y))*(1-(reveal/.45)**2);ctx.beginPath();ctx.rect(0,0,W*12,H*12);ctx.moveTo(x+r,y);ctx.arc(x,y,r,0,Math.PI*2);ctx.fill('evenodd');}
 else{ctx.globalAlpha=1-travel/.35;ctx.fillRect(0,0,W*12,H*12);}
 ctx.restore();
}
function drawGate(){
 const open=room.enemies.every(e=>e.hp<=0);
 for(const d of room.doors){transform(ctx,d.x*12,d.y*12,[Math.PI/2,-Math.PI/2,Math.PI,0][d.dir]);for(let j=0;j<4;j++)tile(ctx,assets.doors+open*4+j,-12+j%2*12,-6+(j>>1)*12);ctx.restore();}
}

let audio,staticGain,beatClock=0,beat=0;
function radiationAudio(active){
 if(!audio)return;
 const buildup=Math.max(radiation,gaze);
 if(!staticGain&&active&&buildup){
  const buffer=audio.createBuffer(1,4096,audio.sampleRate),data=buffer.getChannelData(0),source=audio.createBufferSource();
  for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  staticGain=audio.createGain();staticGain.gain.value=0;source.buffer=buffer;source.loop=true;source.connect(staticGain);staticGain.connect(audio.destination);source.start();
 }
 if(staticGain)staticGain.gain.setTargetAtTime(active&&health?.08*(buildup/3)**2:0,audio.currentTime,.025);
}
function startAudio(){if(!audio)audio=new AudioContext();if(audio.state!=='running')audio.resume();}
// One plain oscillator per note; music uses triangle bass, square pluck and sine lead.
function tone(hz,duration,type='square',volume=.02,delay=0){
 if(!audio)return;
 const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+delay;
 o.type=type;o.frequency.value=hz;
 g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
 o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+duration);
}
// Every floor rolls its own song from one seed: scale, key, tempo, chord walk, arpeggio stride,
// melody rhythm and notes. The bass is triangle, the arpeggio square and the melody sine.
function musicTick(dt){
 if(!audio)return;beatClock-=dt;if(beatClock>0)return;
 const s=world.song,step=beat++%8,scale=[[0,3,5,7,10],[0,2,4,7,9],[0,1,5,7,8]][s%3],root=scale[s>>(beat>>3&3)*2+2&3]+(s>>4)%12,play=(n,d,v,g)=>tone(65.4*2**((n+root)/12),d,v,g);
 beatClock+=.2+(s>>10&7)*.014;
 if(!(step%4))play(0,.7,'triangle',.045);
 play(12+scale[step*(s>>13&3|1)%5],.3,'square',.012);
 if(s>>16+step&1)play(24+scale[(s>>step+21)%5],.5,'sine',.02);
}

function collectUranium(){for(let n=0;n<W*H;n++)if((room.cells[n]>>1)===RADIATION){room.cells[n]=1;objects.push({...tilePoint(n),kind:5,value:0});}}
