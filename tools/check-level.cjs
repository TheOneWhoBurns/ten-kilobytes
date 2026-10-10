const hazards=require('./hazard-view.cjs'),props=require('./prop-view.cjs'),{NEEDLE,WEB,ICE,FIRE,SPIKE,TRAP,RADIATION,CLOSED}=require('./environment-data.cjs').constants;
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={fillText(){},fillRect(){},clip(){},rect(){},clearRect(){},drawImage(){},save(){},restore(){},translate(){},rotate(){},scale(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},strokeRect(){}};
const fields=new Map(),document={createElement:()=>({getContext:()=>context}),getElementById:id=>{if(!fields.has(id))fields.set(id,{getContext:()=>context,setAttribute(){},style:{}});return fields.get(id);}};
// Historical boss fixture exercises future boss progression; the live empty roster is checked separately.
const src=require('./content-data.cjs').compile(require('./content-examples.cjs').boss(require('./content-data.cjs').load())).source+['room','actions','world','combat'].map(n=>fs.readFileSync('src/'+n+'.js','utf8')).join('\n')+'\n'+fs.readFileSync('src/game.js','utf8').split('function choose(')[0];
const api=vm.runInNewContext('const DEV=false,assets={entrance:'+JSON.stringify(require('../assets/entrance.json'))+',letters:"",enemyCount:8,weaponCount:3,pantry:0,actor:160,weapon:70,enemies:73};'+src+`;({makeLevel,canFit,W,H,reset,enterRoom,worldInteract,tickWorld,worldAttack,takeLoot,hitEnemy,fire,hurtPlayer,drawWorld,tickHazards,extinguish,
 init(v){seed=v;reset();level=1;world=makeLevel(seed,level);enterRoom();reveal=0;},
 get state(){return {world,room,player,level,chamber,health,hurt,hitFlash,weapon,shots,objects,travel,worldTime,radiation,uranium,reveal,revealAt};},
 setRoom(n,from){chamber=n;enterRoom(from);reveal=0;},
 position(x,y){player.x=x;player.y=y;},
 walking(v){walking=v;},
 speed:movementFactor,
 staticAudio(){const levels=[],stats={sources:0,data:null};staticGain=null;audio={currentTime:0,sampleRate:44100,destination:{},createBuffer(c,n){stats.data=new Float32Array(n);return{getChannelData:()=>stats.data};},createBufferSource(){stats.sources++;return{connect(){},start(){},stop(){}};},createOscillator(){return{frequency:{},connect(){},start(){},stop(){}};},createGain(){return{gain:{setTargetAtTime(v){levels.push(v);},setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}};return{levels,stats};},
 sound(active=1){radiationAudio(active);},

 hazardScene(tag){room.cells.fill(1);room.enemies=[];room.doors=[];room.offset=0;room.reward=-1;objects=room.loot=[];health=maxHealth=2;hurt=0;worldTime=0;reveal=0;player={x:15.5,y:10.5};radiation=iceX=iceY=0;room.cells[325]=1|(tag<<1);collectUranium();},
 iceScene(){room.cells.fill(1|(ICE<<1));},
 physics(x,y){moveHero(x,y,1/60);},
 tag(){return hazardAt(player);},
 clock(t){worldTime=t;hurt=0;},
 score(){const notes=[];audio={currentTime:0,destination:{},createOscillator(){const o={frequency:{},connect(){},disconnect(){},start(){notes.push(o.frequency.value);},stop(){}};return o;},createGain(){return{gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}};beat=0;beatClock=0;for(let i=0;i<1200;i++)musicTick(1/60);audio=null;return notes;},
 injury(){const calls=[],old=tone;tone=(...args)=>calls.push(args);health=2;hurt=0;hurtPlayer();hurtPlayer();hurt=0;hurtPlayer();tone=old;return calls;},
 aim(a){facing=actionStates.attack.direction=a;},
 clear(){for(const e of room.enemies)if(e.hp>0)hitEnemy(e,10000);},
 health(n){health=n;hurt=0;},
 step(n){for(let i=0;i<n;i++)tickWorld(1/60);},
 draw(){drawWorld();},
 })`,require('./canvas-dom.cjs')({atob,document,Set,Uint8Array,Int16Array,crypto:require('node:crypto').webcrypto}));
let branching=0,deadEnds=0,mixedRooms=0;const doorOffsets=new Set();
for(let seed=0;seed<1000;seed++){
 const w=api.makeLevel(seed,1);assert.equal(JSON.stringify(w),JSON.stringify(api.makeLevel(seed,1)),'seed reproduces entire level');assert.equal(w.rooms.length,6);assert(w.boss>0&&w.boss<6);
 assert.equal(w.rooms.flatMap(r=>r.enemies).filter(e=>e.boss).length,1,'one boss');assert.equal(JSON.stringify(w.rooms[w.boss].gate),'{"x":15.5,"y":3.5}','the exit position stands at the back of the boss arena');
 const arena=w.rooms[w.boss];assert(arena.cells.filter(c=>c===1).length>=180,'boss arena has broad open floor');for(let y=7;y<=13;y++)for(let x=9;x<=21;x++)assert.equal(arena.cells[y*31+x],1,'boss fighting core is unobstructed');
 assert(Number.isInteger(w.song)&&w.song>=0,"each floor carries a song seed");assert(w.reward>=0&&w.reward<1);
 const queue=[0],seen=new Set(queue);for(let i=0;i<queue.length;i++)for(const d of w.rooms[queue[i]].doors)if(!seen.has(d.to)){seen.add(d.to);queue.push(d.to);}assert.equal(seen.size,6,'whole level connected');
 for(let i=0;i<6;i++){
  const r=w.rooms[i];assert.equal(r.loot.length,0,'no potion or weapon spawns before combat');assert(r.enemies.every(e=>e.hp===(e.boss?280/3:1)),'ordinary HP 1; boss HP is two thirds of 140');assert(r.enemies.every(e=>!e.boss||e.kind===0),'one Skull identity across biomes');assert(props(r).every(p=>p.x>=0&&p.x<31&&p.y>=0&&p.y<21),'props remain on the map');if(i<6){assert(r.doors.length>=1,'every combat room connects');if(r.doors.length===1)deadEnds++;}if(r.doors.length>2)branching++;
  for(const d of r.doors){doorOffsets.add(d.dir<2?d.y:d.x);assert(d.x===.5||d.x===30.5||d.y===.5||d.y===20.5,'door at screen edge');assert(w.rooms[d.to].doors.some(back=>back.to===i&&back.dir===(d.dir^1)),'reciprocal opposite door');assert(api.canFit(r.cells,d.x,d.y),'door is open floor');const back=w.rooms[d.to].doors.find(b=>b.to===i);assert.equal(d.dir<2?d.y:d.x,d.dir<2?back.y:back.x,'reciprocal door coordinates align');const [dx,dy]=[[1,0],[-1,0],[0,1],[0,-1]][d.dir];assert(api.canFit(r.cells,d.x-dx*1.5,d.y-dy*1.5),'safe arrival throat');for(let k=0;k<2;k++)for(const w of [-1,1])assert.equal(r.cells[((d.y|0)-dy*k+dx*w)*31+(d.x|0)-dx*k+dy*w]&1,0,'door jambs meet solid room walls');}
  const start=10*31+15,q=[start],s=new Set(q);for(let j=0;j<q.length;j++)for(const d of [-1,1,-31,31]){const n=q[j]+d;if((r.cells[n]&1)&&Math.abs(n%31-q[j]%31)<=1&&!s.has(n)){s.add(n);q.push(n);}}
  assert.equal(s.size,Array.from({length:api.W*api.H},(_,n)=>r.cells[n]).filter(v=>v&1).length,'every floor tile connects to room center');
  for(const p of [...r.enemies,...hazards(r),...r.loot,r.gate])assert(api.canFit(r.cells,p.x,p.y),'entities have valid player-sized floor');
  if(r.enemies.length&&!r.enemies[0].boss){const name=require('../assets/content.json').enemies[r.enemies[0].kind].id,n=r.enemies.length;if(name==='swarm'){assert(n>=20&&n<=27);assert.equal(new Set(r.enemies.map(e=>e.form)).size,1,'each swarm shares one creature sprite');}const ids=r.enemies.map(e=>require('../assets/content.json').enemies[e.kind].id);if(ids.some(id=>id==='swarm'||id==='conga'))assert(ids.every(id=>id===name),'swarm and conga rooms stay pure (one conga line at most)');else mixedRooms+=new Set(ids).size>1;if(name==='conga'){assert(n>=5&&n<=8);assert.equal(new Set(r.enemies.map(e=>e.x+','+e.y)).size,n,'conga starts with distinct adjacent tiles');for(let k=1;k<n;k++)assert.equal(Math.hypot(r.enemies[k].x-r.enemies[k-1].x,r.enemies[k].y-r.enemies[k-1].y),1);}}
  for(const e of r.enemies){if(!e.boss)assert(Math.hypot(e.x-15.5,e.y-10.5)>4,'shared placement retains a four-tile arrival pocket');assert(e.form>=0&&e.form<require('../assets/content.json').enemySprites.length);assert(r.doors.every(d=>Math.hypot(e.x-d.x,e.y-d.y)>3),'door entries remain clear');}
 }
}
assert(branching>100);assert(mixedRooms>500,'most combat rooms mix creature types');assert(deadEnds>100,'dead-end branches are allowed');assert(doorOffsets.size>=20,'doors use varied edge positions');
console.log('PASS 1,000 complete levels: determinism, six connected rooms, reciprocal screen-edge doors, clear arrivals, one boss arena with its reserved exit');
api.init(1);
let s=api.state,door=s.room.doors[0];api.position(door.x,door.y);api.step(25);assert.equal(api.state.chamber,0,'combat locks doors');api.clear();api.position(door.x,door.y);api.step(25);assert.equal(api.state.chamber,door.to,'walk through edge changes room');const back=api.state.room.doors.find(d=>d.to===0);assert(Math.hypot(api.state.player.x-back.x,api.state.player.y-back.y)>1,'arrive inside opposite doorway');api.step(30);api.clear();api.position(back.x,back.y);api.step(25);assert.equal(api.state.chamber,0);assert(api.state.room.enemies.every(e=>e.hp<=0),'cleared enemies remain dead on revisit');assert(api.state.objects.every(o=>o.kind!==0),'no barrels');
api.init('combat');s=api.state;s.room.cells.fill(1);let e=s.room.enemies[0];e.kind=1;e.wait=999;e.x=16.15;e.y=10.3;api.position(15.5,10.5);api.aim(0);const hp=e.hp;api.worldAttack();assert.equal(e.hp,hp,'starter blade waits for its windup');api.step(10);assert(e.hp<hp,'starter blade hits after its windup');
api.takeLoot({kind:3,value:1});const shotCount=api.state.shots.length;api.worldAttack();assert.equal(api.state.shots.length,shotCount+1,'arrow has one shot');api.takeLoot({kind:3,value:2});api.worldAttack();assert(api.state.shots.some(s=>(s.traits&2)),'returning disc');for(let i=0;i<200;i++)api.fire(api.state.player,0,5,1,2);assert(api.state.shots.length<=96,'bounded projectile budget');
api.init('boss');const previousFloor=api.state.world;const boss=api.state.world.boss;api.setRoom(boss);let gate=api.state.room.gate;api.position(gate.x,gate.y);assert.equal(api.worldInteract(),false,'cannot exit before boss death');api.clear();gate=api.state.room.gate;api.position(gate.x,gate.y);assert(api.worldInteract());api.step(25);assert.equal(api.state.level,2,'the arena exit advances the dungeon level');assert.notEqual(api.state.world,previousFloor,'descent replaces current floor');assert.equal(api.state.world.rooms.length,6);assert(!api.state.world.rooms.some(r=>previousFloor.rooms.includes(r)),'no previous rooms retained in current floor');assert.notDeepEqual(api.state.world.rooms.map(r=>Array.from(r.cells)),previousFloor.rooms.map(r=>Array.from(r.cells)),'next depth generates a new layout');assert.equal(api.state.chamber,0);
api.health(1);api.hurtPlayer();assert.equal(api.state.health,0);assert(api.worldInteract());assert.equal(api.state.health,2);assert.equal(api.state.level,0,'death returns to safe entrance');
api.health(2);const before=JSON.stringify(api.state);api.tickWorld(0);assert.equal(JSON.stringify(api.state),before,'zero dt freezes combat');api.draw();
console.log('PASS loop: locked doors, traversal/backtracking, no barrels, melee/fan/disc, projectile cap, boss gate, next level, death/restart and pause');
api.init('projectile-hit');api.position(15.5,10.5);api.aim(0);let victim=api.state.room.enemies[0];victim.x=18.5;victim.y=10.5;victim.kind=1;victim.wait=999;const oldHP=victim.hp;api.takeLoot({kind:3,value:1});api.worldAttack();api.step(18);assert(victim.hp<oldHP,'moving projectile actually damages an enemy');
api.init('wall-impact');api.clear();api.position(15.5,10.5);api.fire(api.state.player,0,14,1,10,true);api.step(180);assert.equal(api.state.shots.length,0,'projectiles stop at the screen boundary');
api.init('disc-return');api.setRoom(0);api.clear();api.state.room.cells.fill(1);api.position(15.5,10.5);api.aim(0);api.takeLoot({kind:3,value:2});api.worldAttack();api.step(27);assert(api.state.shots[0].dx<0,'disc reverses towards the player');
console.log('PASS combat integration: projectile damage, wall collision and returning disc steering');

// Reward provenance and snapshot behavior, independent of rendering.
for(let seed=0;seed<60;seed++){
 api.init(seed);api.clear();assert(!api.state.objects.some(o=>o.kind===3),'normal enemies never drop weapons');
 api.setRoom(api.state.world.boss);const boss=api.state.room.enemies[0];api.clear();
 const rewards=api.state.objects.filter(o=>o.kind===3);assert.equal(rewards.length,1,'one boss weapon');
 api.hitEnemy(boss,100);assert.equal(api.state.objects.filter(o=>o.kind===3).length,1,'dead boss cannot duplicate its reward');assert.equal(api.state.objects.filter(o=>o.kind===1).length,1,'a kill leaves one corpse');assert(api.state.objects.every(o=>o.kind!==1||o.value>=0&&o.value<5));
 api.takeLoot(rewards[0]);assert.equal(api.state.weapon,rewards[0].value,'boss reward equips its weapon');
}
api.init('needle');api.clear();api.takeLoot({kind:3,value:2});api.worldAttack();assert((api.state.shots[0].traits&2));api.takeLoot({kind:3,value:1});assert((api.state.shots[0].traits&2),'existing shot retains its returning trait after weapon swap');
console.log('PASS redesign: boss-only single rewards, single Skull, generated reward variations, no powerups and projectile snapshots');

// Two-hit survival, feedback, immunity, persistent corpse and all boss rewards.
api.init('two-hit');api.clear();api.health(2);api.hurtPlayer();assert.equal(api.state.health,1);assert.equal(api.state.hitFlash,.18);api.hurtPlayer();assert.equal(api.state.health,1,'one hit during immunity');api.step(60);api.hurtPlayer();assert.equal(api.state.health,0);api.step(120);assert.equal(api.state.health,0,'death persists');assert(api.worldInteract());assert.equal(api.state.health,2);
const drops=new Set();for(let n=0;n<120;n++){api.init(n);api.setRoom(api.state.world.boss);api.clear();drops.add(api.state.objects.find(o=>o.kind===3).value);}assert.deepEqual([...drops].sort(),[1,2,3,4,5,6,7,8],'all eight upgraded weapons remain boss rewards');
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
 for(let i=0;i<6;i++){
  const r=world.rooms[i];
  if(i===world.boss){assert.equal(hazards(r).length,0);continue;}
  const patchTiles=hazards(r).filter(h=>h.t===r.hazard-1),singles=hazards(r).filter(h=>h.t!==r.hazard-1);assert(singles.length<=3);
  for(const h of singles){assert([SPIKE-1,TRAP-1,RADIATION-1].includes(h.t));assert(Math.hypot(h.x-15.5,h.y-10.5)>4);assert(r.doors.every(d=>Math.hypot(d.x-h.x,d.y-h.y)>3));}
  const radio=hazards(r).filter(h=>h.t===RADIATION-1),safeCell=n=>(r.cells[n]&1)&&(r.cells[n]>>1)<NEEDLE&&radio.every(h=>Math.hypot(n%31+.5-h.x,(n/31|0)+.5-h.y)>=3),seen=new Set([r.spawn]),reachable=[r.spawn];assert(safeCell(r.spawn));
  for(const n of reachable)for(const d of [-1,1,-31,31]){const k=n+d;if(k>=0&&k<651&&Math.abs(k%31-n%31)<2&&!seen.has(k)&&safeCell(k)){seen.add(k);reachable.push(k);}}
  for(const p of [...r.doors,...r.enemies,r.gate])assert(seen.has((p.y|0)*31+(p.x|0)),'doors, enemies and exit have a hazard-free route');
  for(const h of singles.filter(h=>h.t===SPIKE-1||h.t===TRAP-1)){const n=(h.y|0)*31+(h.x|0);assert([-1,1,-31,31].filter(d=>r.cells[n+d]&1).length>=3,'singleton damage cannot occupy a narrow passage');}
  if(!r.hazard){assert.equal(patchTiles.length,0);continue;}
  assert((patchTiles.length===0||patchTiles.length>=12)&&patchTiles.length<=60,'large patches only where safe routes leave enough room');if(patchTiles.length)assert.equal(new Set(patchTiles.map(h=>h.offset)).size,1,'plate warning is synchronized');
  const unseen=new Set(patchTiles.map(h=>(h.y|0)*31+(h.x|0)));assert.equal(unseen.size,patchTiles.length,'no duplicate hazard tiles');
  for(const h of patchTiles){assert(Math.hypot((h.x|0)-15,(h.y|0)-10)>3,'safe arrival pocket');assert(r.doors.every(d=>Math.hypot(d.x-h.x,d.y-h.y)>3),'safe door approaches');assert(props(r).some(p=>p.x===(h.x|0)&&p.y===(h.y|0)&&p.t===h.t),'visible tile for every hazard');}
  while(unseen.size){const q=[unseen.values().next().value];unseen.delete(q[0]);for(const n of q)for(const k of [n-1,n+1,n-31,n+31])if(Math.abs(k%31-n%31)<2&&unseen.delete(k))q.push(k);assert(q.length>=12,'no isolated single-tile hazards');const xs=q.map(n=>n%31),ys=q.map(n=>n/31|0),area=(Math.max(...xs)-Math.min(...xs)+1)*(Math.max(...ys)-Math.min(...ys)+1);if(area>q.length)irregular++;patchesChecked++;}
 }
}
assert(irregular>patchesChecked*.9,'patches grow organically instead of filling rectangles');
for(let n=0;n<100;n++){api.init(n);if(api.state.room.hazard===NEEDLE&&hazards(api.state.room).length)break;}api.clear();let plate=hazards(api.state.room).find(h=>h.t===NEEDLE-1);assert.equal(plate.t,NEEDLE-1);api.position(plate.x,plate.y);api.health(2);api.clock(6.7-plate.offset);api.step(1);assert.equal(api.state.health,2,'warning does not damage');api.clock(7.1-plate.offset);api.step(1);assert.equal(api.state.health,1,'active needle patch damages');api.step(1);assert.equal(api.state.health,1,'overlapping hazard cells respect immunity');
for(let n=0;n<100;n++){api.init(n);if(api.state.room.hazard===WEB&&hazards(api.state.room).length)break;}api.clear();const web=hazards(api.state.room).find(h=>h.t===WEB-1);assert.equal(web.t,WEB-1);api.position(web.x,web.y);assert.equal(api.speed(),.55,'large web slows');api.position(15.5,10.5);assert.equal(api.speed(),1,'clear route stays full speed');
for(let n=0;n<100;n++){api.init(n);if(!api.state.room.hazard)break;}assert.equal(api.state.room.hazard,0);assert.equal(api.speed(),1,'hazard-free room has no slowdown');
console.log('PASS large connected hazard patches, synchronized needles, web slowdown, safe routes and mud/debris removal');

api.hazardScene(SPIKE);api.step(1);assert.equal(api.state.health,1,'permanent spikes hurt immediately');api.step(60);assert.equal(api.state.health,0,'permanent spikes remain dangerous');
api.hazardScene(FIRE);api.state.room.enemies.push({hp:1});api.tickHazards(1/60);assert.equal(api.state.health,1);api.extinguish();assert.equal(api.tag(),FIRE,'fire stays while enemies live');api.state.room.enemies[0].hp=0;api.extinguish();assert.equal(api.tag(),0,'room clear extinguishes floor fire');
api.hazardScene(TRAP);api.step(1);assert.equal(api.state.health,1);assert.equal(api.tag(),CLOSED);api.step(120);assert.equal(api.state.health,1,'closed trap cannot hit again');api.setRoom(api.state.chamber);api.step(120);assert.equal(api.tag(),CLOSED,'trap remains closed on room revisit');assert.equal(api.state.health,1);
api.hazardScene(RADIATION);api.step(179);assert.equal(api.state.health,2,'radiation gives three seconds of warning');assert(api.state.radiation>2.9);api.step(2);assert.equal(api.state.health,1,'radiation buildup causes a hit');api.position(19,10.5);api.step(1);assert.equal(api.state.radiation,0,'leaving radiation radius clears buildup');
for(const [x,y]of [[17.5,10.5],[13.5,10.5],[15.5,8.5],[15.5,12.5]]){api.hazardScene(RADIATION);api.position(x,y);api.step(30);assert(api.state.radiation>.4,'radiation surrounds its source in every direction');}
api.hazardScene(ICE);api.iceScene();for(let i=0;i<30;i++)api.physics(1,0);const ix=api.state.player.x;for(let i=0;i<10;i++)api.physics(0,0);assert(api.state.player.x>ix+.2,'ice preserves momentum after release');const iy=api.state.player.y;api.physics(0,1);assert(api.state.player.x>ix&&api.state.player.y>iy,'ice steers gradually');assert.equal(api.state.health,2,'ice alone causes no damage');
console.log('PASS hazard system: permanent spikes/fire, persistent single-use trap, radial radiation buildup/reset, and ice momentum');

api.hazardScene(RADIATION);const noise=api.staticAudio();api.step(30);api.sound();const quiet=noise.levels.at(-1);api.step(120);api.sound();const loud=noise.levels.at(-1);assert(loud>quiet*10&&loud<.081,'radiation static grows strongly as the hit approaches');assert.equal(noise.stats.sources,1,'one looping noise source is reused');assert(noise.stats.data.some(v=>v<-.5)&&noise.stats.data.some(v=>v>.5),'static has both noise polarities');api.sound(0);assert.equal(noise.levels.at(-1),0,'pause mutes static');api.sound();assert.equal(noise.levels.at(-1),loud,'resume uses current buildup');api.position(19,10.5);api.step(1);api.sound();assert.equal(noise.levels.at(-1),0,'leaving the source silences static');api.position(15.5,10.5);api.step(181);api.sound();assert(noise.levels.at(-1)<quiet,'taking a radiation hit resets the static volume');
api.hazardScene(RADIATION);api.tickHazards(2.99);api.hurtPlayer();api.tickHazards(.02);assert.equal(api.state.health,1);assert.equal(api.state.radiation,3,'radiation waits at the threshold during invulnerability');api.step(49);assert.equal(api.state.health,0,'radiation hits when invulnerability expires');assert.equal(api.state.radiation,0,'radiation resets after its hit');
console.log('PASS radiation sound: generated noise, increasing gain, pause/exit silence, and hit reset');
api.init('bleeding');api.hazardScene(0);const bloodRoom=api.state.chamber;
api.step(60);assert.equal(api.state.room.blood.length,0,'healthy player leaves no blood');
api.health(1);api.step(1);assert.equal(api.state.room.blood.length,1,'one remaining HP starts bleeding');
const firstBlood=api.state.room.blood[0];assert.equal(firstBlood[0],api.state.player.x);assert.equal(firstBlood[1],api.state.player.y);
api.tickWorld(0);assert.equal(api.state.room.blood.length,1,'paused game drops no blood');
api.step(120);assert(api.state.room.blood.length>=3&&api.state.room.blood.length<=6,'blood drops every 0.4–0.8 seconds');
for(const [x,y,tile,angle] of api.state.room.blood){assert(Number.isFinite(x+y));assert(Number.isInteger(tile)&&tile>=0&&tile<10);assert(angle>=0&&angle<Math.PI*2);}
const stains=api.state.room.blood;api.setRoom((bloodRoom+1)%6);api.setRoom(bloodRoom);assert.equal(api.state.room.blood,stains,'blood persists when revisiting the room');
api.takeLoot({kind:4});const stopped=stains.length;api.step(60);assert.equal(stains.length,stopped,'armor raising health above one stops bleeding');
api.health(1);api.step(12000);assert.equal(stains.length,192,'blood history stays bounded');
api.health(0);api.step(60);assert.equal(stains.length,192,'dead player stops bleeding');
api.init('fresh-blood');assert.equal(api.state.room.blood.length,0,'fresh run clears blood');
console.log('PASS bleeding: one-HP trigger, cadence, feet position, variants, pause, armor, revisit persistence, cap and reset');

api.hazardScene(0);const medusaNoise=api.staticAudio(),medusaKind=require('../assets/content.json').enemies.findIndex(e=>e.id==='medusa');api.state.room.enemies.push({kind:medusaKind,hp:1,x:9.5,y:10.5,angle:0,wait:0,phase:0,form:0,pattern:0,cycle:0});
api.step(30);api.sound();const gazeQuiet=medusaNoise.levels.at(-1);assert(gazeQuiet>0,'Medusa gaze starts static');api.step(120);api.sound();const gazeLoud=medusaNoise.levels.at(-1);assert(gazeLoud>gazeQuiet*10,'Medusa static rises toward its three-second hit');assert.equal(medusaNoise.stats.sources,1,'Medusa reuses one noise source');api.position(28.5,10.5);api.step(1);api.sound();assert.equal(medusaNoise.levels.at(-1),0,'escaping Medusa gaze silences static');
console.log('PASS Medusa static: shared noise, increasing gain and escape silence');

api.init('arrival-reveal');const entry=api.state.room.doors[0];api.enterRoom(entry.to);assert.equal(api.state.reveal,.45);assert.equal(api.state.revealAt.x,entry.x);assert.equal(api.state.revealAt.y,entry.y);const frozen=JSON.stringify(api.state.room.enemies);api.step(15);assert.equal(JSON.stringify(api.state.room.enemies),frozen,'enemies freeze while the room is being revealed');const timer=api.state.reveal;api.tickWorld(0);assert.equal(api.state.reveal,timer,'pause freezes the reveal');api.step(15);assert.equal(api.state.reveal,0,'reveal finishes within half a second');api.reset();assert.equal(api.state.reveal,0,'restart does not retain a room transition');
console.log('PASS arrival reveal: destination door origin, paused combat, timing and restart');

api.init('uranium-carry');api.hazardScene(RADIATION);assert(api.worldInteract());assert(api.state.uranium);assert.equal(api.tag(),0,'picking up uranium removes the floor source');
const uraniumMob={x:17.5,y:10.5,hp:50,kind:0},uraniumBoss={...api.state.world.rooms[api.state.world.boss].enemies[0],x:16.5,y:10.5,hp:1000};api.state.room.enemies.push(uraniumMob,uraniumBoss);
api.tickHazards(2.9);assert.equal(uraniumMob.hp,50);assert.equal(uraniumBoss.hp,1000,'uranium is not an instant kill');assert.equal(api.state.health,2);api.tickHazards(.11);assert.equal(uraniumMob.hp,0);assert.equal(uraniumBoss.hp,0,'one radiation hit kills even a high-HP boss');assert.equal(api.state.health,1,'carried uranium still hurts its carrier');assert(api.state.objects.some(o=>o.kind===3),'uranium boss kills still drop the boss weapon');
api.health(2);api.tickHazards(.5);const carriedBuildup=api.state.radiation,firstUraniumRoom=api.state.chamber;api.setRoom((firstUraniumRoom+1)%6);assert(api.state.uranium,'uranium follows through doors');assert.equal(api.state.radiation,carriedBuildup,'changing rooms cannot reset carried exposure');
assert(api.worldInteract());assert(!api.state.uranium);const drop=api.state.objects.find(o=>o.kind===5),dropRoom=api.state.chamber;assert(drop,'O drops a real room item');api.setRoom(firstUraniumRoom);api.setRoom(dropRoom);assert(api.state.objects.includes(drop),'dropped uranium persists on revisit');api.position(drop.x,drop.y);assert(api.worldInteract());assert(api.state.uranium);assert.equal(drop.kind,2,'picking up a dropped bar does not duplicate it');api.reset();assert(!api.state.uranium,'restart clears carried uranium');
api.init('uranium-range');api.hazardScene(RADIATION);const exposedMob={x:17.5,y:10.5,hp:30,kind:0};api.state.room.enemies.push(exposedMob);api.tickHazards(2);assert(exposedMob.exposure>=2);exposedMob.x=19;api.tickHazards(.1);assert.equal(exposedMob.exposure,0,'leaving uranium resets enemy buildup');exposedMob.x=17.5;api.tickHazards(2.9);assert.equal(exposedMob.hp,30,'returning enemies must build exposure again');api.tickHazards(.11);assert.equal(exposedMob.hp,0,'floor uranium uses the same three-second lethal hit');
console.log('PASS uranium: pickup/drop, persistence, carrier damage, three-second enemy/boss hit, escape reset and rewards');
