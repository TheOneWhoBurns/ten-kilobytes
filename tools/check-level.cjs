const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={fillRect(){},clearRect(){},drawImage(){},save(){},restore(){},translate(){},rotate(){},scale(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},strokeRect(){}};
const fields=new Map(),document={createElement:()=>({getContext:()=>context}),getElementById:id=>{if(!fields.has(id))fields.set(id,{getContext:()=>context,setAttribute(){},style:{}});return fields.get(id);}};
const src=require('./content-data.cjs')()+require('./landmark-data.cjs')()+['room','actions','world'].map(n=>fs.readFileSync('src/'+n+'.js','utf8')).join('\n')+'\n'+fs.readFileSync('src/game.js','utf8').split('function choose(')[0];
const api=vm.runInNewContext('const DEV=false,assets={enemyCount:87,pantry:0,actor:160,weapon:70,enemies:73};'+src+`;({makeLevel,canFit,W,H,reset,enterRoom,worldInteract,tickWorld,worldAttack,takeLoot,boost,hitEnemy,fire,hurtPlayer,drawWorld,
 init(v){seed=v;reset();},
 get state(){return {world,room,player,level,chamber,health,hurt,power,weapon,shots,objects,travel,worldTime,temper};},
 setRoom(n,from){chamber=n;enterRoom(from);},
 position(x,y){player.x=x;player.y=y;},
 navigation(){return {solid:navSolid,cell:navCell,dist:navDistances};},
 walking(v){walking=v;},
 score(){const notes=[];audio={currentTime:0,destination:{},createOscillator(){const o={frequency:{},connect(){},disconnect(){},start(){notes.push(o.frequency.value);},stop(){}};return o;},createGain(){return{gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}};muted=false;beat=0;beatClock=0;for(let i=0;i<1200;i++)musicTick(1/60);audio=null;muted=true;return notes;},
 aim(a){facing=actionStates.attack.direction=a;},
 clear(){for(const e of room.enemies)if(e.hp>0)hitEnemy(e,10000);},
 health(n){health=n;hurt=0;},
 step(n){for(let i=0;i<n;i++)tickWorld(1/60);},
 draw(){drawWorld();},
 })`,{document,Set,Uint8Array,Int16Array});
let branching=0;const variants=new Set();
for(let seed=0;seed<200;seed++){
 const w=api.makeLevel(seed,1);assert.equal(JSON.stringify(w),JSON.stringify(api.makeLevel(seed,1)),'seed reproduces entire level');assert.equal(w.rooms.length,7);assert(w.boss>0&&w.boss<6);variants.add(w.exit);
 assert.equal(w.rooms.flatMap(r=>r.enemies).filter(e=>e.boss).length,1,'one boss');assert.equal(w.rooms[6].enemies.length,0,'dedicated peaceful exit room');assert.equal(w.rooms[6].doors.length,1);assert.equal(w.rooms[6].doors[0].to,w.boss,'exit only connected behind boss');
 const queue=[0],seen=new Set(queue);for(let i=0;i<queue.length;i++)for(const d of w.rooms[queue[i]].doors)if(!seen.has(d.to)){seen.add(d.to);queue.push(d.to);}assert.equal(seen.size,7,'whole level connected');
 for(let i=0;i<7;i++){
  const r=w.rooms[i];assert(r.loot.every(o=>o.kind!==3),'no generated room weapon pickups');assert(r.enemies.every(e=>!e.boss||e.kind===w.shape),'boss mechanics match biome identity');assert(r.props.every(p=>p.x>=0&&p.x<31&&p.y>=0&&p.y<21),'props remain on the map');if(r.doors.length>2)branching++;
  for(const d of r.doors){assert(d.x===.5||d.x===30.5||d.y===.5||d.y===20.5,'door at screen edge');assert(w.rooms[d.to].doors.some(back=>back.to===i&&back.dir===(d.dir^1)),'reciprocal opposite door');assert(api.canFit(r.cells,d.x,d.y),'door is open floor');}
  const start=10*31+15,q=[start],s=new Set(q);for(let j=0;j<q.length;j++)for(const d of [-1,1,-31,31]){const n=q[j]+d;if(r.cells[n]===1&&Math.abs(n%31-q[j]%31)<=1&&!s.has(n)){s.add(n);q.push(n);}}
  assert.equal(s.size,Array.from({length:api.W*api.H},(_,n)=>r.cells[n]).filter(v=>v===1).length,'every floor tile connects to room center');
  for(const p of [...r.enemies,...r.hazards,...r.loot,r.gate])assert(api.canFit(r.cells,p.x,p.y),'entities have valid player-sized floor');
  for(const e of r.enemies){assert(e.form>=0&&e.form<87);assert(r.doors.every(d=>Math.hypot(e.x-d.x,e.y-d.y)>3),'door entries remain clear');}
 }
}
assert(branching>100);assert.equal(variants.size,10,'all exit landmarks generated');
console.log('PASS 200 complete levels: determinism, seven connected rooms, reciprocal screen-edge doors, clear arrivals, one boss + dedicated exit, all10 exits');
api.init(1);
let s=api.state,door=s.room.doors[0];api.position(door.x,door.y);api.step(25);assert.equal(api.state.chamber,0,'combat locks doors');api.clear();api.position(door.x,door.y);api.step(25);assert.equal(api.state.chamber,door.to,'walk through edge changes room');const back=api.state.room.doors.find(d=>d.to===0);assert(Math.hypot(api.state.player.x-back.x,api.state.player.y-back.y)>1,'arrive inside opposite doorway');api.clear();api.position(back.x,back.y);api.step(25);assert.equal(api.state.chamber,0);assert(api.state.room.enemies.every(e=>e.hp<=0),'cleared enemies remain dead on revisit');assert(api.state.objects.every(o=>o.kind!==0),'no barrels');
api.takeLoot({kind:1,value:{stat:0,value:2}});assert.equal(api.boost(0),2);api.takeLoot({kind:1,value:{stat:1,value:-2}});assert.equal(api.boost(0),0);assert.equal(api.boost(1),-2,'new bad power replaces prior good power');api.takeLoot({kind:1,value:{stat:2,value:1}});assert.equal(api.boost(1),0,'new good power removes old drawback');
api.init('combat');s=api.state;let e=s.room.enemies[0];api.position(e.x-1,e.y);api.aim(0);const hp=e.hp;api.worldAttack();assert(e.hp<hp,'fist hits immediately');
api.takeLoot({kind:3,value:2});const shotCount=api.state.shots.length;api.worldAttack();assert.equal(api.state.shots.length,shotCount+3,'fan has three shots');api.takeLoot({kind:3,value:3});api.worldAttack();assert(api.state.shots.some(s=>s.disc),'returning disc');for(let i=0;i<200;i++)api.fire(api.state.player,0,5,1,2);assert(api.state.shots.length<=96,'bounded projectile budget');
api.init('boss');const boss=api.state.world.boss;api.setRoom(6);let gate=api.state.room.gate;api.position(gate.x,gate.y);assert.equal(api.worldInteract(),false,'cannot exit before boss death');api.setRoom(boss);api.clear();api.setRoom(6,boss);gate=api.state.room.gate;api.position(gate.x,gate.y);assert(api.worldInteract());api.step(25);assert.equal(api.state.level,2,'only dedicated exit advances dungeon level');assert.equal(api.state.chamber,0);
api.health(1);api.hurtPlayer();assert.equal(api.state.health,0);assert(api.worldInteract());assert.equal(api.state.health,8);assert.equal(api.state.level,1,'death restarts cleanly');
api.health(8);const before=JSON.stringify(api.state);api.tickWorld(0);assert.equal(JSON.stringify(api.state),before,'zero dt freezes combat');api.draw();
console.log('PASS loop: locked doors, traversal/backtracking, no barrels, replacement powers, melee/fan/disc, projectile cap, boss gate, next level, death/restart and pause');
// Cached paths must invalidate at cell, room and level changes, including returning
// to an earlier grid. Compare every distance against an independent flood fill.
function checkDistances(){
 const {solid,cell,dist}=api.navigation(),expected=new Array(api.W*api.H).fill(999),queue=[cell];expected[cell]=0;
 for(const n of queue)for(const k of [n-1,n+1,n-api.W,n+api.W])if(solid[k]===1&&Math.abs(k%api.W-n%api.W)<2&&expected[k]===999){expected[k]=expected[n]+1;queue.push(k);}
 assert.deepEqual(Array.from(dist),expected,'cached navigation equals a fresh flood fill');
}
api.init('navigation');api.clear();api.position(15.2,10.2);api.step(1);let cached=api.navigation().dist;
api.step(599);assert.equal(api.navigation().dist,cached,'600 stationary ticks use one distance field');
api.position(15.8,10.8);api.step(1);assert.equal(api.navigation().dist,cached,'sub-cell movement reuses the field');
api.position(16.2,10.2);api.step(1);assert.notEqual(api.navigation().dist,cached,'crossing a cell rebuilds the field');checkDistances();
for(let seed=0;seed<20;seed++){
 api.init(seed);
 for(const n of [0,1,6,0]){
  cached=api.navigation().dist;api.setRoom(n);api.clear();api.position(15.5,10.5);api.step(1);
  assert.notEqual(api.navigation().dist,cached,'room and level changes invalidate navigation');checkDistances();
 }
}
console.log('PASS navigation cache: sub-cell reuse, cell/room/level invalidation, backtracking and exact flood-fill distances');
api.init('projectile-hit');api.position(15.5,10.5);api.aim(0);let victim=api.state.room.enemies[0];victim.x=18.5;victim.y=10.5;victim.kind=1;victim.wait=999;const oldHP=victim.hp;api.takeLoot({kind:3,value:1});api.worldAttack();api.step(18);assert(victim.hp<oldHP,'moving projectile actually damages an enemy');
api.init('wall-impact');api.clear();api.position(15.5,10.5);api.fire(api.state.player,0,14,1,10,true);api.step(180);assert.equal(api.state.shots.length,0,'projectiles stop at the screen boundary');
api.init('disc-return');api.setRoom(6);api.position(15.5,10.5);api.aim(0);api.takeLoot({kind:3,value:3});api.worldAttack();api.step(27);assert(api.state.shots[0].dx<0,'disc reverses towards the player');
console.log('PASS combat integration: projectile damage, wall collision and returning disc steering');

// Reward provenance and snapshot behavior, independent of rendering.
for(let seed=0;seed<60;seed++){
 api.init(seed);api.clear();assert(!api.state.objects.some(o=>o.kind===3),'normal enemies never drop weapons');
 api.setRoom(api.state.world.boss);const boss=api.state.room.enemies[0];api.clear();
 const rewards=api.state.objects.filter(o=>o.kind===3);assert.equal(rewards.length,1,'one boss weapon');
 api.hitEnemy(boss,100);assert.equal(api.state.objects.filter(o=>o.kind===3).length,1,'dead boss cannot duplicate its reward');
 api.takeLoot(rewards[0]);assert.equal(api.state.temper,boss.pattern,'reward inherits generated boss variation');
}
api.init('wraith');api.clear();api.health(8);api.takeLoot({kind:1,value:{stat:1,value:1}});api.walking(true);api.fire(api.state.player,0,0,1,1);api.step(1);assert.equal(api.state.health,8,'moving Wraith phases through bullets');api.walking(false);api.step(1);assert.equal(api.state.health,6,'stationary Wraith takes its heavier hit');
api.init('needle');api.clear();api.takeLoot({kind:3,value:1});api.worldAttack();assert(api.state.shots[0].pierce);api.takeLoot({kind:3,value:2});assert(api.state.shots[0].pierce,'existing shot retains its piercing after weapon swap');
api.init('ember');api.clear();api.takeLoot({kind:1,value:{stat:0,value:1}});api.worldAttack();assert.equal(api.state.shots.length,1,'Ember adds a shot to the fist');
api.init('thorn');api.health(8);const thornTarget=api.state.room.enemies[0];thornTarget.x=api.state.player.x+1;thornTarget.y=api.state.player.y;const thornHP=thornTarget.hp;api.takeLoot({kind:1,value:{stat:2,value:-1}});api.hurtPlayer();assert(thornTarget.hp<thornHP,'Thorn retaliates on damage');
console.log('PASS redesign: boss-only single rewards, biome-bound bosses, generated reward variations, Wraith/Ember/Thorn mechanics and projectile snapshots');

api.init('music');const score=Array.from(api.score());assert(score.length>200);assert(score.every(n=>Number.isFinite(n)&&n>40&&n<2000),'synthesis remains within useful pitch bounds');assert.deepEqual(Array.from(api.score()),score,'music reproduces its motif and harmonic cycle');api.init('different music');assert.notDeepEqual(Array.from(api.score()),score,'different seed changes the generated score');console.log('PASS audio: bounded pitches, multiple voices, deterministic motif and seed variation');
