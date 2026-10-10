const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),data=require('./content-data.cjs'),examples=require('./content-examples.cjs');
const runtime=['room','actions','world','combat'].map(n=>fs.readFileSync('src/'+n+'.js','utf8')).join('\n')+'\n'+fs.readFileSync('src/game.js','utf8').split('function choose(')[0];
function boot(catalog,specialize,release=false){
 const c=data.compile(catalog,{specialize}),context={fillText(){},fillRect(){},clip(){},rect(){},beginPath(){},clearRect(){},drawImage(){},save(){},restore(){},translate(){},rotate(){},scale(){}},fields=new Map();
 const document={createElement:()=>({getContext:()=>context}),getElementById:id=>{if(!fields.has(id))fields.set(id,{getContext:()=>context,setAttribute(){},style:{}});return fields.get(id);}};
 return vm.runInNewContext('const DEV=false,assets={entrance:'+JSON.stringify(require('../assets/entrance.json'))+',actor:160,pantry:1,enemies:28,enemyCount:20,weapon:25,weaponCount:3,bosses:38};'+c.source+c.transform(release?require('./specialize-release.cjs')(runtime,{nativeRandom:false}):runtime)+`;({
 init(n){seed=n;reset();level=1;world=makeLevel(seed,level);enterRoom();},level:makeLevel,
 get state(){return {room,world,player,health,shots,weapon,fields,gaze};},
 isolate(e){room.enemies=e?[e]:[];shots=[];player={x:15.5,y:10.5};health=2;hurt=0;travel=0;reveal=0;},
 step:tickWorld,take:takeLoot,fire,attack:worldAttack,
 aim(a){${release?'facing=a':'facing=actionStates.attack.direction=a'};},walk(v){walking=v;},speed:movementFactor,draw:drawWorld,
 startAttack(){performAction('attack');return ${release?'cooldown':'actionStates.attack.cooldown'};},
 drop:bossWeapon,rule:enemyRule,
 kind(e){return ${release?'enemyRules.indexOf(e.rule)':'e.kind'};},
 prepare(e){${release?'e.rule=enemyRules[e.kind+(e.boss?ENEMY_COUNT:0)];':''}return e;},
 definitions(){return JSON.stringify([enemyRules,weaponRules]);}
 })`,require('./canvas-dom.cjs')({atob,document,Set,Uint8Array,Int16Array}));
}
const catalog=data.load(),npc=examples.enemy(catalog,true),gun=examples.weapon(catalog);
catalog.enemies[npc].biomes=[0];catalog.enemies[npc].weight=3;
catalog.weapons.push({id:'test-spear',name:'Test spear',sprite:[28,8],attack:{count:0},reach:2,cooldown:1.5});
const reports=[];
for(const [specialize,release] of [[false,false],[true,false],[true,true]]){
 const api=boot(catalog,specialize,release),definitions=api.definitions();let found,appearances=0;
 for(let seed=0;seed<120;seed++){
  const world=api.level(seed,1);
  for(const room of world.rooms)for(const e of room.enemies)if(!e.boss&&api.kind(e)===npc){assert.equal(world.shape,0,'spawn biome mask');assert.equal(e.form,catalog.enemies[npc].art.base,'new art offset');found=e;appearances++;}
 }
 assert(appearances>0,'new recipe is reachable');
 api.init(1);const e={...found,x:18.5,y:10.5,phase:1,wait:0,angle:0,cycle:0,pattern:0};api.isolate(e);
 const rule=api.rule(e);api.step(.01);assert.equal(api.rule(e),rule,'shared rule row, not per-enemy copy');
 assert.equal(api.state.shots.length,4,'new NPC ID emits a five-shot ring with one opening');
 assert(api.state.shots.some(s=>s.dx<0)&&api.state.shots.some(s=>s.dx>0),'ring reaches both sides');
 api.draw();
 api.init(1);api.isolate();api.aim(0);api.take({kind:3,value:gun});api.attack();
 assert.equal(api.state.shots.length,6,'new weapon ID emits a full ring');assert(api.state.shots.every(s=>(s.traits&1)),'trait is independent of weapon ID');
 api.take({kind:3,value:0});assert(api.state.shots.every(s=>(s.traits&1)),'in-flight behavior survives weapon replacement');
 const drops=new Set();for(let seed=0;seed<120;seed++){api.init(seed);drops.add(api.drop({kind:0}));}assert(drops.has(1)&&drops.has(gun),'old and new rewards remain reachable');
 api.init(1);api.isolate();api.aim(0);api.take({kind:3,value:catalog.weapons.length-1});
 const spearTarget={...found,x:18.5,y:10.5,hp:9,wait:999};api.isolate(spearTarget);api.attack();for(let j=0;j<16;j++)api.step(.01);assert(spearTarget.hp<9,'data-defined melee reach');
 assert.equal(api.startAttack(),.15*1.5,'data-defined weapon cadence');
 api.init(1);api.isolate();api.take({kind:3,value:gun});api.aim(0);
 for(let j=0;j<95;j++)api.fire(api.state.player,0,1,1,1);const old=[...api.state.shots];api.attack();
 assert.equal(api.state.shots.length,96);assert(old.every(s=>s.curve===undefined),'full volley cannot modify earlier bullets');assert(api.state.shots[95].traits&1,'accepted new shot gets the selected traits');
 assert.equal(api.definitions(),definitions,'simulation never mutates definitions');
 reports.push(JSON.stringify(api.state.shots));
}
for(const report of reports)assert.equal(report,reports[0],'column and release specialization preserve simulation');
const sequenceCatalog=data.load(),sequenceId=examples.enemy(sequenceCatalog);
Object.assign(sequenceCatalog.enemies[sequenceId].attack,{mode:['charge','ring','fan'],speed:3,chargeSpeed:11.5,count:5,countStep:0});
const sequences=[];
for(const [specialize,release] of [[false,false],[true,false],[true,true]]){
 const api=boot(sequenceCatalog,specialize,release);api.init(1);
 const e=api.prepare({boss:false,kind:sequenceId,form:6,x:16.5,y:10.5,hp:9,phase:1,wait:0,angle:0,cycle:0,pattern:0,flash:0});
 api.isolate(e);api.step(.01);assert.equal(e.cycle,1);assert.equal(api.state.shots.length,0,'first sequence move charges');
 const x=e.x;api.step(.01);assert(e.x>x,'charge stays selected throughout active phase');
 e.phase=3;e.wait=0;api.step(.01);assert.equal(e.phase,0);
 e.phase=1;e.wait=0;api.isolate(e);api.step(.01);assert.equal(e.cycle,2);assert.equal(api.state.shots.length,4,'second move is a ring with one gap');
 assert(api.state.shots.every(s=>Math.abs(Math.hypot(s.dx,s.dy)-3)<1e-10),'projectile speed is independent of charge speed');
 const ringX=e.x;api.step(.01);assert.equal(e.x,ringX,'projectile move does not become a charge after cycle increments');
 e.phase=3;e.wait=0;api.step(.01);e.phase=1;e.wait=0;api.isolate(e);api.step(.01);
 assert.equal(e.cycle,3);assert.equal(api.state.shots.length,5,'third move is a complete aimed fan');
 sequences.push(JSON.stringify(api.state.shots));
 e.phase=3;e.wait=0;api.step(.01);e.phase=1;e.wait=0;api.isolate(e);api.step(.01);assert.equal(e.cycle,4);assert.equal(api.state.shots.length,0,'sequence wraps back to charge');
 for(const name of ['swarm','conga','kamikaze','mage','medusa']){
  api.init(1);api.state.room.cells.fill(1);
  const kind=sequenceCatalog.enemies.findIndex(r=>r.id===name),x=name==='kamikaze'?14.75:name==='medusa'?9.5:6.5;
  const creature=api.prepare({boss:false,kind,form:0,x,y:10.5,hp:1,phase:0,wait:0,angle:0,cycle:0,pattern:0,slot:0});
  api.isolate(creature);api.step(.01);
  assert.equal(api.state.shots.length,0,name+' keeps its own behavior when another enemy has an attack sequence');
  if(name==='swarm'||name==='conga')assert(creature.x>x,name+' still pursues the player');
  if(name==='kamikaze'||name==='mage')assert.equal(api.state.fields.length,1,name+' still casts its fire field');
  if(name==='medusa')assert(api.state.gaze>0,'medusa still accumulates gaze');
 }
 const level=api.level('sequence-roster',1);
 for(const room of level.rooms){const kinds=room.enemies.map(e=>api.kind(e));if(kinds.some(k=>sequenceCatalog.enemies[k].id==='swarm'||sequenceCatalog.enemies[k].id==='conga'))assert(kinds.every(k=>k===kinds[0]),'group encounters remain homogeneous with attack sequences');}

}
for(const sequence of sequences)assert.equal(sequence,sequences[0],'sequence and release specialization preserve attacks');
for(const mutate of [c=>c.weapons[1].traits=['typo'],c=>c.enemies[0].attack.windupp=.1,c=>examples.boss(c).bosses[0].drop=['missing'],c=>c.enemies[0].art.base=999,c=>c.enemies[0].weight=0,c=>c.enemies[0].attack.mode=[],c=>c.enemies[1].attack.countStep=.5]){const c=examples.weapons(data.load());mutate(c);assert.throws(()=>data.compile(c),/Content:/);}
console.log('PASS recipe extension: new IDs, art, biome/weight pools, charge/ring/fan sequences, ring/piercing/melee, cadence, reward reachability, shot cap, shared immutable rows and specialization');

const sparse=data.compile(examples.weapons(data.load()),{specialize:true,usedFields:new Set(['E_MODE','W_TYPE'])});
assert.throws(()=>sparse.transform('const x=rule[E_SPEED];'),/omitted field/,'a missing liveness declaration cannot silently read the wrong column');
const sparseTables=vm.runInNewContext(sparse.source+';({enemyRules,weaponRules,E_MODE,W_TYPE})');
assert(sparseTables.enemyRules.every(r=>r.length===1)&&sparseTables.weaponRules.every(r=>r.length===1),'only referenced varying columns ship');
assert.equal(sparseTables.enemyRules[0][sparseTables.E_MODE],3);assert.equal(sparseTables.weaponRules[8][sparseTables.W_TYPE],8);
console.log('PASS recipe field liveness and fail-closed omitted-field reads');

const encodeRows=require('./recipe-rows.cjs');
for(const rows of [[],[[]],[[0,1],[2,3]],
 Array.from({length:24},(_,i)=>[i%3,0,.24,.55,1000,i===12?0:7,0]),
 Array.from({length:16},(_,i)=>[[i%2,2,0],.3,0,0,0,0,0])]){
 const decoded=vm.runInNewContext(encodeRows(rows));
 assert.equal(JSON.stringify(decoded),JSON.stringify(rows),'recipe defaults preserve every value, zero and sequence');
 if(decoded.length>1){const second=JSON.stringify(decoded[1]);decoded[0][0]=999;assert.equal(JSON.stringify(decoded[1]),second,'decoded recipe rows remain independent');}
}
console.log('PASS compact recipe rows: exact values, zeros, sequences and independent arrays');
