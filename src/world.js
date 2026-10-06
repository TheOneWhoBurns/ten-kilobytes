// Generate only the current floor, using one seeded stream; visits retain room state.
const exitNames=['Tiny palace','Portal','Giant mirror','Hole','Giant mouth','Hollow tree','Skull stairs','Buried elevator','Whirlpool','Folded doorway'];
let world,level=1,chamber=0,score=0,health=2,hurt=0,hitFlash=0,weapon=0,temper=0,shots=[],worldTime=0,travel=0,destination=-1;
// A safe, fixed prologue. The dungeon is generated only when its doorway is crossed.
function makeEntrance(){
 // Each byte packs a corridor length and its two-bit direction.
 const cells=new Uint8Array(W*H);let x=0,y=1;
 for(const c of atob('dEpxQxgKCAc0BgwLCDphK1AeCQ8Z')){const n=c.charCodeAt(0),[dx,dy]=directions[n&3];for(let k=n>>2;k--;){cells[y*W+x]=1;x+=dx;y+=dy;}}
 for(let y=9;y<13;y++)for(let x=13;x<17;x++)cells[y*W+x]=1;
 return{hue:215,shape:0,rule:0,motif:0,rooms:[{cells,props:[],spawn:31,doors:[],enemies:[],loot:[],gate:{x:15,y:11}}],nodes:[]};
}
// A 16×16 lattice centered at (8,8) packs each coordinate pair into one byte.
// The six-room walk plus exit spans at most six steps, so neither axis can wrap.
function makeLevel(value,depth){
 const rnd=randomFor(value+':'+depth),pick=n=>Math.floor(rnd()*n);
 const theme=pick(3),result={hue:[215,175,265][theme]+pick(25),shape:theme,rule:theme?1:0,exit:pick(exitNames.length),rooms:[],boss:0,reward:rnd(),motif:pick(625)},nodes=[136],steps=[1,-1,16,-16];
 while(nodes.length<6){const n=nodes[pick(nodes.length)]+steps[pick(4)];if(!nodes.includes(n))nodes.push(n);}
 const links=nodes.map(p=>steps.map(d=>nodes.indexOf(p+d))),queue=[0];
 for(let j=0;j<queue.length;j++)for(const n of links[queue[j]])if(n>=0&&!queue.includes(n)){queue.push(n);result.boss=n;}
 const side=links[result.boss].findIndex(n=>n<0);nodes.push(nodes[result.boss]+steps[side]);links[result.boss][side]=6;links.push([-1,-1,-1,-1]);links[6][side^1]=result.boss;result.nodes=Uint8Array.from(nodes);
 for(let i=0;i<nodes.length;i++){
  const r=generate(rnd,result.shape),spots=[];
  if(i===result.boss){const a=10+pick(3),b=6+pick(3);for(let y=2;y<H-1;y++)for(let x=2;x<W-1;x++)if(((x-15)/a)**2+((y-10)/b)**2<1)r.cells[y*W+x]=1;}
  if(i===6){r.props=[];for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++)r.cells[y*W+x]=+(Math.abs((x-15)/11)**([8,2,8,2,2,1,3,8,2,1][result.exit])+Math.abs((y-10)/8)**([8,2,8,2,2,1,3,8,2,1][result.exit])<1);}
  if(i===6)for(const x of [9,21])for(const y of [5,9,13,16])if(r.cells[y*W+x]===1)r.props.push({x,y,t:theme*6+2+(result.exit%3)});
  r.doors=[];
  links[i].forEach((to,dir)=>{if(to<0)return;
   const [dx,dy]=directions[dir],back=result.rooms[to]?.doors.find(d=>d.to===i),offset=back?(dx?back.y:back.x)-.5:3+pick(dx?H-6:W-6),x=dx?15+dx*15:offset,y=dy?10+dy*10:offset;
   r.doors.push({to,dir,x:x+.5,y:y+.5});
   let xx=x-dx*2,yy=y-dy*2,best=999,target=325;
   for(let n=0;n<W*H;n++)if(r.cells[n]===1){const d=Math.abs(n%W-xx)+Math.abs((n/W|0)-yy);if(d<best){best=d;target=n;}}
   while(xx!==target%W||yy!==(target/W|0)){r.cells[yy*W+xx]=1;if(xx!==target%W&&(yy===(target/W|0)||rnd()<.5))xx+=Math.sign(target%W-xx);else yy+=Math.sign((target/W|0)-yy);}
   for(let k=0;k<3;k++)for(let w=-1;w<=1;w++)r.cells[(y-dy*k+dx*w)*W+x-dx*k+dy*w]=1;
  });
  r.props=r.props.filter(p=>(p.t%6<2?r.cells[p.y*W+p.x]===2:r.cells[p.y*W+p.x]===1)&&r.doors.every(d=>Math.hypot(p.x+.5-d.x,p.y+.5-d.y)>3)&&Math.hypot(p.x-15,p.y-10)>3);
  for(let n=0;n<r.cells.length;n++)if(r.cells[n]===1&&Math.hypot(n%W-15,Math.floor(n/W)-10)>5&&r.doors.every(d=>Math.hypot(n%W+.5-d.x,Math.floor(n/W)+.5-d.y)>3))spots.push(n);
  const spot=()=>{const n=spots.splice(pick(spots.length),1)[0]??325;return tilePoint(n);};
  r.gate=tilePoint(i===6?232:325);r.enemies=[];
  const boss=i===result.boss,kind=boss?0:enemyPools?enemyPools[theme][pick(enemyPools[theme].length)]:pick(ENEMY_COUNT),rule=enemyRules[kind+(boss?ENEMY_COUNT:0)],mode=rule[E_MODE];
  const count=i===6?0:boss?1:[3,4,6].includes(mode)?rule[E_COUNT]+pick(rule[E_COUNT_STEP]+1):Math.min(4,1+depth+(i>>1));
  for(let j=0;j<count;j++){
   const e={...spot(),boss,kind,pattern:pick(mode===8?6:3),form:rule[E_ART]+theme*rule[E_THEME]+pick(rule[E_FRAMES]),phase:0,wait:mode===7||mode===9?0:1+rnd(),angle:0,cycle:0};
   if(boss){e.x=15.5;e.y=6.5+pick(3);e.prize=rnd();}
   e.hp=boss?120+20*depth:1;e.guard=mode===4?5:0;e.slot=j;r.enemies.push(e);
  }
  if(mode===4&&count){
   // Find a genuine contiguous line before falling back to a short carved gallery.
   const candidates=[];
   for(let n=2*W+2;n<(H-2)*W-2;n++)for(const d of [1,W])if(Array.from({length:count},(_,j)=>n+j*d).every(k=>k%W>1&&k%W<W-2&&(k/W|0)<H-2&&r.cells[k]===1&&r.doors.every(o=>Math.hypot(k%W+.5-o.x,(k/W|0)+.5-o.y)>3)))candidates.push([n,d]);
   const [n,d]=candidates.length?candidates[pick(candidates.length)]:[6*W+10,1],a=d===1?Math.PI/2:0;if(!candidates.length)for(let y=6;y<=10;y++)r.cells[y*W+15]=1;
   for(const e of r.enemies){const k=n+e.slot*d;r.cells[k]=1;Object.assign(e,tilePoint(k));e.slot=(d===1?-1:1)*(e.slot-(count-1)/2);e.angle=a;}
   r.formation={x:r.enemies[0].x+(d===1?(count-1)/2:0),y:r.enemies[0].y+(d===W?(count-1)/2:0),a};
  }
  if(mode===6&&count){
   const first=r.enemies[0],path=[(first.y|0)*W+(first.x|0)],seen=new Set(path);let attempts=0;
   const extend=()=>{if(path.length===count)return true;if(attempts++>2000)return false;const n=path[path.length-1],options=[-1,1,-W,W];while(options.length){const k=n+options.splice(pick(options.length),1)[0];if(seen.has(k)||r.cells[k]!==1||Math.abs(k%W-n%W)>1||r.doors.some(o=>Math.hypot(k%W+.5-o.x,(k/W|0)+.5-o.y)<=3)||Math.hypot(k%W-15,(k/W|0)-10)<3)continue;seen.add(k);path.push(k);if(extend())return true;path.pop();seen.delete(k);}return false;};
   for(let trial=0;trial<count;trial++){if(extend())break;attempts=0;const p=r.enemies[(trial+1)%count],n=(p.y|0)*W+(p.x|0);path.splice(0,path.length,n);seen.clear();seen.add(n);}
   for(const e of r.enemies){Object.assign(e,tilePoint(path[Math.min(e.slot,path.length-1)]));e.follow=r.enemies[e.slot-1];e.trail=[{x:e.x,y:e.y}];}
  }

  r.props=r.props.filter(p=>p.t!==theme*6+3&&(p.t%6>=2||r.cells[p.y*W+p.x]===2));
  if(i!==6&&i!==result.boss&&theme!==1)growHazards(r,theme,rnd);
  r.loot=[];r.reward=i!==6&&!boss&&ARMOR_COUNT&&rnd()<.25?pick(ARMOR_COUNT):-1;
  result.rooms.push(r);
 }
 return result;
}
function growHazards(r,theme,rnd){
 const pick=n=>Math.floor(rnd()*n),available=new Set(),offset=pick(4);r.offset=offset;
 for(let y=2;y<H-2;y++)for(let x=2;x<W-2;x++)if(r.cells[y*W+x]===1&&Math.hypot(x-15,y-10)>3&&r.doors.every(d=>Math.hypot(x+.5-d.x,y+.5-d.y)>3)&&!r.props.some(p=>p.x===x&&p.y===y))available.add(y*W+x);
 for(let patches=0;patches<2&&available.size;){
  const edge=[[...available][pick(available.size)]],patch=[],size=18+pick(13);
  while(edge.length&&patch.length<size){
   const i=pick(edge.length),n=edge[i];edge[i]=edge[edge.length-1];edge.pop();if(!available.delete(n))continue;
   patch.push(n);for(const d of [-1,1,-W,W])if(available.has(n+d))edge.push(n+d);
  }
  if(patch.length<12)continue;
  patches++;for(const n of patch){const x=n%W,y=n/W|0;r.props.push({x,y,t:theme*6+3});}
 }
}
function enemyRule(e){return enemyRules[e.kind+(e.boss?ENEMY_COUNT:0)];}
function movementFactor(){return (world?.shape===2&&room.props.some(h=>h.t%6===3&&Math.hypot(h.x+.5-player.x,h.y+.5-player.y)<.8)?.55:1);}
function worldAttack(){
 const w=weaponRules[weapon],a=actionStates.attack.direction,damage=(2+temper*.25)*w[W_DAMAGE],reach=2*w[W_REACH];
 const type=w[W_TYPE];
 if(type===3||type===4||type===7)strike(type,a,damage,type===4?2.5:reach);
 else if(type===5){melee(a,reach,damage);strike(5,a,damage,reach,.07);}
 else if(type===6)dash={a,age:0,damage,hit:new Set()};
 else if(type===8)cast(player,a,0,true);
 else if(!w[W_COUNT])melee(a,reach,damage);
 else volley(player,a,w[W_COUNT],w[W_SPEED],damage,w[W_LIFE]+reach*w[W_REACH_LIFE]+temper*w[W_TEMPER_LIFE],true,w[W_FLAGS],w[W_SPREAD]+temper*w[W_TEMPER_SPREAD],w[W_CURVE]);
 tone(w[W_PITCH],.045);
}
// A shared fan/ring primitive. Every shot snapshots its own motion traits.
function volley(p,a,count,speed,damage,life,friendly=false,flags=0,spread=.23,curve=0,gap=-1){
 for(let j=0;j<count;j++)if(j!==gap){
  const s=fire(p,a+(flags&4?j/count*Math.PI*2:(j-(count-1)/2)*spread),speed,damage,life,friendly,!!(flags&2));
  if(s&&curve)s.curve=(s.dx*Math.sin(a)-s.dy*Math.cos(a))*curve;
 }
}
function clearShot(a,b){const d=Math.hypot(b.x-a.x,b.y-a.y);for(let t=.2;t<d;t+=.2)if(!canFit(room.cells,a.x+(b.x-a.x)*t/d,a.y+(b.y-a.y)*t/d))return false;return true;}
function fire(p,a,speed,damage,life,friendly=false,disc=false){if(shots.length>=96)return;const s={x:p.x,y:p.y,dx:Math.cos(a)*speed,dy:Math.sin(a)*speed,damage:friendly?damage:0,life,age:0,boss:p.boss,art:friendly&&disc?weaponArt:-1,hit:new Set(),traits:(disc?2:0)|(friendly?weaponRules[weapon][W_FLAGS]&1:0)};shots.push(s);return s;}
function bossWeapon(e){const pool=bossDrops[e.kind];return pool[Math.floor(world.reward*pool.length)];}
function hitEnemy(e,damage,origin=player){
 if(e.hp<=0)return;
 if(e.guard>0&&Math.cos(Math.atan2(origin.y-e.y,origin.x-e.x)-e.angle)>.2){const blocked=Math.min(e.guard,damage);e.guard-=blocked;damage-=blocked;e.flash=.12;tone(350,.045,'triangle',.03);if(!damage)return;}
e.hp=Math.max(0,e.hp-damage);if(e.hp){e.flash=.12;tone(80,.045,'triangle',.025);return;}tone(e.boss?110:75,e.boss?.5:.12,'triangle',.04);
 if(health)score+=e.boss?100:10;
 if(e.boss){const value=bossWeapon(e),forms=weaponForms[value];objects.push({x:e.x,y:e.y,kind:3,value,art:forms[Math.floor((e.prize??world.reward)*forms.length)],temper:e.pattern});}
}
function hurtPlayer(){if(hurt<=0&&health>0){
 health--;hurt=.8;hitFlash=.18;tone(220,.04,'square',.05);tone(70,.16,'sawtooth',.04,.025);
 if(!health){keys.clear();resetActions();fields=[];blows=[];dash=null;gaze=0;tone(45,.35,'triangle',.04,.08);}
}}
function worldInteract(){
 if(!health){reset(true);return true;}
 if((!level||chamber===6&&world.rooms[world.boss].enemies.every(e=>e.hp<=0))&&Math.hypot(player.x-room.gate.x,player.y-room.gate.y)<1.8){if(!level){player.x=room.gate.x;player.y=room.gate.y;}destination=-1;travel=.35;releaseActions();return true;}
 return false;
}
function takeLoot(o){if(o.kind===4){health++;maxHealth++;}else{weapon=o.value;weaponArt=o.art??weaponRules[weapon][W_SPRITE];temper=o.temper||0;if(DEV)$('weapon-test').value=weapon;}tone(550,.08,'triangle',.03);}
// Collision is immutable during a room visit. Rebuild navigation only on a cell/grid change.
let navSolid,navCell,navDistances;
function tickWorld(dt){
 if(dt<=0)return;
 worldTime+=dt;hitFlash=Math.max(0,hitFlash-dt);hurt=Math.max(0,hurt-dt);
 if(travel<=0&&health&&room.enemies.every(e=>e.hp<=0)){const d=room.doors.find(d=>{const [x,y]=directions[d.dir],a=player.x-d.x,b=player.y-d.y;return a*x+b*y>-.2&&Math.abs(a*y+b*x)<.8;});if(d){destination=d.to;travel=.35;releaseActions();tone(100,.12,'triangle',.03);}}
 if(travel>0){travel-=dt;if(travel<=0){const from=chamber;if(destination<0){level++;world=makeLevel(seed,level);chamber=0;enterRoom();}else{chamber=destination;enterRoom(from);}}return;}
 if(!health)return;
 // One distance field lets all creatures navigate the same generated geometry.
 const start=Math.floor(player.y)*W+Math.floor(player.x);
 if(navSolid!==room.cells||navCell!==start){
  navSolid=room.cells;navCell=start;navDistances=new Int16Array(W*H).fill(999);
  const queue=[start];navDistances[start]=0;
  for(let i=0;i<queue.length;i++)for(const d of [-1,1,-W,W]){const n=queue[i]+d;if(room.cells[n]===1&&navDistances[n]===999&&Math.abs(n%W-queue[i]%W)<2){navDistances[n]=navDistances[queue[i]]+1;queue.push(n);}}
 }
 const dist=navDistances;
 room.looking=false;
 if(room.formation){const g=room.formation,a=Math.atan2(player.y-g.y,player.x-g.x),turn=Math.atan2(Math.sin(a-g.a),Math.cos(a-g.a)),angle=g.a+Math.max(-dt*.12,Math.min(dt*.12,turn)),alive=room.enemies.filter(e=>e.hp>0);
  const fits=(x,y,a)=>alive.every(e=>canFit(room.cells,x-Math.sin(a)*e.slot,y+Math.cos(a)*e.slot));
  if(fits(g.x,g.y,angle))g.a=angle;
  const x=g.x+Math.cos(g.a)*dt*1.6,y=g.y+Math.sin(g.a)*dt*1.6;if(fits(x,y,g.a)){g.x=x;g.y=y;}
 }
 // Identity determines the attack grammar; seeds vary cadence and density within it.
 for(const e of room.enemies)if(e.hp>0){
  e.flash=Math.max(0,(e.flash||0)-dt);e.wait-=dt;
  if(specialEnemy(e,dt))continue;
  const d=Math.hypot(e.x-player.x,e.y-player.y),a=Math.atan2(player.y-e.y,player.x-e.x),rule=enemyRule(e),mode=SEQUENCED_ENEMIES?rule[E_MODE][(e.cycle-(e.phase>1))%rule[E_MODE].length]:rule[E_MODE],lunge=mode===1;
  if(e.phase===0){
   if(lunge||d>rule[E_STANDOFF]||!clearShot(e,player)){
    const n=Math.floor(e.y)*W+Math.floor(e.x);let next,best=dist[n];
    for(const k of [n-1,n+1,n-W,n+W])if(Math.abs(k%W-n%W)<2&&dist[k]<best){next=k;best=dist[k];}
    if(next!==undefined)movePlayer(room.cells,e,next%W+.5-e.x,Math.floor(next/W)+.5-e.y,dt*rule[E_MOVE]);
   }
   if(e.wait<=0&&d<rule[E_RANGE]&&clearShot(e,player)){e.phase=1;e.wait=rule[E_WIND];e.angle=a;tone(e.boss?140:260,.05,'triangle',.006);}
  }else if(e.wait<=0){
   if(e.phase===1){
    e.cycle++;e.phase=2;e.wait=rule[E_ACTIVE];
    if(!lunge){
     const count=rule[E_COUNT]+e.pattern*rule[E_COUNT_STEP],ring=mode===2;
     volley(e,e.angle,count,rule[E_SPEED],1,rule[E_LIFE],false,ring?4:0,rule[E_SPREAD],0,ring?e.cycle%count:-1);
    }
   }else if(e.phase===2){e.phase=3;e.wait=rule[E_RECOVER];}
   else{e.phase=0;e.wait=rule[E_COOL]+e.pattern*rule[E_COOL_STEP];}
  }
  if(e.phase===2&&lunge)movePlayer(room.cells,e,Math.cos(e.angle),Math.sin(e.angle),dt,rule[E_CHARGE]);
  if(d<rule[E_CONTACT])hurtPlayer();
 }
 gaze=room.looking?gaze+dt:0;if(gaze>=6){hurtPlayer();gaze=0;}
 tickCombat(dt);
 if(room.enemies.every(e=>e.hp<=0)&&room.reward>=0){objects.push({x:player.x,y:player.y,kind:4,value:room.reward});room.reward=-1;}
 for(const h of room.props)if(h.t%6===3){const pulse=(worldTime+room.offset)%4;
  if(!world.rule&&pulse>3&&Math.hypot(h.x+.5-player.x,h.y+.5-player.y)<.65)hurtPlayer();
 }
 for(const s of shots){
  s.age+=dt;s.life-=dt;if(s.curve){const a=Math.atan2(s.dy,s.dx)+s.curve*dt,v=Math.hypot(s.dx,s.dy);s.dx=Math.cos(a)*v;s.dy=Math.sin(a)*v;}
  if((s.traits&2)&&s.age>.4){const a=Math.atan2(player.y-s.y,player.x-s.x);s.dx=Math.cos(a)*14;s.dy=Math.sin(a)*14;}
  const steps=Math.max(1,Math.ceil(Math.hypot(s.dx,s.dy)*dt/.2));
  for(let i=0;i<steps&&s.life>0;i++){
   s.x+=s.dx*dt/steps;s.y+=s.dy*dt/steps;
   if(!canFit(room.cells,s.x,s.y)){s.life=0;break;}
   if(s.damage){for(const e of room.enemies)if(e.hp>0&&!s.hit.has(e)&&Math.hypot(e.x-s.x,e.y-s.y)<(e.boss?.85:.5)){s.hit.add(e);hitEnemy(e,s.damage,{x:s.x-s.dx*.03,y:s.y-s.dy*.03});if(!(s.traits&3))s.life=0;}}
   else if(Math.hypot(s.x-player.x,s.y-player.y)<.4){hurtPlayer();s.life=0;}
  }
 }
 shots=shots.filter(s=>s.life>0);musicTick(dt);
}
function worldColor(light=65,offset=0){return 'hsl('+(world.hue+offset)+' 45% '+light+'%)';}
function drawWorld(){
 for(const h of room.props)if(h.t%6===3){const pulse=(worldTime+room.offset)%4;if(!world.rule&&pulse>2.5){ctx.globalAlpha=pulse>3?1:.35;tile(ctx,assets.pantry+world.shape*6+3,h.x*12,h.y*12-(pulse>3?2:0));ctx.globalAlpha=1;}}
 for(const e of room.enemies)if(e.hp>0){
  const rule=enemyRule(e),size=e.boss?24:12,cx=Math.round(e.x*12),cy=Math.round(e.y*12),wind=e.phase===1,bob=e.phase===0?Math.sin(worldTime*9+e.x)*1.2:0,stretch=wind?.8:e.phase===2?1.15:1;
  ctx.fillStyle='#050a10';ctx.fillRect(cx-size/2,cy+size/2-2,size,3);
  ctx.save();ctx.translate(cx,cy+bob);ctx.scale(Math.cos(e.angle)<0?-1:1,stretch);ctx.globalAlpha=e.flash?.35:1;
  if(e.boss)for(let j=0;j<4;j++)tile(ctx,assets.bosses+j,-12+j%2*12,-12+(j>>1)*12);
  else tile(ctx,assets.enemies+(rule[E_ANIM]?rule[E_ART]+world.shape*rule[E_THEME]+Math.floor(worldTime*rule[E_ANIM])%rule[E_FRAMES]:e.form),-6,-6);
  ctx.restore();ctx.globalAlpha=1;
  if(e.boss){ctx.fillStyle='#191b26';ctx.fillRect(126,9,120,3);ctx.fillStyle='#e3a6b2';ctx.fillRect(126,9,120*e.hp/(120+20*level),3);}
 }
 for(const s of shots){const x=Math.round(s.x*12),y=Math.round(s.y*12);if(!s.boss){ctx.save();ctx.translate(x,y);ctx.rotate(s.art>=0?s.age*16:Math.atan2(s.dy,s.dx)+Math.PI/4);tile(ctx,s.art>=0?assets.weapon+s.art:assets.effects,-6,-6);ctx.restore();}else{ctx.fillStyle='#ff9b87';ctx.fillRect(x-1,y-2,3,5);ctx.fillRect(x-2,y-1,5,3);}}
 drawGate();
 world.nodes.forEach((n,i)=>{if(!world.rooms[i].visited)return;const x=(n&15)-8,y=(n>>4)-8;ctx.fillStyle=i===chamber?'#fff':i===world.boss?'#e29a63':i===6?worldColor(80,180):'#a0a88a';ctx.fillRect(34+x*6,34+y*6,5,5);});
 if(DEV/*diagnostics*/){
 let near=objects.find(o=>o.kind>=3&&Math.hypot(o.x-player.x,o.y-player.y)<1.6);
 const ready=room.enemies.every(e=>e.hp<=0),atGate=Math.hypot(player.x-room.gate.x,player.y-room.gate.y)<1.8;
 $('run-status').textContent=!health?'Fallen · Interact to restart':('HP '+health+'/'+maxHealth+' · '+level+' / '+(chamber+1)+' · '+weaponNames[weapon]);
 $('pickup-status').textContent=ready&&atGate&&chamber===6?'Interact: '+exitNames[world.exit]:near?'Take '+(near.kind===4?'Armor':weaponNames[near.value]):(ready?'Doors open':'Enemies '+room.enemies.filter(e=>e.hp>0).length);
 }
 if(!level){
  const controls=DEV?dev.controls():['W A S D','I','O'];
  writeTiles('ROOM ZERO',12,2.5);writeTiles('@ -> '+controls[0].replaceAll(' ',''),11,5.5);writeTiles('"'+controls[1]+'" -> ATTACK',6,13.5);writeTiles('"'+controls[2]+'" -> INTERACT',6,15.5);
  if(DEV/*diagnostics*/){$('run-status').textContent='Room Zero';$('pickup-status').textContent=Math.hypot(player.x-room.gate.x,player.y-room.gate.y)<1.8?controls[2]+' · Descend':'Follow the stairs';}
 }
 if(travel>0){ctx.fillStyle=worldColor(80);ctx.globalAlpha=travel/.35;ctx.fillRect(0,0,W*12,H*12);ctx.globalAlpha=1;}
}
// Pixel-built landmarks: silhouette first, animated opening second.
function drawGate(){
 const g=room.gate,x=Math.round(g.x*12),y=Math.round(g.y*12),kind=world.exit,open=room.enemies.every(e=>e.hp<=0);
 for(const d of room.doors){ctx.save();ctx.translate(d.x*12,d.y*12);ctx.rotate([Math.PI/2,-Math.PI/2,Math.PI,0][d.dir]);ctx.fillStyle=worldColor(55,30);ctx.fillRect(-15,-8,30,22);ctx.fillStyle='#080a08';ctx.fillRect(-10,-8,20,18);ctx.fillStyle=worldColor(38);if(!open) for(let j=-8;j<=8;j+=8)ctx.fillRect(j,-8,2,18);ctx.restore();}
 if(chamber!==6||!open)return;

 const rect=(a,b,w,h)=>ctx.fillRect(x+a*2,y+b*2,w*2,h*2),colors=[worldColor(70,180),'#111925',worldColor(85),'#aee5e7','#efffff','#efedcf','#101310'];
 for(const part of landmarkPrograms[kind]){
  if(part==='a'){ctx.fillStyle=colors[0];for(let j=-12;j<=12;j+=2){const w=Math.round(Math.sqrt(144-j*j));rect(-w,j*.8,w*2,2);}}
  else if(part==='b'){ctx.fillStyle=colors[2];for(let j=0;j<8;j++){const a=worldTime*2+j*.8,r=2+j*.6;rect(Math.round(Math.cos(a)*r),Math.round(Math.sin(a)*r),2,2);}}
  else{const data=landmarkParts[part];for(let i=0;i<data.length;i+=5){ctx.fillStyle=colors[data[i]];rect(...data.slice(i+1,i+5));}}
 }
}
let audio,beatClock=0,beat=0;
function startAudio(){if(!audio)audio=new AudioContext();if(audio.state!=='running')audio.resume();}
// String types select SFX waveforms; numeric types select FM bass, pluck or lead.
function tone(hz,duration,type='square',volume=.02,delay=0){
 if(!audio)return;
 const voice=+type,o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+delay;
 o.type=voice?'sine':type;o.frequency.value=hz;
 g.gain.setValueAtTime(voice?.0001:volume,t);
 if(voice)g.gain.linearRampToValueAtTime(volume,t+(voice===3?.04:.006));
 g.gain.exponentialRampToValueAtTime(.0001,t+duration);
 o.connect(g);g.connect(audio.destination);
 let m,a;
 if(voice){
  m=audio.createOscillator();a=audio.createGain();m.frequency.value=hz*(voice===2?2.01:1);
  a.gain.setValueAtTime(hz*(voice===2?2:voice===3?.7:.35),t);
  a.gain.exponentialRampToValueAtTime(.01,t+duration*.8);
  m.connect(a);a.connect(o.frequency);m.start(t);m.stop(t+duration);
 }
 o.start(t);o.stop(t+duration);o.onended=()=>{for(const n of [o,g,m,a])n?.disconnect();};
}
function musicTick(dt){
 if(!audio)return;beatClock-=dt;if(beatClock>0)return;beatClock+=.24+world.shape*.02;
 const bar=Math.floor(beat/8)%8,step=beat%8,root=[0,5,3,7,5,3,7,0][bar],scale=[0,2,3,5,7,8,11],key=world.hue%12;
 const play=(n,d,v,g)=>{const hz=65.4*2**((n+key)/12);tone(hz,d,v,g);if(v>1)tone(hz,d,v,g*.16,.18);};
 if(step%4===0)play(root,.7,1,.045);
 play(root+[0,7,12,root%5?16:15][step%4],.36,2,.024);
 const note=Math.floor(world.motif/5**(step<4?step:7-step))%5,degree=step<4?note:6-note;
 if(step%2===0||bar%2)play(24+(bar===7&&step>5?0:step%4===0?root:scale[degree]),.6,3,.018);
 beat++;
}
