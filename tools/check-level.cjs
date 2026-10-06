const hazards=require('./hazard-view.cjs'),props=require('./prop-view.cjs');
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={fillText(){},fillRect(){},clearRect(){},drawImage(){},save(){},restore(){},translate(){},rotate(){},scale(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},strokeRect(){}};
const fields=new Map(),document={createElement:()=>({getContext:()=>context}),getElementById:id=>{if(!fields.has(id))fields.set(id,{getContext:()=>context,setAttribute(){},style:{}});return fields.get(id);}};
const src=require('./content-data.cjs')()+require('./landmark-data.cjs')()+['room','actions','world','combat'].map(n=>fs.readFileSync('src/'+n+'.js','utf8')).join('\n')+'\n'+fs.readFileSync('src/game.js','utf8').split('function choose(')[0];
const api=vm.runInNewContext('const DEV=false,assets={letters:"",enemyCount:8,weaponCount:3,pantry:0,actor:160,weapon:70,enemies:73};'+src+`;({makeLevel,canFit,W,H,reset,enterRoom,worldInteract,tickWorld,worldAttack,takeLoot,hitEnemy,fire,hurtPlayer,drawWorld,
 init(v){seed=v;reset();level=1;world=makeLevel(seed,level);enterRoom();},
 get state(){return {world,room,player,level,chamber,health,hurt,hitFlash,weapon,shots,objects,travel,worldTime};},
 setRoom(n,from){chamber=n;enterRoom(from);},
 position(x,y){player.x=x;player.y=y;},
 walking(v){walking=v;},
 speed:movementFactor,
 clock(t){worldTime=t;hurt=0;},
 score(){const notes=[];audio={currentTime:0,destination:{},createOscillator(){const o={frequency:{},connect(){},disconnect(){},start(){notes.push(o.frequency.value);},stop(){}};return o;},createGain(){return{gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}};beat=0;beatClock=0;for(let i=0;i<1200;i++)musicTick(1/60);audio=null;return notes;},
 injury(){const calls=[],old=tone;tone=(...args)=>calls.push(args);health=2;hurt=0;hurtPlayer();hurtPlayer();hurt=0;hurtPlayer();tone=old;return calls;},
 aim(a){facing=actionStates.attack.direction=a;},
 clear(){for(const e of room.enemies)if(e.hp>0)hitEnemy(e,10000);},
 health(n){health=n;hurt=0;},
 step(n){for(let i=0;i<n;i++)tickWorld(1/60);},
 draw(){drawWorld();},
 })`,require('./canvas-dom.cjs')({atob,document,Set,Uint8Array,Int16Array,crypto:require('node:crypto').webcrypto}));
let branching=0,deadEnds=0;const variants=new Set(),doorOffsets=new Set();
for(let seed=0;seed<1000;seed++){
 const w=api.makeLevel(seed,1);assert.equal(JSON.stringify(w),JSON.stringify(api.makeLevel(seed,1)),'seed reproduces entire level');assert.equal(w.rooms.length,7);assert(w.boss>0&&w.boss<6);variants.add(w.exit);
 assert.equal(w.rooms.flatMap(r=>r.enemies).filter(e=>e.boss).length,1,'one boss');assert.equal(w.rooms[6].enemies.length,0,'dedicated peaceful exit room');assert.equal(w.rooms[6].doors.length,1);assert.equal(w.rooms[6].doors[0].to,w.boss,'exit only connected behind boss');
 const arena=w.rooms[w.boss];assert(arena.cells.filter(c=>c===1).length>=180,'boss arena has broad open floor');for(let y=7;y<=13;y++)for(let x=9;x<=21;x++)assert.equal(arena.cells[y*31+x],1,'boss fighting core is unobstructed');
 assert(w.motif>=0&&w.motif<625);assert(w.reward>=0&&w.reward<1);
 const queue=[0],seen=new Set(queue);for(let i=0;i<queue.length;i++)for(const d of w.rooms[queue[i]].doors)if(!seen.has(d.to)){seen.add(d.to);queue.push(d.to);}assert.equal(seen.size,7,'whole level connected');
 for(let i=0;i<7;i++){
  const r=w.rooms[i];assert.equal(r.loot.length,0,'no potion or weapon spawns before combat');assert(r.enemies.every(e=>e.hp===(e.boss?280/3:1)),'ordinary HP 1; boss HP is two thirds of 140');assert(r.enemies.every(e=>!e.boss||e.kind===0),'one Skull identity across biomes');assert(props(r).every(p=>p.x>=0&&p.x<31&&p.y>=0&&p.y<21),'props remain on the map');if(i<6){assert(r.doors.length>=1,'every combat room connects');if(r.doors.length===1)deadEnds++;}if(r.doors.length>2)branching++;
  for(const d of r.doors){doorOffsets.add(d.dir<2?d.y:d.x);assert(d.x===.5||d.x===30.5||d.y===.5||d.y===20.5,'door at screen edge');assert(w.rooms[d.to].doors.some(back=>back.to===i&&back.dir===(d.dir^1)),'reciprocal opposite door');assert(api.canFit(r.cells,d.x,d.y),'door is open floor');const back=w.rooms[d.to].doors.find(b=>b.to===i);assert.equal(d.dir<2?d.y:d.x,d.dir<2?back.y:back.x,'reciprocal door coordinates align');const [dx,dy]=[[1,0],[-1,0],[0,1],[0,-1]][d.dir];assert(api.canFit(r.cells,d.x-dx*1.5,d.y-dy*1.5),'safe arrival throat');}
  const start=10*31+15,q=[start],s=new Set(q);for(let j=0;j<q.length;j++)for(const d of [-1,1,-31,31]){const n=q[j]+d;if((r.cells[n]&1)&&Math.abs(n%31-q[j]%31)<=1&&!s.has(n)){s.add(n);q.push(n);}}
  assert.equal(s.size,Array.from({length:api.W*api.H},(_,n)=>r.cells[n]).filter(v=>v&1).length,'every floor tile connects to room center');
  for(const p of [...r.enemies,...hazards(r),...r.loot,r.gate])assert(api.canFit(r.cells,p.x,p.y),'entities have valid player-sized floor');
  if(r.enemies.length&&!r.enemies[0].boss){const name=require('../assets/content.json').enemies[r.enemies[0].kind].id,n=r.enemies.length;if(name==='swarm')assert(n>=20&&n<=27);if(name==='conga'){assert(n>=8&&n<=12);assert.equal(new Set(r.enemies.map(e=>e.x+','+e.y)).size,n,'conga starts with distinct adjacent tiles');for(let k=1;k<n;k++)assert.equal(Math.hypot(r.enemies[k].x-r.enemies[k-1].x,r.enemies[k].y-r.enemies[k-1].y),1);}}
  for(const e of r.enemies){if(!e.boss)assert(Math.hypot(e.x-15.5,e.y-10.5)>4,'shared placement retains a four-tile arrival pocket');assert(e.form>=0&&e.form<require('../assets/content.json').enemySprites.length);assert(r.doors.every(d=>Math.hypot(e.x-d.x,e.y-d.y)>3),'door entries remain clear');}
 }
}
assert(branching>100);assert(deadEnds>100,'dead-end branches are allowed');assert(doorOffsets.size>=20,'doors use varied edge positions');assert.equal(variants.size,10,'all exit landmarks generated');
console.log('PASS 1,000 complete levels: determinism, seven connected rooms, reciprocal screen-edge doors, clear arrivals, one boss + dedicated exit, all10 exits');
api.init(1);
let s=api.state,door=s.room.doors[0];api.position(door.x,door.y);api.step(25);assert.equal(api.state.chamber,0,'combat locks doors');api.clear();api.position(door.x,door.y);api.step(25);assert.equal(api.state.chamber,door.to,'walk through edge changes room');const back=api.state.room.doors.find(d=>d.to===0);assert(Math.hypot(api.state.player.x-back.x,api.state.player.y-back.y)>1,'arrive inside opposite doorway');api.clear();api.position(back.x,back.y);api.step(25);assert.equal(api.state.chamber,0);assert(api.state.room.enemies.every(e=>e.hp<=0),'cleared enemies remain dead on revisit');assert(api.state.objects.every(o=>o.kind!==0),'no barrels');
api.init('combat');s=api.state;let e=s.room.enemies[0];api.position(e.x-1,e.y);api.aim(0);const hp=e.hp;api.worldAttack();assert(e.hp<hp,'fist hits immediately');
api.takeLoot({kind:3,value:1});const shotCount=api.state.shots.length;api.worldAttack();assert.equal(api.state.shots.length,shotCount+1,'arrow has one shot');api.takeLoot({kind:3,value:2});api.worldAttack();assert(api.state.shots.some(s=>(s.traits&2)),'returning disc');for(let i=0;i<200;i++)api.fire(api.state.player,0,5,1,2);assert(api.state.shots.length<=96,'bounded projectile budget');
api.init('boss');const previousFloor=api.state.world;const boss=api.state.world.boss;api.setRoom(6);let gate=api.state.room.gate;api.position(gate.x,gate.y);assert.equal(api.worldInteract(),false,'cannot exit before boss death');api.setRoom(boss);api.clear();api.setRoom(6,boss);gate=api.state.room.gate;api.position(gate.x,gate.y);assert(api.worldInteract());api.step(25);assert.equal(api.state.level,2,'only dedicated exit advances dungeon level');assert.notEqual(api.state.world,previousFloor,'descent replaces current floor');assert.equal(api.state.world.rooms.length,7);assert(!api.state.world.rooms.some(r=>previousFloor.rooms.includes(r)),'no previous rooms retained in current floor');assert.notDeepEqual(api.state.world.rooms.map(r=>Array.from(r.cells)),previousFloor.rooms.map(r=>Array.from(r.cells)),'next depth generates a new layout');assert.equal(api.state.chamber,0);
api.health(1);api.hurtPlayer();assert.equal(api.state.health,0);assert(api.worldInteract());assert.equal(api.state.health,2);assert.equal(api.state.level,0,'death returns to safe entrance');
api.health(2);const before=JSON.stringify(api.state);api.tickWorld(0);assert.equal(JSON.stringify(api.state),before,'zero dt freezes combat');api.draw();
console.log('PASS loop: locked doors, traversal/backtracking, no barrels, melee/fan/disc, projectile cap, boss gate, next level, death/restart and pause');
api.init('projectile-hit');api.position(15.5,10.5);api.aim(0);let victim=api.state.room.enemies[0];victim.x=18.5;victim.y=10.5;victim.kind=1;victim.wait=999;const oldHP=victim.hp;api.takeLoot({kind:3,value:1});api.worldAttack();api.step(18);assert(victim.hp<oldHP,'moving projectile actually damages an enemy');
api.init('wall-impact');api.clear();api.position(15.5,10.5);api.fire(api.state.player,0,14,1,10,true);api.step(180);assert.equal(api.state.shots.length,0,'projectiles stop at the screen boundary');
api.init('disc-return');api.setRoom(6);api.position(15.5,10.5);api.aim(0);api.takeLoot({kind:3,value:2});api.worldAttack();api.step(27);assert(api.state.shots[0].dx<0,'disc reverses towards the player');
console.log('PASS combat integration: projectile damage, wall collision and returning disc steering');

// Reward provenance and snapshot behavior, independent of rendering.
for(let seed=0;seed<60;seed++){
 api.init(seed);api.clear();assert(!api.state.objects.some(o=>o.kind===3),'normal enemies never drop weapons');
 api.setRoom(api.state.world.boss);const boss=api.state.room.enemies[0];api.clear();
 const rewards=api.state.objects.filter(o=>o.kind===3);assert.equal(rewards.length,1,'one boss weapon');
 api.hitEnemy(boss,100);assert.equal(api.state.objects.filter(o=>o.kind===3).length,1,'dead boss cannot duplicate its reward');
 api.takeLoot(rewards[0]);assert.equal(api.state.weapon,rewards[0].value,'boss reward equips its weapon');
}
api.init('needle');api.clear();api.takeLoot({kind:3,value:2});api.worldAttack();assert((api.state.shots[0].traits&2));api.takeLoot({kind:3,value:1});assert((api.state.shots[0].traits&2),'existing shot retains its returning trait after weapon swap');
console.log('PASS redesign: boss-only single rewards, single Skull, generated reward variations, no powerups and projectile snapshots');

// Two-hit survival, feedback, immunity, persistent corpse and all boss rewards.
api.init('two-hit');api.clear();api.health(2);api.hurtPlayer();assert.equal(api.state.health,1);assert.equal(api.state.hitFlash,.18);api.hurtPlayer();assert.equal(api.state.health,1,'one hit during immunity');api.step(60);api.hurtPlayer();assert.equal(api.state.health,0);api.step(120);assert.equal(api.state.health,0,'death persists');assert(api.worldInteract());assert.equal(api.state.health,2);
const drops=new Set();for(let n=0;n<120;n++){api.init(n);api.setRoom(api.state.world.boss);api.clear();drops.add(api.state.objects[0].value);}assert.deepEqual([...drops].sort(),[1,2,3,4,5,6,7,8],'all eight upgraded weapons remain boss rewards');
for(const depth of [1,2,10]){const w=api.makeLevel(4,depth);for(const r of w.rooms)for(const e of r.enemies)assert.equal(e.hp,e.boss?(6+depth)*40/3:1);}
api.init('boss-no-repeat');api.setRoom(api.state.world.boss);let target=api.state.room.enemies[0];target.x=17;target.y=10.5;target.wait=999;api.position(15.5,10.5);api.aim(0);api.takeLoot({kind:3,value:2});api.worldAttack();api.step(45);assert.equal(target.hp,280/3-2,'returning fang hits the same boss once');
api.health(0);api.hitEnemy(target,9999);assert.equal(api.state.health,0,'late boss death cannot resurrect player');
console.log('PASS two-hit survival, invulnerability, no powers, all boss weapons, 5x boss scaling and returning-shot hit memory');

api.init('music');const score=Array.from(api.score());assert(score.length>100,"twenty seconds of bass, arpeggio and melody");assert(score.every(n=>Number.isFinite(n)&&n>40&&n<2000),'synthesis remains within useful pitch bounds');assert.deepEqual(Array.from(api.score()),score,'music reproduces its motif and harmonic cycle');api.init('different music');assert.notDeepEqual(Array.from(api.score()),score,'different seed changes the generated score');console.log('PASS audio: bounded pitches, multiple voices, deterministic motif and seed variation');

const injury=api.injury();assert.deepEqual(Array.from(injury,n=>n[0]),[220,70,220,70,45]);assert.equal(injury[1][4],.025);console.log('PASS distinct two-part hit sound and death tone; invulnerability suppresses duplicate cues');

// Hazard patches must be large, connected, readable and avoid protected routes.
let patchesChecked=0,irregular=0;
for(let seed=0;seed<500;seed++){
 const world=api.makeLevel(seed,1);
 for(let i=0;i<7;i++){
  const r=world.rooms[i];
  if(world.shape===1){assert.equal(hazards(r).length,0,'no Cistern slowdown');assert(!props(r).some(p=>p.t===9),'no mud/debris art');}
  if(i===world.boss||i===6||world.shape===1){assert.equal(hazards(r).length,0);continue;}
  assert(hazards(r).length>=24&&hazards(r).length<=60,'large but bounded coverage');assert.equal(new Set(hazards(r).map(h=>h.offset)).size,1,'plate warning is synchronized');
  const unseen=new Set(hazards(r).map(h=>(h.y|0)*31+(h.x|0)));assert.equal(unseen.size,hazards(r).length,'no duplicate hazard tiles');
  for(const h of hazards(r)){assert(Math.hypot((h.x|0)-15,(h.y|0)-10)>3,'safe arrival pocket');assert(r.doors.every(d=>Math.hypot(d.x-h.x,d.y-h.y)>3),'safe door approaches');assert(props(r).some(p=>p.x===(h.x|0)&&p.y===(h.y|0)&&p.t===world.shape*6+3),'visible tile for every hazard');}
  while(unseen.size){const q=[unseen.values().next().value];unseen.delete(q[0]);for(const n of q)for(const k of [n-1,n+1,n-31,n+31])if(Math.abs(k%31-n%31)<2&&unseen.delete(k))q.push(k);assert(q.length>=12,'no isolated single-tile hazards');const xs=q.map(n=>n%31),ys=q.map(n=>n/31|0),area=(Math.max(...xs)-Math.min(...xs)+1)*(Math.max(...ys)-Math.min(...ys)+1);if(area>q.length)irregular++;patchesChecked++;}
 }
}
assert(irregular>patchesChecked*.9,'patches grow organically instead of filling rectangles');
api.init(1);api.clear();let plate=hazards(api.state.room)[0];assert.equal(api.state.world.shape,0);api.position(plate.x,plate.y);api.health(2);api.clock(6.7-plate.offset);api.step(1);assert.equal(api.state.health,2,'warning does not damage');api.clock(7.1-plate.offset);api.step(1);assert.equal(api.state.health,1,'active needle patch damages');api.step(1);assert.equal(api.state.health,1,'overlapping hazard cells respect immunity');
api.init(2);api.clear();const web=hazards(api.state.room)[0];assert.equal(api.state.world.shape,2);api.position(web.x,web.y);assert.equal(api.speed(),.55,'large web slows');api.position(15.5,10.5);assert.equal(api.speed(),1,'clear route stays full speed');
api.init(0);assert.equal(api.state.world.shape,1);assert.equal(api.speed(),1,'Cistern has no slowdown');
console.log('PASS large connected hazard patches, synchronized needles, web slowdown, safe routes and mud/debris removal');
