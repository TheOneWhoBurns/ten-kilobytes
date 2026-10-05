const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={fillRect(){},clearRect(){},drawImage(){},save(){},restore(){},translate(){},rotate(){},scale(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},strokeRect(){}};
const fields=new Map(),document={createElement:()=>({getContext:()=>context}),getElementById:id=>{if(!fields.has(id))fields.set(id,{getContext:()=>context,setAttribute(){},style:{}});return fields.get(id);}};
const src=['room','actions','world'].map(n=>fs.readFileSync('src/'+n+'.js','utf8')).join('\n')+'\n'+fs.readFileSync('src/game.js','utf8').split('function choose(')[0];
const api=vm.runInNewContext('const DEV=false,assets={enemyCount:87,pantry:0,actor:160,weapon:70,enemies:73};'+src+`;({makeLevel,canFit,W,H,reset,enterRoom,worldInteract,tickWorld,worldAttack,takeLoot,boost,hitEnemy,fire,hurtPlayer,drawWorld,
 init(v){seed=v;reset();},
 get state(){return {world,room,player,level,chamber,health,hurt,power,weapon,shots,objects,travel,worldTime};},
 setRoom(n,from){chamber=n;enterRoom(from);},
 position(x,y){player.x=x;player.y=y;},
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
  const r=w.rooms[i];if(r.doors.length>2)branching++;
  for(const d of r.doors){assert(d.x===.5||d.x===30.5||d.y===.5||d.y===20.5,'door at screen edge');assert(w.rooms[d.to].doors.some(back=>back.to===i&&back.dir===(d.dir^1)),'reciprocal opposite door');assert(api.canFit(r.cells,d.x,d.y),'door is open floor');}
  const start=10*31+15,q=[start],s=new Set(q);for(let j=0;j<q.length;j++)for(const d of [-1,1,-31,31]){const n=q[j]+d;if(r.cells[n]&&Math.abs(n%31-q[j]%31)<=1&&!s.has(n)){s.add(n);q.push(n);}}
  assert.equal(s.size,r.cells.reduce((a,b)=>a+b,0),'every floor tile connects to room center');
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
api.init('projectile-hit');api.position(15.5,10.5);api.aim(0);let victim=api.state.room.enemies[0];victim.x=18.5;victim.y=10.5;victim.kind=1;victim.wait=999;const oldHP=victim.hp;api.takeLoot({kind:3,value:1});api.worldAttack();api.step(18);assert(victim.hp<oldHP,'moving projectile actually damages an enemy');
api.init('wall-impact');api.clear();api.position(15.5,10.5);api.fire(api.state.player,0,14,1,10,true);api.step(180);assert.equal(api.state.shots.length,0,'projectiles stop at the screen boundary');
api.init('disc-return');api.setRoom(6);api.position(15.5,10.5);api.aim(0);api.takeLoot({kind:3,value:3});api.worldAttack();api.step(27);assert(api.state.shots[0].dx<0,'disc reverses towards the player');
console.log('PASS combat integration: projectile damage, wall collision and returning disc steering');
