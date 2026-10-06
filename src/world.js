// Generate only the current floor, using one seeded stream; visits retain room state.
const exitNames=['Tiny palace','Portal','Giant mirror','Hole','Giant mouth','Hollow tree','Skull stairs','Buried elevator','Whirlpool','Folded doorway'];
let world,level=1,chamber=0,score=0,health=2,hurt=0,hitFlash=0,weapon=0,shots=[],worldTime=0,travel=0,destination=-1;
// A safe, fixed prologue. The dungeon is generated only when its doorway is crossed.
function makeEntrance(){
 // One open superellipse chamber around the ring; the player starts at its left edge.
 const cells=new Uint8Array(W*H);fillShape(cells,14,9,4);
 return{hue:215,shape:0,motif:0,rooms:[{cells,spawn:313,doors:[],enemies:[],loot:[],gate:{x:14.5,y:10.5}}]};
}
// A 16×16 lattice centered at (8,8) packs each coordinate pair into one byte.
// The six-room walk plus exit spans at most six steps, so neither axis can wrap.
function makeLevel(value,depth){
 rng=randomFor(value+':'+depth);
 const theme=pick(3),result={hue:[215,175,265][theme]+pick(25),shape:theme,exit:pick(exitNames.length),rooms:[],boss:0,reward:rng(),motif:pick(625)},nodes=[136],steps=[1,-1,16,-16];
 while(nodes.length<6){const n=nodes[pick(nodes.length)]+steps[pick(4)];if(!nodes.includes(n))nodes.push(n);}
 const links=nodes.map(p=>steps.map(d=>nodes.indexOf(p+d))),queue=[0];
 for(let j=0;j<queue.length;j++)for(const n of links[queue[j]])if(n>=0&&!queue.includes(n)){queue.push(n);result.boss=n;}
 for(let i=0;i<nodes.length;i++){
  const r=generate(rng),spots=[];
  // The boss arena takes its landmark's outline and pillars; the landmark opens once the boss falls.
  if(i===result.boss){fillShape(r.cells,10+pick(3),6+pick(3));fillShape(r.cells,11,8,[8,2,8,2,2,1,3,8,2,1][result.exit]);for(const x of [7,23])for(const y of [5,9,13,16])if(r.cells[y*W+x]===1)r.cells[y*W+x]=1|((theme*6+[3,5][result.exit%2])<<1);}
  r.doors=[];
  links[i].forEach((to,dir)=>{if(to<0)return;
   const [dx,dy]=directions[dir],back=result.rooms[to]?.doors.find(d=>d.to===i),offset=back?(dx?back.y:back.x)-.5:3+pick(dx?H-6:W-6),x=dx?15+dx*15:offset,y=dy?10+dy*10:offset;
   r.doors.push({to,dir,x:x+.5,y:y+.5});
   tunnel(r.cells,x-dx*2,y-dy*2);
   for(let k=0;k<3;k++)for(let w=-1;w<=1;w++)r.cells[(y-dy*k+dx*w)*W+x-dx*k+dy*w]=1;
  });
  // Decorate and collect one safe-floor pool for both enemy placement and hazards.
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
   const n=y*W+x,distance=Math.hypot(x-15,y-10),edges=[-1,1,-W,W].filter(d=>r.cells[n+d]&1).length;
   if(!r.cells[n]){if(theme!==1&&edges&&rng()<.12)r.cells[n]=(theme*6+1+pick(2))<<1;}
   else if(i!==result.boss&&distance>4&&edges<4&&rng()<.14)r.cells[n]=1|((theme*6+3+2*pick(2))<<1);
   if(r.cells[n]===1&&distance>4&&r.doors.every(d=>Math.hypot(x+.5-d.x,y+.5-d.y)>3))spots.push(n);
  }
  const available=new Set(spots),spot=()=>{const n=spots.splice(pick(spots.length),1)[0]??325;return tilePoint(n);};
  r.gate=tilePoint(325);r.enemies=[];
  // A room is all swarm, one conga line, or a random mix of every other creature.
  const pool=enemyPools?enemyPools[theme]:enemyRules.slice(0,ENEMY_COUNT).map((_,k)=>k),boss=i===result.boss,roll=pick(5),group=boss?-1:enemyRules.findIndex((r,k)=>r[E_MODE]===(roll?6:3)&&pool.includes(k)),grouped=roll<2&&group>=0,first=enemyRules[grouped?group:0],mode=boss?-1:grouped?first[E_MODE]:0;
  const count=boss?1:grouped?first[E_COUNT]+pick(first[E_COUNT_STEP]+1):Math.min(4,1+depth+(i>>1));
  for(let j=0;j<count;j++){
   let kind=boss?0:grouped?group:pool[pick(pool.length)];for(let t=0;!boss&&!grouped&&t<9&&[3,6].includes(enemyRules[kind][E_MODE]);t++)kind=pool[pick(pool.length)];
   const rule=enemyRules[kind+(boss?ENEMY_COUNT:0)],m=rule[E_MODE],e={...spot(),boss,kind,pattern:pick(3),form:rule[E_ART]+theme*rule[E_THEME]+pick(rule[E_FRAMES]),phase:0,wait:m===7||m===9?0:1+rng(),angle:0,cycle:0};
   if(boss){e.x=15.5;e.y=6.5+pick(3);}
   e.hp=boss?(6+depth)*40/3:1;e.slot=j;r.enemies.push(e);
  }
  if(mode===6&&count){
   const horizontal=pick(2),x=horizontal?15-(count>>1):7+16*pick(2),y=horizontal?5+10*pick(2):10-(count>>1);
   tunnel(r.cells,x,y);
   for(const e of r.enemies){e.x=x+(horizontal?e.slot:0)+.5;e.y=y+(horizontal?0:e.slot)+.5;r.cells[(e.y|0)*W+(e.x|0)]=1;e.follow=r.enemies[e.slot-1];e.trail=[];}
  }
  if(!boss&&theme!==1)growHazards(r,theme,available);
  r.loot=[];r.reward=!boss&&ARMOR_COUNT&&rng()<.25?pick(ARMOR_COUNT):-1;
  result.rooms.push(r);
 }
 return result;
}
function tunnel(cells,x,y){while(!(cells[y*W+x]&1)){cells[y*W+x]=1;if(x!==15&&(y===10||rng()<.5))x+=Math.sign(15-x);else y+=Math.sign(10-y);}}
function growHazards(r,theme,available){
 r.offset=pick(4);
 for(let patches=0;patches<2&&available.size;){
  const grown=patch([...available][pick(available.size)],18+pick(13),n=>available.delete(n));
  if(grown.length<12)continue;
  patches++;for(const n of grown)r.cells[n]=1|((theme*6+4)<<1);
 }
}
function enemyRule(e){return enemyRules[e.kind+(e.boss?ENEMY_COUNT:0)];}
function hazardAt(p){return (room.cells[(p.y|0)*W+(p.x|0)]>>1)%6===4;}
function movementFactor(){return (world?.shape===2&&hazardAt(player)?.55:1);}
function worldAttack(){
 const w=weaponRules[weapon],a=actionStates.attack.direction,damage=2*w[W_DAMAGE],reach=2*w[W_REACH];
 const type=w[W_TYPE];
 // Weapons 3–7 share one blow record: nunchuck sweep, whirlwind, one-two, thrust and heavy hit.
 if(type>2&&type<8){const b=strike(type,a,damage,type===4?2.5:type===6?1.8:reach,type===5?.07:type===7?.3:0);if(type===6)dash=b;if(type===5){melee(a,reach,damage);tone(130,.045,'square',.02,.07);}}
 // The rune wand shows itself and casts one of the three mage shapes.
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
function clearShot(a,b){const d=Math.hypot(b.x-a.x,b.y-a.y);for(let t=.2;t<d;t+=.2)if(!canFit(room.cells,a.x+(b.x-a.x)*t/d,a.y+(b.y-a.y)*t/d))return false;return true;}
function fire(p,a,speed,damage,life,friendly=false,disc=false){if(shots.length>=96)return;const s={x:p.x,y:p.y,dx:Math.cos(a)*speed,dy:Math.sin(a)*speed,damage:friendly?damage:0,life,age:0,boss:p.boss,art:friendly&&disc?weaponArt:-1,hit:[],traits:(disc?2:0)|(PIERCING_SHOTS&&friendly?weaponRules[weapon][W_FLAGS]&1:0)};shots.push(s);return s;}
function bossWeapon(e){const pool=bossDrops[e.kind];return pool[Math.floor(world.reward*pool.length)];}
function hitEnemy(e,damage){
 if(e.hp<=0)return;
e.hp=Math.max(0,e.hp-damage);if(e.hp){e.flash=.12;tone(80,.045,'triangle',.025);return;}tone(e.boss?110:75,e.boss?.5:.12,'triangle',.04);
 if(health)score+=e.boss?75+Math.random()*51|0:5+Math.random()*11|0;
 objects.push({x:e.x,y:e.y,kind:1,value:Math.random()*5|0});
 if(e.boss)objects.push({x:e.x,y:e.y,kind:3,value:bossWeapon(e)});
}
function hurtPlayer(){if(hurt<=0&&health>0){
 health--;hurt=.8;hitFlash=.18;tone(220,.04,'square',.05);tone(70,.16,'sawtooth',.04,.025);
 if(!health){clearKeys();resetActions();fields=[];blows=[];dash=null;gaze=0;tone(45,.35,'triangle',.04,.08);}
}}
function worldInteract(){
 if(!health){reset(true);return true;}
 if((!level||chamber===world.boss&&room.enemies.every(e=>e.hp<=0))&&Math.hypot(player.x-room.gate.x,player.y-room.gate.y)<1.8){if(!level){player.x=room.gate.x;player.y=room.gate.y;}destination=-1;travel=.35;releaseActions();return true;}
 return false;
}
function takeLoot(o){if(o.kind===4){health++;maxHealth++;}else{weapon=o.value;weaponArt=weaponRules[weapon][W_SPRITE];if(DEV)$('weapon-test').value=weapon;}tone(550,.08,'triangle',.03);}
function tickWorld(dt){
 if(dt<=0)return;
 worldTime+=dt;hitFlash=Math.max(0,hitFlash-dt);hurt=Math.max(0,hurt-dt);
 if(travel<=0&&health&&room.enemies.every(e=>e.hp<=0)){const d=room.doors.find(d=>{const [x,y]=directions[d.dir],a=player.x-d.x,b=player.y-d.y;return a*x+b*y>-.2&&Math.abs(a*y+b*x)<.8;});if(d){destination=d.to;travel=.35;releaseActions();tone(100,.12,'triangle',.03);}}
 if(travel>0){travel-=dt;if(travel<=0){const from=chamber;if(destination<0){level++;world=makeLevel(seed,level);chamber=0;enterRoom();}else{chamber=destination;enterRoom(from);}}return;}
 if(!health)return;
 // Standing on the ring's centre descends without pressing interact.
 if(!level&&Math.hypot(player.x-room.gate.x,player.y-room.gate.y)<.3)worldInteract();
 room.looking=false;
 // Identity determines the attack grammar; seeds vary cadence and density within it.
 for(const e of room.enemies)if(e.hp>0){
  e.flash=Math.max(0,(e.flash||0)-dt);e.wait-=dt;
  const d=Math.hypot(e.x-player.x,e.y-player.y),a=Math.atan2(player.y-e.y,player.x-e.x),rule=enemyRule(e),rawMode=rule[E_MODE];
  if(!SEQUENCED_ENEMIES&&rawMode>=3){
   const mode=rawMode,speed=rule[E_MOVE]*5;
   if(mode===3)seek(e,player,dt,speed);
   if(mode===5){if(e.phase){if(e.wait<=0){e.hp=0;tone(55,.2,'sawtooth',.035);}}else if(d<1&&clearShot(e,player)){e.phase=1;e.wait=.3;cast(e,a,5,false,.3);}else seek(e,player,dt,speed);}
   if(mode===6){
    let lead=e.follow;while(lead&&lead.hp<=0)lead=lead.follow;
    if(!lead)seek(e,player,dt,speed);
    else{const path=e.trail,last=path[path.length-1]||e;
     if(Math.hypot(last.x-lead.x,last.y-lead.y)>.25)path.push({x:lead.x,y:lead.y});
     while(path.length&&(path.length>64||Math.hypot(path[0].x-e.x,path[0].y-e.y)<.15))path.shift();
     const p=path[0];if(p)movePlayer(room.cells,e,p.x-e.x,p.y-e.y,dt,Math.min(speed,Math.hypot(p.x-e.x,p.y-e.y)/dt));
    }
   }
   if(mode===7){if(e.wait<=0){e.angle=a;e.wait=.7+d/rule[E_CHARGE];}const x=e.x,y=e.y;movePlayer(room.cells,e,Math.cos(e.angle),Math.sin(e.angle),dt,rule[E_CHARGE]);if(Math.hypot(e.x-x,e.y-y)<dt)e.wait=0;}
   if(mode===8){if(e.wait<=0&&clearShot(e,player)){cast(e,a,e.pattern*e.pattern);e.wait=3.5;}if(d>8)seek(e,player,dt,speed);}
   // Medusa swings its gaze cone after the player and closes in to keep them inside it.
   if(mode===9){const turn=Math.atan2(Math.sin(a-e.angle),Math.cos(a-e.angle));e.angle+=Math.max(-dt*2.5,Math.min(dt*2.5,turn));if(d>4)seek(e,player,dt,speed);e.look=d<7&&Math.cos(a-e.angle)>.866&&clearShot(e,player);if(e.look)room.looking=true;}
   if(mode!==7&&mode!==9)e.angle=a;
  }else{
   const mode=SEQUENCED_ENEMIES?rule[E_MODE][(e.cycle-(e.phase>1))%rule[E_MODE].length]:rule[E_MODE],lunge=mode===1;
   if(!e.phase&&(lunge||d>rule[E_STANDOFF]||!clearShot(e,player)))seek(e,player,dt,rule[E_MOVE]*5);
   if(e.wait<=0&&(e.phase||d<rule[E_RANGE]&&clearShot(e,player))){
    e.phase=(e.phase+1)%4;e.wait=[rule[E_COOL]+e.pattern*rule[E_COOL_STEP],rule[E_WIND],rule[E_ACTIVE],rule[E_RECOVER]][e.phase];
    if(e.phase===1){e.angle=a;tone(e.boss?140:260,.05,'triangle',.006);}
    if(e.phase===2){e.cycle++;if(!lunge){const count=rule[E_COUNT]+e.pattern*rule[E_COUNT_STEP],ring=mode===2;volley(e,e.angle,count,rule[E_SPEED],1,rule[E_LIFE],false,ring?4:0,rule[E_SPREAD],0,ring?e.cycle%count:-1);}}
   }
   if(e.phase===2&&lunge)movePlayer(room.cells,e,Math.cos(e.angle),Math.sin(e.angle),dt,rule[E_CHARGE]);
  }
  if(d<rule[E_CONTACT])hurtPlayer();
 }
 gaze=room.looking?gaze+dt:0;if(gaze>=6){hurtPlayer();gaze=0;}
 tickCombat(dt);
 if(room.enemies.every(e=>e.hp<=0)&&room.reward>=0){objects.push({x:player.x,y:player.y,kind:4,value:room.reward});room.reward=-1;}
 if(!world.shape&&(worldTime+room.offset)%4>3&&hazardAt(player))hurtPlayer();
 for(const s of shots){
  s.age+=dt;s.life-=dt;if(CURVED_SHOTS&&s.curve){const a=Math.atan2(s.dy,s.dx)+s.curve*dt,v=Math.hypot(s.dx,s.dy);s.dx=Math.cos(a)*v;s.dy=Math.sin(a)*v;}
  if((s.traits&2)&&s.age>.4){const a=Math.atan2(player.y-s.y,player.x-s.x);s.dx=Math.cos(a)*14;s.dy=Math.sin(a)*14;}
  const steps=Math.max(1,Math.ceil(Math.hypot(s.dx,s.dy)*dt/.2));
  for(let i=0;i<steps&&s.life>0;i++){
   s.x+=s.dx*dt/steps;s.y+=s.dy*dt/steps;
   if(!canFit(room.cells,s.x,s.y)){s.life=0;break;}
   if(s.damage){for(const e of room.enemies)if(e.hp>0&&!s.hit.includes(e)&&Math.hypot(e.x-s.x,e.y-s.y)<(e.boss?.85:.5)){s.hit.push(e);hitEnemy(e,s.damage);if(!(s.traits&3))s.life=0;}}
   else if(Math.hypot(s.x-player.x,s.y-player.y)<.4){hurtPlayer();s.life=0;}
  }
 }
 shots=shots.filter(s=>s.life>0);musicTick(dt);
}
function worldColor(light=65,offset=0){return 'hsl('+(world.hue+offset)+' 45% '+light+'%)';}
function drawWorld(){
 const pulse=(worldTime+room.offset)%4;if(!world.shape&&pulse>2.5){ctx.globalAlpha=pulse>3?1:.35;for(let n=0;n<W*H;n++)if((room.cells[n]>>1)%6===4)tile(ctx,assets.pantry+world.shape*6+3,n%W*12,(n/W|0)*12-(pulse>3?2:0));ctx.globalAlpha=1;}
 for(const e of room.enemies)if(e.hp>0){
  const rule=enemyRule(e),size=e.boss?24:12,cx=Math.round(e.x*12),cy=Math.round(e.y*12),wind=e.phase===1,bob=e.phase===0?Math.sin(worldTime*9+e.x)*1.2:0,stretch=wind?.8:e.phase===2?1.15:1;
  ctx.fillStyle='#050a10';ctx.fillRect(cx-size/2,cy+size/2-2,size,3);
  ctx.save();ctx.translate(cx,cy+bob);ctx.scale(Math.cos(e.angle)>0?-1:1,stretch);ctx.globalAlpha=e.flash?.35:1;
  if(e.boss)for(let j=0;j<4;j++)tile(ctx,assets.bosses+j,-12+j%2*12,-12+(j>>1)*12);
  else tile(ctx,assets.enemies+(rule[E_ANIM]?rule[E_ART]+world.shape*rule[E_THEME]+Math.floor(worldTime*rule[E_ANIM])%rule[E_FRAMES]:e.form),-6,-6);
  ctx.restore();
  // A medusa's gaze is a visible line while it is building madness.
  if(rule[E_MODE]===9){ctx.fillStyle='#c394ff';ctx.globalAlpha=e.look?.3:.1;ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,84,e.angle-.52,e.angle+.52);ctx.fill();ctx.globalAlpha=1;}
 }
 for(const s of shots){const x=Math.round(s.x*12),y=Math.round(s.y*12);if(!s.boss){ctx.save();ctx.translate(x,y);ctx.rotate(s.art>=0?s.age*16:Math.atan2(s.dy,s.dx)+Math.PI/4);tile(ctx,s.art>=0?assets.weapon+s.art:assets.effects,-6,-6);ctx.restore();}else{ctx.fillStyle='#ff9b87';ctx.fillRect(x-1,y-2,3,5);ctx.fillRect(x-2,y-1,5,3);}}
 drawGate();
 if(DEV/*diagnostics*/){
 let near=objects.find(o=>o.kind>=3&&Math.hypot(o.x-player.x,o.y-player.y)<1.6);
 const ready=room.enemies.every(e=>e.hp<=0),atGate=Math.hypot(player.x-room.gate.x,player.y-room.gate.y)<1.8;
 $('run-status').textContent=!health?'Fallen · Interact to restart':('HP '+health+'/'+maxHealth+' · '+level+' / '+(chamber+1)+' · '+weaponNames[weapon]);
 $('pickup-status').textContent=ready&&atGate&&chamber===world.boss?'Interact: '+exitNames[world.exit]:near?'Take '+(near.kind===4?'Armor':weaponNames[near.value]):(ready?'Doors open':'Enemies '+room.enemies.filter(e=>e.hp>0).length);
 }
 if(!level){
  const controls=DEV?dev.controls():['W A S D','I','O'];
  // The title is the sheet's gothic capitals at double size.
  for(let i=0;i<9;i++)ctx.drawImage(atlas,(assets.title+i)*12,0,12,12,78+i*24,18,24,24);
  tile(ctx,assets.font,180,54);writeTiles((DEV?controls[0].replaceAll(' ',''):'WASD')+' -> MOVE',6);writeTiles(DEV?'"'+controls[1]+'" -> ATTACK':'"I" -> ATTACK',14);writeTiles(DEV?'"'+controls[2]+'" -> INTERACT':'"O" -> INTERACT',16);
  if(DEV/*diagnostics*/){$('run-status').textContent='Room Zero';$('pickup-status').textContent=Math.hypot(player.x-room.gate.x,player.y-room.gate.y)<1.8?controls[2]+' · Descend':'Follow the stairs';}
 }
 if(travel>0){ctx.fillStyle=worldColor(80);ctx.globalAlpha=travel/.35;ctx.fillRect(0,0,W*12,H*12);ctx.globalAlpha=1;}
}
// Pixel-built landmarks: silhouette first, animated opening second.
function drawGate(){
 const g=room.gate,x=Math.round(g.x*12),y=Math.round(g.y*12),kind=world.exit,open=room.enemies.every(e=>e.hp<=0);
 for(const d of room.doors){ctx.save();ctx.translate(d.x*12,d.y*12);ctx.rotate([Math.PI/2,-Math.PI/2,Math.PI,0][d.dir]);ctx.fillStyle=worldColor(55,30);ctx.fillRect(-15,-8,30,22);ctx.fillStyle='#080a08';ctx.fillRect(-10,-8,20,18);ctx.fillStyle=worldColor(38);if(!open) for(let j=-8;j<=8;j+=8)ctx.fillRect(j,-8,2,18);ctx.restore();}
 if(chamber!==world.boss||!open)return;

 const rect=(a,b,w,h)=>ctx.fillRect(x+a*2,y+b*2,w*2,h*2),colors=[worldColor(70,180),'#111925',worldColor(85),'#aee5e7','#efffff','#efedcf','#101310'];
 for(const part of landmarkPrograms[kind]){
  if(part==='a'){ctx.fillStyle=colors[0];for(let j=-12;j<=12;j+=2){const w=Math.round(Math.sqrt(144-j*j));rect(-w,j*.8,w*2,2);}}
  else if(part==='b'){ctx.fillStyle=colors[2];for(let j=0;j<8;j++){const a=worldTime*2+j*.8,r=2+j*.6;rect(Math.round(Math.cos(a)*r),Math.round(Math.sin(a)*r),2,2);}}
  else{const data=landmarkParts[part];for(let i=0;i<data.length;i+=5){ctx.fillStyle=colors[data[i]];rect(...data.slice(i+1,i+5));}}
 }
}
let audio,beatClock=0,beat=0;
function startAudio(){if(!audio)audio=new AudioContext();if(audio.state!=='running')audio.resume();}
// One plain oscillator per note; music uses triangle bass, square pluck and sine lead.
function tone(hz,duration,type='square',volume=.02,delay=0){
 if(!audio)return;
 const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+delay;
 o.type=type;o.frequency.value=hz;
 g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
 o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+duration);
}
// A four-bar minor loop: triangle bass, square arpeggio and a floor-seeded sine melody.
function musicTick(dt){
 if(!audio)return;beatClock-=dt;if(beatClock>0)return;beatClock+=.24+world.shape*.02;
 const step=beat++%8,root=[0,8,3,7][beat>>3&3]+world.hue%12,play=(n,d,v,g)=>tone(65.4*2**((n+root)/12),d,v,g);
 if(!(step%4))play(0,.7,'triangle',.045);
 play([12,19,24,15][step%4],.3,'square',.012);
 if(world.motif>>step&1)play(24+[0,3,5,7,10][(world.motif>>step+3)%5],.5,'sine',.02);
}
